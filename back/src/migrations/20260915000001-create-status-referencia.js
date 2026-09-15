'use strict';

module.exports = {
  up: async (qi, Sq) => {
    // Tabela de referência: status_contrato
    await qi.createTable('status_contrato', {
      id: {
        type: Sq.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      codigo: {
        type: Sq.STRING(50),
        allowNull: false,
        unique: true,
      },
      descricao: {
        type: Sq.TEXT,
        allowNull: true,
      },
    });

    await qi.bulkInsert('status_contrato', [
      { codigo: 'elaboracao',          descricao: 'Em elaboração' },
      { codigo: 'em_assinatura',       descricao: 'Em processo de assinatura' },
      { codigo: 'vigente',             descricao: 'Contrato vigente' },
      { codigo: 'renovacao_pendente',  descricao: 'Renovação pendente' },
      { codigo: 'encerrado',           descricao: 'Encerrado' },
      { codigo: 'rescindido',          descricao: 'Rescindido' },
    ]);

    // Tabela de referência: status_financeiro
    await qi.createTable('status_financeiro', {
      id: {
        type: Sq.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      codigo: {
        type: Sq.STRING(50),
        allowNull: false,
        unique: true,
      },
      descricao: {
        type: Sq.TEXT,
        allowNull: true,
      },
    });

    await qi.bulkInsert('status_financeiro', [
      { codigo: 'pendente',   descricao: 'Pagamento pendente' },
      { codigo: 'pago',       descricao: 'Pago' },
      { codigo: 'atrasado',   descricao: 'Pagamento em atraso' },
      { codigo: 'cancelado',  descricao: 'Cancelado' },
    ]);
  },

  down: async (qi, Sq) => {
    await qi.bulkDelete('status_financeiro', null, {});
    await qi.dropTable('status_financeiro');
    await qi.bulkDelete('status_contrato', null, {});
    await qi.dropTable('status_contrato');
  },
};
