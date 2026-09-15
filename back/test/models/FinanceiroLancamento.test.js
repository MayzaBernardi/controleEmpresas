"use strict";

const db = require("../support/db");
const { cnpjUnico, textoUnico, dataOffsetDias } = require("../support/factories");

const { Empresa, FinanceiroLancamento, StatusFinanceiro } = db;

let empresa;
let statusPendenteId;
const lancamentosCriadosIds = [];

beforeAll(async () => {
  empresa = await Empresa.create({
    razao_social: textoUnico("Empresa Para Financeiro"),
    tipo_empresa: "nacional",
    cnpj: cnpjUnico(),
  });

  const statusPendente = await StatusFinanceiro.findOne({ where: { codigo: "pendente" } });
  statusPendenteId = statusPendente.id;
});

afterAll(async () => {
  await FinanceiroLancamento.destroy({ where: { id: lancamentosCriadosIds } });
  await empresa.destroy();
  await db.sequelize.close();
});

function criarLancamento(overrides = {}) {
  return FinanceiroLancamento.create({
    empresa_id: empresa.id,
    valor: 850.0,
    data_vencimento: dataOffsetDias(10),
    status_financeiro_id: statusPendenteId,
    ...overrides,
  }).then((lancamento) => {
    lancamentosCriadosIds.push(lancamento.id);
    return lancamento;
  });
}

describe("FinanceiroLancamento — getter virtual estaAtrasado (RN-31)", () => {
  // Offsets bem afastados de "hoje" propositalmente — ver observação sobre o bug de
  // fuso horário nesse getter relatado na resposta final desta tarefa.

  test("RN-31: estaAtrasado = true quando data_vencimento está no passado e não há data_pagamento", async () => {
    const lancamento = await criarLancamento({
      data_vencimento: dataOffsetDias(-10),
      data_pagamento: null,
    });

    expect(lancamento.estaAtrasado).toBe(true);
  });

  test("RN-31: estaAtrasado = false quando data_vencimento está no passado, mas já há data_pagamento", async () => {
    const lancamento = await criarLancamento({
      data_vencimento: dataOffsetDias(-10),
      data_pagamento: dataOffsetDias(-5),
    });

    expect(lancamento.estaAtrasado).toBe(false);
  });

  test("RN-31: estaAtrasado = false quando data_vencimento ainda está no futuro", async () => {
    const lancamento = await criarLancamento({
      data_vencimento: dataOffsetDias(10),
      data_pagamento: null,
    });

    expect(lancamento.estaAtrasado).toBe(false);
  });

  test("RN-31: o getter virtual nunca é persistido como coluna no banco", async () => {
    const lancamento = await criarLancamento({
      data_vencimento: dataOffsetDias(-10),
      data_pagamento: null,
    });

    const recarregado = await FinanceiroLancamento.findByPk(lancamento.id, { raw: true });
    expect(recarregado).not.toHaveProperty("estaAtrasado");
    expect(recarregado).not.toHaveProperty("esta_atrasado");
  });
});
