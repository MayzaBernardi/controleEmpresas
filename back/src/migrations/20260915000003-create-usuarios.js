'use strict';

module.exports = {
  up: async (qi, Sq) => {
    // O tipo ENUM (enum_usuarios_papel) é criado automaticamente pelo Sq.ENUM(...) abaixo.
    await qi.createTable('usuarios', {
      id: {
        type: Sq.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      nome: {
        type: Sq.STRING(255),
        allowNull: false,
      },
      email: {
        type: Sq.STRING(255),
        allowNull: false,
        unique: true,
      },
      papel: {
        type: Sq.ENUM('equipe_programa', 'empresa_afiliada', 'contabilidade'),
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
    await qi.dropTable('usuarios');
  },
};
