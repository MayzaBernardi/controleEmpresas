'use strict';

const fs = require('fs');
const path = require('path');

// Mapeamento fornecido pela equipe, a partir da planilha de controle legado. Comparação
// é exata (case-insensitive, com trim) — nenhuma correspondência por similaridade/prefixo.
// Nunca adicione um novo par aqui "chutando" — só com confirmação explícita da equipe.
const MAPEAMENTO_STATUS_LEGADO = {
  'boleto pago e afiliada': 'afiliada_ativa',
  'aguardando pagamento de boleto': 'aguardando_pagamento_boleto',
  'aguardando pagamento do boleto': 'aguardando_pagamento_boleto',
  'contrato encaminhado para assinaturas': 'contrato_elaborado_encaminhado_assinatura',
  'contrato elaborado e encaminhado para assinaturas': 'contrato_elaborado_encaminhado_assinatura',
  'aguardando assinatura do contrato': 'aguardando_assinatura_contrato',
  'aguardando envio de documentos': 'aguardando_envio_documentos',
  afiliada: 'afiliada_ativa',
};

const CAMINHO_RELATORIO = path.resolve(__dirname, '../../../docs/revisao-manual/status-processo-nao-mapeado.md');

function normalizar(texto) {
  return (texto || '').trim().toLowerCase();
}

module.exports = {
  up: async (qi, Sq) => {
    const naoMapeados = [];

    await qi.sequelize.transaction(async (transaction) => {
      const statusProcessoRows = await qi.sequelize.query('SELECT id, codigo FROM status_processo', {
        type: Sq.QueryTypes.SELECT,
        transaction,
      });
      const idPorCodigo = Object.fromEntries(statusProcessoRows.map((r) => [r.codigo, r.id]));

      const empresas = await qi.sequelize.query(
        'SELECT id, razao_social, status_processo FROM empresas',
        { type: Sq.QueryTypes.SELECT, transaction }
      );

      for (const empresa of empresas) {
        const chave = normalizar(empresa.status_processo);
        const codigoAlvo = MAPEAMENTO_STATUS_LEGADO[chave];
        const idAlvo = codigoAlvo ? idPorCodigo[codigoAlvo] : undefined;

        if (idAlvo) {
          await qi.sequelize.query(
            'UPDATE empresas SET status_processo_id = :idAlvo WHERE id = :id',
            { replacements: { idAlvo, id: empresa.id }, transaction }
          );
        } else {
          naoMapeados.push({
            id: empresa.id,
            razao_social: empresa.razao_social,
            status_processo: empresa.status_processo,
          });
        }
      }
    });

    // O relatório NUNCA é escrito quando NODE_ENV=test: back/test/globalSetup.js roda esta
    // mesma migration real contra um banco de teste descartável e vazio (0 empresas) a cada
    // `npm test`, e sem essa guarda o relatório de verdade (contra o banco de dev/produção)
    // seria sobrescrito com um falso "0 pendências" — exatamente o tipo de suposição
    // silenciosa que a Regra 5 desta etapa proíbe. Achado real na revisão desta etapa.
    if (process.env.NODE_ENV !== 'test') {
      const linhas = [
        '# Empresas sem mapeamento automático de status_processo_id',
        '',
        `Gerado pela migration \`20260915020011-backfill-empresas-status-processo.js\` em ${new Date().toISOString()}.`,
        '',
        'Estas empresas mantiveram `status_processo_id = NULL` porque o texto livre em',
        '`status_processo` não bateu (comparação exata, case-insensitive) com nenhum dos',
        'padrões conhecidos do mapeamento legado (ver ADR 0005 §4). Revise manualmente e',
        'faça o UPDATE direto no banco, ou peça para o mapeamento ser ampliado com o texto',
        'exato encontrado abaixo — nenhum valor foi adivinhado.',
        '',
        naoMapeados.length === 0
          ? 'Nenhuma. Todas as empresas foram mapeadas automaticamente.'
          : '| id | razao_social | status_processo (texto legado) |\n|---|---|---|\n' +
            naoMapeados
              .map((e) => `| ${e.id} | ${e.razao_social} | ${e.status_processo === null ? '_(NULL)_' : e.status_processo} |`)
              .join('\n'),
        '',
      ].join('\n');

      fs.mkdirSync(path.dirname(CAMINHO_RELATORIO), { recursive: true });
      fs.writeFileSync(CAMINHO_RELATORIO, linhas, 'utf8');
    }

    console.log(
      `[backfill status_processo] ${naoMapeados.length} empresa(s) sem mapeamento automático. ` +
        (process.env.NODE_ENV !== 'test' ? `Relatório em ${CAMINHO_RELATORIO}` : '(NODE_ENV=test — relatório não escrito)')
    );
  },

  down: async (qi, Sq) => {
    // Reverte só as linhas que ESTA migration teria atribuído: recomputa o mesmo mapeamento
    // de up() a partir do texto legado (nunca alterado por este backfill) e só zera
    // status_processo_id nas linhas cujo valor atual ainda bate com o que o mapeamento
    // produziria — não um UPDATE em massa. Isso evita apagar classificações manuais feitas
    // depois (ex.: a equipe preenchendo o relatório de não-mapeados na mão), diferente de um
    // simples `UPDATE empresas SET status_processo_id = NULL` sem escopo.
    await qi.sequelize.transaction(async (transaction) => {
      const statusProcessoRows = await qi.sequelize.query('SELECT id, codigo FROM status_processo', {
        type: Sq.QueryTypes.SELECT,
        transaction,
      });
      const idPorCodigo = Object.fromEntries(statusProcessoRows.map((r) => [r.codigo, r.id]));

      const empresas = await qi.sequelize.query(
        'SELECT id, status_processo, status_processo_id FROM empresas',
        { type: Sq.QueryTypes.SELECT, transaction }
      );

      for (const empresa of empresas) {
        const chave = normalizar(empresa.status_processo);
        const codigoAlvo = MAPEAMENTO_STATUS_LEGADO[chave];
        const idQueEstaMigrationTeriaAtribuido = codigoAlvo ? idPorCodigo[codigoAlvo] : undefined;

        if (idQueEstaMigrationTeriaAtribuido && empresa.status_processo_id === idQueEstaMigrationTeriaAtribuido) {
          await qi.sequelize.query('UPDATE empresas SET status_processo_id = NULL WHERE id = :id', {
            replacements: { id: empresa.id },
            transaction,
          });
        }
      }
    });
  },
};
