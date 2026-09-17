'use strict';

const authService = require('../services/authService');
const ApiError = require('../utils/ApiError');
const { NODE_ENV } = require('../config/env');

/**
 * Atalho de desenvolvimento/teste manual (Postman): emite um token válido para um usuário
 * já existente na base, por e-mail, sem exigir senha. Recusado com 404 em produção — útil
 * pra testar rápido sem depender de uma senha já ter sido definida pra aquele usuário.
 */
exports.devLogin = async (req, res) => {
  try {
    if (NODE_ENV === 'production') {
      return res.status(404).json({ error: 'Rota não encontrada' });
    }

    const resultado = await authService.emitirTokenDev(req.body.email);
    return res.status(200).json(resultado);
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Login real (e-mail + senha, RN-02 revisado — ver docs/decisoes/0003).
exports.login = async (req, res) => {
  try {
    const resultado = await authService.login(req.body.email, req.body.senha);
    return res.status(200).json(resultado);
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
