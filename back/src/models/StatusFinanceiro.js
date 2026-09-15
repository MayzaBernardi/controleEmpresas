'use strict';

module.exports = (sequelize, DataTypes) => {
  const StatusFinanceiro = sequelize.define(
    'StatusFinanceiro',
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
      tableName: 'status_financeiro',
      freezeTableName: true,
      timestamps: false,
    }
  );

  StatusFinanceiro.associate = (models) => {
    StatusFinanceiro.hasMany(models.FinanceiroLancamento, {
      foreignKey: 'status_financeiro_id',
      as: 'lancamentos',
    });
  };

  return StatusFinanceiro;
};
