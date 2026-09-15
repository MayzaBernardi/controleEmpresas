'use strict';

module.exports = (sequelize, DataTypes) => {
  const StatusProspeccao = sequelize.define(
    'StatusProspeccao',
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
      tableName: 'status_prospeccao',
      freezeTableName: true,
      timestamps: false,
    }
  );

  StatusProspeccao.associate = (models) => {
    StatusProspeccao.hasMany(models.Prospeccao, { foreignKey: 'status_prospeccao_id', as: 'prospeccoes' });
  };

  return StatusProspeccao;
};
