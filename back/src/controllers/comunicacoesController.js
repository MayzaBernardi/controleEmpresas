'use strict';

const comunicacoesService = require('../services/comunicacoesService');

async function criarRascunho(req, res) {
  const comunicacao = await comunicacoesService.criarRascunho(req.body);
  res.status(201).json(comunicacao);
}

async function listar(req, res) {
  const comunicacoes = await comunicacoesService.listar();
  res.json(comunicacoes);
}

async function editar(req, res) {
  const comunicacao = await comunicacoesService.editar(req.params.id, req.body);
  res.json(comunicacao);
}

async function aprovar(req, res) {
  const comunicacao = await comunicacoesService.aprovar(req.params.id, req.user.id);
  res.json(comunicacao);
}

async function enviar(req, res) {
  const comunicacao = await comunicacoesService.enviar(req.params.id);
  res.json(comunicacao);
}

module.exports = { criarRascunho, listar, editar, aprovar, enviar };
