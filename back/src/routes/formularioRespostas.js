'use strict';

const { Router } = require('express');
const { submeter, listar, detalhar, triar } = require('../controllers/formularioController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/requireRole');

const router = Router();

// RN-04: rota PÚBLICA — ponto de entrada do processo de afiliação, antes de existir
// qualquer usuário/sessão. Não passa por authMiddleware.
router.post('/', submeter);

router.get('/', authMiddleware, requireRole('equipe_programa'), listar);

router.get('/:id', authMiddleware, requireRole('equipe_programa'), detalhar);

router.patch('/:id/triagem', authMiddleware, requireRole('equipe_programa'), triar);

module.exports = router;
