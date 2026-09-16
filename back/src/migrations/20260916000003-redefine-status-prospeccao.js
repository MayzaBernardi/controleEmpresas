'use strict';

// Taxonomia de status_prospeccao redefinida com o negócio em 2026-09-16: só 3 estados
// (em_contato / nao_constatada / proposta_rejeitada). O antigo "convertido_para_formulario"
// deixou de existir como status — a conversão agora é só `formulario_resposta_id` deixando
// de ser null (ver prospeccaoService.vincularProspeccaoAoFormulario), e a prospecção some da
// listagem nesse momento, sem precisar de um status próprio pra isso.
const NOVOS_STATUS = [
  { codigo: 'em_contato', descricao: 'Em contato — prospecção ativa, aguardando ou trocando retorno' },
  { codigo: 'nao_constatada', descricao: 'Não foi possível constatar/confirmar contato com a empresa' },
  { codigo: 'proposta_rejeitada', descricao: 'Empresa recebeu a proposta e recusou' },
];

const MAPA_STATUS_ANTIGO_PARA_NOVO = {
  identificado: 'em_contato',
  material_enviado: 'em_contato',
  aguardando_retorno: 'em_contato',
  convertido_para_formulario: 'em_contato',
  descartado: 'proposta_rejeitada',
};

module.exports = {
  up: async (qi, Sq) => {
    await qi.bulkInsert('status_prospeccao', NOVOS_STATUS);

    const antigos = await qi.sequelize.query('SELECT id, codigo FROM status_prospeccao', {
      type: Sq.QueryTypes.SELECT,
    });
    const idPorCodigo = Object.fromEntries(antigos.map((s) => [s.codigo, s.id]));

    for (const [codigoAntigo, codigoNovo] of Object.entries(MAPA_STATUS_ANTIGO_PARA_NOVO)) {
      const idAntigo = idPorCodigo[codigoAntigo];
      const idNovo = idPorCodigo[codigoNovo];
      if (!idAntigo) continue;
      await qi.sequelize.query(
        'UPDATE prospeccoes SET status_prospeccao_id = :idNovo WHERE status_prospeccao_id = :idAntigo',
        { replacements: { idNovo, idAntigo } }
      );
    }

    await qi.bulkDelete('status_prospeccao', { codigo: Object.keys(MAPA_STATUS_ANTIGO_PARA_NOVO) }, {});
  },

  down: async (qi, Sq) => {
    // Não há caminho de volta determinístico pro código antigo específico de cada linha
    // (vários antigos colapsam em "em_contato") — down só recria os códigos antigos vazios
    // e manda tudo que estava nos 3 novos pra "identificado", como estado neutro.
    const RESTAURADOS = [
      { codigo: 'identificado', descricao: 'Empresa identificada como potencial afiliada' },
      { codigo: 'material_enviado', descricao: 'Material/edital enviado (hoje, tipicamente via WhatsApp — RN-03)' },
      { codigo: 'aguardando_retorno', descricao: 'Aguardando retorno da empresa' },
      { codigo: 'convertido_para_formulario', descricao: 'Empresa avançou e preencheu o formulário de inscrição' },
      { codigo: 'descartado', descricao: 'Prospecção descartada/sem interesse' },
    ];
    await qi.bulkInsert('status_prospeccao', RESTAURADOS);

    const atuais = await qi.sequelize.query('SELECT id, codigo FROM status_prospeccao', {
      type: Sq.QueryTypes.SELECT,
    });
    const idPorCodigo = Object.fromEntries(atuais.map((s) => [s.codigo, s.id]));

    await qi.sequelize.query('UPDATE prospeccoes SET status_prospeccao_id = :id WHERE status_prospeccao_id IN (:ids)', {
      replacements: {
        id: idPorCodigo.identificado,
        ids: NOVOS_STATUS.map((s) => idPorCodigo[s.codigo]),
      },
    });

    await qi.bulkDelete('status_prospeccao', { codigo: NOVOS_STATUS.map((s) => s.codigo) }, {});
  },
};
