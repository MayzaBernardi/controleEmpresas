'use strict';

const { Router } = require('express');
const { listar, atualizar, criar } = require('../controllers/usuariosController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/requireRole');

const router = Router();

router.get('/', authMiddleware, requireRole('equipe_programa'), listar);

router.post('/', authMiddleware, requireRole('equipe_programa'), criar);

router.patch('/:id', authMiddleware, requireRole('equipe_programa'), atualizar);

module.exports = router;
