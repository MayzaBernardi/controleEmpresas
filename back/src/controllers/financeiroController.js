'use strict';

const financeiroService = require('../services/financeiroService');

async function listar(req, res) {
  const lancamentos = await financeiroService.listar({ usuario: req.user });
  res.json(lancamentos);
}

async function listarAtrasados(req, res) {
  const lancamentos = await financeiroService.listarAtrasados();
  res.json(lancamentos);
}

async function lancar(req, res) {
  const lancamento = await financeiroService.lancar(req.body);
  res.status(201).json(lancamento);
}

async function confirmarPagamento(req, res) {
  const lancamento = await financeiroService.confirmarPagamento(req.params.id, req.body);
  res.json(lancamento);
}

module.exports = { listar, listarAtrasados, lancar, confirmarPagamento };
