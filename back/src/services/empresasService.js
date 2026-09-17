'use strict';

const ApiError = require('../utils/ApiError');
const wrapSequelizeErrors = require('../utils/wrapSequelizeErrors');
const auditoriaService = require('./auditoriaService');

const CAMPOS_CRIACAO = [
  'razao_social',
  'nome_fantasia',
  'cnpj',
  'identificador_estrangeiro',
  'tipo_empresa',
  'tipo_caso_especial',
  'descricao_caso_especial',
  'status_processo',
  'contatos',
  'observacoes',
  'telefone',
  'cidade',
  'uf',
  'representante_legal',
  'endereco_logradouro',
  'endereco_numero',
  'endereco_complemento',
  'endereco_bairro',
  'representante_legal_cpf',
  'representante_legal_email',
];

// 'ativo' só é atualizável, nunca setável na criação (toda empresa nova começa ativa) —
// é o campo usado para "excluir" (soft-delete, RN a confirmar formalmente).
const CAMPOS_ATUALIZACAO = [...CAMPOS_CRIACAO, 'ativo'];

function somenteCamposPermitidos(body, camposPermitidos) {
  const dados = {};
  for (const campo of camposPermitidos) {
    if (Object.prototype.hasOwnProperty.call(body, campo)) {
      dados[campo] = body[campo];
    }
  }
  return dados;
}

/**
 * RN-06: 'encerrada' nunca é gravado na coluna — é o mesmo padrão de estado derivado de
 * data já usado em RN-30 (Contrato.estaVencido/estaProximoVencimento, calculado em
 * leitura), só que aqui a computação exige cruzar com Contrato (Empresa não tem acesso
 * direto às datas do contrato via getter próprio), então fica no service em vez de hook
 * de model — no mesmo espírito de contratosService.listarRenovacaoPendente (query +
 * filtro em JS). Reescreve status_processo só no objeto em memória (nunca .save() aqui):
 * uma empresa persistida como 'ativa' aparece como 'encerrada' na resposta da API quando
 * nenhum contrato dela (ativo, não soft-deletado) está 'em_assinatura' ou 'vigente' e
 * ainda dentro da vigência.
 */
async function aplicarStatusEncerradaPorVencimento(empresas, db) {
  const listaEmpresas = Array.isArray(empresas) ? empresas : [empresas];
  const idsAtivas = listaEmpresas.filter((empresa) => empresa.status_processo === 'ativa').map((empresa) => empresa.id);
  if (idsAtivas.length === 0) return empresas;

  const hoje = new Date().toISOString().slice(0, 10);
  const contratos = await db.Contrato.findAll({
    where: { empresa_id: idsAtivas, ativo: true },
    include: [{ model: db.StatusContrato, as: 'statusContrato', attributes: ['codigo'] }],
  });

  const empresasComContratoValido = new Set();
  for (const contrato of contratos) {
    const codigo = contrato.statusContrato?.codigo;
    if (codigo === 'em_assinatura') empresasComContratoValido.add(contrato.empresa_id);
    if (codigo === 'vigente' && contrato.data_termino_vigencia >= hoje) empresasComContratoValido.add(contrato.empresa_id);
  }

  for (const empresa of listaEmpresas) {
    if (empresa.status_processo === 'ativa' && !empresasComContratoValido.has(empresa.id)) {
      empresa.status_processo = 'encerrada'; // só no objeto em memória — nunca .save() aqui
    }
  }
  return empresas;
}

async function listar({ models } = {}) {
  const db = models || require('../models');
  const empresas = await db.Empresa.findAll({ where: { ativo: true }, order: [['razao_social', 'ASC']] });
  await aplicarStatusEncerradaPorVencimento(empresas, db);
  return empresas;
}

async function buscarPorId(id, { models } = {}) {
  const db = models || require('../models');
  const empresa = await db.Empresa.findByPk(id);
  if (!empresa) {
    throw new ApiError(404, 'Empresa não encontrada.');
  }
  await aplicarStatusEncerradaPorVencimento(empresa, db);
  return empresa;
}

// RN-33: usado pelo controller para o autoatendimento (GET /empresas/me) — busca
// diretamente por empresaId (sem depender de :id de rota), então não tem o risco de IDOR
// que motivou o Op.and no scope `paraEmpresa` (ver docs/modelagem/empresa.md).
async function buscarMinhaEmpresa(empresaId, { models } = {}) {
  if (!empresaId) {
    throw new ApiError(403, 'Usuário não está vinculado a nenhuma empresa.');
  }
  return buscarPorId(empresaId, { models });
}

async function criar(body, { usuario, models } = {}) {
  const db = models || require('../models');
  const dados = somenteCamposPermitidos(body, CAMPOS_CRIACAO);
  const empresa = await wrapSequelizeErrors(db.Empresa.create(dados));
  await auditoriaService.registrar({
    entidade: 'empresas',
    entidadeId: empresa.id,
    acao: 'create',
    usuario,
    dadosNovos: empresa.toJSON(),
    models: db,
  });
  return empresa;
}

async function atualizar(id, body, { usuario, models } = {}) {
  const empresa = await buscarPorId(id, { models });
  const dados = somenteCamposPermitidos(body, CAMPOS_ATUALIZACAO);
  const dadosAnteriores = {};
  for (const campo of Object.keys(dados)) {
    dadosAnteriores[campo] = empresa[campo];
  }
  Object.assign(empresa, dados);
  const resultado = await wrapSequelizeErrors(empresa.save());
  await auditoriaService.registrar({
    entidade: 'empresas',
    entidadeId: empresa.id,
    acao: dados.ativo === false ? 'delete' : 'update',
    usuario,
    dadosAnteriores,
    dadosNovos: dados,
  });
  return resultado;
}

// ADR 0005 §4 / RN-06 (⚠️ pendente): só move a FK nova (status_processo_id); o campo de
// texto legado (status_processo) não é tocado por este fluxo.
async function atualizarStatusProcesso(id, statusProcessoId, { usuario, models } = {}) {
  const db = models || require('../models');
  const empresa = await buscarPorId(id, { models });

  if (statusProcessoId !== null) {
    const statusProcesso = await db.StatusProcesso.findByPk(statusProcessoId);
    if (!statusProcesso) {
      throw new ApiError(400, 'status_processo_id inválido — não existe em status_processo.');
    }
  }

  const statusProcessoIdAnterior = empresa.status_processo_id;
  empresa.status_processo_id = statusProcessoId;
  const resultado = await empresa.save();
  await auditoriaService.registrar({
    entidade: 'empresas',
    entidadeId: empresa.id,
    acao: 'update',
    usuario,
    dadosAnteriores: { status_processo_id: statusProcessoIdAnterior },
    dadosNovos: { status_processo_id: statusProcessoId },
    models: db,
  });
  return resultado;
}

module.exports = {
  listar,
  buscarPorId,
  buscarMinhaEmpresa,
  criar,
  atualizar,
  atualizarStatusProcesso,
};
