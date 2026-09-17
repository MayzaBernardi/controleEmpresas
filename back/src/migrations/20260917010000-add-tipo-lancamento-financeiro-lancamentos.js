'use strict';

// Correção da RN-44 (2026-09-17): a regra de "nasce pago" foi implementada errado — valia para
// TODO lançamento, quando na verdade só se aplica a Nota Fiscal (Boleto continua nascendo
// pendente/confirmado manualmente via PATCH .../pagamento, RN-16/RF-06). Não dá pra inferir o
// tipo pelos campos existentes: `numero_documento` e `numero_nota_fiscal` são independentes,
// opcionais e podem coexistir no mesmo registro (há lançamentos no seed com os dois preenchidos
// e ainda pendentes). Por isso um campo explícito novo. defaultValue: 'boleto' classifica os
// lançamentos já existentes (seed) como boleto, preservando o comportamento antigo pra eles —
// nenhum lançamento pré-existente vira "pago" retroativamente por esta migration.
module.exports = {
  up: async (qi, Sq) => {
    await qi.addColumn('financeiro_lancamentos', 'tipo_lancamento', {
      type: Sq.ENUM('nota_fiscal', 'boleto'),
      allowNull: false,
      defaultValue: 'boleto',
    });
  },

  down: async (qi) => {
    await qi.removeColumn('financeiro_lancamentos', 'tipo_lancamento');
    await qi.sequelize.query('DROP TYPE IF EXISTS "enum_financeiro_lancamentos_tipo_lancamento";');
  },
};
