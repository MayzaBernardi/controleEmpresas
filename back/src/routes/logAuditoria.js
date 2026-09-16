'use strict';

const { Router } = require('express');
const { listar } = require('../controllers/auditoriaController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/requireRole');

const router = Router();

router.get('/', authMiddleware, requireRole('equipe_programa'), listar);

module.exports = router;
