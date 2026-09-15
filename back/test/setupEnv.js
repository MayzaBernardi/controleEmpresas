"use strict";

// Jest setupFiles: roda dentro de CADA arquivo de teste, antes do módulo do teste
// ser carregado — portanto antes de `require('../../src/models')` disparar
// `require('dotenv').config()` em src/config/database.js. Como dotenv, por padrão,
// não sobrescreve variáveis de ambiente já definidas, fixar POSTGRES_DB aqui garante
// que os models de produção conectem no banco de teste isolado, e não no
// `pollen_parque` de desenvolvimento (com os 15 afiliados de seed).

process.env.NODE_ENV = "test";
process.env.POSTGRES_DB = require("./support/testDbName");
