'use strict';

const ApiError = require('../utils/ApiError');
const wrapSequelizeErrors = require('../utils/wrapSequelizeErrors');
const auditoriaService = require('./auditoriaService');

// Campos editáveis via PATCH /usuarios/:id. `email` é deliberadamente excluído: é a
// identidade vinda do SSO institucional (ADR 0003) e não pode ser alterada por esta rota —
// se vier no body, é ignorado silenciosamente (não gera erro).
const CAMPOS_ATUALIZACAO = ['nome', 'papel', 'empresa_id', 'ativo'];

function somenteCamposPermitidos(body, camposPermitidos) {
  const dados = {};
  for (const campo of camposPermitidos) {
    if (Object.prototype.hasOwnProperty.call(body, campo)) {
      dados[campo] = body[campo];
    }
  }
  return dados;
}

async function listar({ models } = {}) {
  const db = models || require('../models');
  return db.Usuario.findAll({ order: [['nome', 'ASC']] });
}

async function buscarPorId(id, { models } = {}) {
  const db = models || require('../models');
  const usuario = await db.Usuario.findByPk(id);
  if (!usuario) {
    throw new ApiError(404, 'Usuário não encontrado.');
  }
  return usuario;
}

// RN-01: mudar `papel` para empresa_afiliada exige empresa_id — já validado pelo model
// (empresaObrigatoriaParaPapelEmpresaAfiliada), wrapSequelizeErrors converte em ApiError(400).
async function atualizar(id, body, { usuario: atuante, models } = {}) {
  const db = models || require('../models');
  const usuario = await buscarPorId(id, { models: db });
  const dados = somenteCamposPermitidos(body || {}, CAMPOS_ATUALIZACAO);
  const dadosAnteriores = {};
  for (const campo of Object.keys(dados)) {
    dadosAnteriores[campo] = usuario[campo];
  }
  Object.assign(usuario, dados);
  const resultado = await wrapSequelizeErrors(usuario.save());
  await auditoriaService.registrar({
    entidade: 'usuarios',
    entidadeId: usuario.id,
    acao: dados.ativo === false ? 'delete' : 'update',
    usuario: atuante,
    dadosAnteriores,
    dadosNovos: dados,
    models: db,
  });
  return resultado;
}

module.exports = { listar, buscarPorId, atualizar };
