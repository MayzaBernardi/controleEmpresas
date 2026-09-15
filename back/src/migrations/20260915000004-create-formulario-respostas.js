'use strict';

module.exports = {
  up: async (qi, Sq) => {
    await qi.createTable('formulario_respostas', {
      id: {
        type: Sq.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      empresa_id: {
        type: Sq.UUID,
        allowNull: true,
        references: {
          model: 'empresas',
          key: 'id',
        },
        onDelete: 'SET NULL',
      },
      email_contato: {
        type: Sq.STRING(255),
        allowNull: false,
      },
      payload_respostas: {
        type: Sq.JSONB,
        allowNull: false,
      },
      status_triagem: {
        type: Sq.STRING(50),
        allowNull: false,
        defaultValue: 'aguardando',
      },
      observacoes_triagem: {
        type: Sq.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sq.DATE,
        allowNull: false,
        defaultValue: Sq.literal('NOW()'),
      },
      updated_at: {
        type: Sq.DATE,
        allowNull: false,
        defaultValue: Sq.literal('NOW()'),
      },
    });
  },

  down: async (qi, Sq) => {
    await qi.dropTable('formulario_respostas');
  },
};
