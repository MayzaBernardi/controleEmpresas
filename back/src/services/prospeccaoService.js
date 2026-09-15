'use strict';

const { Op } = require('sequelize');
const ApiError = require('../utils/ApiError');
const wrapSequelizeErrors = require('../utils/wrapSequelizeErrors');

const STATUS_PROSPECCAO_ABERTOS = ['identificado', 'material_enviado', 'aguardando_retorno'];
const STATUS_PROSPECCAO_CONVERTIDO = 'convertido_para_formulario';
const STATUS_PROSPECCAO_PADRAO = 'identificado';

const CAMPOS_PERMITIDOS = [
  'nome_empresa',
  'cidade',
  'uf',
  'email_contato',
  'telefone_contato',
  'responsavel_interno',
  'status_prospeccao_id',
  'observacoes',
];

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
 * RN-36: quando um FormularioResposta é criado, vincula (se existir) uma prospecção em
 * aberto com o mesmo e-mail de contato ou nome de empresa, e atualiza seu status para
 * "convertido_para_formulario". Implementado como service — não como hook automático do
 * model — para manter a regra visível e testável na camada correta (routes -> controllers
 * -> services -> models). Quem cria o FormularioResposta deve chamar esta função em seguida,
 * dentro da mesma transação da criação.
 *
 * @param {object} formularioResposta - instância de FormularioResposta já criada.
 * @param {object} [opcoes]
 * @param {import('sequelize').Transaction} [opcoes.transaction]
 * @param {object} [opcoes.models] - override para testes; por padrão usa `../models`.
 * @returns {Promise<object|null>} a Prospeccao vinculada, ou null se nenhuma estava em aberto.
 */
async function vincularProspeccaoAoFormulario(formularioResposta, { transaction, models } = {}) {
  const db = models || require('../models');
  const { Prospeccao, StatusProspeccao } = db;

  const statusAbertos = await StatusProspeccao.findAll({
    where: { codigo: STATUS_PROSPECCAO_ABERTOS },
    transaction,
  });
  const idsStatusAbertos = statusAbertos.map((s) => s.id);
  if (idsStatusAbertos.length === 0) return null;

  const nomeEmpresa =
    formularioResposta.payload_respostas && typeof formularioResposta.payload_respostas === 'object'
      ? formularioResposta.payload_respostas.razao_social
      : null;

  const condicoesDeCorrespondencia = [];
  if (formularioResposta.email_contato) {
    condicoesDeCorrespondencia.push({ email_contato: { [Op.iLike]: formularioResposta.email_contato } });
  }
  if (nomeEmpresa) {
    condicoesDeCorrespondencia.push({ nome_empresa: { [Op.iLike]: nomeEmpresa } });
  }
  if (condicoesDeCorrespondencia.length === 0) return null;

  const prospeccao = await Prospeccao.findOne({
    where: {
      [Op.and]: [{ status_prospeccao_id: idsStatusAbertos }, { [Op.or]: condicoesDeCorrespondencia }],
    },
    transaction,
  });
  if (!prospeccao) return null;

  const statusConvertido = await StatusProspeccao.findOne({
    where: { codigo: STATUS_PROSPECCAO_CONVERTIDO },
    transaction,
  });

  await prospeccao.update(
    {
      formulario_resposta_id: formularioResposta.id,
      status_prospeccao_id: statusConvertido.id,
    },
    { transaction }
  );

  return prospeccao;
}

/**
 * ADR 0005 §3: lista todas as prospecções (sem isolamento por empresa — é dado interno
 * da equipe de programa, anterior a existir uma Empresa), com o status vinculado
 * incluído, mais recentes primeiro.
 */
async function listar({ models } = {}) {
  const db = models || require('../models');
  return db.Prospeccao.findAll({
    include: [{ model: db.StatusProspeccao, as: 'statusProspeccao' }],
    order: [['createdAt', 'DESC']],
  });
}

/**
 * Busca o id de status_prospeccao pelo `codigo` informado, lançando ApiError(400) se não
 * existir — usado tanto para o default (RN-... "identificado") quanto para validar um
 * status_prospeccao_id enviado explicitamente pelo chamador.
 */
async function buscarStatusProspeccaoIdPorCodigo(codigo, { transaction, models } = {}) {
  const db = models || require('../models');
  const status = await db.StatusProspeccao.findOne({ where: { codigo }, transaction });
  if (!status) {
    throw new ApiError(400, `status_prospeccao com codigo "${codigo}" não encontrado.`);
  }
  return status.id;
}

async function validarStatusProspeccaoId(statusProspeccaoId, { models } = {}) {
  const db = models || require('../models');
  const status = await db.StatusProspeccao.findByPk(statusProspeccaoId);
  if (!status) {
    throw new ApiError(400, 'status_prospeccao_id inválido — não existe em status_prospeccao.');
  }
}

/**
 * Cria uma Prospeccao. `nome_empresa` é obrigatório; se `status_prospeccao_id` não vier
 * no body, usa o id de codigo="identificado" (buscado, nunca chumbado); se vier, valida
 * que existe em status_prospeccao.
 */
async function criar(body, { models } = {}) {
  const db = models || require('../models');
  const dados = somenteCamposPermitidos(body || {}, CAMPOS_PERMITIDOS);

  if (!dados.nome_empresa) {
    throw new ApiError(400, 'nome_empresa é obrigatório.');
  }

  if (dados.status_prospeccao_id === undefined || dados.status_prospeccao_id === null) {
    dados.status_prospeccao_id = await buscarStatusProspeccaoIdPorCodigo(STATUS_PROSPECCAO_PADRAO, { models: db });
  } else {
    await validarStatusProspeccaoId(dados.status_prospeccao_id, { models: db });
  }

  return wrapSequelizeErrors(db.Prospeccao.create(dados));
}

/**
 * Atualiza uma Prospeccao existente. Sem isolamento por empresa (ADR 0005 §3: é dado
 * interno da equipe, anterior a existir uma Empresa).
 */
async function atualizar(id, body, { models } = {}) {
  const db = models || require('../models');
  const prospeccao = await db.Prospeccao.findByPk(id);
  if (!prospeccao) {
    throw new ApiError(404, 'Prospecção não encontrada.');
  }

  const dados = somenteCamposPermitidos(body || {}, CAMPOS_PERMITIDOS);

  if (Object.prototype.hasOwnProperty.call(dados, 'status_prospeccao_id') && dados.status_prospeccao_id !== null) {
    await validarStatusProspeccaoId(dados.status_prospeccao_id, { models: db });
  }

  Object.assign(prospeccao, dados);
  return wrapSequelizeErrors(prospeccao.save());
}

module.exports = { vincularProspeccaoAoFormulario, listar, criar, atualizar };
