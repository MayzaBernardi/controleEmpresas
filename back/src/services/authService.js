'use strict';

const jwt = require('jsonwebtoken');
const { AUTH_SECRET } = require('../config/env');
const ApiError = require('../utils/ApiError');

const EXPIRACAO_TOKEN_DEV = '8h';

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

  const token = jwt.sign(
    { id: usuario.id, papel: usuario.papel, empresaId: usuario.empresa_id },
    AUTH_SECRET,
    { expiresIn: EXPIRACAO_TOKEN_DEV }
  );

  return {
    token,
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      papel: usuario.papel,
      empresaId: usuario.empresa_id,
    },
  };
}

module.exports = { emitirTokenDev };
