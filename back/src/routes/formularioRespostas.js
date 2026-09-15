'use strict';

const { Router } = require('express');
const controller = require('../controllers/formularioController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/requireRole');
const asyncHandler = require('../utils/asyncHandler');

const router = Router();

// RN-04: rota PÚBLICA — ponto de entrada do processo de afiliação, antes de existir
// qualquer usuário/sessão. Não passa por authMiddleware.
router.post('/', asyncHandler(controller.submeter));

router.get('/', authMiddleware, requireRole('equipe_programa'), asyncHandler(controller.listar));
router.get('/:id', authMiddleware, requireRole('equipe_programa'), asyncHandler(controller.detalhar));
router.patch('/:id/triagem', authMiddleware, requireRole('equipe_programa'), asyncHandler(controller.triar));

module.exports = router;
