'use strict';

const ApiError = require('../utils/ApiError');
const wrapSequelizeErrors = require('../utils/wrapSequelizeErrors');
const auditoriaService = require('./auditoriaService');

const CAMPOS_ATUALIZACAO = ['nome', 'valor', 'ativo'];

function somenteCamposPermitidos(body, camposPermitidos) {
  const dados = {};
  for (const campo of camposPermitidos) {
    if (Object.prototype.hasOwnProperty.call(body, campo)) {
      dados[campo] = body[campo];
    }
  }
  return dados;
}

// Catálogo — sem isolamento por empresa (ADR 0005 §1): todo perfil autenticado lê a lista
// completa (a rota é quem restringe quais perfis chegam até aqui).
async function listar({ models } = {}) {
  const db = models || require('../models');
  return db.PlanoAfiliacao.findAll({ order: [['nome', 'ASC']] });
}

async function buscarPorId(id, { models } = {}) {
  const db = models || require('../models');
  const plano = await db.PlanoAfiliacao.findByPk(id);
  if (!plano) {
    throw new ApiError(404, 'Plano de afiliação não encontrado.');
  }
  return plano;
}

async function atualizar(id, body, { usuario, models } = {}) {
  const db = models || require('../models');
  const plano = await buscarPorId(id, { models: db });
  const dados = somenteCamposPermitidos(body, CAMPOS_ATUALIZACAO);
  const dadosAnteriores = {};
  for (const campo of Object.keys(dados)) {
    dadosAnteriores[campo] = plano[campo];
  }
  Object.assign(plano, dados);
  const resultado = await wrapSequelizeErrors(plano.save());
  await auditoriaService.registrar({
    entidade: 'planos_afiliacao',
    entidadeId: plano.id,
    acao: dados.ativo === false ? 'delete' : 'update',
    usuario,
    dadosAnteriores,
    dadosNovos: dados,
    models: db,
  });
  return resultado;
}

module.exports = {
  listar,
  buscarPorId,
  atualizar,
};
