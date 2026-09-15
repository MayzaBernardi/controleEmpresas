'use strict';

module.exports = {
  up: async (qi, Sq) => {
    // O tipo ENUM (enum_log_auditoria_acao) é criado automaticamente pelo Sq.ENUM(...) abaixo.
    await qi.createTable('log_auditoria', {
      id: {
        type: Sq.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      entidade: {
        type: Sq.STRING(100),
        allowNull: false,
      },
      entidade_id: {
        type: Sq.STRING(100),
        allowNull: false,
      },
      acao: {
        type: Sq.ENUM('create', 'update', 'delete'),
        allowNull: false,
      },
      usuario_id: {
        type: Sq.BIGINT,
        allowNull: true,
        references: {
          model: 'usuarios',
          key: 'id',
        },
        onDelete: 'SET NULL',
      },
      dados_anteriores: {
        type: Sq.JSONB,
        allowNull: true,
      },
      dados_novos: {
        type: Sq.JSONB,
        allowNull: true,
      },
      created_at: {
        type: Sq.DATE,
        allowNull: false,
        defaultValue: Sq.literal('NOW()'),
      },
    });

    await qi.addIndex('log_auditoria', ['entidade', 'entidade_id'], {
      name: 'log_auditoria_entidade_entidade_id_idx',
    });
  },

  down: async (qi) => {
    await qi.removeIndex('log_auditoria', 'log_auditoria_entidade_entidade_id_idx');
    await qi.dropTable('log_auditoria');
  },
};
