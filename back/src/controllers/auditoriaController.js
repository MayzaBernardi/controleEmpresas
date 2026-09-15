'use strict';

const auditoriaService = require('../services/auditoriaService');

async function listar(req, res) {
  const logs = await auditoriaService.listar({
    entidade: req.query.entidade,
    entidadeId: req.query.entidade_id,
  });
  res.json(logs);
}

module.exports = { listar };
