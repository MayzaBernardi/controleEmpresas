'use strict';

// Router de caminho completo: montado na raiz (sem prefixo), mesmo padrão de
// routes/assinaturas.js — por isso a rota declara o path inteiro, e não '/'.
const { Router } = require('express');
const controller = require('../controllers/beneficiosExposicaoController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/requireRole');
const asyncHandler = require('../utils/asyncHandler');

const router = Router();

router.get(
  '/empresas/:empresaId/beneficios-exposicao',
  authMiddleware,
  requireRole('equipe_programa', 'empresa_afiliada'),
  asyncHandler(controller.detalhar)
);

router.patch(
  '/empresas/:empresaId/beneficios-exposicao',
  authMiddleware,
  requireRole('equipe_programa'),
  asyncHandler(controller.atualizar)
);

module.exports = router;
