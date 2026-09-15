'use strict';

const { Router } = require('express');
const controller = require('../controllers/usuariosController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/requireRole');
const asyncHandler = require('../utils/asyncHandler');

const router = Router();

router.use(authMiddleware);
router.use(requireRole('equipe_programa'));

router.get('/', asyncHandler(controller.listar));
router.patch('/:id', asyncHandler(controller.atualizar));

module.exports = router;
