'use strict';

const { Router } = require('express');
const controller = require('../controllers/auditoriaController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/requireRole');
const asyncHandler = require('../utils/asyncHandler');

const router = Router();

router.use(authMiddleware);
router.use(requireRole('equipe_programa'));

router.get('/', asyncHandler(controller.listar));

module.exports = router;
