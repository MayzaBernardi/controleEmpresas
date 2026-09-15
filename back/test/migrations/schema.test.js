"use strict";

// Sanity check leve sobre as 12 migrations (item 8 do escopo): confirma que a suíte
// está mesmo rodando contra um banco `pollen_parque_test` com o schema real aplicado
// por `test/globalSetup.js` (sequelize-cli db:migrate usando as migrations de
// produção em back/src/migrations), e não contra um banco vazio/errado. Os testes de
// model acima já exercitam esse schema em profundidade; este teste só garante que as
// 13 tabelas esperadas existem (12 migrations — a primeira cria duas tabelas de referência).

const db = require("../support/db");

afterAll(async () => {
  await db.sequelize.close();
});

const TABELAS_ESPERADAS = [
  "status_contrato",
  "status_financeiro",
  "empresas",
  "usuarios",
  "formulario_respostas",
  "espacos_fisicos",
  "contratos",
  "assinaturas",
  "documentos",
  "financeiro_lancamentos",
  "comunicacoes_email",
  "comunicacoes_destinatarios",
  "log_auditoria",
];

describe("Migrations — schema aplicado no banco de teste", () => {
  test("as 13 tabelas de negócio criadas pelas migrations existem no banco", async () => {
    const tabelas = await db.sequelize.getQueryInterface().showAllTables();
    // Alguns dialetos/versões retornam objetos { tableName } em vez de strings puras.
    const nomes = tabelas.map((t) => (typeof t === "string" ? t : t.tableName));

    for (const tabela of TABELAS_ESPERADAS) {
      expect(nomes).toContain(tabela);
    }
  });

  test("tabelas de referência status_contrato/status_financeiro vieram populadas pelo seed da migration", async () => {
    const { StatusContrato, StatusFinanceiro } = db;

    const codigosContrato = (await StatusContrato.findAll()).map((s) => s.codigo).sort();
    const codigosFinanceiro = (await StatusFinanceiro.findAll()).map((s) => s.codigo).sort();

    expect(codigosContrato).toEqual(
      ["elaboracao", "em_assinatura", "encerrado", "renovacao_pendente", "rescindido", "vigente"].sort()
    );
    expect(codigosFinanceiro).toEqual(["atrasado", "cancelado", "pago", "pendente"].sort());
  });
});
