'use strict';

// Erro com status HTTP explícito. Lançado por services/controllers e capturado pelo
// middleware central de erros (src/app.js), que usa `err.status` quando presente e cai
// para 500 + mensagem genérica em qualquer outro caso (nunca vaza stack trace).
class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

module.exports = ApiError;
