'use strict';

const espacosFisicosService = require('../services/espacosFisicosService');
const ApiError = require('../utils/ApiError');

exports.listar = async (req, res) => {
  try {
    const espacos = await espacosFisicosService.listar({ usuario: req.user });
    return res.json(espacos);
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
