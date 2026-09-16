'use strict';

module.exports = (sequelize, DataTypes) => {
  const Prospeccao = sequelize.define(
    'Prospeccao',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      nome_empresa: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      cidade: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      uf: {
        type: DataTypes.STRING(2),
        allowNull: true,
      },
      email_contato: {
        type: DataTypes.STRING(255),
        allowNull: true,
        validate: {
          isEmail: { msg: 'email_contato deve ser um e-mail válido.' },
        },
      },
      telefone_contato: {
        type: DataTypes.STRING(30),
        allowNull: true,
      },
      responsavel_interno: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      status_prospeccao_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      formulario_resposta_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
      observacoes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      // Excluir é soft-delete (sai da listagem). Distinto de ter sido "convertida" —
      // conversão é `formulario_resposta_id` deixando de ser null (RN-36).
      ativo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: 'prospeccoes',
      freezeTableName: true,
      underscored: true,
    }
  );

  Prospeccao.associate = (models) => {
    Prospeccao.belongsTo(models.StatusProspeccao, { foreignKey: 'status_prospeccao_id', as: 'statusProspeccao' });
    Prospeccao.belongsTo(models.FormularioResposta, { foreignKey: 'formulario_resposta_id', as: 'formularioResposta' });
  };

  return Prospeccao;
};
