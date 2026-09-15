'use strict';

module.exports = {
  up: async (qi, Sq) => {
    // A coluna antiga `status_processo` (STRING livre) É MANTIDA — não é removida nem
    // renomeada. Esta migration só adiciona a nova FK, ainda NULL para todas as linhas.
    // O backfill de dado (mapeamento do texto livre para esta FK) é feito na migration
    // seguinte, separada, para manter o down() de cada uma simples e correto.
    await qi.addColumn('empresas', 'status_processo_id', {
      type: Sq.INTEGER,
      allowNull: true,
      references: {
        model: 'status_processo',
        key: 'id',
      },
    });
    await qi.addIndex('empresas', ['status_processo_id'], { name: 'empresas_status_processo_id_idx' });
  },

  down: async (qi) => {
    // Coluna adicionada só por esta migration, ainda sem nenhum dado migrado nela neste
    // ponto (o backfill é a migration seguinte, revertida separadamente antes desta).
    await qi.removeIndex('empresas', 'empresas_status_processo_id_idx');
    await qi.removeColumn('empresas', 'status_processo_id');
  },
};
