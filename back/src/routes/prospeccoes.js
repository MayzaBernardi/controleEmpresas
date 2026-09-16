'use strict';

const { Router } = require('express');
const { listar, criar, atualizar, listarStatusDisponiveis } = require('../controllers/prospeccaoController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/requireRole');

const router = Router();

// Precisa vir antes de '/:id' — senão "status-disponiveis" seria capturado como :id (mas
// como hoje não existe GET '/:id' aqui, é só uma questão de robustez a futuro).
router.get('/status-disponiveis', authMiddleware, requireRole('equipe_programa'), listarStatusDisponiveis);

router.get('/', authMiddleware, requireRole('equipe_programa'), listar);

router.post('/', authMiddleware, requireRole('equipe_programa'), criar);

router.patch('/:id', authMiddleware, requireRole('equipe_programa'), atualizar);

module.exports = router;
