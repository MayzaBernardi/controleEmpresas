'use strict';

const { Op } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Documento = sequelize.define(
    'Documento',
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
      contrato_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      tipo_documento: {
        type: DataTypes.ENUM(
          'estatuto_social',
          'cnpj',
          'certidao_negativa',
          'procuracao',
          'comprovante_endereco',
          'minuta_contrato',
          'outro'
        ),
        allowNull: false,
      },
      nome_arquivo: {
        type: DataTypes.STRING(500),
        allowNull: false,
      },
      // Opcional agora: um documento tem OU uma url_arquivo externa OU um upload direto
      // (arquivo_base64) — pelo menos um dos dois, validado no service, não no model.
      url_arquivo: {
        type: DataTypes.STRING(1000),
        allowNull: true,
      },
      arquivo_mimetype: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      arquivo_base64: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('pendente', 'aprovado', 'rejeitado'),
        allowNull: false,
        defaultValue: 'pendente',
      },
      observacoes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      // Excluir é soft-delete (sai da listagem).
      ativo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: 'documentos',
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

  Documento.associate = (models) => {
    Documento.belongsTo(models.Empresa, { foreignKey: 'empresa_id', as: 'empresa' });
    Documento.belongsTo(models.Contrato, { foreignKey: 'contrato_id', as: 'contrato' });
  };

  return Documento;
};
