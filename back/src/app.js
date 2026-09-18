const express = require('express');
const cors = require('cors');

const routes = require('./routes');
const { CORS_ORIGIN } = require('./config/env');

const app = express();

// Em produção, CORS_ORIGIN é obrigatório (validado em config/env.js) e restringe a API ao(s)
// domínio(s) do front. Em desenvolvimento, sem CORS_ORIGIN definido, mantém o comportamento
// permissivo de sempre (aceita qualquer origem — conveniente pra rodar front/back em portas
// locais distintas sem configurar nada).
const origensPermitidas = CORS_ORIGIN
  ? CORS_ORIGIN.split(',').map((origem) => origem.trim()).filter(Boolean)
  : undefined;
app.use(cors(origensPermitidas ? { origin: origensPermitidas } : undefined));
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
