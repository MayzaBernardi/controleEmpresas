'use strict';

const formularioService = require('../services/formularioService');

async function submeter(req, res) {
  const formularioResposta = await formularioService.registrarSubmissao(req.body);
  res.status(201).json(formularioResposta);
}

async function listar(req, res) {
  const formularios = await formularioService.listar();
  res.json(formularios);
}

async function detalhar(req, res) {
  const formularioResposta = await formularioService.buscarPorId(req.params.id);
  res.json(formularioResposta);
}

async function triar(req, res) {
  const formularioResposta = await formularioService.triar(req.params.id, req.body);
  res.json(formularioResposta);
}

module.exports = { submeter, listar, detalhar, triar };
