'use strict';

module.exports = (sequelize, DataTypes) => {
  const Usuario = sequelize.define(
    'Usuario',
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
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      papel: {
        type: DataTypes.ENUM('equipe_programa', 'empresa_afiliada', 'contabilidade'),
        allowNull: false,
      },
      empresa_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      ativo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: 'usuarios',
      freezeTableName: true,
      underscored: true,
      validate: {
        // RN-01: usuário empresa_afiliada precisa estar vinculado a uma empresa para o isolamento (RN-33) funcionar.
        empresaObrigatoriaParaPapelEmpresaAfiliada() {
          if (this.papel === 'empresa_afiliada' && !this.empresa_id) {
            throw new Error(
              'empresa_id é obrigatório para usuários com papel = empresa_afiliada (RN-01, RN-33).'
            );
          }
        },
      },
    }
  );

  Usuario.associate = (models) => {
    Usuario.belongsTo(models.Empresa, { foreignKey: 'empresa_id', as: 'empresa' });
    Usuario.hasMany(models.ComunicacaoEmail, { foreignKey: 'revisado_por_usuario_id', as: 'comunicacoesRevisadas' });
    Usuario.hasMany(models.LogAuditoria, { foreignKey: 'usuario_id', as: 'logsAuditoria' });
  };

  return Usuario;
};
