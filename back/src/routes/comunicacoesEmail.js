'use strict';

const { Router } = require('express');
const controller = require('../controllers/comunicacoesController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/requireRole');
const asyncHandler = require('../utils/asyncHandler');

const router = Router();

router.use(authMiddleware);
router.use(requireRole('equipe_programa'));

router.post('/rascunho', asyncHandler(controller.criarRascunho));
router.get('/', asyncHandler(controller.listar));
router.patch('/:id', asyncHandler(controller.editar));
router.post('/:id/aprovar', asyncHandler(controller.aprovar));
router.post('/:id/enviar', asyncHandler(controller.enviar));

module.exports = router;
