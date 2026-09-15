'use strict';

const { Router } = require('express');
const authController = require('../controllers/authController');
const asyncHandler = require('../utils/asyncHandler');

const router = Router();

router.post('/dev-login', asyncHandler(authController.devLogin));

module.exports = router;
