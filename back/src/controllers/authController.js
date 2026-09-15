'use strict';

const authService = require('../services/authService');
const ApiError = require('../utils/ApiError');
const { NODE_ENV } = require('../config/env');

/**
 * Atalho de desenvolvimento/teste manual (Postman): emite um token válido para um usuário
 * já existente na base, por e-mail, sem passar pelo fluxo real de SSO (Auth.js, ainda não
 * implementado no front/ — ver ADR 0003). Recusado com 404 em produção.
 */
async function devLogin(req, res, next) {
  if (NODE_ENV === 'production') {
    return next(new ApiError(404, 'Rota não encontrada'));
  }
  const resultado = await authService.emitirTokenDev(req.body.email);
  return res.status(200).json(resultado);
}

module.exports = { devLogin };
