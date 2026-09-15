'use strict';

module.exports = {
  up: async (qi, Sq) => {
    await qi.createTable('prospeccoes', {
      id: {
        type: Sq.UUID,
        defaultValue: Sq.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      nome_empresa: {
        type: Sq.STRING(255),
        allowNull: false,
      },
      cidade: {
        type: Sq.STRING(255),
        allowNull: true,
      },
      uf: {
        type: Sq.STRING(2),
        allowNull: true,
      },
      email_contato: {
        type: Sq.STRING(255),
        allowNull: true,
      },
      telefone_contato: {
        type: Sq.STRING(30),
        allowNull: true,
      },
      responsavel_interno: {
        type: Sq.STRING(255),
        allowNull: true,
      },
      status_prospeccao_id: {
        type: Sq.INTEGER,
        allowNull: false,
        defaultValue: 1,
        references: {
          model: 'status_prospeccao',
          key: 'id',
        },
      },
      formulario_resposta_id: {
        type: Sq.BIGINT,
        allowNull: true,
        references: {
          model: 'formulario_respostas',
          key: 'id',
        },
        onDelete: 'SET NULL',
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

    await qi.addIndex('prospeccoes', ['status_prospeccao_id'], { name: 'prospeccoes_status_prospeccao_id_idx' });
    await qi.addIndex('prospeccoes', ['email_contato'], { name: 'prospeccoes_email_contato_idx' });
  },

  down: async (qi) => {
    await qi.removeIndex('prospeccoes', 'prospeccoes_email_contato_idx');
    await qi.removeIndex('prospeccoes', 'prospeccoes_status_prospeccao_id_idx');
    await qi.dropTable('prospeccoes');
  },
};
