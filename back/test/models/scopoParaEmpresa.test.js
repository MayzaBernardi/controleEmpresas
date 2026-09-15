"use strict";

// RN-33: isolamento de dados por perfil via scopes nomeados explícitos (`paraEmpresa`),
// definidos em Empresa, Contrato, Documento, FinanceiroLancamento e EspacoFisico
// (ADR 0004, seção 4). Aqui testamos o cenário realista de uso do scope — busca por
// PK/id, sem repetir `empresa_id`/`id` no `where` da mesma chamada — que é como o ADR
// e os controllers devem de fato usar o scope. NÃO testamos o caso em que a query
// repete a mesma chave do scope no `where` (esse comportamento de merge raso do
// Sequelize é uma pegadinha documentada como comentário nos 5 models, não um
// comportamento esperado/correto a ser validado como "certo").

const db = require("../support/db");
const { cnpjUnico, textoUnico, dataOffsetDias } = require("../support/factories");

const { Empresa, Contrato, Documento, FinanceiroLancamento, EspacoFisico, StatusContrato, StatusFinanceiro } = db;

let empresaA;
let empresaB;
let contratoA;
let contratoB;
let documentoA;
let documentoB;
let lancamentoA;
let lancamentoB;
let espacoA;
let espacoB;

beforeAll(async () => {
  [empresaA, empresaB] = await Promise.all([
    Empresa.create({
      razao_social: textoUnico("Empresa A (RN-33)"),
      tipo_empresa: "nacional",
      cnpj: cnpjUnico(),
    }),
    Empresa.create({
      razao_social: textoUnico("Empresa B (RN-33)"),
      tipo_empresa: "nacional",
      cnpj: cnpjUnico(),
    }),
  ]);

  const [statusContratoVigente, statusFinanceiroPendente] = await Promise.all([
    StatusContrato.findOne({ where: { codigo: "vigente" } }),
    StatusFinanceiro.findOne({ where: { codigo: "pendente" } }),
  ]);

  [contratoA, contratoB] = await Promise.all([
    Contrato.create({
      empresa_id: empresaA.id,
      data_inicio_vigencia: dataOffsetDias(-100),
      data_termino_vigencia: dataOffsetDias(265),
      status_contrato_id: statusContratoVigente.id,
      valor_anuidade: 1000,
    }),
    Contrato.create({
      empresa_id: empresaB.id,
      data_inicio_vigencia: dataOffsetDias(-100),
      data_termino_vigencia: dataOffsetDias(265),
      status_contrato_id: statusContratoVigente.id,
      valor_anuidade: 1000,
    }),
  ]);

  [documentoA, documentoB] = await Promise.all([
    Documento.create({
      empresa_id: empresaA.id,
      tipo_documento: "cnpj",
      nome_arquivo: "cnpj-empresa-a.pdf",
      url_arquivo: "https://example.com/empresa-a/cnpj.pdf",
    }),
    Documento.create({
      empresa_id: empresaB.id,
      tipo_documento: "cnpj",
      nome_arquivo: "cnpj-empresa-b.pdf",
      url_arquivo: "https://example.com/empresa-b/cnpj.pdf",
    }),
  ]);

  [lancamentoA, lancamentoB] = await Promise.all([
    FinanceiroLancamento.create({
      empresa_id: empresaA.id,
      valor: 500,
      data_vencimento: dataOffsetDias(15),
      status_financeiro_id: statusFinanceiroPendente.id,
    }),
    FinanceiroLancamento.create({
      empresa_id: empresaB.id,
      valor: 500,
      data_vencimento: dataOffsetDias(15),
      status_financeiro_id: statusFinanceiroPendente.id,
    }),
  ]);

  [espacoA, espacoB] = await Promise.all([
    EspacoFisico.create({
      empresa_id: empresaA.id,
      identificador_sala: "Sala A-1",
      data_inicio_ocupacao: dataOffsetDias(-200),
    }),
    EspacoFisico.create({
      empresa_id: empresaB.id,
      identificador_sala: "Sala B-1",
      data_inicio_ocupacao: dataOffsetDias(-200),
    }),
  ]);
});

afterAll(async () => {
  // Ordem respeita as FKs RESTRICT de contratos/financeiro_lancamentos para empresas.
  await FinanceiroLancamento.destroy({ where: { id: [lancamentoA.id, lancamentoB.id] } });
  await Documento.destroy({ where: { id: [documentoA.id, documentoB.id] } });
  await EspacoFisico.destroy({ where: { id: [espacoA.id, espacoB.id] } });
  await Contrato.destroy({ where: { id: [contratoA.id, contratoB.id] } });
  await Empresa.destroy({ where: { id: [empresaA.id, empresaB.id] } });
  await db.sequelize.close();
});

describe("Empresa.scope('paraEmpresa') (RN-33)", () => {
  // O scope de Empresa filtra pela própria PK (`id`), a mesma chave que `findByPk` injeta
  // internamente (`where: { id: pk }`). Isso faria o `where` do findByPk sobrescrever o do
  // scope num merge raso — por isso o scope embrulha o filtro em `Op.and` (ver Empresa.js),
  // que usa uma chave própria e nunca colide, garantindo AND real mesmo com findByPk.
  test("empresa A não enxerga a empresa B pelo scope", async () => {
    const resultado = await Empresa.scope({ method: ["paraEmpresa", empresaA.id] }).findByPk(empresaB.id);
    expect(resultado).toBeNull();
  });

  test("empresa B enxerga a si mesma pelo scope", async () => {
    const resultado = await Empresa.scope({ method: ["paraEmpresa", empresaB.id] }).findByPk(empresaB.id);
    expect(resultado).not.toBeNull();
    expect(resultado.id).toBe(empresaB.id);
  });
});

describe("Contrato.scope('paraEmpresa') (RN-33)", () => {
  test("empresa A não enxerga o contrato da empresa B pelo scope", async () => {
    const resultado = await Contrato.scope({ method: ["paraEmpresa", empresaA.id] }).findByPk(contratoB.id);
    expect(resultado).toBeNull();
  });

  test("empresa B enxerga o próprio contrato pelo scope", async () => {
    const resultado = await Contrato.scope({ method: ["paraEmpresa", empresaB.id] }).findByPk(contratoB.id);
    expect(resultado).not.toBeNull();
    expect(resultado.id).toBe(contratoB.id);
  });
});

describe("Documento.scope('paraEmpresa') (RN-33)", () => {
  test("empresa A não enxerga o documento da empresa B pelo scope", async () => {
    const resultado = await Documento.scope({ method: ["paraEmpresa", empresaA.id] }).findByPk(documentoB.id);
    expect(resultado).toBeNull();
  });

  test("empresa B enxerga o próprio documento pelo scope", async () => {
    const resultado = await Documento.scope({ method: ["paraEmpresa", empresaB.id] }).findByPk(documentoB.id);
    expect(resultado).not.toBeNull();
    expect(resultado.id).toBe(documentoB.id);
  });
});

describe("FinanceiroLancamento.scope('paraEmpresa') (RN-33)", () => {
  test("empresa A não enxerga o lançamento financeiro da empresa B pelo scope", async () => {
    const resultado = await FinanceiroLancamento.scope({ method: ["paraEmpresa", empresaA.id] }).findByPk(lancamentoB.id);
    expect(resultado).toBeNull();
  });

  test("empresa B enxerga o próprio lançamento financeiro pelo scope", async () => {
    const resultado = await FinanceiroLancamento.scope({ method: ["paraEmpresa", empresaB.id] }).findByPk(lancamentoB.id);
    expect(resultado).not.toBeNull();
    expect(resultado.id).toBe(lancamentoB.id);
  });
});

describe("EspacoFisico.scope('paraEmpresa') (RN-33)", () => {
  test("empresa A não enxerga o espaço físico da empresa B pelo scope", async () => {
    const resultado = await EspacoFisico.scope({ method: ["paraEmpresa", empresaA.id] }).findByPk(espacoB.id);
    expect(resultado).toBeNull();
  });

  test("empresa B enxerga o próprio espaço físico pelo scope", async () => {
    const resultado = await EspacoFisico.scope({ method: ["paraEmpresa", empresaB.id] }).findByPk(espacoB.id);
    expect(resultado).not.toBeNull();
    expect(resultado.id).toBe(espacoB.id);
  });
});
