'use strict';

const ApiError = require('../utils/ApiError');
const wrapSequelizeErrors = require('../utils/wrapSequelizeErrors');
const prospeccaoService = require('./prospeccaoService');

const CAMPOS_TRIAGEM = ['status_triagem', 'observacoes_triagem'];

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
 * RF-01/RN-04: cria o FormularioResposta (ponto de entrada do processo de afiliação,
 * rota pública) e, na mesma transação, aciona a RN-36 (prospeccaoService) para vincular
 * uma prospecção em aberto correspondente, se existir. `email_contato` e
 * `payload_respostas` são obrigatórios.
 */
async function registrarSubmissao(body, { models } = {}) {
  const db = models || require('../models');
  const { email_contato, payload_respostas } = body || {};

  if (!email_contato) {
    throw new ApiError(400, 'email_contato é obrigatório.');
  }
  if (!payload_respostas || typeof payload_respostas !== 'object') {
    throw new ApiError(400, 'payload_respostas é obrigatório.');
  }

  return db.sequelize.transaction(async (transaction) => {
    const formularioResposta = await wrapSequelizeErrors(
      db.FormularioResposta.create({ email_contato, payload_respostas }, { transaction })
    );

    // RN-36: vincula (se existir) uma prospecção em aberto correspondente e avança seu
    // status. Não reimplementado aqui — apenas chamado, como já feito e testado em
    // prospeccaoService.
    await prospeccaoService.vincularProspeccaoAoFormulario(formularioResposta, { transaction, models: db });

    return formularioResposta;
  });
}

async function listar({ models } = {}) {
  const db = models || require('../models');
  return db.FormularioResposta.findAll({ order: [['createdAt', 'DESC']] });
}

async function buscarPorId(id, { models } = {}) {
  const db = models || require('../models');
  const formularioResposta = await db.FormularioResposta.findByPk(id);
  if (!formularioResposta) {
    throw new ApiError(404, 'Formulário de inscrição não encontrado.');
  }
  return formularioResposta;
}

async function triar(id, body, { models } = {}) {
  const db = models || require('../models');
  const formularioResposta = await buscarPorId(id, { models: db });
  const dados = somenteCamposPermitidos(body || {}, CAMPOS_TRIAGEM);
  Object.assign(formularioResposta, dados);
  return wrapSequelizeErrors(formularioResposta.save());
}

module.exports = { registrarSubmissao, listar, buscarPorId, triar };
