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
    db.FormularioResposta.findAll({ order: [['createdAt', 'DESC']] }),
    cnpjsComContratoValido(db),
  ]);

  // RN-04-A: uma vez convertido em cadastro de Empresa (empresa_id preenchido via
  // "Criar nova empresa"), o formulário sai da listagem de triagem incondicionalmente —
  // passa a viver só na tela de Empresas, independente de já ter contrato ou não.
  // RN-42: sem cadastro ainda, some também se o CNPJ do próprio payload já corresponder a
  // uma empresa (outra) com contrato válido — formulário respondido antes de virar cadastro.
  return formularios.filter((formulario) => {
    if (formulario.empresa_id) return false;
    if (cnpjsValidos.size === 0) return true;
    const cnpj = somenteDigitos(formulario.payload_respostas?.cnpj);
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

/**
 * Ação explícita da equipe_programa: cria o cadastro de Empresa a partir de um
 * FormularioResposta recebido e vincula empresa_id de volta (a coluna existe no schema
 * desde sempre, mas nada a preenchia automaticamente). Reaproveita empresasService.criar
 * (RN-32 de CNPJ/identificador_estrangeiro e auditoria de criação da empresa já ficam por
 * conta dele) — aqui só fixamos status_processo em 'contrato_elaboracao' (toda empresa
 * nasce nesse status, RN-06) e contatos.email vindo do email_contato do formulário, e
 * registramos a auditoria separada do vínculo empresa_id no próprio formulário.
 */
async function criarEmpresa(id, body, { usuario, models } = {}) {
  const db = models || require('../models');
  const empresasService = require('./empresasService'); // require tardio: evita ciclo se empresasService vier a importar este arquivo
  const formularioResposta = await buscarPorId(id, { models: db });

  if (formularioResposta.empresa_id) {
    throw new ApiError(400, 'Este formulário já está vinculado a uma empresa.');
  }

  const dadosEmpresa = {
    razao_social: body?.razao_social,
    nome_fantasia: body?.nome_fantasia ?? null,
    tipo_empresa: body?.tipo_empresa || 'nacional',
    cnpj: body?.cnpj ?? null,
    identificador_estrangeiro: body?.identificador_estrangeiro ?? null,
    telefone: body?.telefone ?? null,
    cidade: body?.cidade ?? null,
    uf: body?.uf ?? null,
    contatos: { email: formularioResposta.email_contato },
    status_processo: 'contrato_elaboracao',
  };

  const empresa = await empresasService.criar(dadosEmpresa, { usuario, models: db });

  const dadosAnteriores = { empresa_id: formularioResposta.empresa_id };
  formularioResposta.empresa_id = empresa.id;
  await wrapSequelizeErrors(formularioResposta.save());
  await auditoriaService.registrar({
    entidade: 'formulario_respostas',
    entidadeId: formularioResposta.id,
    acao: 'update',
    usuario,
    dadosAnteriores,
    dadosNovos: { empresa_id: empresa.id },
    models: db,
  });

  return empresa;
}

module.exports = { registrarSubmissao, listar, buscarPorId, triar, criarEmpresa };
