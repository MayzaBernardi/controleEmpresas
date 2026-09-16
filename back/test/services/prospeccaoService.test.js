"use strict";

// RN-36: quando um FormularioResposta é criado, uma Prospeccao ainda não convertida
// (formulario_resposta_id nulo) e ativa, com o mesmo e-mail de contato (case-insensitive,
// Op.iLike) OU o mesmo nome de empresa (comparado com payload_respostas.razao_social do
// formulário, também case-insensitive), deve ser vinculada ao formulário
// (formulario_resposta_id). Decisão de negócio (2026-09-16): a taxonomia de
// status_prospeccao (em_contato / nao_constatada / proposta_rejeitada) não tem mais um
// estado "convertida" nem um conceito de "aberta" — o único filtro de elegibilidade é
// `formulario_resposta_id IS NULL` + `ativo: true`; o status em si nunca é alterado por
// esta função. Implementado em SERVICE (prospeccaoService.js#vincularProspeccaoAoFormulario),
// não como hook automático do model (ADR 0005 §3) — por isso os testes aqui chamam o
// service diretamente, passando `models: db` (parâmetro de override pensado para testes).

const db = require("../support/db");
const { emailUnico, textoUnico } = require("../support/factories");
const { vincularProspeccaoAoFormulario } = require("../../src/services/prospeccaoService");

const { Prospeccao, FormularioResposta, StatusProspeccao } = db;

let statusIds;

const prospeccoesCriadasIds = [];
const formulariosCriadosIds = [];

beforeAll(async () => {
  const statusRows = await StatusProspeccao.findAll({
    where: { codigo: ["em_contato", "nao_constatada", "proposta_rejeitada"] },
  });
  statusIds = Object.fromEntries(statusRows.map((s) => [s.codigo, s.id]));
});

afterAll(async () => {
  await Prospeccao.destroy({ where: { id: prospeccoesCriadasIds } });
  await FormularioResposta.destroy({ where: { id: formulariosCriadosIds } });
  await db.sequelize.close();
});

function criarProspeccao(overrides = {}) {
  return Prospeccao.create({
    nome_empresa: textoUnico("Prospecção Empresa"),
    status_prospeccao_id: statusIds.em_contato,
    ...overrides,
  }).then((prospeccao) => {
    prospeccoesCriadasIds.push(prospeccao.id);
    return prospeccao;
  });
}

function criarFormulario(overrides = {}) {
  return FormularioResposta.create({
    email_contato: emailUnico("formulario"),
    payload_respostas: {},
    ...overrides,
  }).then((formulario) => {
    formulariosCriadosIds.push(formulario.id);
    return formulario;
  });
}

describe("prospeccaoService.vincularProspeccaoAoFormulario (RN-36)", () => {
  test("RN-36: vincula por e-mail de contato, mesmo com diferença de maiúsculas/minúsculas (ex.: CONTATO@x.com vs contato@x.com)", async () => {
    const emailBase = emailUnico("contato-rn36-email");
    const prospeccao = await criarProspeccao({
      email_contato: emailBase,
      status_prospeccao_id: statusIds.em_contato,
    });

    const formulario = await criarFormulario({
      email_contato: emailBase.toUpperCase(),
      // razao_social propositalmente sem relação com a prospecção acima — a vinculação
      // aqui deve acontecer só por causa do e-mail.
      payload_respostas: { razao_social: textoUnico("Razão Social Não Relacionada") },
    });

    const vinculada = await vincularProspeccaoAoFormulario(formulario, { models: db });

    expect(vinculada).not.toBeNull();
    expect(vinculada.id).toBe(prospeccao.id);

    const recarregada = await Prospeccao.findByPk(prospeccao.id);
    expect(recarregada.formulario_resposta_id).toBe(formulario.id);
    // status não muda — conversão é só formulario_resposta_id deixando de ser null.
    expect(recarregada.status_prospeccao_id).toBe(statusIds.em_contato);
  });

  test("RN-36: vincula por nome de empresa (payload_respostas.razao_social), case-insensitive", async () => {
    const nomeEmpresa = textoUnico("Empresa Prospecção Nome");
    const prospeccao = await criarProspeccao({
      nome_empresa: nomeEmpresa,
      email_contato: emailUnico("prospeccao-email-nao-usado"),
      status_prospeccao_id: statusIds.nao_constatada,
    });

    const formulario = await criarFormulario({
      // e-mail propositalmente diferente — a vinculação aqui deve acontecer só por
      // causa do nome da empresa.
      email_contato: emailUnico("formulario-email-diferente"),
      payload_respostas: { razao_social: nomeEmpresa.toUpperCase() },
    });

    const vinculada = await vincularProspeccaoAoFormulario(formulario, { models: db });

    expect(vinculada).not.toBeNull();
    expect(vinculada.id).toBe(prospeccao.id);

    const recarregada = await Prospeccao.findByPk(prospeccao.id);
    expect(recarregada.formulario_resposta_id).toBe(formulario.id);
    expect(recarregada.status_prospeccao_id).toBe(statusIds.nao_constatada);
  });

  test("RN-36: vincula uma prospecção com \"proposta_rejeitada\" — status não filtra mais elegibilidade, só formulario_resposta_id/ativo", async () => {
    const emailBase = emailUnico("contato-rejeitada");
    const prospeccao = await criarProspeccao({
      email_contato: emailBase,
      status_prospeccao_id: statusIds.proposta_rejeitada,
    });

    const formulario = await criarFormulario({
      email_contato: emailBase,
      payload_respostas: {},
    });

    const vinculada = await vincularProspeccaoAoFormulario(formulario, { models: db });

    expect(vinculada).not.toBeNull();
    expect(vinculada.id).toBe(prospeccao.id);
  });

  test("RN-36: NÃO vincula uma prospecção já convertida (formulario_resposta_id já preenchido)", async () => {
    const emailBase = emailUnico("contato-ja-convertida");
    const formularioAnterior = await criarFormulario({
      email_contato: emailUnico("formulario-anterior"),
      payload_respostas: {},
    });
    const prospeccao = await criarProspeccao({
      email_contato: emailBase,
      formulario_resposta_id: formularioAnterior.id,
    });

    const formulario = await criarFormulario({
      email_contato: emailBase,
      payload_respostas: {},
    });

    const resultado = await vincularProspeccaoAoFormulario(formulario, { models: db });

    expect(resultado).toBeNull();

    const recarregada = await Prospeccao.findByPk(prospeccao.id);
    expect(recarregada.formulario_resposta_id).toBe(formularioAnterior.id);
  });

  test("RN-36: NÃO vincula uma prospecção inativa (excluída/arquivada)", async () => {
    const emailBase = emailUnico("contato-inativa");
    const prospeccao = await criarProspeccao({
      email_contato: emailBase,
      ativo: false,
    });

    const formulario = await criarFormulario({
      email_contato: emailBase,
      payload_respostas: {},
    });

    const resultado = await vincularProspeccaoAoFormulario(formulario, { models: db });

    expect(resultado).toBeNull();

    const recarregada = await Prospeccao.findByPk(prospeccao.id);
    expect(recarregada.formulario_resposta_id).toBeNull();
  });

  test("RN-36: retorna null sem lançar erro quando não há prospecção correspondente", async () => {
    const formulario = await criarFormulario({
      email_contato: emailUnico("sem-correspondente"),
      payload_respostas: { razao_social: textoUnico("Empresa Sem Prospecção Prévia") },
    });

    await expect(vincularProspeccaoAoFormulario(formulario, { models: db })).resolves.toBeNull();
  });
});
