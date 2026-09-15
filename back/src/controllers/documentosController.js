'use strict';

const documentosService = require('../services/documentosService');

async function listar(req, res) {
  const documentos = await documentosService.listar({ usuario: req.user });
  res.json(documentos);
}

async function upload(req, res) {
  const documento = await documentosService.upload(req.body, { usuario: req.user });
  res.status(201).json(documento);
}

async function avaliar(req, res) {
  const documento = await documentosService.avaliar(req.params.id, req.body);
  res.json(documento);
}

module.exports = { listar, upload, avaliar };
