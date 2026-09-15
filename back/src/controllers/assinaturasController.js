'use strict';

const assinaturasService = require('../services/assinaturasService');

async function listarPorContrato(req, res) {
  const assinaturas = await assinaturasService.listarPorContrato(req.params.contratoId, { usuario: req.user });
  res.json(assinaturas);
}

async function atualizar(req, res) {
  const assinatura = await assinaturasService.atualizar(req.params.id, req.body);
  res.json(assinatura);
}

module.exports = { listarPorContrato, atualizar };
