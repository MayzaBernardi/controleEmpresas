'use strict';

module.exports = {
  up: async (qi, Sq) => {
    await qi.addColumn('contratos', 'isento_taxa', {
      type: Sq.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await qi.addColumn('contratos', 'motivo_isencao', {
      type: Sq.TEXT,
      allowNull: true,
    });
    await qi.addColumn('contratos', 'documento_referencia', {
      type: Sq.STRING(100),
      allowNull: true,
    });
    await qi.addColumn('contratos', 'isencao_inicio', {
      type: Sq.DATEONLY,
      allowNull: true,
    });
    await qi.addColumn('contratos', 'isencao_fim', {
      type: Sq.DATEONLY,
      allowNull: true,
    });
  },

  down: async (qi) => {
    // As 5 colunas abaixo foram todas adicionadas por esta própria migration — nenhuma
    // tinha dado pré-existente antes desta tarefa (contratos legados ficaram com o default
    // isento_taxa = false e o restante NULL). Reverter com removeColumn é seguro aqui.
    await qi.removeColumn('contratos', 'isencao_fim');
    await qi.removeColumn('contratos', 'isencao_inicio');
    await qi.removeColumn('contratos', 'documento_referencia');
    await qi.removeColumn('contratos', 'motivo_isencao');
    await qi.removeColumn('contratos', 'isento_taxa');
  },
};
