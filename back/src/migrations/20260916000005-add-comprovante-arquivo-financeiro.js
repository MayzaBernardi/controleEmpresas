'use strict';

// Upload da foto da nota/boleto no cadastro do lançamento financeiro — mesmo padrão de
// contratos/documentos (base64 direto no Postgres, ver 20260916000002-add-arquivo-contratos-documentos.js).
// Reaproveita o prefixo `comprovante_` já existente na tabela (comprovante_url) em vez de
// introduzir `arquivo_*` só aqui.
module.exports = {
  up: async (qi, Sq) => {
    await qi.addColumn('financeiro_lancamentos', 'comprovante_mimetype', { type: Sq.STRING(150), allowNull: true });
    await qi.addColumn('financeiro_lancamentos', 'comprovante_base64', { type: Sq.TEXT, allowNull: true });
  },

  down: async (qi) => {
    await qi.removeColumn('financeiro_lancamentos', 'comprovante_base64');
    await qi.removeColumn('financeiro_lancamentos', 'comprovante_mimetype');
  },
};
