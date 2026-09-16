'use strict';

module.exports = (sequelize, DataTypes) => {
  const ComunicacaoEmail = sequelize.define(
    'ComunicacaoEmail',
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      assunto: {
        type: DataTypes.STRING(500),
        allowNull: false,
      },
      corpo_html: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      // RN-25 / RN-28: histórico de rascunhos gerados por IA precisa marcar a origem e a revisão humana.
      gerado_por_ia: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      revisado_por_usuario_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
      revisado_em: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('rascunho', 'aprovado', 'enviado', 'falha'),
        allowNull: false,
        defaultValue: 'rascunho',
      },
      data_envio: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      observacoes_ia: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      // Excluir é soft-delete (sai da listagem) — funciona em qualquer status, diferente
      // de editar (assunto/corpo_html), que só é permitido enquanto for rascunho.
      ativo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: 'comunicacoes_email',
      freezeTableName: true,
      underscored: true,
      validate: {
        // RN-28: e-mail gerado por IA só pode ser marcado como enviado/aprovado com revisão humana registrada.
        revisaoHumanaObrigatoriaParaEnvioDeRascunhoDeIA() {
          const foiEnviadoOuAprovado = this.status === 'enviado' || this.status === 'aprovado';
          if (this.gerado_por_ia && foiEnviadoOuAprovado && !this.revisado_por_usuario_id) {
            throw new Error(
              'revisado_por_usuario_id é obrigatório antes de aprovar/enviar um e-mail gerado por IA (RN-25, RN-28).'
            );
          }
        },
      },
    }
  );

  ComunicacaoEmail.associate = (models) => {
    ComunicacaoEmail.belongsTo(models.Usuario, { foreignKey: 'revisado_por_usuario_id', as: 'revisadoPor' });
    ComunicacaoEmail.belongsToMany(models.Empresa, {
      through: models.ComunicacaoDestinatario,
      foreignKey: 'comunicacao_email_id',
      otherKey: 'empresa_id',
      as: 'destinatarios',
    });
  };

  return ComunicacaoEmail;
};
