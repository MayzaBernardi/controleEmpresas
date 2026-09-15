'use strict';

module.exports = {
  up: async (qi, Sq) => {
    await qi.addColumn('empresas', 'telefone', {
      type: Sq.STRING(30),
      allowNull: true,
    });
    await qi.addColumn('empresas', 'cidade', {
      type: Sq.STRING(255),
      allowNull: true,
    });
    await qi.addColumn('empresas', 'uf', {
      type: Sq.STRING(2),
      allowNull: true,
    });
    await qi.addColumn('empresas', 'representante_legal', {
      type: Sq.STRING(255),
      allowNull: true,
    });
  },

  down: async (qi) => {
    // As 4 colunas abaixo foram todas adicionadas por esta própria migration, sem dado
    // pré-existente — nenhum backfill foi feito para elas (ADR 0005 §7).
    await qi.removeColumn('empresas', 'representante_legal');
    await qi.removeColumn('empresas', 'uf');
    await qi.removeColumn('empresas', 'cidade');
    await qi.removeColumn('empresas', 'telefone');
  },
};
