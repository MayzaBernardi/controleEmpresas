const { Router } = require('express');

const routes = Router();

routes.get('/', (req, res) => {
  res.json({ message: 'API rodando com sucesso!' });
});

routes.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

module.exports = routes;
