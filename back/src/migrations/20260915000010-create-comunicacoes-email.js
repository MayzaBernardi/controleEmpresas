'use strict';

module.exports = {
  up: async (qi, Sq) => {
    // O tipo ENUM (enum_comunicacoes_email_status) é criado automaticamente pelo
    // Sq.ENUM(...) abaixo.
    await qi.createTable('comunicacoes_email', {
      id: {
        type: Sq.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      assunto: {
        type: Sq.STRING(500),
        allowNull: false,
      },
      corpo_html: {
        type: Sq.TEXT,
        allowNull: false,
      },
      gerado_por_ia: {
        type: Sq.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      revisado_por_usuario_id: {
        type: Sq.BIGINT,
        allowNull: true,
        references: {
          model: 'usuarios',
          key: 'id',
        },
        onDelete: 'SET NULL',
      },
      revisado_em: {
        type: Sq.DATE,
        allowNull: true,
      },
      status: {
        type: Sq.ENUM('rascunho', 'aprovado', 'enviado', 'falha'),
        allowNull: false,
        defaultValue: 'rascunho',
      },
      data_envio: {
        type: Sq.DATE,
        allowNull: true,
      },
      observacoes_ia: {
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

  down: async (qi) => {
    await qi.dropTable('comunicacoes_email');
  },
};
