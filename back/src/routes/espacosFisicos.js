'use strict';

const { Router } = require('express');
const { listar } = require('../controllers/espacosFisicosController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/requireRole');

const router = Router();

router.get('/', authMiddleware, requireRole('equipe_programa', 'empresa_afiliada'), listar);

module.exports = router;
