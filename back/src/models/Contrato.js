'use strict';

const { Op } = require('sequelize');

const DIAS_ANTECEDENCIA_RENOVACAO = 60;

module.exports = (sequelize, DataTypes) => {
  const Contrato = sequelize.define(
    'Contrato',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      empresa_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      contrato_anterior_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      numero_termo: {
        type: DataTypes.STRING(100),
        allowNull: true,
        unique: true,
      },
      data_inicio_vigencia: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      data_termino_vigencia: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      status_contrato_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      numero_chamado_procuradoria: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      data_envio_procuradoria: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      data_retorno_procuradoria: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      valor_anuidade: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      observacoes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      plano_id: {
        type: DataTypes.BIGINT,
        allowNull: true, // nullable: contratos legados não têm plano atribuído retroativamente (ADR 0005 §1)
      },
      isento_taxa: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      motivo_isencao: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      documento_referencia: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      isencao_inicio: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      isencao_fim: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      // RN-30: estados derivados de tempo, calculados em leitura — nunca persistidos.
      estaVencido: {
        type: DataTypes.VIRTUAL,
        get() {
          const termino = this.getDataValue('data_termino_vigencia');
          if (!termino) return false;
          return new Date(termino) < new Date(new Date().toDateString());
        },
      },
      estaProximoVencimento: {
        type: DataTypes.VIRTUAL,
        get() {
          const termino = this.getDataValue('data_termino_vigencia');
          if (!termino) return false;
          const hoje = new Date(new Date().toDateString());
          const limite = new Date(hoje);
          limite.setDate(limite.getDate() + DIAS_ANTECEDENCIA_RENOVACAO);
          const dataTermino = new Date(termino);
          return dataTermino >= hoje && dataTermino <= limite;
        },
      },
    },
    {
      tableName: 'contratos',
      freezeTableName: true,
      underscored: true,
      validate: {
        // RN-34: isenção de taxa exige motivo e documento de referência registrados.
        motivoEDocumentoObrigatoriosParaIsencao() {
          if (this.isento_taxa && (!this.motivo_isencao || !this.motivo_isencao.trim())) {
            throw new Error('motivo_isencao é obrigatório quando isento_taxa = true (RN-34).');
          }
          if (this.isento_taxa && (!this.documento_referencia || !this.documento_referencia.trim())) {
            throw new Error('documento_referencia é obrigatório quando isento_taxa = true (RN-34).');
          }
        },
      },
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

  Contrato.associate = (models) => {
    Contrato.belongsTo(models.Empresa, { foreignKey: 'empresa_id', as: 'empresa' });
    Contrato.belongsTo(models.Contrato, { foreignKey: 'contrato_anterior_id', as: 'contratoAnterior' });
    Contrato.hasMany(models.Contrato, { foreignKey: 'contrato_anterior_id', as: 'renovacoes' });
    Contrato.belongsTo(models.StatusContrato, { foreignKey: 'status_contrato_id', as: 'statusContrato' });
    Contrato.belongsTo(models.PlanoAfiliacao, { foreignKey: 'plano_id', as: 'plano' });
    Contrato.hasMany(models.Assinatura, { foreignKey: 'contrato_id', as: 'assinaturas' });
    Contrato.hasMany(models.Documento, { foreignKey: 'contrato_id', as: 'documentos' });
    Contrato.hasMany(models.FinanceiroLancamento, { foreignKey: 'contrato_id', as: 'lancamentosFinanceiros' });
  };

  return Contrato;
};
