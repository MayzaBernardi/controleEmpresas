"use strict";

const db = require("../support/db");
const { cnpjUnico, cnpjMascaradoUnico, textoUnico } = require("../support/factories");

const { Empresa } = db;

afterAll(async () => {
  await db.sequelize.close();
});

describe("Empresa — validator cnpjOuIdentificadorEstrangeiroObrigatorio (RN-32)", () => {
  describe("tipo_empresa = nacional", () => {
    test("RN-32: falha ao validar sem cnpj", async () => {
      const empresa = Empresa.build({
        razao_social: textoUnico("Empresa Nacional Sem CNPJ"),
        tipo_empresa: "nacional",
      });

      await expect(empresa.validate()).rejects.toThrow(
        /cnpj é obrigatório.*14 dígitos.*nacional/i
      );
    });

    test("RN-32: falha ao validar com cnpj curto/inválido (menos de 14 dígitos)", async () => {
      const empresa = Empresa.build({
        razao_social: textoUnico("Empresa Nacional CNPJ Curto"),
        tipo_empresa: "nacional",
        cnpj: "123456",
      });

      await expect(empresa.validate()).rejects.toThrow(/14 dígitos numéricos/i);
    });

    test("RN-32: passa na validação com cnpj de 14 dígitos sem máscara", async () => {
      const empresa = Empresa.build({
        razao_social: textoUnico("Empresa Nacional CNPJ Sem Máscara"),
        tipo_empresa: "nacional",
        cnpj: cnpjUnico(),
      });

      await expect(empresa.validate()).resolves.not.toThrow();
    });

    test("RN-32: passa na validação com cnpj mascarado (ex.: 12.345.678/0001-99)", async () => {
      const empresa = Empresa.build({
        razao_social: textoUnico("Empresa Nacional CNPJ Mascarado"),
        tipo_empresa: "nacional",
        cnpj: cnpjMascaradoUnico(),
      });

      await expect(empresa.validate()).resolves.not.toThrow();
    });

    test("RN-32: persiste de verdade no banco (create) com cnpj de 14 dígitos", async () => {
      const cnpj = cnpjUnico();
      const empresa = await Empresa.create({
        razao_social: textoUnico("Empresa Nacional Persistida"),
        tipo_empresa: "nacional",
        cnpj,
      });

      try {
        expect(empresa.id).toBeDefined();
        expect(empresa.cnpj).toBe(cnpj);
      } finally {
        await empresa.destroy();
      }
    });
  });

  describe("tipo_empresa = internacional", () => {
    test("RN-32: falha ao validar sem identificador_estrangeiro", async () => {
      const empresa = Empresa.build({
        razao_social: textoUnico("Empresa Internacional Sem Identificador"),
        tipo_empresa: "internacional",
      });

      await expect(empresa.validate()).rejects.toThrow(
        /identificador_estrangeiro é obrigatório.*internacional/i
      );
    });

    test("RN-32: passa na validação com identificador_estrangeiro preenchido, dispensando cnpj", async () => {
      const empresa = Empresa.build({
        razao_social: textoUnico("Empresa Internacional Com Identificador"),
        tipo_empresa: "internacional",
        identificador_estrangeiro: "EIN-99-1234567",
        // cnpj intencionalmente omitido — RN-32 diz que não é obrigatório para internacional.
      });

      await expect(empresa.validate()).resolves.not.toThrow();
      expect(empresa.cnpj).toBeFalsy();
    });

    test("RN-32: persiste de verdade no banco (create) sem cnpj, apenas com identificador_estrangeiro", async () => {
      const empresa = await Empresa.create({
        razao_social: textoUnico("Empresa Internacional Persistida"),
        tipo_empresa: "internacional",
        identificador_estrangeiro: "REG-EXT-000123",
      });

      try {
        expect(empresa.id).toBeDefined();
        expect(empresa.cnpj).toBeNull();
        expect(empresa.identificador_estrangeiro).toBe("REG-EXT-000123");
      } finally {
        await empresa.destroy();
      }
    });
  });
});
