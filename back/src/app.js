const express = require('express');
const cors = require('cors');

const routes = require('./routes');

const app = express();

app.use(cors());
app.use(express.json());

app.use(routes);

app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.status || 500;
  const mensagem = status === 500 ? 'Erro interno do servidor' : err.message;
  res.status(status).json({ error: mensagem });
});

module.exports = app;
