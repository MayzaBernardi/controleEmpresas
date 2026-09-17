'use strict';

const path = require('path');
const ApiError = require('../utils/ApiError');
const wrapSequelizeErrors = require('../utils/wrapSequelizeErrors');
const auditoriaService = require('./auditoriaService');
const gerarPdf = require('../utils/gerarPdf');

const CODIGO_STATUS_ELABORACAO = 'elaboracao';
const CODIGO_STATUS_EM_ASSINATURA = 'em_assinatura';
const CODIGO_STATUS_VIGENTE = 'vigente';
const DIAS_VIGENCIA_RENOVACAO = 365;

// Fluxo real (remapeado 2026-09-17): equipe_programa emite o contrato (gera o PDF a partir
// desta minuta padrão) → contabilidade baixa o PDF → envia pelo Satelitti (serviço externo de
// assinatura eletrônica, fora do sistema) → quando volta assinado, a equipe marca vigente
// manualmente (marcarVigente). Isso substitui o fluxo antigo de chamado na Procuradoria
// Jurídica e de coleta de assinatura por pessoa (tabela/model Assinatura) — esses campos e
// tabela continuam existindo no schema (histórico), só não são mais exigidos/usados aqui.
const TEMPLATE_PATH = path.join(__dirname, '../../public/templates/minuta-contrato-afiliacao.docx');

const CAMPOS_CRIACAO = [
  'empresa_id',
  'contrato_anterior_id',
  'numero_termo',
  'data_inicio_vigencia',
  'data_termino_vigencia',
  'status_contrato_id',
  'numero_chamado_procuradoria',
  'data_envio_procuradoria',
  'data_retorno_procuradoria',
  'valor_anuidade',
  'observacoes',
  'plano_id',
  'isento_taxa',
  'motivo_isencao',
  'documento_referencia',
  'isencao_inicio',
  'isencao_fim',
  // Upload do contrato assinado (PNG/PDF em base64) — os contratos são gerados
  // manualmente pela equipe fora do sistema; isto é só o registro do arquivo em si.
  'arquivo_nome',
  'arquivo_mimetype',
  'arquivo_base64',
];

// RN-11 / ADR: empresa_id não muda depois de criado — todos os demais campos são
// livremente atualizáveis pela equipe do programa. 'ativo' só é atualizável (soft-delete),
// nunca setável na criação.
const CAMPOS_ATUALIZACAO = [...CAMPOS_CRIACAO.filter((campo) => campo !== 'empresa_id'), 'ativo'];

function somenteCamposPermitidos(body, camposPermitidos) {
  const dados = {};
  for (const campo of camposPermitidos) {
    if (Object.prototype.hasOwnProperty.call(body, campo)) {
      dados[campo] = body[campo];
    }
  }
  return dados;
}

async function buscarStatusContratoPorCodigo(codigo, { models } = {}) {
  const db = models || require('../models');
  const status = await db.StatusContrato.findOne({ where: { codigo } });
  if (!status) {
    throw new ApiError(400, `Status de contrato "${codigo}" não está cadastrado em status_contrato.`);
  }
  return status;
}

function somarDias(dataOneOnly, dias) {
  const data = new Date(`${dataOneOnly}T00:00:00.000Z`);
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
}

// RN-33: equipe_programa/contabilidade veem tudo; empresa_afiliada só os próprios.
async function listar({ usuario, models } = {}) {
  const db = models || require('../models');
  if (usuario?.papel === 'empresa_afiliada') {
    return db.Contrato.scope({ method: ['paraEmpresa', usuario.empresaId] }).findAll({ where: { ativo: true } });
  }
  return db.Contrato.findAll({ where: { ativo: true } });
}

// Padrão seguro RN-33: nunca combinar scope `paraEmpresa` com findByPk — busca sem
// scope e depois valida manualmente a propriedade do registro, sempre respondendo 404
// (nunca 403) quando não pertence à empresa do usuário, para não revelar existência.
async function buscarPorId(id, { usuario, models } = {}) {
  const db = models || require('../models');
  const contrato = await db.Contrato.findByPk(id);
  if (!contrato) {
    throw new ApiError(404, 'Contrato não encontrado.');
  }
  if (usuario?.papel === 'empresa_afiliada' && contrato.empresa_id !== usuario.empresaId) {
    throw new ApiError(404, 'Contrato não encontrado.');
  }
  return contrato;
}

// RN-30: "renovação pendente" = contrato com status formal ainda "vigente" (id buscado
// por código, nunca chumbado) e cujo vencimento cai dentro da janela de antecedência —
// essa segunda condição é o getter virtual `estaProximoVencimento` do model, calculado
// em leitura, então filtramos em JS depois de já ter restringido por status no SQL.
async function listarRenovacaoPendente({ models } = {}) {
  const db = models || require('../models');
  const statusVigente = await buscarStatusContratoPorCodigo(CODIGO_STATUS_VIGENTE, { models: db });
  const contratosVigentes = await db.Contrato.findAll({ where: { status_contrato_id: statusVigente.id } });
  return contratosVigentes.filter((contrato) => contrato.estaProximoVencimento);
}

// RF-03: cria o registro determinístico do contrato (a geração do PDF/documento em si é
// fora de escopo aqui — só a regra de negócio de que não passa por LLM se aplica).
async function gerar(body, { usuario, models } = {}) {
  const db = models || require('../models');
  const dados = somenteCamposPermitidos(body, CAMPOS_CRIACAO);

  if (!dados.empresa_id) {
    throw new ApiError(400, 'empresa_id é obrigatório.');
  }
  if (!dados.data_inicio_vigencia) {
    throw new ApiError(400, 'data_inicio_vigencia é obrigatório.');
  }
  if (!dados.data_termino_vigencia) {
    throw new ApiError(400, 'data_termino_vigencia é obrigatório.');
  }

  if (dados.valor_anuidade === undefined && dados.plano_id) {
    const plano = await db.PlanoAfiliacao.findByPk(dados.plano_id);
    if (!plano || !plano.ativo) {
      throw new ApiError(400, 'plano_id inválido — plano não existe ou não está ativo.');
    }
    dados.valor_anuidade = plano.valor;
  }
  if (dados.valor_anuidade === undefined) {
    throw new ApiError(400, 'valor_anuidade é obrigatório (ou informe plano_id de um plano ativo).');
  }

  if (!dados.status_contrato_id) {
    const statusElaboracao = await buscarStatusContratoPorCodigo(CODIGO_STATUS_ELABORACAO, { models: db });
    dados.status_contrato_id = statusElaboracao.id;
  }

  const contrato = await wrapSequelizeErrors(db.Contrato.create(dados));
  await auditoriaService.registrar({
    entidade: 'contratos',
    entidadeId: contrato.id,
    acao: 'create',
    usuario,
    dadosNovos: contrato.toJSON(),
    models: db,
  });
  return contrato;
}

async function atualizar(id, body, { usuario, models } = {}) {
  const db = models || require('../models');
  const contrato = await buscarPorId(id, { models: db });
  const dados = somenteCamposPermitidos(body, CAMPOS_ATUALIZACAO);
  const dadosAnteriores = {};
  for (const campo of Object.keys(dados)) {
    dadosAnteriores[campo] = contrato[campo];
  }
  Object.assign(contrato, dados);
  const resultado = await wrapSequelizeErrors(contrato.save());
  await auditoriaService.registrar({
    entidade: 'contratos',
    entidadeId: contrato.id,
    acao: dados.ativo === false ? 'delete' : 'update',
    usuario,
    dadosAnteriores,
    dadosNovos: dados,
    models: db,
  });
  return resultado;
}

// RF-07: renova um contrato existente criando um novo registro encadeado por
// contrato_anterior_id, herdando empresa/plano/valor do original (a menos que o body
// sobrescreva) e calculando as datas de vigência subsequentes.
async function renovar(id, body, { usuario, models } = {}) {
  const db = models || require('../models');
  const original = await buscarPorId(id, { models: db });
  const statusElaboracao = await buscarStatusContratoPorCodigo(CODIGO_STATUS_ELABORACAO, { models: db });

  const dadosBody = somenteCamposPermitidos(body || {}, CAMPOS_CRIACAO);

  const dataInicioVigencia =
    dadosBody.data_inicio_vigencia || somarDias(original.data_termino_vigencia, 1);
  const dataTerminoVigencia =
    dadosBody.data_termino_vigencia || somarDias(dataInicioVigencia, DIAS_VIGENCIA_RENOVACAO);

  const dados = {
    ...dadosBody,
    empresa_id: original.empresa_id,
    contrato_anterior_id: original.id,
    plano_id: Object.prototype.hasOwnProperty.call(dadosBody, 'plano_id') ? dadosBody.plano_id : original.plano_id,
    valor_anuidade: dadosBody.valor_anuidade ?? original.valor_anuidade,
    status_contrato_id: dadosBody.status_contrato_id || statusElaboracao.id,
    data_inicio_vigencia: dataInicioVigencia,
    data_termino_vigencia: dataTerminoVigencia,
  };

  const novoContrato = await wrapSequelizeErrors(db.Contrato.create(dados));
  await auditoriaService.registrar({
    entidade: 'contratos',
    entidadeId: novoContrato.id,
    acao: 'create',
    usuario,
    dadosNovos: novoContrato.toJSON(),
    models: db,
  });
  return novoContrato;
}

// RF-03 / fluxo remapeado: equipe_programa emite o contrato — gera o PDF preenchido a
// partir da minuta padrão e o deixa pronto pra contabilidade baixar e enviar pelo Satelitti
// (fora do sistema). Não depende de chamado na Procuradoria nem de assinaturas individuais.
async function emitir(id, { usuario, models } = {}) {
  const db = models || require('../models');
  const contrato = await buscarPorId(id, { models: db });
  const empresa = await db.Empresa.findByPk(contrato.empresa_id);
  if (!empresa) {
    throw new ApiError(404, 'Empresa vinculada ao contrato não encontrada.');
  }

  const emailContato = empresa.contatos?.email;
  const faltantes = [];
  if (!contrato.numero_termo) faltantes.push('numero_termo (do contrato)');
  if (!empresa.razao_social) faltantes.push('razao_social (da empresa)');
  if (!(empresa.cnpj || empresa.identificador_estrangeiro)) {
    faltantes.push('cnpj ou identificador_estrangeiro (da empresa)');
  }
  if (!empresa.endereco_logradouro) faltantes.push('endereco_logradouro (da empresa)');
  if (!empresa.endereco_numero) faltantes.push('endereco_numero (da empresa)');
  if (!empresa.endereco_bairro) faltantes.push('endereco_bairro (da empresa)');
  if (!empresa.cidade) faltantes.push('cidade (da empresa)');
  if (!empresa.uf) faltantes.push('uf (da empresa)');
  if (!empresa.telefone) faltantes.push('telefone (da empresa)');
  if (!empresa.representante_legal) faltantes.push('representante_legal (da empresa)');
  if (!empresa.representante_legal_cpf) faltantes.push('representante_legal_cpf (da empresa)');
  if (!empresa.representante_legal_email) faltantes.push('representante_legal_email (da empresa)');
  if (!emailContato) faltantes.push('contatos.email (da empresa)');

  if (faltantes.length > 0) {
    throw new ApiError(
      400,
      `Não é possível emitir o contrato — preencha antes: ${faltantes.join(', ')}.`
    );
  }

  const dadosTemplate = {
    NUMERO_TERMO: contrato.numero_termo,
    EMPRESA_RAZAO_SOCIAL: empresa.razao_social,
    EMPRESA_CNPJ: empresa.cnpj || empresa.identificador_estrangeiro,
    EMPRESA_ENDERECO_LOGRADOURO: empresa.endereco_logradouro,
    EMPRESA_ENDERECO_NUMERO: empresa.endereco_numero,
    EMPRESA_ENDERECO_COMPLEMENTO: empresa.endereco_complemento,
    EMPRESA_ENDERECO_BAIRRO: empresa.endereco_bairro,
    EMPRESA_CIDADE: empresa.cidade,
    EMPRESA_UF: empresa.uf,
    EMPRESA_TELEFONE: empresa.telefone,
    REPRESENTANTE_NOME: empresa.representante_legal,
    REPRESENTANTE_CPF: empresa.representante_legal_cpf,
    REPRESENTANTE_EMAIL: empresa.representante_legal_email,
    REPRESENTANTE_TELEFONE: empresa.telefone,
    EMPRESA_EMAIL_CONTATO: emailContato,
    VALOR_ANUIDADE: Number(contrato.valor_anuidade).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    VALOR_ANUIDADE_EXTENSO: gerarPdf.numeroPorExtenso(contrato.valor_anuidade),
  };

  const pdfBase64 = await gerarPdf(TEMPLATE_PATH, dadosTemplate);
  const statusEmAssinatura = await buscarStatusContratoPorCodigo(CODIGO_STATUS_EM_ASSINATURA, { models: db });

  contrato.arquivo_base64 = pdfBase64;
  contrato.arquivo_mimetype = 'application/pdf';
  contrato.arquivo_nome = `contrato-${contrato.numero_termo}.pdf`;
  contrato.status_contrato_id = statusEmAssinatura.id;

  const resultado = await wrapSequelizeErrors(contrato.save());
  await auditoriaService.registrar({
    entidade: 'contratos',
    entidadeId: contrato.id,
    acao: 'update',
    usuario,
    dadosNovos: { status_contrato_id: statusEmAssinatura.id, arquivo_nome: contrato.arquivo_nome },
    models: db,
  });

  // RN-06: emitir o contrato é o gatilho que tira a empresa de 'contrato_elaboracao' e a
  // leva para 'ativa' — efeito colateral automático, sem endpoint próprio para setar isso
  // manualmente. Idempotente: se já estava 'ativa' (reemissão), não regrava nem audita de novo.
  if (empresa.status_processo !== 'ativa') {
    const statusProcessoAnterior = empresa.status_processo;
    empresa.status_processo = 'ativa';
    await wrapSequelizeErrors(empresa.save());
    await auditoriaService.registrar({
      entidade: 'empresas',
      entidadeId: empresa.id,
      acao: 'update',
      usuario,
      dadosAnteriores: { status_processo: statusProcessoAnterior },
      dadosNovos: { status_processo: 'ativa' },
      models: db,
    });
  }

  return resultado;
}

// Confirmação manual da equipe_programa de que o contrato voltou assinado do Satelitti
// (serviço externo, fora do sistema) — sem validação extra além de o contrato existir.
async function marcarVigente(id, { usuario, models } = {}) {
  const db = models || require('../models');
  const contrato = await buscarPorId(id, { models: db });
  const statusVigente = await buscarStatusContratoPorCodigo(CODIGO_STATUS_VIGENTE, { models: db });

  contrato.status_contrato_id = statusVigente.id;
  const resultado = await wrapSequelizeErrors(contrato.save());
  await auditoriaService.registrar({
    entidade: 'contratos',
    entidadeId: contrato.id,
    acao: 'update',
    usuario,
    dadosNovos: { status_contrato_id: statusVigente.id },
    models: db,
  });
  return resultado;
}

module.exports = {
  listar,
  buscarPorId,
  listarRenovacaoPendente,
  gerar,
  atualizar,
  renovar,
  emitir,
  marcarVigente,
};
