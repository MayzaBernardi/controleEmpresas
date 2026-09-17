'use strict';

const { Router } = require('express');
const { devLogin, login } = require('../controllers/authController');

const router = Router();

router.post('/login', login);

router.post('/dev-login', devLogin);

module.exports = router;
