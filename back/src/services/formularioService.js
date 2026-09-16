'use strict';

const { Op } = require('sequelize');
const ApiError = require('../utils/ApiError');
const wrapSequelizeErrors = require('../utils/wrapSequelizeErrors');
const prospeccaoService = require('./prospeccaoService');
const auditoriaService = require('./auditoriaService');

const CAMPOS_TRIAGEM = ['status_triagem', 'observacoes_triagem'];

// Status de contrato que não contam como "vigente" mesmo se a data ainda cobrir hoje
// (RN-42): um contrato encerrado/rescindido antecipadamente não deve manter a empresa
// fora da listagem de formulários.
const STATUS_CONTRATO_SEM_EFEITO = ['encerrado', 'rescindido'];

function somenteDigitos(valor) {
  return (valor || '').toString().replace(/\D/g, '');
}

/**
 * RN-42 (2026-09-16): uma empresa sai da listagem de formulários de inscrição assim que
 * tem um contrato válido — dentro da janela de vigência (data_inicio_vigencia <= hoje <=
 * data_termino_vigencia) e não encerrado/rescindido — vinculado ao mesmo CNPJ. A
 * comparação é por CNPJ (não só por empresa_id) porque o formulário pode ter sido
 * respondido antes da Empresa existir como cadastro (payload_respostas.cnpj), e mesmo
 * assim já corresponder a uma empresa que veio a assinar contrato depois.
 */
async function cnpjsComContratoValido(db) {
  const hoje = new Date().toISOString().slice(0, 10);

  const contratos = await db.Contrato.findAll({
    where: {
      ativo: true,
      data_inicio_vigencia: { [Op.lte]: hoje },
      data_termino_vigencia: { [Op.gte]: hoje },
    },
    include: [
      { model: db.StatusContrato, as: 'statusContrato', attributes: ['codigo'] },
      { model: db.Empresa, as: 'empresa', attributes: ['cnpj'] },
    ],
  });

  const cnpjs = new Set();
  for (const contrato of contratos) {
    const codigoStatus = contrato.statusContrato?.codigo;
    if (STATUS_CONTRATO_SEM_EFEITO.includes(codigoStatus)) continue;
    const cnpj = somenteDigitos(contrato.empresa?.cnpj);
    if (cnpj) cnpjs.add(cnpj);
  }
  return cnpjs;
}

function somenteCamposPermitidos(body, camposPermitidos) {
  const dados = {};
  for (const campo of camposPermitidos) {
    if (Object.prototype.hasOwnProperty.call(body, campo)) {
      dados[campo] = body[campo];
    }
  }
  return dados;
}

/**
 * RF-01/RN-04: cria o FormularioResposta (ponto de entrada do processo de afiliação,
 * rota pública) e, na mesma transação, aciona a RN-36 (prospeccaoService) para vincular
 * uma prospecção em aberto correspondente, se existir. `email_contato` e
 * `payload_respostas` são obrigatórios.
 */
async function registrarSubmissao(body, { models } = {}) {
  const db = models || require('../models');
  const { email_contato, payload_respostas } = body || {};

  if (!email_contato) {
    throw new ApiError(400, 'email_contato é obrigatório.');
  }
  if (!payload_respostas || typeof payload_respostas !== 'object') {
    throw new ApiError(400, 'payload_respostas é obrigatório.');
  }

  const formularioResposta = await db.sequelize.transaction(async (transaction) => {
    const formularioResposta = await wrapSequelizeErrors(
      db.FormularioResposta.create({ email_contato, payload_respostas }, { transaction })
    );

    // RN-36: vincula (se existir) uma prospecção em aberto correspondente e avança seu
    // status. Não reimplementado aqui — apenas chamado, como já feito e testado em
    // prospeccaoService.
    await prospeccaoService.vincularProspeccaoAoFormulario(formularioResposta, { transaction, models: db });

    return formularioResposta;
  });

  // Rota pública (sem usuário autenticado) — usuario_id fica null no registro.
  await auditoriaService.registrar({
    entidade: 'formulario_respostas',
    entidadeId: formularioResposta.id,
    acao: 'create',
    dadosNovos: formularioResposta.toJSON(),
    models: db,
  });

  return formularioResposta;
}

async function listar({ models } = {}) {
  const db = models || require('../models');

  const [formularios, cnpjsValidos] = await Promise.all([
    db.FormularioResposta.findAll({
      include: [{ model: db.Empresa, as: 'empresa', attributes: ['cnpj'] }],
      order: [['createdAt', 'DESC']],
    }),
    cnpjsComContratoValido(db),
  ]);

  if (cnpjsValidos.size === 0) return formularios;

  // RN-42: prioriza o CNPJ da Empresa já vinculada; sem vínculo ainda, usa o CNPJ
  // informado no próprio payload (formulário respondido antes de virar cadastro).
  return formularios.filter((formulario) => {
    const cnpjVinculado = somenteDigitos(formulario.empresa?.cnpj);
    const cnpjPayload = somenteDigitos(formulario.payload_respostas?.cnpj);
    const cnpj = cnpjVinculado || cnpjPayload;
    return !cnpj || !cnpjsValidos.has(cnpj);
  });
}

async function buscarPorId(id, { models } = {}) {
  const db = models || require('../models');
  const formularioResposta = await db.FormularioResposta.findByPk(id);
  if (!formularioResposta) {
    throw new ApiError(404, 'Formulário de inscrição não encontrado.');
  }
  return formularioResposta;
}

async function triar(id, body, { usuario, models } = {}) {
  const db = models || require('../models');
  const formularioResposta = await buscarPorId(id, { models: db });
  const dados = somenteCamposPermitidos(body || {}, CAMPOS_TRIAGEM);
  const dadosAnteriores = {};
  for (const campo of Object.keys(dados)) {
    dadosAnteriores[campo] = formularioResposta[campo];
  }
  Object.assign(formularioResposta, dados);
  const resultado = await wrapSequelizeErrors(formularioResposta.save());
  await auditoriaService.registrar({
    entidade: 'formulario_respostas',
    entidadeId: formularioResposta.id,
    acao: 'update',
    usuario,
    dadosAnteriores,
    dadosNovos: dados,
    models: db,
  });
  return resultado;
}

module.exports = { registrarSubmissao, listar, buscarPorId, triar };
