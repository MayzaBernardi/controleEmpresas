'use strict';

const { Router } = require('express');
const {
  listar,
  listarRenovacaoPendente,
  detalhar,
  gerar,
  atualizar,
  renovar,
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

module.exports = router;
