"use strict";

require("dotenv").config();

const REQUIRED = [
  "POSTGRES_HOST",
  "POSTGRES_PORT",
  "POSTGRES_DB",
  "POSTGRES_USERNAME",
  "POSTGRES_PASSWORD",
  "AUTH_SECRET",
];

const missing = REQUIRED.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(
    `Variáveis de ambiente obrigatórias ausentes: ${missing.join(", ")}. ` +
      "Copie back/.env.example para back/.env e preencha os valores.",
  );
}

// Guarda de produção — recusa subir com um segredo de dev (ex.: alguém copiou o .env de
// desenvolvimento direto pro servidor por engano) ou sem CORS restrito a um domínio real.
// Só roda quando NODE_ENV=production; em desenvolvimento/teste segue permissivo como antes.
const AUTH_SECRET_DEV_CONHECIDO = "dev-secret-local-only-nao-usar-em-producao";
if ((process.env.NODE_ENV || "development") === "production") {
  const erros = [];
  if (
    !process.env.AUTH_SECRET ||
    process.env.AUTH_SECRET === AUTH_SECRET_DEV_CONHECIDO ||
    process.env.AUTH_SECRET.length < 32
  ) {
    erros.push(
      "AUTH_SECRET precisa ser um valor forte e exclusivo de produção (não o valor de " +
        "desenvolvimento, mínimo 32 caracteres). Gere um novo com: openssl rand -hex 32"
    );
  }
  if (!process.env.CORS_ORIGIN) {
    erros.push(
      "CORS_ORIGIN é obrigatório em produção — defina o(s) domínio(s) do front autorizados " +
        "a chamar esta API, separados por vírgula (ex.: https://app.pollenparque.org.br)."
    );
  }
  if (erros.length > 0) {
    throw new Error(`Configuração insegura para produção:\n- ${erros.join("\n- ")}`);
  }
}

module.exports = {
  API_PORT: process.env.API_PORT || "3000",
  API_HOST: process.env.API_HOST || "0.0.0.0",
  NODE_ENV: process.env.NODE_ENV || "development",

  DB: {
    host: process.env.POSTGRES_HOST,
    port: Number(process.env.POSTGRES_PORT),
    name: process.env.POSTGRES_DB,
    username: process.env.POSTGRES_USERNAME,
    password: process.env.POSTGRES_PASSWORD,
    schema: process.env.POSTGRES_SCHEMA || "public",
  },

  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  AUTH_SECRET: process.env.AUTH_SECRET,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
};
