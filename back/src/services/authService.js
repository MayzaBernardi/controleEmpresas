'use strict';

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { AUTH_SECRET } = require('../config/env');
const ApiError = require('../utils/ApiError');

const EXPIRACAO_TOKEN = '8h';

function emitirToken(usuario) {
  return jwt.sign(
    { id: usuario.id, papel: usuario.papel, empresaId: usuario.empresa_id },
    AUTH_SECRET,
    { expiresIn: EXPIRACAO_TOKEN }
  );
}

function serializarUsuario(usuario) {
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    papel: usuario.papel,
    empresaId: usuario.empresa_id,
  };
}

/**
 * Emite um token assinado (mesmo formato que authMiddleware espera) para um usuário
 * existente, identificado por e-mail. Uso exclusivo de desenvolvimento/teste manual
 * (Postman) — substitui o login real via Auth.js/SSO institucional (ADR 0003), que ainda
 * não está implementado no front/. Nunca deve ficar acessível em produção — o controller
 * que chama esta função (authController.devLogin) já recusa a requisição fora de
 * desenvolvimento/teste antes de chegar aqui.
 */
async function emitirTokenDev(email, { models } = {}) {
  const db = models || require('../models');
  const { Usuario } = db;

  if (!email) {
    throw new ApiError(400, 'email é obrigatório.');
  }

  const usuario = await Usuario.findOne({ where: { email } });
  if (!usuario || !usuario.ativo) {
    throw new ApiError(404, 'Nenhum usuário ativo encontrado com esse e-mail.');
  }

  return { token: emitirToken(usuario), usuario: serializarUsuario(usuario) };
}

// Login real (e-mail + senha) — substitui o SSO institucional previsto no ADR 0003 §3, que
// foi revertido em 2026-09-17 por inviabilidade validada com o time: agora é autenticação
// local (RN-02 revisado), com hash bcrypt e senha definida/resetada só pela equipe_programa
// (não há fluxo de "esqueci minha senha" por e-mail — o projeto não tem envio de e-mail).
//
// Mensagem de erro deliberadamente genérica em todo caminho de falha (usuário inexistente,
// inativo, sem senha definida ainda, ou senha errada) — não diferencia pra não vazar pra um
// atacante se um e-mail existe na base (user enumeration).
async function login(email, senha, { models } = {}) {
  const db = models || require('../models');
  const { Usuario } = db;

  if (!email || !senha) {
    throw new ApiError(400, 'email e senha são obrigatórios.');
  }

  const ERRO_CREDENCIAIS = new ApiError(401, 'E-mail ou senha inválidos.');

  // .unscoped(): o defaultScope do model exclui senha_hash de toda leitura (nunca deve
  // vazar no JSON de resposta) — aqui é a única exceção legítima, pra comparar o hash.
  const usuario = await Usuario.unscoped().findOne({ where: { email } });
  if (!usuario || !usuario.ativo || !usuario.senha_hash) {
    throw ERRO_CREDENCIAIS;
  }

  const senhaConfere = await bcrypt.compare(senha, usuario.senha_hash);
  if (!senhaConfere) {
    throw ERRO_CREDENCIAIS;
  }

  return { token: emitirToken(usuario), usuario: serializarUsuario(usuario) };
}

module.exports = { emitirTokenDev, login };
