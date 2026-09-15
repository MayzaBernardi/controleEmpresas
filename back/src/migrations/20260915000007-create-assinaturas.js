'use strict';

module.exports = {
  up: async (qi, Sq) => {
    // Os tipos ENUM (enum_assinaturas_papel_assinatura / enum_assinaturas_status) são
    // criados automaticamente pelo Sq.ENUM(...) abaixo.
    await qi.createTable('assinaturas', {
      id: {
        type: Sq.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      contrato_id: {
        type: Sq.UUID,
        allowNull: false,
        references: {
          model: 'contratos',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      nome_signatario: {
        type: Sq.STRING(255),
        allowNull: false,
      },
      email_signatario: {
        type: Sq.STRING(255),
        allowNull: false,
      },
      papel_assinatura: {
        type: Sq.ENUM(
          'representante_legal',
          'assinante_institucional_1',
          'assinante_institucional_2',
          'assinante_institucional_3',
          'reitor'
        ),
        allowNull: false,
      },
      status: {
        type: Sq.ENUM('pendente', 'assinado', 'rejeitado'),
        allowNull: false,
        defaultValue: 'pendente',
      },
      data_assinatura: {
        type: Sq.DATE,
        allowNull: true,
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

    await qi.addConstraint('assinaturas', {
      fields: ['contrato_id', 'papel_assinatura'],
      type: 'unique',
      name: 'assinaturas_contrato_papel_unique',
    });
  },

  down: async (qi) => {
    await qi.removeConstraint('assinaturas', 'assinaturas_contrato_papel_unique');
    await qi.dropTable('assinaturas');
  },
};
