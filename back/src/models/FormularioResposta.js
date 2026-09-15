'use strict';

module.exports = (sequelize, DataTypes) => {
  const FormularioResposta = sequelize.define(
    'FormularioResposta',
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      empresa_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      email_contato: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          isEmail: true,
        },
      },
      payload_respostas: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
      status_triagem: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'aguardando',
      },
      observacoes_triagem: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: 'formulario_respostas',
      freezeTableName: true,
      underscored: true,
    }
  );

  FormularioResposta.associate = (models) => {
    FormularioResposta.belongsTo(models.Empresa, { foreignKey: 'empresa_id', as: 'empresa' });
  };

  return FormularioResposta;
};
