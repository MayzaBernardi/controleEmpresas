'use strict';

module.exports = {
  up: async (qi, Sq) => {
    await qi.createTable('espacos_fisicos', {
      id: {
        type: Sq.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      empresa_id: {
        type: Sq.UUID,
        allowNull: false,
        references: {
          model: 'empresas',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      identificador_sala: {
        type: Sq.STRING(50),
        allowNull: false,
      },
      bloco: {
        type: Sq.STRING(50),
        allowNull: true,
      },
      metragem_quadrada: {
        type: Sq.DECIMAL(8, 2),
        allowNull: true,
      },
      data_inicio_ocupacao: {
        type: Sq.DATEONLY,
        allowNull: false,
      },
      data_fim_ocupacao: {
        type: Sq.DATEONLY,
        allowNull: true,
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

  down: async (qi, Sq) => {
    await qi.dropTable('espacos_fisicos');
  },
};
