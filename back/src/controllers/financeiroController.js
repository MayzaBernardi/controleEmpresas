'use strict';

const financeiroService = require('../services/financeiroService');
const ApiError = require('../utils/ApiError');

exports.listar = async (req, res) => {
  try {
    const lancamentos = await financeiroService.listar({ usuario: req.user });
    return res.json(lancamentos);
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

exports.listarAtrasados = async (req, res) => {
  try {
    const lancamentos = await financeiroService.listarAtrasados();
    return res.json(lancamentos);
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

exports.lancar = async (req, res) => {
  try {
    const lancamento = await financeiroService.lancar(req.body, { usuario: req.user });
    return res.status(201).json(lancamento);
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

exports.confirmarPagamento = async (req, res) => {
  try {
    const lancamento = await financeiroService.confirmarPagamento(req.params.id, req.body, { usuario: req.user });
    return res.json(lancamento);
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
