'use strict';

const empresasService = require('../services/empresasService');
const ApiError = require('../utils/ApiError');

exports.listar = async (req, res) => {
  try {
    const empresas = await empresasService.listar();
    return res.json(empresas);
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

exports.minhaEmpresa = async (req, res) => {
  try {
    const empresa = await empresasService.buscarMinhaEmpresa(req.user.empresaId);
    return res.json(empresa);
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
    const empresa = await empresasService.buscarPorId(req.params.id);
    return res.json(empresa);
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
    const empresa = await empresasService.criar(req.body, { usuario: req.user });
    return res.status(201).json(empresa);
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
    const empresa = await empresasService.atualizar(req.params.id, req.body, { usuario: req.user });
    return res.json(empresa);
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

exports.atualizarStatusProcesso = async (req, res) => {
  try {
    const empresa = await empresasService.atualizarStatusProcesso(
      req.params.id,
      req.body.status_processo_id ?? null,
      { usuario: req.user }
    );
    return res.json(empresa);
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
