'use strict';

module.exports = {
  up: async (qi, Sq) => {
    await qi.createTable('comunicacoes_destinatarios', {
      comunicacao_email_id: {
        type: Sq.BIGINT,
        allowNull: false,
        primaryKey: true,
        references: {
          model: 'comunicacoes_email',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      empresa_id: {
        type: Sq.UUID,
        allowNull: false,
        primaryKey: true,
        references: {
          model: 'empresas',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      created_at: {
        type: Sq.DATE,
        allowNull: false,
        defaultValue: Sq.literal('NOW()'),
      },
    });

    await qi.addIndex('comunicacoes_destinatarios', ['empresa_id'], {
      name: 'comunicacoes_destinatarios_empresa_id_idx',
    });
  },

  down: async (qi) => {
    await qi.removeIndex('comunicacoes_destinatarios', 'comunicacoes_destinatarios_empresa_id_idx');
    await qi.dropTable('comunicacoes_destinatarios');
  },
};
