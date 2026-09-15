"use strict";

const db = require("../support/db");
const { cnpjUnico, textoUnico, dataOffsetDias } = require("../support/factories");

const { Empresa, Contrato, StatusContrato } = db;

let empresa;
let statusVigenteId;
const contratosCriadosIds = [];

beforeAll(async () => {
  empresa = await Empresa.create({
    razao_social: textoUnico("Empresa Para Contrato"),
    tipo_empresa: "nacional",
    cnpj: cnpjUnico(),
  });

  const statusVigente = await StatusContrato.findOne({ where: { codigo: "vigente" } });
  statusVigenteId = statusVigente.id;
});

afterAll(async () => {
  await Contrato.destroy({ where: { id: contratosCriadosIds } });
  await empresa.destroy();
  await db.sequelize.close();
});

function criarContrato(overrides = {}) {
  return Contrato.create({
    empresa_id: empresa.id,
    data_inicio_vigencia: dataOffsetDias(-365),
    data_termino_vigencia: dataOffsetDias(10),
    status_contrato_id: statusVigenteId,
    valor_anuidade: 1200.0,
    ...overrides,
  }).then((contrato) => {
    contratosCriadosIds.push(contrato.id);
    return contrato;
  });
}

describe("Contrato — getters virtuais estaVencido / estaProximoVencimento (RN-30)", () => {
  // As datas de teste usam offsets bem afastados das fronteiras (hoje / hoje+60 dias)
  // propositalmente — ver observação sobre o bug de fuso horário nesses getters
  // relatado na resposta final desta tarefa.

  test("RN-30: estaVencido = true quando data_termino_vigencia está claramente no passado", async () => {
    const contrato = await criarContrato({
      data_termino_vigencia: dataOffsetDias(-10),
    });

    expect(contrato.estaVencido).toBe(true);
  });

  test("RN-30: estaVencido = false quando data_termino_vigencia está claramente no futuro", async () => {
    const contrato = await criarContrato({
      data_termino_vigencia: dataOffsetDias(10),
    });

    expect(contrato.estaVencido).toBe(false);
  });

  test("RN-30: estaProximoVencimento = true quando data_termino_vigencia está dentro da janela de 60 dias", async () => {
    const contrato = await criarContrato({
      data_termino_vigencia: dataOffsetDias(30),
    });

    expect(contrato.estaProximoVencimento).toBe(true);
    expect(contrato.estaVencido).toBe(false);
  });

  test("RN-30: estaProximoVencimento = false quando data_termino_vigencia está fora da janela de 60 dias", async () => {
    const contrato = await criarContrato({
      data_termino_vigencia: dataOffsetDias(90),
    });

    expect(contrato.estaProximoVencimento).toBe(false);
  });

  test("RN-30: estaProximoVencimento = false quando o contrato já está vencido (não é 'próximo')", async () => {
    const contrato = await criarContrato({
      data_termino_vigencia: dataOffsetDias(-10),
    });

    expect(contrato.estaProximoVencimento).toBe(false);
  });

  test("RN-30: os getters virtuais nunca são persistidos como coluna no banco", async () => {
    const contrato = await criarContrato({
      data_termino_vigencia: dataOffsetDias(-10),
    });

    const recarregado = await Contrato.findByPk(contrato.id, { raw: true });
    expect(recarregado).not.toHaveProperty("estaVencido");
    expect(recarregado).not.toHaveProperty("estaProximoVencimento");
    expect(recarregado).not.toHaveProperty("esta_vencido");
    expect(recarregado).not.toHaveProperty("esta_proximo_vencimento");
  });
});

describe("Contrato — autorreferência contratoAnterior (renovação)", () => {
  test("Contrato.belongsTo(Contrato, { as: 'contratoAnterior' }) é resolvido via include", async () => {
    const contratoOriginal = await criarContrato({
      numero_termo: textoUnico("TERMO-ORIGINAL"),
      data_termino_vigencia: dataOffsetDias(-5),
    });

    const contratoRenovacao = await criarContrato({
      numero_termo: textoUnico("TERMO-RENOVACAO"),
      contrato_anterior_id: contratoOriginal.id,
      data_termino_vigencia: dataOffsetDias(355),
    });

    const encontrado = await Contrato.findByPk(contratoRenovacao.id, {
      include: [{ model: Contrato, as: "contratoAnterior" }],
    });

    expect(encontrado.contratoAnterior).not.toBeNull();
    expect(encontrado.contratoAnterior.id).toBe(contratoOriginal.id);
  });

  test("o primeiro contrato de uma empresa tem contrato_anterior_id nulo", async () => {
    const contrato = await criarContrato({
      numero_termo: textoUnico("TERMO-PRIMEIRO"),
    });

    expect(contrato.contrato_anterior_id).toBeNull();
  });
});
