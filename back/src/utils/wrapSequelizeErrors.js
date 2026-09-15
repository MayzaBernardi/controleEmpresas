'use strict';

const ApiError = require('./ApiError');

// Converte SequelizeValidationError/SequelizeUniqueConstraintError (validators de model,
// ex. RN-32/RN-34, e constraints UNIQUE do banco) em ApiError(400, mensagem amigável) —
// em vez de deixar virar 500 genérico. Qualquer outro erro passa adiante sem alteração.
async function wrapSequelizeErrors(promessa) {
  try {
    return await promessa;
  } catch (err) {
    if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
      throw new ApiError(400, err.errors?.[0]?.message || 'Dados inválidos.');
    }
    throw err;
  }
}

module.exports = wrapSequelizeErrors;
