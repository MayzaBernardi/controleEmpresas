'use strict';

const { Router } = require('express');
const controller = require('../controllers/espacosFisicosController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/requireRole');
const asyncHandler = require('../utils/asyncHandler');

const router = Router();

router.use(authMiddleware);

router.get('/', requireRole('equipe_programa', 'empresa_afiliada'), asyncHandler(controller.listar));

module.exports = router;
