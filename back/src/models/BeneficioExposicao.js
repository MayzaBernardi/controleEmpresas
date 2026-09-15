'use strict';

const { Op } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const BeneficioExposicao = sequelize.define(
    'BeneficioExposicao',
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
        unique: true,
      },
      telao_ativo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      marca_site_ativo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      observacoes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      atualizado_em: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'beneficios_exposicao',
      freezeTableName: true,
      underscored: true,
      timestamps: false,
      scopes: {
        // RN-33: isolamento por perfil (mesma família de scopes das demais entidades ligadas a empresa).
        paraEmpresa(empresaId) {
          return { where: { [Op.and]: [{ empresa_id: empresaId }] } };
        },
      },
    }
  );

  BeneficioExposicao.associate = (models) => {
    BeneficioExposicao.belongsTo(models.Empresa, { foreignKey: 'empresa_id', as: 'empresa' });
  };

  return BeneficioExposicao;
};
