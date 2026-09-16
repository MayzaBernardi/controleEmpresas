'use strict';

const { Router } = require('express');
const {
  listar,
  minhaEmpresa,
  detalhar,
  criar,
  atualizar,
  atualizarStatusProcesso,
} = require('../controllers/empresasController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/requireRole');

const router = Router();

router.get('/me', authMiddleware, requireRole('empresa_afiliada'), minhaEmpresa);

router.get('/', authMiddleware, requireRole('equipe_programa', 'contabilidade'), listar);

router.get('/:id', authMiddleware, requireRole('equipe_programa', 'contabilidade'), detalhar);

router.post('/', authMiddleware, requireRole('equipe_programa'), criar);

router.patch('/:id', authMiddleware, requireRole('equipe_programa'), atualizar);

router.patch(
  '/:id/status-processo',
  authMiddleware,
  requireRole('equipe_programa'),
  atualizarStatusProcesso
);

module.exports = router;
