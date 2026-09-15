'use strict';

module.exports = {
  up: async (qi, Sq) => {
    await qi.createTable('planos_afiliacao', {
      id: {
        type: Sq.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      nome: {
        type: Sq.STRING(255),
        allowNull: false,
        unique: true,
      },
      valor: {
        type: Sq.DECIMAL(12, 2),
        allowNull: false,
      },
      ativo: {
        type: Sq.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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

  down: async (qi) => {
    await qi.dropTable('planos_afiliacao');
  },
};
