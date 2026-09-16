'use strict';

const comunicacoesService = require('../services/comunicacoesService');
const emailAgentService = require('../services/emailAgentService');
const ApiError = require('../utils/ApiError');

exports.sugerirCorpo = async (req, res) => {
  try {
    const { assunto } = req.body || {};
    if (!assunto) {
      throw new ApiError(400, 'assunto é obrigatório.');
    }
    const corpo_html = await emailAgentService.sugerirCorpoEmail(assunto);
    return res.json({ corpo_html });
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

exports.criarRascunho = async (req, res) => {
  try {
    const comunicacao = await comunicacoesService.criarRascunho(req.body, { usuario: req.user });
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
    const comunicacao = await comunicacoesService.editar(req.params.id, req.body, { usuario: req.user });
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
    const comunicacao = await comunicacoesService.aprovar(req.params.id, req.user.id, { usuario: req.user });
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
    const comunicacao = await comunicacoesService.enviar(req.params.id, { usuario: req.user });
    return res.json(comunicacao);
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
