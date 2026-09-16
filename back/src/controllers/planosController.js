'use strict';

const planosService = require('../services/planosService');
const ApiError = require('../utils/ApiError');

exports.listar = async (req, res) => {
  try {
    const planos = await planosService.listar();
    return res.json(planos);
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
    const plano = await planosService.atualizar(req.params.id, req.body);
    return res.json(plano);
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
