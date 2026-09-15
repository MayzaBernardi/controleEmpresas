"use strict";

// RN-34: um contrato pode ser marcado como isento da taxa de anuidade
// (isento_taxa = true) como caso especial contratual. Quando isento, o contrato
// DEVE ter motivo_isencao e documento_referencia preenchidos — não pode haver
// isenção "sem justificativa registrada". Validado via custom validator a nível de
// model (Contrato.js, `validate.motivoEDocumentoObrigatoriosParaIsencao`), disparado
// tanto em `.validate()` quanto em `.save()`/`.create()` (ADR 0005 §2).

const db = require("../support/db");
const { cnpjUnico, textoUnico, dataOffsetDias } = require("../support/factories");

const { Empresa, Contrato, StatusContrato } = db;

let empresa;
let statusContratoId;
const contratosCriadosIds = [];

beforeAll(async () => {
  empresa = await Empresa.create({
    razao_social: textoUnico("Empresa Para Isenção de Taxa"),
    tipo_empresa: "nacional",
    cnpj: cnpjUnico(),
  });

  const statusVigente = await StatusContrato.findOne({ where: { codigo: "vigente" } });
  statusContratoId = statusVigente.id;
});

afterAll(async () => {
  await Contrato.destroy({ where: { id: contratosCriadosIds } });
  await empresa.destroy();
  await db.sequelize.close();
});

function buildContrato(overrides = {}) {
  return Contrato.build({
    empresa_id: empresa.id,
    data_inicio_vigencia: dataOffsetDias(-365),
    data_termino_vigencia: dataOffsetDias(365),
    status_contrato_id: statusContratoId,
    valor_anuidade: 1200.0,
    ...overrides,
  });
}

function criarContrato(overrides = {}) {
  return Contrato.create({
    empresa_id: empresa.id,
    data_inicio_vigencia: dataOffsetDias(-365),
    data_termino_vigencia: dataOffsetDias(365),
    status_contrato_id: statusContratoId,
    valor_anuidade: 1200.0,
    ...overrides,
  }).then((contrato) => {
    contratosCriadosIds.push(contrato.id);
    return contrato;
  });
}

describe("Contrato — validator motivoEDocumentoObrigatoriosParaIsencao (RN-34)", () => {
  test("RN-34: isento_taxa = true sem motivo_isencao nem documento_referencia falha na validação", async () => {
    const contrato = buildContrato({
      isento_taxa: true,
      numero_termo: textoUnico("TERMO-ISENCAO-SEM-NADA"),
    });

    await expect(contrato.validate()).rejects.toThrow(/motivo_isencao é obrigatório.*RN-34/i);
  });

  test("RN-34: isento_taxa = true com apenas motivo_isencao preenchido (falta documento_referencia) falha na validação", async () => {
    const contrato = buildContrato({
      isento_taxa: true,
      motivo_isencao: "Distrato firmado com a reitoria em 2025",
      numero_termo: textoUnico("TERMO-ISENCAO-SO-MOTIVO"),
    });

    await expect(contrato.validate()).rejects.toThrow(/documento_referencia é obrigatório.*RN-34/i);
  });

  test("RN-34: isento_taxa = true com apenas documento_referencia preenchido (falta motivo_isencao) falha na validação", async () => {
    const contrato = buildContrato({
      isento_taxa: true,
      documento_referencia: "DISTRATO-2025-042",
      numero_termo: textoUnico("TERMO-ISENCAO-SO-DOCUMENTO"),
    });

    await expect(contrato.validate()).rejects.toThrow(/motivo_isencao é obrigatório.*RN-34/i);
  });

  test("RN-34: isento_taxa = true com motivo_isencao e documento_referencia preenchidos passa na validação e persiste", async () => {
    const contrato = await criarContrato({
      isento_taxa: true,
      motivo_isencao: "Distrato firmado com a reitoria em 2025, convênio de fomento",
      documento_referencia: "DISTRATO-2025-042",
      numero_termo: textoUnico("TERMO-ISENCAO-COMPLETO"),
    });

    expect(contrato.id).toBeDefined();
    expect(contrato.isento_taxa).toBe(true);

    const recarregado = await Contrato.findByPk(contrato.id);
    expect(recarregado.motivo_isencao).toBe("Distrato firmado com a reitoria em 2025, convênio de fomento");
    expect(recarregado.documento_referencia).toBe("DISTRATO-2025-042");
  });

  test("RN-34: isento_taxa = false (default) não exige motivo_isencao nem documento_referencia", async () => {
    const contrato = await criarContrato({
      numero_termo: textoUnico("TERMO-SEM-ISENCAO"),
      // isento_taxa intencionalmente omitido — deve assumir o default (false) do model.
    });

    expect(contrato.isento_taxa).toBe(false);
    expect(contrato.motivo_isencao).toBeNull();
    expect(contrato.documento_referencia).toBeNull();
  });

  test("RN-34: isento_taxa = false explícito também não exige motivo_isencao nem documento_referencia", async () => {
    const contrato = buildContrato({
      isento_taxa: false,
      numero_termo: textoUnico("TERMO-ISENCAO-FALSE-EXPLICITO"),
    });

    await expect(contrato.validate()).resolves.not.toThrow();
  });
});
