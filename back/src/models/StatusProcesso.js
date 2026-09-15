'use strict';

module.exports = (sequelize, DataTypes) => {
  const StatusProcesso = sequelize.define(
    'StatusProcesso',
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
      ordem: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
      },
      descricao: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: 'status_processo',
      freezeTableName: true,
      timestamps: false,
    }
  );

  StatusProcesso.associate = (models) => {
    StatusProcesso.hasMany(models.Empresa, { foreignKey: 'status_processo_id', as: 'empresas' });
  };

  return StatusProcesso;
};
