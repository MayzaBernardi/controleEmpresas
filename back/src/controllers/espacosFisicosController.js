'use strict';

const espacosFisicosService = require('../services/espacosFisicosService');

async function listar(req, res) {
  const espacos = await espacosFisicosService.listar({ usuario: req.user });
  res.json(espacos);
}

module.exports = { listar };
