'use strict';

const { Router } = require('express');
const {
  listar,
  listarRenovacaoPendente,
  detalhar,
  gerar,
  atualizar,
  renovar,
  emitir,
  marcarVigente,
} = require('../controllers/contratosController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/requireRole');

const router = Router();

// Precisa vir antes de '/:id' — senão "renovacao-pendente" seria capturado como :id.
router.get(
  '/renovacao-pendente',
  authMiddleware,
  requireRole('equipe_programa'),
  listarRenovacaoPendente
);

router.get(
  '/',
  authMiddleware,
  requireRole('equipe_programa', 'contabilidade', 'empresa_afiliada'),
  listar
);

router.get(
  '/:id',
  authMiddleware,
  requireRole('equipe_programa', 'contabilidade', 'empresa_afiliada'),
  detalhar
);

router.post('/', authMiddleware, requireRole('equipe_programa'), gerar);

router.patch('/:id', authMiddleware, requireRole('equipe_programa'), atualizar);

router.post('/:id/renovar', authMiddleware, requireRole('equipe_programa'), renovar);

router.post('/:id/emitir', authMiddleware, requireRole('equipe_programa'), emitir);

router.patch('/:id/vigente', authMiddleware, requireRole('equipe_programa', 'contabilidade'), marcarVigente);

module.exports = router;
