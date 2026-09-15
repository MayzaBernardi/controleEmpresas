"use strict";

// RN-35: limite anual de reservas por tipo de espaço compartilhado (sala_atico e
// auditorio: 1x/ano; coworking: 12x/ano), contando apenas reservas com status !=
// 'cancelado', no ano de `data_reserva` (ou no ano de `createdAt`, se a reserva ainda
// não tem data definida). Implementado em SERVICE (reservaEspacoService.js), não em
// hook de model (ADR 0005 §6) — por isso os testes aqui chamam o service diretamente,
// passando `models: db` (o parâmetro de override pensado explicitamente para testes,
// ver jsdoc de `criarReserva`/`contarReservasNaoCanceladasNoAno`).
//
// As datas usadas nos testes ficam em anos bem distantes uns dos outros (2030, 2031,
// 2032, ...) propositalmente, para que os testes nunca dependam do ano corrente da
// máquina rodando a suíte nem colidam entre si.

const db = require("../support/db");
const { cnpjUnico, textoUnico } = require("../support/factories");
const {
  criarReserva,
  contarReservasNaoCanceladasNoAno,
} = require("../../src/services/reservaEspacoService");

const { Empresa, ReservaEspaco } = db;

const empresasCriadasIds = [];

afterAll(async () => {
  // onDelete: CASCADE em reservas_espaco.empresa_id apaga as reservas junto.
  await Empresa.destroy({ where: { id: empresasCriadasIds } });
  await db.sequelize.close();
});

async function criarEmpresa() {
  const empresa = await Empresa.create({
    razao_social: textoUnico("Empresa Para Reserva de Espaço"),
    tipo_empresa: "nacional",
    cnpj: cnpjUnico(),
  });
  empresasCriadasIds.push(empresa.id);
  return empresa;
}

function contarNoBanco(empresaId, tipoEspaco) {
  return ReservaEspaco.count({ where: { empresa_id: empresaId, tipo_espaco: tipoEspaco } });
}

describe("reservaEspacoService.criarReserva — sala_atico, limite 1x/ano (RN-35)", () => {
  test("RN-35: a primeira reserva de sala_atico no ano é permitida", async () => {
    const empresa = await criarEmpresa();

    const reserva = await criarReserva({
      empresaId: empresa.id,
      tipoEspaco: "sala_atico",
      dataReserva: "2030-03-10",
      status: "confirmado",
      models: db,
    });

    expect(reserva.id).toBeDefined();
    expect(await contarNoBanco(empresa.id, "sala_atico")).toBe(1);
  });

  test("RN-35: a segunda reserva de sala_atico no mesmo ano é recusada com mensagem clara (RN-35) e não cria o registro", async () => {
    const empresa = await criarEmpresa();

    await criarReserva({
      empresaId: empresa.id,
      tipoEspaco: "sala_atico",
      dataReserva: "2031-01-15",
      models: db,
    });

    const quantidadeAntes = await contarNoBanco(empresa.id, "sala_atico");
    expect(quantidadeAntes).toBe(1);

    await expect(
      criarReserva({
        empresaId: empresa.id,
        tipoEspaco: "sala_atico",
        dataReserva: "2031-11-20",
        models: db,
      })
    ).rejects.toThrow(/Limite anual.*sala_atico.*RN-35/i);

    const quantidadeDepois = await contarNoBanco(empresa.id, "sala_atico");
    expect(quantidadeDepois).toBe(quantidadeAntes);
  });
});

describe("reservaEspacoService.criarReserva — auditorio, limite 1x/ano (RN-35)", () => {
  test("RN-35: a segunda reserva de auditorio no mesmo ano é recusada", async () => {
    const empresa = await criarEmpresa();

    await criarReserva({ empresaId: empresa.id, tipoEspaco: "auditorio", dataReserva: "2032-02-01", models: db });

    await expect(
      criarReserva({ empresaId: empresa.id, tipoEspaco: "auditorio", dataReserva: "2032-09-01", models: db })
    ).rejects.toThrow(/Limite anual.*auditorio.*RN-35/i);

    expect(await contarNoBanco(empresa.id, "auditorio")).toBe(1);
  });
});

describe("reservaEspacoService.criarReserva — coworking, limite 12x/ano (RN-35)", () => {
  test("RN-35: permite até 12 reservas de coworking no mesmo ano; a 13ª é recusada", async () => {
    const empresa = await criarEmpresa();

    for (let mes = 1; mes <= 12; mes += 1) {
      const dataReserva = `2033-${String(mes).padStart(2, "0")}-05`;
      // eslint-disable-next-line no-await-in-loop
      const reserva = await criarReserva({
        empresaId: empresa.id,
        tipoEspaco: "coworking",
        dataReserva,
        models: db,
      });
      expect(reserva.id).toBeDefined();
    }

    expect(await contarNoBanco(empresa.id, "coworking")).toBe(12);

    await expect(
      criarReserva({ empresaId: empresa.id, tipoEspaco: "coworking", dataReserva: "2033-12-20", models: db })
    ).rejects.toThrow(/Limite anual.*coworking.*RN-35/i);

    expect(await contarNoBanco(empresa.id, "coworking")).toBe(12);
  });
});

describe("reservaEspacoService.criarReserva — isolamento por ano (RN-35)", () => {
  test("RN-35: uma reserva no ano seguinte é permitida mesmo já tendo atingido o limite no ano anterior", async () => {
    const empresa = await criarEmpresa();

    await criarReserva({ empresaId: empresa.id, tipoEspaco: "sala_atico", dataReserva: "2034-06-01", models: db });

    await expect(
      criarReserva({ empresaId: empresa.id, tipoEspaco: "sala_atico", dataReserva: "2034-08-01", models: db })
    ).rejects.toThrow(/RN-35/);

    const reservaAnoSeguinte = await criarReserva({
      empresaId: empresa.id,
      tipoEspaco: "sala_atico",
      dataReserva: "2035-06-01",
      models: db,
    });

    expect(reservaAnoSeguinte.id).toBeDefined();
    expect(await contarNoBanco(empresa.id, "sala_atico")).toBe(2);
  });
});

describe("reservaEspacoService.criarReserva — reservas canceladas não contam para o limite (RN-35)", () => {
  test("RN-35: uma reserva cancelada não bloqueia a próxima reserva do mesmo tipo/ano", async () => {
    const empresa = await criarEmpresa();

    const reservaCancelada = await criarReserva({
      empresaId: empresa.id,
      tipoEspaco: "sala_atico",
      dataReserva: "2036-04-01",
      status: "cancelado",
      models: db,
    });
    expect(reservaCancelada.status).toBe("cancelado");

    // A reserva cancelada acima não conta para o limite — esta segunda reserva (não
    // cancelada) é, na prática, a "primeira" reserva válida do ano para fins do limite.
    const reservaConfirmada = await criarReserva({
      empresaId: empresa.id,
      tipoEspaco: "sala_atico",
      dataReserva: "2036-07-01",
      status: "confirmado",
      models: db,
    });
    expect(reservaConfirmada.id).toBeDefined();

    expect(await contarNoBanco(empresa.id, "sala_atico")).toBe(2);

    // Agora existe 1 reserva NÃO cancelada em 2036 — uma terceira deve ser recusada.
    await expect(
      criarReserva({ empresaId: empresa.id, tipoEspaco: "sala_atico", dataReserva: "2036-10-01", models: db })
    ).rejects.toThrow(/RN-35/);
  });
});

describe("reservaEspacoService.contarReservasNaoCanceladasNoAno — reserva sem data_reserva (RN-35)", () => {
  test("RN-35: uma reserva sem data_reserva é contada no ano de createdAt (ano corrente)", async () => {
    const empresa = await criarEmpresa();

    const { quantidade: quantidadeAntes } = await contarReservasNaoCanceladasNoAno({
      empresaId: empresa.id,
      tipoEspaco: "sala_atico",
      dataReserva: null,
      models: db,
    });
    expect(quantidadeAntes).toBe(0);

    const reserva = await criarReserva({
      empresaId: empresa.id,
      tipoEspaco: "sala_atico",
      dataReserva: null,
      status: "pre_reservado",
      models: db,
    });
    expect(reserva.data_reserva).toBeNull();

    const { quantidade: quantidadeDepois, anoAlvo } = await contarReservasNaoCanceladasNoAno({
      empresaId: empresa.id,
      tipoEspaco: "sala_atico",
      dataReserva: null,
      models: db,
    });

    expect(quantidadeDepois).toBe(1);
    expect(anoAlvo).toBe(new Date().getUTCFullYear());

    // Consequência natural do limite: uma segunda reserva sem data, no mesmo ano
    // corrente, deve ser recusada (sala_atico é 1x/ano).
    await expect(
      criarReserva({ empresaId: empresa.id, tipoEspaco: "sala_atico", dataReserva: null, models: db })
    ).rejects.toThrow(/RN-35/);
  });
});
