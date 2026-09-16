'use strict';

const assinaturasService = require('../services/assinaturasService');
const ApiError = require('../utils/ApiError');

exports.listarPorContrato = async (req, res) => {
  try {
    const assinaturas = await assinaturasService.listarPorContrato(req.params.contratoId, {
      usuario: req.user,
    });
    return res.json(assinaturas);
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
    const assinatura = await assinaturasService.atualizar(req.params.id, req.body, { usuario: req.user });
    return res.json(assinatura);
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
