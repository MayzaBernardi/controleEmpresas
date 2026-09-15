"use strict";

// Sanity check leve sobre as 12 migrations incrementais do ADR 0005
// (back/src/migrations/20260915020001-*.js a 20260915020012-*.js): confirma que as
// tabelas/colunas novas existem no banco de teste (aplicado via test/globalSetup.js,
// que roda as migrations reais de produção) e, principalmente, que NADA da etapa
// anterior (ADR 0004) foi removido — a coluna antiga `empresas.status_processo` e a
// tabela `espacos_fisicos` devem continuar existindo intactas, já que a regra desta
// etapa proíbe DROP TABLE/DROP COLUMN (ADR 0005, regra de segurança #3).
//
// Este arquivo cobre só schema (DDL) — o comportamento de RN-34/RN-35/RN-36 em si já
// está coberto por test/models/Contrato.isencaoTaxa.test.js e
// test/services/{reservaEspacoService,prospeccaoService}.test.js.

const db = require("../support/db");

afterAll(async () => {
  await db.sequelize.close();
});

const TABELAS_NOVAS_ESPERADAS = [
  "planos_afiliacao",
  "status_prospeccao",
  "prospeccoes",
  "status_processo",
  "beneficios_exposicao",
  "reservas_espaco",
];

describe("Migrations ADR 0005 — tabelas novas existem no banco de teste", () => {
  test("as 6 tabelas novas criadas pelas migrations do ADR 0005 existem", async () => {
    const tabelas = await db.sequelize.getQueryInterface().showAllTables();
    const nomes = tabelas.map((t) => (typeof t === "string" ? t : t.tableName));

    for (const tabela of TABELAS_NOVAS_ESPERADAS) {
      expect(nomes).toContain(tabela);
    }
  });
});

describe("Migrations ADR 0005 — colunas novas em contratos", () => {
  test("contratos ganhou plano_id e as 5 colunas de isenção de taxa (RN-34)", async () => {
    const colunas = await db.sequelize.getQueryInterface().describeTable("contratos");

    expect(colunas).toHaveProperty("plano_id");
    expect(colunas).toHaveProperty("isento_taxa");
    expect(colunas).toHaveProperty("motivo_isencao");
    expect(colunas).toHaveProperty("documento_referencia");
    expect(colunas).toHaveProperty("isencao_inicio");
    expect(colunas).toHaveProperty("isencao_fim");

    expect(colunas.isento_taxa.allowNull).toBe(false);
  });
});

describe("Migrations ADR 0005 — colunas novas em empresas, sem remover as antigas", () => {
  test("empresas ganhou status_processo_id, telefone, cidade, uf, representante_legal", async () => {
    const colunas = await db.sequelize.getQueryInterface().describeTable("empresas");

    expect(colunas).toHaveProperty("status_processo_id");
    expect(colunas).toHaveProperty("telefone");
    expect(colunas).toHaveProperty("cidade");
    expect(colunas).toHaveProperty("uf");
    expect(colunas).toHaveProperty("representante_legal");
  });

  test("a coluna antiga empresas.status_processo (texto livre, ADR 0004) continua existindo intacta", async () => {
    const colunas = await db.sequelize.getQueryInterface().describeTable("empresas");

    expect(colunas).toHaveProperty("status_processo");
    expect(colunas.status_processo.allowNull).toBe(false);
  });
});

describe("Migrations ADR 0005 — espacos_fisicos (ADR 0004) não foi removida nem substituída", () => {
  test("a tabela espacos_fisicos continua existindo, sem uso em código novo (ADR 0005 §6)", async () => {
    const tabelas = await db.sequelize.getQueryInterface().showAllTables();
    const nomes = tabelas.map((t) => (typeof t === "string" ? t : t.tableName));

    expect(nomes).toContain("espacos_fisicos");
  });
});

describe("Migrations ADR 0005 — tabelas de referência novas vieram populadas pelo seed da migration", () => {
  test("status_prospeccao tem os 5 códigos esperados", async () => {
    const { StatusProspeccao } = db;
    const codigos = (await StatusProspeccao.findAll()).map((s) => s.codigo).sort();

    expect(codigos).toEqual(
      ["identificado", "material_enviado", "aguardando_retorno", "convertido_para_formulario", "descartado"].sort()
    );
  });

  test("status_processo tem os 8 estágios do funil, na ordem certa (coluna `ordem`)", async () => {
    const { StatusProcesso } = db;
    const registros = await StatusProcesso.findAll({ order: [["ordem", "ASC"]] });

    expect(registros.map((s) => s.codigo)).toEqual([
      "aguardando_envio_documentos",
      "contrato_elaborado_encaminhado_assinatura",
      "aguardando_assinatura_contrato",
      "aguardando_pagamento_boleto",
      "afiliada_ativa",
      "renovacao_pendente",
      "inadimplente",
      "encerrada",
    ]);
  });
});
