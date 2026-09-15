"use strict";

// Cobre a associação N:N Empresa <-> ComunicacaoEmail (via ComunicacaoDestinatario),
// que sustenta o envio de e-mail em massa para empresas afiliadas (RN-24) com
// histórico auditável de quem recebeu cada comunicação (RN-25).

const db = require("../support/db");
const { cnpjUnico, textoUnico } = require("../support/factories");

const { Empresa, ComunicacaoEmail, ComunicacaoDestinatario } = db;

let empresa1;
let empresa2;
let comunicacao1;
let comunicacao2;

beforeAll(async () => {
  [empresa1, empresa2] = await Promise.all([
    Empresa.create({
      razao_social: textoUnico("Empresa 1 (associações)"),
      tipo_empresa: "nacional",
      cnpj: cnpjUnico(),
    }),
    Empresa.create({
      razao_social: textoUnico("Empresa 2 (associações)"),
      tipo_empresa: "nacional",
      cnpj: cnpjUnico(),
    }),
  ]);

  [comunicacao1, comunicacao2] = await Promise.all([
    ComunicacaoEmail.create({
      assunto: textoUnico("Comunicado em massa 1"),
      corpo_html: "<p>Mensagem 1</p>",
      status: "enviado",
      data_envio: new Date(),
    }),
    ComunicacaoEmail.create({
      assunto: textoUnico("Comunicado individual"),
      corpo_html: "<p>Mensagem 2</p>",
      status: "enviado",
      data_envio: new Date(),
    }),
  ]);

  // comunicacao1 foi enviada em massa para as duas empresas; comunicacao2 só para a empresa1.
  await ComunicacaoDestinatario.bulkCreate([
    { comunicacao_email_id: comunicacao1.id, empresa_id: empresa1.id },
    { comunicacao_email_id: comunicacao1.id, empresa_id: empresa2.id },
    { comunicacao_email_id: comunicacao2.id, empresa_id: empresa1.id },
  ]);
});

afterAll(async () => {
  await ComunicacaoDestinatario.destroy({
    where: { comunicacao_email_id: [comunicacao1.id, comunicacao2.id] },
  });
  await ComunicacaoEmail.destroy({ where: { id: [comunicacao1.id, comunicacao2.id] } });
  await Empresa.destroy({ where: { id: [empresa1.id, empresa2.id] } });
  await db.sequelize.close();
});

describe("Empresa.belongsToMany(ComunicacaoEmail, { through: ComunicacaoDestinatario })", () => {
  test("uma empresa pode ter várias comunicações associadas", async () => {
    const encontrada = await Empresa.findByPk(empresa1.id, {
      include: [{ model: ComunicacaoEmail, as: "comunicacoesEmail" }],
    });

    const idsComunicacoes = encontrada.comunicacoesEmail.map((c) => c.id).sort();
    expect(idsComunicacoes).toEqual([comunicacao1.id, comunicacao2.id].sort());
  });

  test("uma comunicação pode ter vários destinatários (empresas)", async () => {
    const encontrada = await ComunicacaoEmail.findByPk(comunicacao1.id, {
      include: [{ model: Empresa, as: "destinatarios" }],
    });

    const idsEmpresas = encontrada.destinatarios.map((e) => e.id).sort();
    expect(idsEmpresas).toEqual([empresa1.id, empresa2.id].sort());
  });

  test("uma empresa que só recebeu uma comunicação não aparece como destinatária da outra", async () => {
    const encontrada = await ComunicacaoEmail.findByPk(comunicacao2.id, {
      include: [{ model: Empresa, as: "destinatarios" }],
    });

    const idsEmpresas = encontrada.destinatarios.map((e) => e.id);
    expect(idsEmpresas).toEqual([empresa1.id]);
  });
});
