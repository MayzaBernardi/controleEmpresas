'use strict';

module.exports = {
  up: async (qi, Sq) => {
    await qi.createTable('contratos', {
      id: {
        type: Sq.UUID,
        defaultValue: Sq.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      empresa_id: {
        type: Sq.UUID,
        allowNull: false,
        references: {
          model: 'empresas',
          key: 'id',
        },
        onDelete: 'RESTRICT',
      },
      contrato_anterior_id: {
        type: Sq.UUID,
        allowNull: true,
        references: {
          model: 'contratos',
          key: 'id',
        },
        onDelete: 'SET NULL',
      },
      numero_termo: {
        type: Sq.STRING(100),
        allowNull: true,
        unique: true,
      },
      data_inicio_vigencia: {
        type: Sq.DATEONLY,
        allowNull: false,
      },
      data_termino_vigencia: {
        type: Sq.DATEONLY,
        allowNull: false,
      },
      status_contrato_id: {
        type: Sq.INTEGER,
        allowNull: false,
        defaultValue: 1,
        references: {
          model: 'status_contrato',
          key: 'id',
        },
      },
      numero_chamado_procuradoria: {
        type: Sq.STRING(100),
        allowNull: true,
      },
      data_envio_procuradoria: {
        type: Sq.DATEONLY,
        allowNull: true,
      },
      data_retorno_procuradoria: {
        type: Sq.DATEONLY,
        allowNull: true,
      },
      valor_anuidade: {
        type: Sq.DECIMAL(12, 2),
        allowNull: false,
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

    await qi.addIndex('contratos', ['empresa_id'], { name: 'contratos_empresa_id_idx' });
    await qi.addIndex('contratos', ['status_contrato_id'], { name: 'contratos_status_contrato_id_idx' });
  },

  down: async (qi, Sq) => {
    await qi.removeIndex('contratos', 'contratos_status_contrato_id_idx');
    await qi.removeIndex('contratos', 'contratos_empresa_id_idx');
    await qi.dropTable('contratos');
  },
};
