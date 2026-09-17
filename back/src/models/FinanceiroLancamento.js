'use strict';

const { Op } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const FinanceiroLancamento = sequelize.define(
    'FinanceiroLancamento',
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
      numero_documento: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      numero_nota_fiscal: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      valor: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      forma_pagamento: {
        type: DataTypes.ENUM('boleto', 'pix', 'parcelado'),
        allowNull: false,
        defaultValue: 'boleto',
      },
      parcela_numero: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      total_parcelas: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      data_vencimento: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      data_pagamento: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      status_financeiro_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      comprovante_url: {
        type: DataTypes.STRING(1000),
        allowNull: true,
      },
      comprovante_mimetype: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      comprovante_base64: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      observacoes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      // RN-31: "atrasado" é derivado em leitura — nunca persistido em status_financeiro_id.
      estaAtrasado: {
        type: DataTypes.VIRTUAL,
        get() {
          const vencimento = this.getDataValue('data_vencimento');
          const pagamento = this.getDataValue('data_pagamento');
          if (!vencimento || pagamento) return false;
          return new Date(vencimento) < new Date(new Date().toDateString());
        },
      },
    },
    {
      tableName: 'financeiro_lancamentos',
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

  FinanceiroLancamento.associate = (models) => {
    FinanceiroLancamento.belongsTo(models.Empresa, { foreignKey: 'empresa_id', as: 'empresa' });
    FinanceiroLancamento.belongsTo(models.Contrato, { foreignKey: 'contrato_id', as: 'contrato' });
    FinanceiroLancamento.belongsTo(models.StatusFinanceiro, { foreignKey: 'status_financeiro_id', as: 'statusFinanceiro' });
  };

  return FinanceiroLancamento;
};
