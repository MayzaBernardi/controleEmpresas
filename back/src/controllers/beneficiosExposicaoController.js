'use strict';

const beneficiosExposicaoService = require('../services/beneficiosExposicaoService');

async function detalhar(req, res) {
  const beneficio = await beneficiosExposicaoService.buscarPorEmpresa(req.params.empresaId, {
    usuario: req.user,
  });
  res.json(beneficio);
}

async function atualizar(req, res) {
  const beneficio = await beneficiosExposicaoService.upsert(req.params.empresaId, req.body);
  res.json(beneficio);
}

module.exports = { detalhar, atualizar };
