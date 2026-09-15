'use strict';

module.exports = {
  up: async (qi, Sq) => {
    // Os tipos ENUM (enum_documentos_tipo_documento / enum_documentos_status) são
    // criados automaticamente pelo Sq.ENUM(...) abaixo.
    await qi.createTable('documentos', {
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
      contrato_id: {
        type: Sq.UUID,
        allowNull: true,
        references: {
          model: 'contratos',
          key: 'id',
        },
        onDelete: 'SET NULL',
      },
      tipo_documento: {
        type: Sq.ENUM(
          'estatuto_social',
          'cnpj',
          'certidao_negativa',
          'procuracao',
          'comprovante_endereco',
          'minuta_contrato',
          'outro'
        ),
        allowNull: false,
      },
      nome_arquivo: {
        type: Sq.STRING(500),
        allowNull: false,
      },
      url_arquivo: {
        type: Sq.STRING(1000),
        allowNull: false,
      },
      status: {
        type: Sq.ENUM('pendente', 'aprovado', 'rejeitado'),
        allowNull: false,
        defaultValue: 'pendente',
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
  },

  down: async (qi) => {
    await qi.dropTable('documentos');
  },
};
