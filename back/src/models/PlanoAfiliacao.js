'use strict';

module.exports = (sequelize, DataTypes) => {
  const PlanoAfiliacao = sequelize.define(
    'PlanoAfiliacao',
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      nome: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
      },
      valor: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      ativo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: 'planos_afiliacao',
      freezeTableName: true,
      underscored: true,
    }
  );

  PlanoAfiliacao.associate = (models) => {
    PlanoAfiliacao.hasMany(models.Contrato, { foreignKey: 'plano_id', as: 'contratos' });
  };

  return PlanoAfiliacao;
};
