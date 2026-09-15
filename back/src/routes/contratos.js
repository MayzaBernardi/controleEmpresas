'use strict';

const { Router } = require('express');
const controller = require('../controllers/contratosController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/requireRole');
const asyncHandler = require('../utils/asyncHandler');

const router = Router();

router.use(authMiddleware);

// Precisa vir antes de '/:id' — senão "renovacao-pendente" seria capturado como :id.
router.get(
  '/renovacao-pendente',
  requireRole('equipe_programa'),
  asyncHandler(controller.listarRenovacaoPendente)
);

router.get(
  '/',
  requireRole('equipe_programa', 'contabilidade', 'empresa_afiliada'),
  asyncHandler(controller.listar)
);
router.get(
  '/:id',
  requireRole('equipe_programa', 'contabilidade', 'empresa_afiliada'),
  asyncHandler(controller.detalhar)
);
router.post('/', requireRole('equipe_programa'), asyncHandler(controller.gerar));
router.patch('/:id', requireRole('equipe_programa'), asyncHandler(controller.atualizar));
router.post('/:id/renovar', requireRole('equipe_programa'), asyncHandler(controller.renovar));

module.exports = router;
