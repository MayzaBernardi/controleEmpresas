'use strict';

const ApiError = require('../utils/ApiError');

// RN-01: cada rota autorizada só para determinados perfis usa este middleware depois de
// authMiddleware. Ex.: router.get('/', authMiddleware, requireRole('equipe_programa'), ...).
module.exports = function requireRole(...papeisPermitidos) {
  return function (req, res, next) {
    if (!req.user) {
      return next(new ApiError(401, 'Não autenticado.'));
    }
    if (!papeisPermitidos.includes(req.user.papel)) {
      return next(new ApiError(403, 'Seu perfil não tem acesso a este recurso.'));
    }
    return next();
  };
};
