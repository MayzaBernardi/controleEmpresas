'use strict';

module.exports = (sequelize, DataTypes) => {
  const ComunicacaoDestinatario = sequelize.define(
    'ComunicacaoDestinatario',
    {
      comunicacao_email_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
      },
      empresa_id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
      },
    },
    {
      tableName: 'comunicacoes_destinatarios',
      freezeTableName: true,
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
    }
  );

  ComunicacaoDestinatario.associate = (models) => {
    ComunicacaoDestinatario.belongsTo(models.ComunicacaoEmail, { foreignKey: 'comunicacao_email_id', as: 'comunicacaoEmail' });
    ComunicacaoDestinatario.belongsTo(models.Empresa, { foreignKey: 'empresa_id', as: 'empresa' });
  };

  return ComunicacaoDestinatario;
};
