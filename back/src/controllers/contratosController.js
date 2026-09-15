'use strict';

const contratosService = require('../services/contratosService');

async function listar(req, res) {
  const contratos = await contratosService.listar({ usuario: req.user });
  res.json(contratos);
}

async function listarRenovacaoPendente(req, res) {
  const contratos = await contratosService.listarRenovacaoPendente();
  res.json(contratos);
}

async function detalhar(req, res) {
  const contrato = await contratosService.buscarPorId(req.params.id, { usuario: req.user });
  res.json(contrato);
}

async function gerar(req, res) {
  const contrato = await contratosService.gerar(req.body);
  res.status(201).json(contrato);
}

async function atualizar(req, res) {
  const contrato = await contratosService.atualizar(req.params.id, req.body);
  res.json(contrato);
}

async function renovar(req, res) {
  const contrato = await contratosService.renovar(req.params.id, req.body);
  res.status(201).json(contrato);
}

module.exports = { listar, listarRenovacaoPendente, detalhar, gerar, atualizar, renovar };
