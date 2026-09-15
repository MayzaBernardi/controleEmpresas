'use strict';

const jwt = require('jsonwebtoken');
const { AUTH_SECRET } = require('../config/env');
const ApiError = require('../utils/ApiError');

// Valida a sessão via token assinado com o segredo compartilhado AUTH_SECRET (ADR 0003 §3)
// e popula req.user = { id, papel, empresaId }. Controllers/services usam req.user para
// autorização por perfil (RN-01) e para aplicar o scope `paraEmpresa` (RN-33).
//
// NOTA (protótipo): o token é emitido hoje por POST /auth/dev-login (back/src/controllers/
// authController.js), um atalho de desenvolvimento — não é o fluxo real de SSO institucional.
// Quando o Auth.js for implementado no front/ (ADR 0003), este middleware deve passar a
// validar a sessão real emitida por ele; a forma de validação (JWT assinado com um segredo
// compartilhado) foi escolhida deliberadamente compatível com essa migração futura.
module.exports = function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new ApiError(401, 'Não autenticado: envie o header Authorization: Bearer <token>.'));
  }

  try {
    const payload = jwt.verify(token, AUTH_SECRET);
    req.user = {
      id: payload.id,
      papel: payload.papel,
      empresaId: payload.empresaId || null,
    };
    return next();
  } catch (err) {
    return next(new ApiError(401, 'Sessão inválida ou expirada.'));
  }
};
