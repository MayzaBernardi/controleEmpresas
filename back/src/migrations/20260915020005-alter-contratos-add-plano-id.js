'use strict';

module.exports = {
  up: async (qi, Sq) => {
    await qi.addColumn('contratos', 'plano_id', {
      type: Sq.BIGINT,
      allowNull: true,
      references: {
        model: 'planos_afiliacao',
        key: 'id',
      },
      onDelete: 'SET NULL',
    });
    await qi.addIndex('contratos', ['plano_id'], { name: 'contratos_plano_id_idx' });
  },

  down: async (qi) => {
    // `plano_id` foi adicionada por esta própria migration (nenhum dado pré-existente vive
    // nela) — reverter com removeColumn aqui não conflita com a regra "nunca DROP COLUMN"
    // desta etapa, que protege colunas antigas que já tinham dado real antes desta tarefa.
    await qi.removeIndex('contratos', 'contratos_plano_id_idx');
    await qi.removeColumn('contratos', 'plano_id');
  },
};
