'use strict';

module.exports = (sequelize, DataTypes) => {
  const Assinatura = sequelize.define(
    'Assinatura',
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      contrato_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      nome_signatario: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      email_signatario: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          isEmail: true,
        },
      },
      papel_assinatura: {
        type: DataTypes.ENUM(
          'representante_legal',
          'assinante_institucional_1',
          'assinante_institucional_2',
          'assinante_institucional_3',
          'reitor'
        ),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('pendente', 'assinado', 'rejeitado'),
        allowNull: false,
        defaultValue: 'pendente',
      },
      data_assinatura: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      observacoes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: 'assinaturas',
      freezeTableName: true,
      underscored: true,
    }
  );

  Assinatura.associate = (models) => {
    Assinatura.belongsTo(models.Contrato, { foreignKey: 'contrato_id', as: 'contrato' });
  };

  return Assinatura;
};
