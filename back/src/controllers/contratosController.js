'use strict';

const contratosService = require('../services/contratosService');
const ApiError = require('../utils/ApiError');

exports.listar = async (req, res) => {
  try {
    const contratos = await contratosService.listar({ usuario: req.user });
    return res.json(contratos);
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

exports.listarRenovacaoPendente = async (req, res) => {
  try {
    const contratos = await contratosService.listarRenovacaoPendente();
    return res.json(contratos);
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

exports.detalhar = async (req, res) => {
  try {
    const contrato = await contratosService.buscarPorId(req.params.id, { usuario: req.user });
    return res.json(contrato);
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

exports.gerar = async (req, res) => {
  try {
    const contrato = await contratosService.gerar(req.body, { usuario: req.user });
    return res.status(201).json(contrato);
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

exports.atualizar = async (req, res) => {
  try {
    const contrato = await contratosService.atualizar(req.params.id, req.body, { usuario: req.user });
    return res.json(contrato);
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

exports.renovar = async (req, res) => {
  try {
    const contrato = await contratosService.renovar(req.params.id, req.body, { usuario: req.user });
    return res.status(201).json(contrato);
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

exports.emitir = async (req, res) => {
  try {
    const contrato = await contratosService.emitir(req.params.id, { usuario: req.user });
    return res.status(201).json(contrato);
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

exports.marcarVigente = async (req, res) => {
  try {
    const contrato = await contratosService.marcarVigente(req.params.id, { usuario: req.user });
    return res.json(contrato);
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
