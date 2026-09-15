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
};
