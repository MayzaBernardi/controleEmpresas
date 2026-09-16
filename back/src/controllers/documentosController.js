'use strict';

const documentosService = require('../services/documentosService');
const ApiError = require('../utils/ApiError');

exports.listar = async (req, res) => {
  try {
    const documentos = await documentosService.listar({ usuario: req.user });
    return res.json(documentos);
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

exports.upload = async (req, res) => {
  try {
    const documento = await documentosService.upload(req.body, { usuario: req.user });
    return res.status(201).json(documento);
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
    const documento = await documentosService.atualizar(req.params.id, req.body);
    return res.json(documento);
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
