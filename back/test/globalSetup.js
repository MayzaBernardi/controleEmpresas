"use strict";

// Jest globalSetup: roda UMA vez, em um processo Node separado, antes de qualquer
// arquivo de teste ser carregado. Aqui garantimos que existe um banco de dados
// Postgres isolado (`pollen_parque_test`, nunca o `pollen_parque` de desenvolvimento)
// e que as migrations REAIS de produção (back/src/migrations) foram aplicadas nele —
// sem alterar nenhum arquivo de src/config, src/migrations, src/models ou src/seeders.
//
// O banco é recriado do zero a cada execução (`npm test`) para garantir suítes
// determinísticas, mesmo que uma execução anterior tenha sido interrompida no meio.

const path = require("path");
const { execFileSync } = require("child_process");
const { Client } = require("pg");

require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

const TEST_DB_NAME = require("./support/testDbName");
const BACK_DIR = path.resolve(__dirname, "..");

module.exports = async function globalSetup() {
  const adminClient = new Client({
    host: process.env.POSTGRES_HOST,
    port: Number(process.env.POSTGRES_PORT) || 5432,
    user: process.env.POSTGRES_USERNAME,
    password: process.env.POSTGRES_PASSWORD,
    // Conecta no banco de manutenção `postgres`, que sempre existe, para poder
    // recriar `pollen_parque_test` do zero (não dá para DROP/CREATE DATABASE
    // estando conectado ao próprio banco que se quer recriar).
    database: "postgres",
  });

  await adminClient.connect();
  try {
    // Encerra conexões residuais de uma execução anterior interrompida, se houver.
    await adminClient.query(
      `SELECT pg_terminate_backend(pid)
       FROM pg_stat_activity
       WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [TEST_DB_NAME]
    );
    await adminClient.query(`DROP DATABASE IF EXISTS "${TEST_DB_NAME}"`);
    await adminClient.query(
      `CREATE DATABASE "${TEST_DB_NAME}" OWNER "${process.env.POSTGRES_USERNAME}"`
    );
  } finally {
    await adminClient.end();
  }

  // Aplica as migrations reais de produção (sequelize-cli lê back/.sequelizerc e
  // back/src/config/database.js) contra o banco de teste isolado, via override
  // de POSTGRES_DB/NODE_ENV só para este processo filho.
  execFileSync("npx", ["sequelize-cli", "db:migrate"], {
    cwd: BACK_DIR,
    env: { ...process.env, NODE_ENV: "test", POSTGRES_DB: TEST_DB_NAME },
    stdio: "inherit",
  });
};
