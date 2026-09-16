'use strict';

const formularioService = require('../services/formularioService');
const ApiError = require('../utils/ApiError');

exports.submeter = async (req, res) => {
  try {
    const formularioResposta = await formularioService.registrarSubmissao(req.body);
    return res.status(201).json(formularioResposta);
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

exports.listar = async (req, res) => {
  try {
    const formularios = await formularioService.listar();
    return res.json(formularios);
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
    const formularioResposta = await formularioService.buscarPorId(req.params.id);
    return res.json(formularioResposta);
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

exports.triar = async (req, res) => {
  try {
    const formularioResposta = await formularioService.triar(req.params.id, req.body, { usuario: req.user });
    return res.json(formularioResposta);
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
