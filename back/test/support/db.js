"use strict";

// Ponto único de acesso aos models de PRODUÇÃO (back/src/models/index.js) a partir
// dos testes. Nenhum model é mockado — os testes rodam contra o Postgres real de
// teste (pollen_parque_test), já migrado por test/globalSetup.js. Reexportamos o
// mesmo `db` (models + instância `sequelize`) que a aplicação usa, para exercitar
// exatamente o código de produção que este agente construiu.
module.exports = require("../../src/models");
