"use strict";

// Carrega dotenv antes de qualquer leitura de variável de ambiente.
// Necessário porque o sequelize-cli usa este arquivo diretamente.
require("dotenv").config();

const dbConfig = {
  username: process.env.POSTGRES_USERNAME,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT) || 5432,
  dialect: "postgres",
  schema: process.env.POSTGRES_SCHEMA || "public",
  define: {
    underscored: true, // snake_case em colunas por padrão
    timestamps: true, // created_at, updated_at automáticos
    freezeTableName: false, // Sequelize pluraliza o nome da tabela
  },
  dialectOptions: {
    // Ativa suporte ao tipo UUID nativo do Postgres
    decimalNumbers: true,
  },
  logging: process.env.NODE_ENV === "development" ? console.log : false,
};

// O sequelize-cli lê esta estrutura por ambiente
module.exports = {
  development: dbConfig,
  test: dbConfig,
  production: {
    ...dbConfig,
    logging: false,
    pool: { max: 10, min: 2, acquire: 30000, idle: 10000 },
  },
};
