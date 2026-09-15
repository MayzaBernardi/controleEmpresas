'use strict';

module.exports = {
  up: async (qi, Sq) => {
    // Sem CREATE TYPE manual: o tipo ENUM do Postgres é criado automaticamente pelo
    // Sq.ENUM(...) abaixo (lição do ADR 0004 — CREATE TYPE manual ficava órfão e
    // desalinhado do tipo que o Sequelize de fato usa).
    await qi.createTable('reservas_espaco', {
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
      tipo_espaco: {
        type: Sq.ENUM('sala_atico', 'auditorio', 'coworking'),
        allowNull: false,
      },
      data_reserva: {
        type: Sq.DATEONLY,
        allowNull: true, // ver RN-35 / ADR 0005 §6: nem toda reserva legada tem data conhecida
      },
      status: {
        type: Sq.ENUM('pre_reservado', 'confirmado', 'realizado', 'cancelado'),
        allowNull: false,
        defaultValue: 'pre_reservado',
      },
      observacoes: {
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

    await qi.addIndex('reservas_espaco', ['empresa_id', 'tipo_espaco'], { name: 'reservas_espaco_empresa_tipo_idx' });
  },

  down: async (qi) => {
    await qi.removeIndex('reservas_espaco', 'reservas_espaco_empresa_tipo_idx');
    await qi.dropTable('reservas_espaco');
  },
};
