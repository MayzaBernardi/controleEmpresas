'use strict';

module.exports = {
  up: async (qi, Sq) => {
    await qi.createTable('beneficios_exposicao', {
      id: {
        type: Sq.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      empresa_id: {
        type: Sq.UUID,
        allowNull: false,
        unique: true, // relação 1:1 com empresas
        references: {
          model: 'empresas',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      telao_ativo: {
        type: Sq.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      marca_site_ativo: {
        type: Sq.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      observacoes: {
        type: Sq.TEXT,
        allowNull: true,
      },
      atualizado_em: {
        type: Sq.DATE,
        allowNull: false,
        defaultValue: Sq.literal('NOW()'),
      },
    });
  },

  down: async (qi) => {
    await qi.dropTable('beneficios_exposicao');
  },
};
