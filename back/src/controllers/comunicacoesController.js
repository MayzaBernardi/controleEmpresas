'use strict';

const comunicacoesService = require('../services/comunicacoesService');
const ApiError = require('../utils/ApiError');

exports.criarRascunho = async (req, res) => {
  try {
    const comunicacao = await comunicacoesService.criarRascunho(req.body);
    return res.status(201).json(comunicacao);
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
    const comunicacoes = await comunicacoesService.listar();
    return res.json(comunicacoes);
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

exports.editar = async (req, res) => {
  try {
    const comunicacao = await comunicacoesService.editar(req.params.id, req.body);
    return res.json(comunicacao);
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

exports.aprovar = async (req, res) => {
  try {
    const comunicacao = await comunicacoesService.aprovar(req.params.id, req.user.id);
    return res.json(comunicacao);
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

exports.enviar = async (req, res) => {
  try {
    const comunicacao = await comunicacoesService.enviar(req.params.id);
    return res.json(comunicacao);
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
