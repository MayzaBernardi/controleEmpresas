'use strict';

const empresasService = require('../services/empresasService');

async function listar(req, res) {
  const empresas = await empresasService.listar();
  res.json(empresas);
}

async function minhaEmpresa(req, res) {
  const empresa = await empresasService.buscarMinhaEmpresa(req.user.empresaId);
  res.json(empresa);
}

async function detalhar(req, res) {
  const empresa = await empresasService.buscarPorId(req.params.id);
  res.json(empresa);
}

async function criar(req, res) {
  const empresa = await empresasService.criar(req.body);
  res.status(201).json(empresa);
}

async function atualizar(req, res) {
  const empresa = await empresasService.atualizar(req.params.id, req.body);
  res.json(empresa);
}

async function atualizarStatusProcesso(req, res) {
  const empresa = await empresasService.atualizarStatusProcesso(req.params.id, req.body.status_processo_id ?? null);
  res.json(empresa);
}

module.exports = { listar, minhaEmpresa, detalhar, criar, atualizar, atualizarStatusProcesso };
