'use strict';

const beneficiosExposicaoService = require('../services/beneficiosExposicaoService');
const ApiError = require('../utils/ApiError');

exports.detalhar = async (req, res) => {
  try {
    const beneficio = await beneficiosExposicaoService.buscarPorEmpresa(req.params.empresaId, {
      usuario: req.user,
    });
    return res.json(beneficio);
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
    const beneficio = await beneficiosExposicaoService.upsert(req.params.empresaId, req.body);
    return res.json(beneficio);
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
