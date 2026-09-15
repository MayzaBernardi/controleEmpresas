'use strict';

const { Router } = require('express');
const controller = require('../controllers/planosController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/requireRole');
const asyncHandler = require('../utils/asyncHandler');

const router = Router();

router.use(authMiddleware);

router.get(
  '/',
  requireRole('equipe_programa', 'empresa_afiliada', 'contabilidade'),
  asyncHandler(controller.listar)
);
router.patch('/:id', requireRole('equipe_programa'), asyncHandler(controller.atualizar));

module.exports = router;
