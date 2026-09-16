'use strict';

// status_triagem simplificado com o negócio pra só 2 valores (2026-09-16): "aguardando"
// (Aguardando preenchimento) e "finalizado" (Finalizado). Campo continua STRING(50) livre,
// sem tabela de lookup — só renomeia o valor usado pelo seed ("triado" -> "finalizado").
module.exports = {
  up: async (qi) => {
    await qi.sequelize.query(
      "UPDATE formulario_respostas SET status_triagem = 'finalizado' WHERE status_triagem = 'triado'"
    );
  },

  down: async (qi) => {
    await qi.sequelize.query(
      "UPDATE formulario_respostas SET status_triagem = 'triado' WHERE status_triagem = 'finalizado'"
    );
  },
};
