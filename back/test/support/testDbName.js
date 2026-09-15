"use strict";

// Nome do banco de dados isolado usado exclusivamente pela suíte de testes (Jest).
// Nunca deve ser igual ao POSTGRES_DB de desenvolvimento (`pollen_parque`), para não
// tocar nos dados de seed usados manualmente durante o desenvolvimento.
module.exports = "pollen_parque_test";
