'use strict';

const { Router } = require('express');
const { listar, criar, atualizarStatus } = require('../controllers/reservasEspacoController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/requireRole');

const router = Router();

router.get('/', authMiddleware, requireRole('equipe_programa', 'empresa_afiliada'), listar);

router.post('/', authMiddleware, requireRole('equipe_programa', 'empresa_afiliada'), criar);

router.patch('/:id', authMiddleware, requireRole('equipe_programa'), atualizarStatus);

module.exports = router;
