'use strict';

const { Op } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Empresa = sequelize.define(
    'Empresa',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      razao_social: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      nome_fantasia: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      cnpj: {
        type: DataTypes.STRING(18),
        allowNull: true,
        unique: true,
      },
      identificador_estrangeiro: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      tipo_empresa: {
        type: DataTypes.ENUM('nacional', 'internacional'),
        allowNull: false,
        defaultValue: 'nacional',
      },
      tipo_caso_especial: {
        type: DataTypes.ENUM('nenhum', 'grande_porte', 'internacional', 'outro'),
        allowNull: false,
        defaultValue: 'nenhum',
      },
      descricao_caso_especial: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status_processo: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'inscricao_pendente',
      },
      // FK para a tabela de referência status_processo (ADR 0005 §4). Mantida lado a lado
      // com o campo de texto livre acima — código novo deve preferir esta coluna, mas
      // status_processo (texto) não é removida nem deixa de ser escrita automaticamente.
      status_processo_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      contatos: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      observacoes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      telefone: {
        type: DataTypes.STRING(30),
        allowNull: true,
      },
      cidade: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      uf: {
        type: DataTypes.STRING(2),
        allowNull: true,
      },
      representante_legal: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      // Excluir uma empresa é sempre soft-delete: sai das listagens, nunca apaga de
      // verdade (referenciada por contratos/documentos/financeiro).
      ativo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: 'empresas',
      freezeTableName: true,
      underscored: true,
      validate: {
        // RN-32: nacional exige CNPJ com 14 dígitos numéricos; internacional exige identificador_estrangeiro.
        cnpjOuIdentificadorEstrangeiroObrigatorio() {
          if (this.tipo_empresa === 'internacional') {
            if (!this.identificador_estrangeiro || !this.identificador_estrangeiro.trim()) {
              throw new Error(
                'identificador_estrangeiro é obrigatório para empresas com tipo_empresa = internacional (RN-32).'
              );
            }
          } else {
            const somenteDigitos = (this.cnpj || '').replace(/\D/g, '');
            if (somenteDigitos.length !== 14) {
              throw new Error(
                'cnpj é obrigatório e deve conter 14 dígitos numéricos para empresas com tipo_empresa = nacional (RN-32).'
              );
            }
          }
        },
      },
      scopes: {
        // RN-33: isolamento por perfil — invocado explicitamente pelo controller a partir de req.user.empresa_id.
        // O filtro do scope coincide com a própria PK (`id`), então qualquer chamada que também informe um
        // `where.id` (ex.: findByPk) tomaria a mesma chave — e o merge raso do Sequelize simplesmente sobrescreve
        // chaves de `where` repetidas em vez de combiná-las com AND. Por isso o filtro é embrulhado em `Op.and`:
        // como `Op.and` é uma chave própria (um Symbol), nunca colide com o `where.id` que findByPk/findOne
        // injetam, e as duas condições continuam sendo combinadas com AND de verdade — inclusive com findByPk.
        paraEmpresa(empresaId) {
          return { where: { [Op.and]: [{ id: empresaId }] } };
        },
      },
    }
  );

  Empresa.associate = (models) => {
    Empresa.hasMany(models.Usuario, { foreignKey: 'empresa_id', as: 'usuarios' });
    Empresa.hasMany(models.FormularioResposta, { foreignKey: 'empresa_id', as: 'formularioRespostas' });
    Empresa.hasMany(models.EspacoFisico, { foreignKey: 'empresa_id', as: 'espacosFisicos' });
    Empresa.hasMany(models.Contrato, { foreignKey: 'empresa_id', as: 'contratos' });
    Empresa.hasMany(models.Documento, { foreignKey: 'empresa_id', as: 'documentos' });
    Empresa.hasMany(models.FinanceiroLancamento, { foreignKey: 'empresa_id', as: 'lancamentosFinanceiros' });
    Empresa.belongsToMany(models.ComunicacaoEmail, {
      through: models.ComunicacaoDestinatario,
      foreignKey: 'empresa_id',
      otherKey: 'comunicacao_email_id',
      as: 'comunicacoesEmail',
    });
    Empresa.belongsTo(models.StatusProcesso, { foreignKey: 'status_processo_id', as: 'statusProcessoRef' });
    Empresa.hasOne(models.BeneficioExposicao, { foreignKey: 'empresa_id', as: 'beneficioExposicao' });
    Empresa.hasMany(models.ReservaEspaco, { foreignKey: 'empresa_id', as: 'reservasEspaco' });
  };

  return Empresa;
};
