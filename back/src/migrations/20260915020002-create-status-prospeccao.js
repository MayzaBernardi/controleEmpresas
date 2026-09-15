'use strict';

module.exports = {
  up: async (qi, Sq) => {
    await qi.createTable('status_prospeccao', {
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

    await qi.bulkInsert('status_prospeccao', [
      { codigo: 'identificado', descricao: 'Empresa identificada como potencial afiliada' },
      { codigo: 'material_enviado', descricao: 'Material/edital enviado (hoje, tipicamente via WhatsApp — RN-03)' },
      { codigo: 'aguardando_retorno', descricao: 'Aguardando retorno da empresa' },
      { codigo: 'convertido_para_formulario', descricao: 'Empresa avançou e preencheu o formulário de inscrição' },
      { codigo: 'descartado', descricao: 'Prospecção descartada/sem interesse' },
    ]);
  },

  down: async (qi) => {
    await qi.bulkDelete('status_prospeccao', null, {});
    await qi.dropTable('status_prospeccao');
  },
};
