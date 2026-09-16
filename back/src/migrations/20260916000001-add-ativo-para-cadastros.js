'use strict';

// Excluir um cadastro (Empresas, Prospecção, Contratos, Documentos, Comunicações) é sempre
// soft-delete (RN a confirmar formalmente, decisão tomada com o negócio em 2026-09-16): o
// registro sai das listagens mas nunca é apagado de verdade — mesmo padrão já usado em
// Usuario/PlanoAfiliacao/EspacoFisico.
const TABELAS = ['empresas', 'prospeccoes', 'contratos', 'documentos', 'comunicacoes_email'];

module.exports = {
  up: async (qi, Sq) => {
    for (const tabela of TABELAS) {
      await qi.addColumn(tabela, 'ativo', {
        type: Sq.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      });
    }
  },

  down: async (qi) => {
    for (const tabela of TABELAS) {
      await qi.removeColumn(tabela, 'ativo');
    }
  },
};
