'use strict';

module.exports = (sequelize, DataTypes) => {
  const LogAuditoria = sequelize.define(
    'LogAuditoria',
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      entidade: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      entidade_id: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      acao: {
        type: DataTypes.ENUM('create', 'update', 'delete'),
        allowNull: false,
      },
      usuario_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
      dados_anteriores: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      dados_novos: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
    },
    {
      tableName: 'log_auditoria',
      freezeTableName: true,
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
    }
  );

  LogAuditoria.associate = (models) => {
    LogAuditoria.belongsTo(models.Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
  };

  return LogAuditoria;
};
