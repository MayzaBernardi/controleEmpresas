'use strict';

const auditoriaService = require('../services/auditoriaService');
const ApiError = require('../utils/ApiError');

exports.listar = async (req, res) => {
  try {
    const logs = await auditoriaService.listar({
      entidade: req.query.entidade,
      entidadeId: req.query.entidade_id,
    });
    return res.json(logs);
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
