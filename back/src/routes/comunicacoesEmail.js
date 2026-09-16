'use strict';

const { Router } = require('express');
const {
  criarRascunho,
  listar,
  editar,
  aprovar,
  enviar,
} = require('../controllers/comunicacoesController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/requireRole');

const router = Router();

router.post('/rascunho', authMiddleware, requireRole('equipe_programa'), criarRascunho);

router.get('/', authMiddleware, requireRole('equipe_programa'), listar);

router.patch('/:id', authMiddleware, requireRole('equipe_programa'), editar);

router.post('/:id/aprovar', authMiddleware, requireRole('equipe_programa'), aprovar);

router.post('/:id/enviar', authMiddleware, requireRole('equipe_programa'), enviar);

module.exports = router;
