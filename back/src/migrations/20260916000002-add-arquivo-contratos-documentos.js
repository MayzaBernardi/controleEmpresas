'use strict';

// Upload de contrato/documento (PNG ou PDF) armazenado direto no Postgres como base64 —
// decisão explícita do negócio (2026-09-16): nada de storage externo por enquanto. O limite
// de tamanho de payload aceito pelo Express foi ajustado em app.js na mesma tarefa.
module.exports = {
  up: async (qi, Sq) => {
    await qi.addColumn('contratos', 'arquivo_nome', { type: Sq.STRING(500), allowNull: true });
    await qi.addColumn('contratos', 'arquivo_mimetype', { type: Sq.STRING(150), allowNull: true });
    await qi.addColumn('contratos', 'arquivo_base64', { type: Sq.TEXT, allowNull: true });

    // Documento já tem `nome_arquivo` (usado tanto pra upload quanto pra URL externa) —
    // só faltam o mimetype/conteúdo do upload, e `url_arquivo` vira opcional porque agora
    // um documento pode ter OU uma URL externa OU um arquivo enviado direto.
    await qi.addColumn('documentos', 'arquivo_mimetype', { type: Sq.STRING(150), allowNull: true });
    await qi.addColumn('documentos', 'arquivo_base64', { type: Sq.TEXT, allowNull: true });
    await qi.changeColumn('documentos', 'url_arquivo', { type: Sq.STRING(1000), allowNull: true });
  },

  down: async (qi, Sq) => {
    await qi.changeColumn('documentos', 'url_arquivo', { type: Sq.STRING(1000), allowNull: false });
    await qi.removeColumn('documentos', 'arquivo_base64');
    await qi.removeColumn('documentos', 'arquivo_mimetype');

    await qi.removeColumn('contratos', 'arquivo_base64');
    await qi.removeColumn('contratos', 'arquivo_mimetype');
    await qi.removeColumn('contratos', 'arquivo_nome');
  },
};
