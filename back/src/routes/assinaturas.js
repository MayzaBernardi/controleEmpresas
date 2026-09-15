'use strict';

// Router de caminho completo: montado na raiz (sem prefixo), junto com o de contratos —
// por isso cada rota declara o path inteiro, e não '/'.
const { Router } = require('express');
const controller = require('../controllers/assinaturasController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/requireRole');
const asyncHandler = require('../utils/asyncHandler');

const router = Router();

router.get(
  '/contratos/:contratoId/assinaturas',
  authMiddleware,
  requireRole('equipe_programa', 'contabilidade', 'empresa_afiliada'),
  asyncHandler(controller.listarPorContrato)
);

router.patch(
  '/assinaturas/:id',
  authMiddleware,
  requireRole('equipe_programa'),
  asyncHandler(controller.atualizar)
);

module.exports = router;
