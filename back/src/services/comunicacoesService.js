'use strict';

const ApiError = require('../utils/ApiError');
const wrapSequelizeErrors = require('../utils/wrapSequelizeErrors');
const auditoriaService = require('./auditoriaService');

// RF-04/RN-24/RN-28: o "rascunho" chega pronto no body (assunto/corpo_html) — quem gera o
// texto (hoje simulado, futuramente emailAgentService + @google/genai) é responsabilidade de
// outra camada, fora de escopo aqui. Este service só persiste, sempre marcando
// gerado_por_ia: true e status inicial 'rascunho' (RN-28: nunca sai daqui como enviado).
//
// RN-24 (envio individual e em massa): body.empresaIds é uma lista de UUIDs de Empresa — um
// único item cobre o caso individual, vários cobrem o envio em massa, com o mesmo fluxo.
// Toda a operação roda em uma transação: ou a ComunicacaoEmail e todos os seus destinatários
// são gravados juntos, ou nada é gravado.
async function criarRascunho(body, { usuario, models } = {}) {
  const db = models || require('../models');
  const { assunto, corpo_html: corpoHtml, observacoes_ia: observacoesIa, empresaIds } = body || {};

  if (!assunto) {
    throw new ApiError(400, 'assunto é obrigatório.');
  }
  if (!corpoHtml) {
    throw new ApiError(400, 'corpo_html é obrigatório.');
  }

  const comunicacao = await db.sequelize.transaction(async (transaction) => {
    const comunicacao = await wrapSequelizeErrors(
      db.ComunicacaoEmail.create(
        {
          assunto,
          corpo_html: corpoHtml,
          gerado_por_ia: true,
          status: 'rascunho',
          observacoes_ia: observacoesIa ?? null,
        },
        { transaction }
      )
    );

    if (Array.isArray(empresaIds) && empresaIds.length > 0) {
      await wrapSequelizeErrors(
        db.ComunicacaoDestinatario.bulkCreate(
          empresaIds.map((empresaId) => ({
            comunicacao_email_id: comunicacao.id,
            empresa_id: empresaId,
          })),
          { transaction }
        )
      );
    }

    return comunicacao;
  });

  await auditoriaService.registrar({
    entidade: 'comunicacoes_email',
    entidadeId: comunicacao.id,
    acao: 'create',
    usuario,
    dadosNovos: comunicacao.toJSON(),
    models: db,
  });

  return comunicacao;
}

// RN-25: histórico auditável de todo e-mail do sistema — lista todas as comunicações, com
// seus destinatários, mais recentes primeiro.
async function listar({ models } = {}) {
  const db = models || require('../models');
  return db.ComunicacaoEmail.findAll({
    where: { ativo: true },
    include: [{ association: 'destinatarios' }],
    order: [['created_at', 'DESC']],
  });
}

async function buscarPorId(id, { models } = {}) {
  const db = models || require('../models');
  const comunicacao = await db.ComunicacaoEmail.findByPk(id);
  if (!comunicacao) {
    throw new ApiError(404, 'Comunicação de e-mail não encontrada.');
  }
  return comunicacao;
}

// Edição humana do rascunho (revisão do texto gerado pela IA) — o conteúdo (assunto/corpo)
// só é editável enquanto o status for rascunho, pra não alterar algo já aprovado/enviado.
// 'ativo' (excluir/arquivar) é a exceção: funciona em qualquer status.
async function editar(id, body, { usuario, models } = {}) {
  const db = models || require('../models');
  const comunicacao = await buscarPorId(id, { models: db });

  const mexeNoConteudo =
    Object.prototype.hasOwnProperty.call(body || {}, 'assunto') ||
    Object.prototype.hasOwnProperty.call(body || {}, 'corpo_html');

  if (mexeNoConteudo && comunicacao.status !== 'rascunho') {
    throw new ApiError(400, 'Só é possível editar o conteúdo enquanto o status for rascunho.');
  }

  const dadosAnteriores = {
    assunto: comunicacao.assunto,
    corpo_html: comunicacao.corpo_html,
    ativo: comunicacao.ativo,
  };

  if (Object.prototype.hasOwnProperty.call(body || {}, 'assunto')) {
    comunicacao.assunto = body.assunto;
  }
  if (Object.prototype.hasOwnProperty.call(body || {}, 'corpo_html')) {
    comunicacao.corpo_html = body.corpo_html;
  }
  if (Object.prototype.hasOwnProperty.call(body || {}, 'ativo')) {
    comunicacao.ativo = body.ativo;
  }

  const resultado = await wrapSequelizeErrors(comunicacao.save());
  await auditoriaService.registrar({
    entidade: 'comunicacoes_email',
    entidadeId: comunicacao.id,
    acao: body?.ativo === false ? 'delete' : 'update',
    usuario,
    dadosAnteriores,
    dadosNovos: { assunto: comunicacao.assunto, corpo_html: comunicacao.corpo_html, ativo: comunicacao.ativo },
    models: db,
  });
  return resultado;
}

// RN-28: aprovação humana explícita — obrigatória antes de qualquer envio de e-mail gerado
// por IA. O validator do model (revisaoHumanaObrigatoriaParaEnvioDeRascunhoDeIA) garante que
// revisado_por_usuario_id não pode ficar vazio quando status vira 'aprovado'/'enviado'.
async function aprovar(id, usuarioId, { usuario, models } = {}) {
  const db = models || require('../models');
  const comunicacao = await buscarPorId(id, { models: db });

  const statusAnterior = comunicacao.status;
  comunicacao.revisado_por_usuario_id = usuarioId;
  comunicacao.revisado_em = new Date();
  comunicacao.status = 'aprovado';

  const resultado = await wrapSequelizeErrors(comunicacao.save());
  await auditoriaService.registrar({
    entidade: 'comunicacoes_email',
    entidadeId: comunicacao.id,
    acao: 'update',
    usuario,
    dadosAnteriores: { status: statusAnterior },
    dadosNovos: { status: comunicacao.status, revisado_por_usuario_id: usuarioId },
    models: db,
  });
  return resultado;
}

// RN-28: transição de estado apenas — envio de e-mail de verdade (SMTP) é fora de escopo
// aqui. Só é permitido a partir de um e-mail já aprovado (ou seja, já revisado por humano).
async function enviar(id, { usuario, models } = {}) {
  const db = models || require('../models');
  const comunicacao = await buscarPorId(id, { models: db });

  if (comunicacao.status !== 'aprovado') {
    throw new ApiError(400, 'Só é possível enviar um e-mail já aprovado (RN-28).');
  }

  comunicacao.status = 'enviado';
  comunicacao.data_envio = new Date();

  const resultado = await wrapSequelizeErrors(comunicacao.save());
  await auditoriaService.registrar({
    entidade: 'comunicacoes_email',
    entidadeId: comunicacao.id,
    acao: 'update',
    usuario,
    dadosAnteriores: { status: 'aprovado' },
    dadosNovos: { status: 'enviado', data_envio: comunicacao.data_envio },
    models: db,
  });
  return resultado;
}

module.exports = {
  criarRascunho,
  listar,
  buscarPorId,
  editar,
  aprovar,
  enviar,
};
