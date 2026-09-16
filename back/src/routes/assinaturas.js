'use strict';

// Router de caminho completo: montado na raiz (sem prefixo), junto com o de contratos —
// por isso cada rota declara o path inteiro, e não '/'.
const { Router } = require('express');
const { listarPorContrato, atualizar } = require('../controllers/assinaturasController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/requireRole');

const router = Router();

router.get(
  '/contratos/:contratoId/assinaturas',
  authMiddleware,
  requireRole('equipe_programa', 'contabilidade', 'empresa_afiliada'),
  listarPorContrato
);

router.patch('/assinaturas/:id', authMiddleware, requireRole('equipe_programa'), atualizar);

module.exports = router;
