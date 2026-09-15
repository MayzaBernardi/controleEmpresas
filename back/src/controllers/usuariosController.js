'use strict';

const usuariosService = require('../services/usuariosService');

async function listar(req, res) {
  const usuarios = await usuariosService.listar();
  res.json(usuarios);
}

async function atualizar(req, res) {
  const usuario = await usuariosService.atualizar(req.params.id, req.body);
  res.json(usuario);
}

module.exports = { listar, atualizar };
