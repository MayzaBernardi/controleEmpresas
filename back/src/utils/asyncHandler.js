'use strict';

// Evita repetir try/catch em cada controller: encaminha qualquer rejeição da função
// async para next(err), onde o middleware central de erros (src/app.js) trata.
module.exports = function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
