'use strict';

const { Router } = require('express');
const {
  listar,
  listarAtrasados,
  lancar,
  confirmarPagamento,
} = require('../controllers/financeiroController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/requireRole');

const router = Router();

// Precisa vir antes de qualquer rota '/:id' — senão "atrasados" seria capturado como :id.
router.get(
  '/atrasados',
  authMiddleware,
  requireRole('equipe_programa', 'contabilidade'),
  listarAtrasados
);

router.get(
  '/',
  authMiddleware,
  requireRole('equipe_programa', 'contabilidade', 'empresa_afiliada'),
  listar
);

router.post('/', authMiddleware, requireRole('contabilidade'), lancar);

router.patch('/:id/pagamento', authMiddleware, requireRole('contabilidade'), confirmarPagamento);

module.exports = router;
