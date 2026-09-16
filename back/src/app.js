const express = require('express');
const cors = require('cors');

const routes = require('./routes');

const app = express();

app.use(cors());
// Limite elevado pra caber upload de contrato/documento (PNG/PDF) em base64 direto no
// body — front aplica um teto de ~8MB por arquivo antes de enviar (ver front/src/lib/arquivo.ts).
app.use(express.json({ limit: '15mb' }));

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
