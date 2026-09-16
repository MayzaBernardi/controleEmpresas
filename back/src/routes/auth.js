'use strict';

const { Router } = require('express');
const { devLogin } = require('../controllers/authController');

const router = Router();

router.post('/dev-login', devLogin);

module.exports = router;
