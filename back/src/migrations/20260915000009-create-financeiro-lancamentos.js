'use strict';

module.exports = {
  up: async (qi, Sq) => {
    // O tipo ENUM (enum_financeiro_lancamentos_forma_pagamento) é criado automaticamente
    // pelo Sq.ENUM(...) abaixo.
    await qi.createTable('financeiro_lancamentos', {
      id: {
        type: Sq.BIGINT,
        primaryKey: true,
        autoIncrement: true,
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
      contrato_id: {
        type: Sq.UUID,
        allowNull: true,
        references: {
          model: 'contratos',
          key: 'id',
        },
        onDelete: 'SET NULL',
      },
      numero_documento: {
        type: Sq.STRING(100),
        allowNull: true,
      },
      numero_nota_fiscal: {
        type: Sq.STRING(100),
        allowNull: true,
      },
      valor: {
        type: Sq.DECIMAL(12, 2),
        allowNull: false,
      },
      forma_pagamento: {
        type: Sq.ENUM('boleto', 'pix', 'parcelado'),
        allowNull: false,
        defaultValue: 'boleto',
      },
      parcela_numero: {
        type: Sq.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      total_parcelas: {
        type: Sq.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      data_vencimento: {
        type: Sq.DATEONLY,
        allowNull: false,
      },
      data_pagamento: {
        type: Sq.DATEONLY,
        allowNull: true,
      },
      status_financeiro_id: {
        type: Sq.INTEGER,
        allowNull: false,
        defaultValue: 1,
        references: {
          model: 'status_financeiro',
          key: 'id',
        },
      },
      comprovante_url: {
        type: Sq.STRING(1000),
        allowNull: true,
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

    await qi.addIndex('financeiro_lancamentos', ['empresa_id'], { name: 'financeiro_lancamentos_empresa_id_idx' });
    await qi.addIndex('financeiro_lancamentos', ['status_financeiro_id'], { name: 'financeiro_lancamentos_status_financeiro_id_idx' });
    await qi.addIndex('financeiro_lancamentos', ['data_vencimento'], { name: 'financeiro_lancamentos_data_vencimento_idx' });
  },

  down: async (qi) => {
    await qi.removeIndex('financeiro_lancamentos', 'financeiro_lancamentos_data_vencimento_idx');
    await qi.removeIndex('financeiro_lancamentos', 'financeiro_lancamentos_status_financeiro_id_idx');
    await qi.removeIndex('financeiro_lancamentos', 'financeiro_lancamentos_empresa_id_idx');
    await qi.dropTable('financeiro_lancamentos');
  },
};
