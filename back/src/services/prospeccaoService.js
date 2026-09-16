'use strict';

const { Op } = require('sequelize');
const ApiError = require('../utils/ApiError');
const wrapSequelizeErrors = require('../utils/wrapSequelizeErrors');
const auditoriaService = require('./auditoriaService');

const STATUS_PROSPECCAO_PADRAO = 'em_contato';

const CAMPOS_CRIACAO = [
  'nome_empresa',
  'cidade',
  'uf',
  'email_contato',
  'telefone_contato',
  'responsavel_interno',
  'status_prospeccao_id',
  'observacoes',
];

// 'ativo' só é atualizável (soft-delete) — nunca setável na criação.
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
 * RN-36: quando um FormularioResposta é criado, vincula (se existir) uma prospecção ainda
 * não convertida (formulario_resposta_id nulo) e ativa, com o mesmo e-mail de contato ou
 * nome de empresa. Implementado como service — não como hook automático do model — para
 * manter a regra visível e testável na camada correta. Quem cria o FormularioResposta deve
 * chamar esta função em seguida, dentro da mesma transação da criação.
 *
 * Decisão de negócio (2026-09-16): a taxonomia de status_prospeccao (em_contato /
 * nao_constatada / proposta_rejeitada) não tem um estado "convertida" — a conversão em si é
 * só `formulario_resposta_id` deixando de ser null, e a prospecção some da listagem nesse
 * momento (ver `listar` abaixo). O status que a prospecção tinha antes de converter não
 * muda.
 *
 * @param {object} formularioResposta - instância de FormularioResposta já criada.
 * @param {object} [opcoes]
 * @param {import('sequelize').Transaction} [opcoes.transaction]
 * @param {object} [opcoes.models] - override para testes; por padrão usa `../models`.
 * @returns {Promise<object|null>} a Prospeccao vinculada, ou null se nenhuma foi encontrada.
 */
async function vincularProspeccaoAoFormulario(formularioResposta, { transaction, models } = {}) {
  const db = models || require('../models');
  const { Prospeccao } = db;

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
      [Op.and]: [{ ativo: true }, { formulario_resposta_id: null }, { [Op.or]: condicoesDeCorrespondencia }],
    },
    transaction,
  });
  if (!prospeccao) return null;

  await prospeccao.update({ formulario_resposta_id: formularioResposta.id }, { transaction });

  return prospeccao;
}

/**
 * ADR 0005 §3: lista as prospecções ainda ativas e não convertidas (sem isolamento por
 * empresa — é dado interno da equipe de programa, anterior a existir uma Empresa), com o
 * status vinculado incluído, mais recentes primeiro. Uma prospecção some daqui assim que
 * `formulario_resposta_id` é preenchido (RN-36) ou quando é excluída (ativo=false).
 */
async function listar({ models } = {}) {
  const db = models || require('../models');
  return db.Prospeccao.findAll({
    where: { ativo: true, formulario_resposta_id: null },
    include: [{ model: db.StatusProspeccao, as: 'statusProspeccao' }],
    order: [['createdAt', 'DESC']],
  });
}

/**
 * Busca o id de status_prospeccao pelo `codigo` informado, lançando ApiError(400) se não
 * existir — usado tanto para o default ("em_contato") quanto para validar um
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
 * no body, usa o id de codigo="em_contato" (buscado, nunca chumbado); se vier, valida
 * que existe em status_prospeccao.
 */
async function criar(body, { usuario, models } = {}) {
  const db = models || require('../models');
  const dados = somenteCamposPermitidos(body || {}, CAMPOS_CRIACAO);

  if (!dados.nome_empresa) {
    throw new ApiError(400, 'nome_empresa é obrigatório.');
  }

  if (dados.status_prospeccao_id === undefined || dados.status_prospeccao_id === null) {
    dados.status_prospeccao_id = await buscarStatusProspeccaoIdPorCodigo(STATUS_PROSPECCAO_PADRAO, { models: db });
  } else {
    await validarStatusProspeccaoId(dados.status_prospeccao_id, { models: db });
  }

  const prospeccao = await wrapSequelizeErrors(db.Prospeccao.create(dados));
  await auditoriaService.registrar({
    entidade: 'prospeccoes',
    entidadeId: prospeccao.id,
    acao: 'create',
    usuario,
    dadosNovos: prospeccao.toJSON(),
    models: db,
  });
  return prospeccao;
}

/**
 * Atualiza (edição de dados, mudança de status, ou soft-delete via `ativo`) uma Prospeccao
 * existente. Sem isolamento por empresa (ADR 0005 §3: é dado interno da equipe, anterior a
 * existir uma Empresa).
 */
async function atualizar(id, body, { usuario, models } = {}) {
  const db = models || require('../models');
  const prospeccao = await db.Prospeccao.findByPk(id);
  if (!prospeccao) {
    throw new ApiError(404, 'Prospecção não encontrada.');
  }

  const dados = somenteCamposPermitidos(body || {}, CAMPOS_ATUALIZACAO);

  if (Object.prototype.hasOwnProperty.call(dados, 'status_prospeccao_id') && dados.status_prospeccao_id !== null) {
    await validarStatusProspeccaoId(dados.status_prospeccao_id, { models: db });
  }

  const dadosAnteriores = {};
  for (const campo of Object.keys(dados)) {
    dadosAnteriores[campo] = prospeccao[campo];
  }
  Object.assign(prospeccao, dados);
  const resultado = await wrapSequelizeErrors(prospeccao.save());
  await auditoriaService.registrar({
    entidade: 'prospeccoes',
    entidadeId: prospeccao.id,
    acao: dados.ativo === false ? 'delete' : 'update',
    usuario,
    dadosAnteriores,
    dadosNovos: dados,
    models: db,
  });
  return resultado;
}

// Lookup pro front montar o seletor de status na edição — sem isso não há como saber os
// ids válidos de status_prospeccao (não é um ENUM fixo no código, é uma tabela).
async function listarStatusDisponiveis({ models } = {}) {
  const db = models || require('../models');
  return db.StatusProspeccao.findAll({ order: [['id', 'ASC']] });
}

module.exports = { vincularProspeccaoAoFormulario, listar, criar, atualizar, listarStatusDisponiveis };
