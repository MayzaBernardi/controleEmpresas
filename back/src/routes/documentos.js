'use strict';

const { Router } = require('express');
const { listar, upload, atualizar } = require('../controllers/documentosController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/requireRole');

const router = Router();

router.get('/', authMiddleware, requireRole('equipe_programa', 'empresa_afiliada', 'contabilidade'), listar);

router.post('/', authMiddleware, requireRole('equipe_programa', 'empresa_afiliada'), upload);

router.patch('/:id', authMiddleware, requireRole('equipe_programa'), atualizar);

module.exports = router;
