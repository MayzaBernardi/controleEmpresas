'use strict';

module.exports = {
  up: async (qi) => {
    await qi.bulkInsert('planos_afiliacao', [
      { nome: 'Microempresa ou Startup', valor: '600.00', ativo: true },
      { nome: 'Empresa de Pequeno Porte', valor: '1200.00', ativo: true },
      { nome: 'Empresa de Médio Porte', valor: '2400.00', ativo: true },
      { nome: 'Pessoa jurídica, sem fins lucrativos', valor: '100.00', ativo: true },
    ]);
  },

  down: async (qi) => {
    await qi.bulkDelete('planos_afiliacao', null, {});
  },
};
