'use strict';

const ApiError = require('../utils/ApiError');
const wrapSequelizeErrors = require('../utils/wrapSequelizeErrors');

const CODIGO_STATUS_ELABORACAO = 'elaboracao';
const CODIGO_STATUS_VIGENTE = 'vigente';
const DIAS_VIGENCIA_RENOVACAO = 365;

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
];

// RN-11 / ADR: empresa_id não muda depois de criado — todos os demais campos são
// livremente atualizáveis pela equipe do programa.
const CAMPOS_ATUALIZACAO = CAMPOS_CRIACAO.filter((campo) => campo !== 'empresa_id');

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
    return db.Contrato.scope({ method: ['paraEmpresa', usuario.empresaId] }).findAll();
  }
  return db.Contrato.findAll();
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
async function gerar(body, { models } = {}) {
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

  return wrapSequelizeErrors(db.Contrato.create(dados));
}

async function atualizar(id, body, { models } = {}) {
  const db = models || require('../models');
  const contrato = await buscarPorId(id, { models: db });
  const dados = somenteCamposPermitidos(body, CAMPOS_ATUALIZACAO);
  Object.assign(contrato, dados);
  return wrapSequelizeErrors(contrato.save());
}

// RF-07: renova um contrato existente criando um novo registro encadeado por
// contrato_anterior_id, herdando empresa/plano/valor do original (a menos que o body
// sobrescreva) e calculando as datas de vigência subsequentes.
async function renovar(id, body, { models } = {}) {
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

  return wrapSequelizeErrors(db.Contrato.create(dados));
}

module.exports = {
  listar,
  buscarPorId,
  listarRenovacaoPendente,
  gerar,
  atualizar,
  renovar,
};
