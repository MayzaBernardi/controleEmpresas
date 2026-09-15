'use strict';

const { Router } = require('express');
const controller = require('../controllers/financeiroController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/requireRole');
const asyncHandler = require('../utils/asyncHandler');

const router = Router();

router.use(authMiddleware);

// Precisa vir antes de qualquer rota '/:id' — senão "atrasados" seria capturado como :id.
router.get(
  '/atrasados',
  requireRole('equipe_programa', 'contabilidade'),
  asyncHandler(controller.listarAtrasados)
);

router.get(
  '/',
  requireRole('equipe_programa', 'contabilidade', 'empresa_afiliada'),
  asyncHandler(controller.listar)
);
router.post('/', requireRole('contabilidade'), asyncHandler(controller.lancar));
router.patch('/:id/pagamento', requireRole('contabilidade'), asyncHandler(controller.confirmarPagamento));

module.exports = router;
