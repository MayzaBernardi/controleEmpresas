'use strict';

const { Op } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const EspacoFisico = sequelize.define(
    'EspacoFisico',
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
      identificador_sala: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      bloco: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      metragem_quadrada: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: true,
      },
      data_inicio_ocupacao: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      data_fim_ocupacao: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      ativo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: 'espacos_fisicos',
      freezeTableName: true,
      underscored: true,
      scopes: {
        // RN-33: isolamento por perfil.
        // Embrulhado em Op.and (chave própria, nunca colide com outro `where`) para que o filtro nunca seja
        // sobrescrito por um `where.empresa_id` repetido na query — ver a explicação completa em Empresa.js.
        paraEmpresa(empresaId) {
          return { where: { [Op.and]: [{ empresa_id: empresaId }] } };
        },
      },
    }
  );

  EspacoFisico.associate = (models) => {
    EspacoFisico.belongsTo(models.Empresa, { foreignKey: 'empresa_id', as: 'empresa' });
  };

  return EspacoFisico;
};
