'use strict';

// RN-25 / ADR 0004 §6: leitura somente — a gravação de log_auditoria é responsabilidade
// interna de outros services (cada um grava seu próprio histórico de create/update/delete),
// não existe endpoint de escrita neste módulo.
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

module.exports = { listar };
