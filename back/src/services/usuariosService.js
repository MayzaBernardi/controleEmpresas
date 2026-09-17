'use strict';

const bcrypt = require('bcryptjs');
const ApiError = require('../utils/ApiError');
const wrapSequelizeErrors = require('../utils/wrapSequelizeErrors');
const auditoriaService = require('./auditoriaService');

const CUSTO_HASH = 10;

// Campos editáveis via PATCH /usuarios/:id. `email` é deliberadamente excluído: uma vez
// criado, o usuário não troca o próprio e-mail por esta rota — se vier no body, é ignorado
// silenciosamente (não gera erro). `senha` é tratada à parte em `atualizar` (precisa virar
// hash antes de gravar, não é uma cópia direta como os demais campos).
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
//
// `senha` (opcional, texto puro) é o jeito da equipe_programa definir/resetar a senha de um
// usuário — não há fluxo de "esqueci minha senha" (ver comentário em authService.login).
// Tratado à parte de CAMPOS_ATUALIZACAO porque precisa virar hash antes de gravar.
async function atualizar(id, body, { usuario: atuante, models } = {}) {
  const db = models || require('../models');
  const usuario = await buscarPorId(id, { models: db });
  const dados = somenteCamposPermitidos(body || {}, CAMPOS_ATUALIZACAO);
  const dadosAnteriores = {};
  for (const campo of Object.keys(dados)) {
    dadosAnteriores[campo] = usuario[campo];
  }

  const senhaFoiResetada = Boolean(body?.senha);
  if (senhaFoiResetada) {
    dados.senha_hash = await bcrypt.hash(body.senha, CUSTO_HASH);
  }

  Object.assign(usuario, dados);
  await wrapSequelizeErrors(usuario.save());

  await auditoriaService.registrar({
    entidade: 'usuarios',
    entidadeId: usuario.id,
    acao: dados.ativo === false ? 'delete' : 'update',
    usuario: atuante,
    dadosAnteriores,
    // Nunca grava hash/senha no log de auditoria — só sinaliza que houve reset.
    dadosNovos: senhaFoiResetada ? { ...dados, senha_hash: '(redefinida)' } : dados,
    models: db,
  });

  // Reconsulta via buscarPorId (aplica o defaultScope do model, que exclui senha_hash) — a
  // instância em memória pode ter o hash setado (quando a senha foi resetada) e isso nunca
  // deve ir pro JSON de resposta.
  return buscarPorId(id, { models: db });
}

// RF: só equipe_programa cria usuário (checado na rota via requireRole) e já define a senha
// inicial na criação (decisão do time, 2026-09-17: sem fluxo de "esqueci minha senha", a
// equipe_programa também é quem reseta depois via `atualizar`). `empresa_id` segue a mesma
// obrigatoriedade do model pra papel empresa_afiliada (RN-01), validada pelo hook do Sequelize.
async function criar(body, { usuario: atuante, models } = {}) {
  const db = models || require('../models');

  if (!body?.nome) {
    throw new ApiError(400, 'nome é obrigatório.');
  }
  if (!body?.email) {
    throw new ApiError(400, 'email é obrigatório.');
  }
  if (!body?.papel) {
    throw new ApiError(400, 'papel é obrigatório.');
  }
  if (!body?.senha) {
    throw new ApiError(400, 'senha é obrigatória.');
  }

  const dados = {
    nome: body.nome,
    email: body.email,
    papel: body.papel,
    empresa_id: body.empresa_id ?? null,
    senha_hash: await bcrypt.hash(body.senha, CUSTO_HASH),
  };

  const criado = await wrapSequelizeErrors(db.Usuario.create(dados));
  await auditoriaService.registrar({
    entidade: 'usuarios',
    entidadeId: criado.id,
    acao: 'create',
    usuario: atuante,
    dadosNovos: { nome: dados.nome, email: dados.email, papel: dados.papel, empresa_id: dados.empresa_id },
    models: db,
  });

  // Reconsulta via buscarPorId (defaultScope exclui senha_hash) — .create() retorna a
  // instância com o hash no dataValues em memória, que nunca deve ir pro JSON de resposta.
  return buscarPorId(criado.id, { models: db });
}

module.exports = { listar, buscarPorId, atualizar, criar };
