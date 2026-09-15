'use strict';

const prospeccaoService = require('../services/prospeccaoService');

async function listar(req, res) {
  const prospeccoes = await prospeccaoService.listar();
  res.json(prospeccoes);
}

async function criar(req, res) {
  const prospeccao = await prospeccaoService.criar(req.body);
  res.status(201).json(prospeccao);
}

async function atualizar(req, res) {
  const prospeccao = await prospeccaoService.atualizar(req.params.id, req.body);
  res.json(prospeccao);
}

module.exports = { listar, criar, atualizar };
