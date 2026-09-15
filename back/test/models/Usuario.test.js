"use strict";

const db = require("../support/db");
const { cnpjUnico, emailUnico, textoUnico } = require("../support/factories");

const { Empresa, Usuario } = db;

let empresa;

beforeAll(async () => {
  empresa = await Empresa.create({
    razao_social: textoUnico("Empresa Para Usuario"),
    tipo_empresa: "nacional",
    cnpj: cnpjUnico(),
  });
});

afterAll(async () => {
  await Usuario.destroy({ where: { empresa_id: empresa.id } });
  await empresa.destroy();
  await db.sequelize.close();
});

describe("Usuario — validator empresaObrigatoriaParaPapelEmpresaAfiliada (RN-01)", () => {
  test("RN-01: falha ao validar papel=empresa_afiliada sem empresa_id", async () => {
    const usuario = Usuario.build({
      nome: "Usuário Sem Empresa",
      email: emailUnico("sem-empresa"),
      papel: "empresa_afiliada",
    });

    await expect(usuario.validate()).rejects.toThrow(
      /empresa_id é obrigatório.*empresa_afiliada/i
    );
  });

  test("RN-01: passa na validação e persiste papel=empresa_afiliada com empresa_id preenchido", async () => {
    const usuario = await Usuario.create({
      nome: "Usuário Com Empresa",
      email: emailUnico("com-empresa"),
      papel: "empresa_afiliada",
      empresa_id: empresa.id,
    });

    expect(usuario.id).toBeDefined();
    expect(usuario.empresa_id).toBe(empresa.id);
  });

  test("RN-01: papel diferente de empresa_afiliada não exige empresa_id", async () => {
    const usuario = await Usuario.create({
      nome: "Usuário Equipe do Programa",
      email: emailUnico("equipe-programa"),
      papel: "equipe_programa",
      // empresa_id intencionalmente omitido.
    });

    expect(usuario.id).toBeDefined();
    expect(usuario.empresa_id).toBeNull();
  });
});
