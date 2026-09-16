'use strict';

const prospeccaoService = require('../services/prospeccaoService');
const ApiError = require('../utils/ApiError');

exports.listar = async (req, res) => {
  try {
    const prospeccoes = await prospeccaoService.listar();
    return res.json(prospeccoes);
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

exports.listarStatusDisponiveis = async (req, res) => {
  try {
    const status = await prospeccaoService.listarStatusDisponiveis();
    return res.json(status);
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

exports.criar = async (req, res) => {
  try {
    const prospeccao = await prospeccaoService.criar(req.body);
    return res.status(201).json(prospeccao);
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
    const prospeccao = await prospeccaoService.atualizar(req.params.id, req.body);
    return res.json(prospeccao);
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
