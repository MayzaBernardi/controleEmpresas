'use strict';

const { Op } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const ReservaEspaco = sequelize.define(
    'ReservaEspaco',
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      empresa_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      tipo_espaco: {
        type: DataTypes.ENUM('sala_atico', 'auditorio', 'coworking'),
        allowNull: false,
      },
      data_reserva: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('pre_reservado', 'confirmado', 'realizado', 'cancelado'),
        allowNull: false,
        defaultValue: 'pre_reservado',
      },
      observacoes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: 'reservas_espaco',
      freezeTableName: true,
      underscored: true,
      scopes: {
        // RN-33: isolamento por perfil (extensão natural da regra a esta nova entidade ligada a empresa).
        paraEmpresa(empresaId) {
          return { where: { [Op.and]: [{ empresa_id: empresaId }] } };
        },
      },
    }
  );

  ReservaEspaco.associate = (models) => {
    ReservaEspaco.belongsTo(models.Empresa, { foreignKey: 'empresa_id', as: 'empresa' });
  };

  return ReservaEspaco;
};
