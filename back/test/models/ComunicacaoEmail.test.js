"use strict";

const db = require("../support/db");
const { emailUnico, textoUnico } = require("../support/factories");

const { Usuario, ComunicacaoEmail } = db;

let revisor;
const comunicacoesCriadasIds = [];

beforeAll(async () => {
  revisor = await Usuario.create({
    nome: "Revisor Equipe do Programa",
    email: emailUnico("revisor"),
    papel: "equipe_programa",
  });
});

afterAll(async () => {
  await ComunicacaoEmail.destroy({ where: { id: comunicacoesCriadasIds } });
  await revisor.destroy();
  await db.sequelize.close();
});

describe("ComunicacaoEmail — validator revisaoHumanaObrigatoriaParaEnvioDeRascunhoDeIA (RN-28)", () => {
  test("RN-28: falha ao validar rascunho de IA com status=aprovado sem revisor", async () => {
    const comunicacao = ComunicacaoEmail.build({
      assunto: textoUnico("Aviso de vencimento"),
      corpo_html: "<p>Rascunho gerado por IA</p>",
      gerado_por_ia: true,
      status: "aprovado",
      // revisado_por_usuario_id intencionalmente omitido.
    });

    await expect(comunicacao.validate()).rejects.toThrow(
      /revisado_por_usuario_id é obrigatório.*aprovar\/enviar.*IA/i
    );
  });

  test("RN-28: falha ao validar rascunho de IA com status=enviado sem revisor", async () => {
    const comunicacao = ComunicacaoEmail.build({
      assunto: textoUnico("Cobrança de débito"),
      corpo_html: "<p>Rascunho gerado por IA</p>",
      gerado_por_ia: true,
      status: "enviado",
    });

    await expect(comunicacao.validate()).rejects.toThrow(/revisado_por_usuario_id é obrigatório/i);
  });

  test("RN-28: passa na validação com status=rascunho sem revisor, mesmo gerado por IA", async () => {
    const comunicacao = ComunicacaoEmail.build({
      assunto: textoUnico("Boas-vindas"),
      corpo_html: "<p>Rascunho gerado por IA, ainda não revisado</p>",
      gerado_por_ia: true,
      status: "rascunho",
    });

    await expect(comunicacao.validate()).resolves.not.toThrow();
  });

  test("RN-28: passa na validação e persiste status=aprovado quando há revisor registrado", async () => {
    const comunicacao = await ComunicacaoEmail.create({
      assunto: textoUnico("Aviso de vencimento revisado"),
      corpo_html: "<p>Rascunho gerado por IA, já revisado</p>",
      gerado_por_ia: true,
      status: "aprovado",
      revisado_por_usuario_id: revisor.id,
      revisado_em: new Date(),
    });
    comunicacoesCriadasIds.push(comunicacao.id);

    expect(comunicacao.id).toBeDefined();
    expect(comunicacao.status).toBe("aprovado");
  });

  test("RN-28: e-mail não gerado por IA pode ser enviado sem revisor (regra só se aplica a gerado_por_ia=true)", async () => {
    const comunicacao = await ComunicacaoEmail.create({
      assunto: textoUnico("Comunicado manual da equipe"),
      corpo_html: "<p>Escrito manualmente pela equipe do programa</p>",
      gerado_por_ia: false,
      status: "enviado",
      data_envio: new Date(),
    });
    comunicacoesCriadasIds.push(comunicacao.id);

    expect(comunicacao.id).toBeDefined();
    expect(comunicacao.revisado_por_usuario_id).toBeNull();
  });
});
