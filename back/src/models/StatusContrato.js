'use strict';

module.exports = (sequelize, DataTypes) => {
  const StatusContrato = sequelize.define(
    'StatusContrato',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      codigo: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      descricao: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: 'status_contrato',
      freezeTableName: true,
      timestamps: false,
    }
  );

  StatusContrato.associate = (models) => {
    StatusContrato.hasMany(models.Contrato, {
      foreignKey: 'status_contrato_id',
      as: 'contratos',
    });
  };

  return StatusContrato;
};
