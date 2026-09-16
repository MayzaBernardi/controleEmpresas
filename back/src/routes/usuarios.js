'use strict';

const { Router } = require('express');
const { listar, atualizar } = require('../controllers/usuariosController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/requireRole');

const router = Router();

router.get('/', authMiddleware, requireRole('equipe_programa'), listar);

router.patch('/:id', authMiddleware, requireRole('equipe_programa'), atualizar);

module.exports = router;
