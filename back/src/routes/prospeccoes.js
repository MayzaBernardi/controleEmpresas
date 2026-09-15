'use strict';

const { Router } = require('express');
const controller = require('../controllers/prospeccaoController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/requireRole');
const asyncHandler = require('../utils/asyncHandler');

const router = Router();

router.use(authMiddleware);

router.get('/', requireRole('equipe_programa'), asyncHandler(controller.listar));
router.post('/', requireRole('equipe_programa'), asyncHandler(controller.criar));
router.patch('/:id', requireRole('equipe_programa'), asyncHandler(controller.atualizar));

module.exports = router;
