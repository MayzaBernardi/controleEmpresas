'use strict';

module.exports = {
  up: async (qi, Sq) => {
    await qi.createTable('status_processo', {
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
      ordem: {
        type: Sq.INTEGER,
        allowNull: false,
        unique: true,
      },
      descricao: {
        type: Sq.TEXT,
        allowNull: true,
      },
    });

    await qi.bulkInsert('status_processo', [
      { codigo: 'aguardando_envio_documentos', ordem: 1, descricao: 'Aguardando envio de documentos pela empresa' },
      { codigo: 'contrato_elaborado_encaminhado_assinatura', ordem: 2, descricao: 'Contrato elaborado e encaminhado para assinaturas' },
      { codigo: 'aguardando_assinatura_contrato', ordem: 3, descricao: 'Aguardando assinatura do contrato' },
      { codigo: 'aguardando_pagamento_boleto', ordem: 4, descricao: 'Aguardando pagamento do boleto' },
      { codigo: 'afiliada_ativa', ordem: 5, descricao: 'Afiliada ativa' },
      { codigo: 'renovacao_pendente', ordem: 6, descricao: 'Renovação pendente' },
      { codigo: 'inadimplente', ordem: 7, descricao: 'Inadimplente' },
      { codigo: 'encerrada', ordem: 8, descricao: 'Encerrada' },
    ]);
  },

  down: async (qi) => {
    await qi.bulkDelete('status_processo', null, {});
    await qi.dropTable('status_processo');
  },
};
