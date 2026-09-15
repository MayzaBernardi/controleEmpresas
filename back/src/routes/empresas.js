'use strict';

const { Router } = require('express');
const controller = require('../controllers/empresasController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/requireRole');
const asyncHandler = require('../utils/asyncHandler');

const router = Router();

router.use(authMiddleware);

router.get('/me', requireRole('empresa_afiliada'), asyncHandler(controller.minhaEmpresa));
router.get('/', requireRole('equipe_programa', 'contabilidade'), asyncHandler(controller.listar));
router.get('/:id', requireRole('equipe_programa', 'contabilidade'), asyncHandler(controller.detalhar));
router.post('/', requireRole('equipe_programa'), asyncHandler(controller.criar));
router.patch('/:id', requireRole('equipe_programa'), asyncHandler(controller.atualizar));
router.patch('/:id/status-processo', requireRole('equipe_programa'), asyncHandler(controller.atualizarStatusProcesso));

module.exports = router;
