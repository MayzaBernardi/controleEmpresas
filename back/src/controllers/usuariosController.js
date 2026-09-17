'use strict';

const usuariosService = require('../services/usuariosService');
const ApiError = require('../utils/ApiError');

exports.listar = async (req, res) => {
  try {
    const usuarios = await usuariosService.listar();
    return res.json(usuarios);
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
    const usuario = await usuariosService.atualizar(req.params.id, req.body, { usuario: req.user });
    return res.json(usuario);
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
    const usuario = await usuariosService.criar(req.body, { usuario: req.user });
    return res.status(201).json(usuario);
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
