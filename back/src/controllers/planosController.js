'use strict';

const planosService = require('../services/planosService');

async function listar(req, res) {
  const planos = await planosService.listar();
  res.json(planos);
}

async function atualizar(req, res) {
  const plano = await planosService.atualizar(req.params.id, req.body);
  res.json(plano);
}

module.exports = { listar, atualizar };
