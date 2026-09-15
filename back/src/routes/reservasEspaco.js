'use strict';

const { Router } = require('express');
const controller = require('../controllers/reservasEspacoController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/requireRole');
const asyncHandler = require('../utils/asyncHandler');

const router = Router();

router.use(authMiddleware);

router.get('/', requireRole('equipe_programa', 'empresa_afiliada'), asyncHandler(controller.listar));
router.post('/', requireRole('equipe_programa', 'empresa_afiliada'), asyncHandler(controller.criar));
router.patch('/:id', requireRole('equipe_programa'), asyncHandler(controller.atualizarStatus));

module.exports = router;
