'use strict';

// RN-25 / ADR 0004 §6: sem endpoint de escrita neste módulo — `registrar` é chamado
// internamente pelos outros services (cada um grava seu próprio histórico de
// create/update/delete), nunca por um controller/rota diretamente.
async function listar({ entidade, entidadeId, models } = {}) {
  const db = models || require('../models');

  const where = {};
  if (entidade) {
    where.entidade = entidade;
  }
  if (entidadeId) {
    where.entidade_id = entidadeId;
  }

  return db.LogAuditoria.findAll({
    where,
    order: [['created_at', 'DESC']],
  });
}

// Nunca lança — uma falha ao gravar o log não pode derrubar a operação de negócio que
// já foi concluída (o registro principal já existe quando isto é chamado).
async function registrar({ entidade, entidadeId, acao, usuario, dadosAnteriores, dadosNovos, models } = {}) {
  const db = models || require('../models');
  try {
    await db.LogAuditoria.create({
      entidade,
      entidade_id: String(entidadeId),
      acao,
      usuario_id: usuario?.id ?? null,
      dados_anteriores: dadosAnteriores ?? null,
      dados_novos: dadosNovos ?? null,
    });
  } catch (error) {
    console.error('Falha ao registrar log de auditoria:', error);
  }
}

module.exports = { listar, registrar };
