'use strict';

const ApiError = require('../utils/ApiError');
const wrapSequelizeErrors = require('../utils/wrapSequelizeErrors');

// RF-04/RN-24/RN-28: o "rascunho" chega pronto no body (assunto/corpo_html) — quem gera o
// texto (hoje simulado, futuramente emailAgentService + @google/genai) é responsabilidade de
// outra camada, fora de escopo aqui. Este service só persiste, sempre marcando
// gerado_por_ia: true e status inicial 'rascunho' (RN-28: nunca sai daqui como enviado).
//
// RN-24 (envio individual e em massa): body.empresaIds é uma lista de UUIDs de Empresa — um
// único item cobre o caso individual, vários cobrem o envio em massa, com o mesmo fluxo.
// Toda a operação roda em uma transação: ou a ComunicacaoEmail e todos os seus destinatários
// são gravados juntos, ou nada é gravado.
async function criarRascunho(body, { models } = {}) {
  const db = models || require('../models');
  const { assunto, corpo_html: corpoHtml, observacoes_ia: observacoesIa, empresaIds } = body || {};

  if (!assunto) {
    throw new ApiError(400, 'assunto é obrigatório.');
  }
  if (!corpoHtml) {
    throw new ApiError(400, 'corpo_html é obrigatório.');
  }

  return db.sequelize.transaction(async (transaction) => {
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
}

// RN-25: histórico auditável de todo e-mail do sistema — lista todas as comunicações, com
// seus destinatários, mais recentes primeiro.
async function listar({ models } = {}) {
  const db = models || require('../models');
  return db.ComunicacaoEmail.findAll({
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

// Edição humana do rascunho (revisão do texto gerado pela IA) — só permitida enquanto o
// e-mail ainda não avançou de status, para não alterar o conteúdo de algo já aprovado/enviado.
async function editar(id, body, { models } = {}) {
  const db = models || require('../models');
  const comunicacao = await buscarPorId(id, { models: db });

  if (comunicacao.status !== 'rascunho') {
    throw new ApiError(400, 'Só é possível editar enquanto o status for rascunho.');
  }

  if (Object.prototype.hasOwnProperty.call(body || {}, 'assunto')) {
    comunicacao.assunto = body.assunto;
  }
  if (Object.prototype.hasOwnProperty.call(body || {}, 'corpo_html')) {
    comunicacao.corpo_html = body.corpo_html;
  }

  return wrapSequelizeErrors(comunicacao.save());
}

// RN-28: aprovação humana explícita — obrigatória antes de qualquer envio de e-mail gerado
// por IA. O validator do model (revisaoHumanaObrigatoriaParaEnvioDeRascunhoDeIA) garante que
// revisado_por_usuario_id não pode ficar vazio quando status vira 'aprovado'/'enviado'.
async function aprovar(id, usuarioId, { models } = {}) {
  const db = models || require('../models');
  const comunicacao = await buscarPorId(id, { models: db });

  comunicacao.revisado_por_usuario_id = usuarioId;
  comunicacao.revisado_em = new Date();
  comunicacao.status = 'aprovado';

  return wrapSequelizeErrors(comunicacao.save());
}

// RN-28: transição de estado apenas — envio de e-mail de verdade (SMTP) é fora de escopo
// aqui. Só é permitido a partir de um e-mail já aprovado (ou seja, já revisado por humano).
async function enviar(id, { models } = {}) {
  const db = models || require('../models');
  const comunicacao = await buscarPorId(id, { models: db });

  if (comunicacao.status !== 'aprovado') {
    throw new ApiError(400, 'Só é possível enviar um e-mail já aprovado (RN-28).');
  }

  comunicacao.status = 'enviado';
  comunicacao.data_envio = new Date();

  return wrapSequelizeErrors(comunicacao.save());
}

module.exports = {
  criarRascunho,
  listar,
  buscarPorId,
  editar,
  aprovar,
  enviar,
};
