'use strict';

module.exports = {
  up: async (qi, Sq) => {
    // Os tipos ENUM do Postgres são criados automaticamente pelo Sq.ENUM(...) abaixo
    // (nomeados enum_empresas_tipo_empresa / enum_empresas_tipo_caso_especial) — não
    // criamos os tipos manualmente para evitar tipos órfãos e desalinhados no schema.
    await qi.createTable('empresas', {
      id: {
        type: Sq.UUID,
        defaultValue: Sq.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      razao_social: {
        type: Sq.STRING(255),
        allowNull: false,
      },
      nome_fantasia: {
        type: Sq.STRING(255),
        allowNull: true,
      },
      cnpj: {
        type: Sq.STRING(18),
        allowNull: true,
        unique: true,
      },
      identificador_estrangeiro: {
        type: Sq.STRING(100),
        allowNull: true,
      },
      tipo_empresa: {
        type: Sq.ENUM('nacional', 'internacional'),
        allowNull: false,
        defaultValue: 'nacional',
      },
      tipo_caso_especial: {
        type: Sq.ENUM('nenhum', 'grande_porte', 'internacional', 'outro'),
        allowNull: false,
        defaultValue: 'nenhum',
      },
      descricao_caso_especial: {
        type: Sq.TEXT,
        allowNull: true,
      },
      status_processo: {
        type: Sq.STRING(50),
        allowNull: false,
        defaultValue: 'inscricao_pendente',
      },
      contatos: {
        type: Sq.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      observacoes: {
        type: Sq.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sq.DATE,
        allowNull: false,
        defaultValue: Sq.literal('NOW()'),
      },
      updated_at: {
        type: Sq.DATE,
        allowNull: false,
        defaultValue: Sq.literal('NOW()'),
      },
    });
  },

  down: async (qi) => {
    await qi.dropTable('empresas');
  },
};
