'use strict';

const fs = require('fs');
const path = require('path');

const CAMINHO_RELATORIO = path.resolve(__dirname, '../../../docs/revisao-manual/reservas-espaco-nao-mapeado.md');

// Marcador nas observações da linha criada por este backfill, usado só para permitir um
// down() preciso (remover exclusivamente o que esta migration inseriu, nunca reservas
// criadas manualmente depois).
const MARCADOR = '[backfill-adr0005]';

function semAcentos(texto) {
  return (texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function classificarTipoEspaco(identificadorSala, bloco) {
  const texto = semAcentos(`${identificadorSala || ''} ${bloco || ''}`).toLowerCase();
  if (texto.includes('atico')) return 'sala_atico';
  if (texto.includes('auditorio')) return 'auditorio';
  if (texto.includes('coworking')) return 'coworking';
  return null;
}

module.exports = {
  up: async (qi, Sq) => {
    const naoMapeados = [];
    let criados = 0;

    await qi.sequelize.transaction(async (transaction) => {
      const linhas = await qi.sequelize.query(
        'SELECT id, empresa_id, identificador_sala, bloco, data_inicio_ocupacao FROM espacos_fisicos',
        { type: Sq.QueryTypes.SELECT, transaction }
      );

      for (const linha of linhas) {
        const tipoEspaco = classificarTipoEspaco(linha.identificador_sala, linha.bloco);

        if (!tipoEspaco) {
          naoMapeados.push(linha);
          continue;
        }

        // Data real já existente (data_inicio_ocupacao) é reaproveitada como data_reserva —
        // não é um valor inventado, é o dado que já estava na linha de origem.
        await qi.sequelize.query(
          `INSERT INTO reservas_espaco
             (empresa_id, tipo_espaco, data_reserva, status, observacoes, created_at, updated_at)
           VALUES
             (:empresaId, :tipoEspaco, :dataReserva, 'confirmado', :observacoes, NOW(), NOW())`,
          {
            replacements: {
              empresaId: linha.empresa_id,
              tipoEspaco,
              dataReserva: linha.data_inicio_ocupacao,
              observacoes: `${MARCADOR} origem: espacos_fisicos.id=${linha.id}`,
            },
            transaction,
          }
        );
        criados += 1;
      }
    });

    // O relatório NUNCA é escrito quando NODE_ENV=test: back/test/globalSetup.js roda esta
    // mesma migration real contra um banco de teste descartável e vazio (0 espacos_fisicos) a
    // cada `npm test`, e sem essa guarda o relatório de verdade (contra o banco de dev/
    // produção) seria sobrescrito com um falso "0 pendências" — exatamente o tipo de
    // suposição silenciosa que a Regra 5 desta etapa proíbe. Achado real na revisão desta etapa.
    if (process.env.NODE_ENV !== 'test') {
      const conteudoRelatorio = [
        '# Ocupações de espacos_fisicos sem tipo_espaco identificável para reservas_espaco',
        '',
        `Gerado pela migration \`20260915020012-backfill-reservas-espaco.js\` em ${new Date().toISOString()}.`,
        '',
        'Estas linhas de `espacos_fisicos` NÃO geraram registro em `reservas_espaco` porque',
        '`identificador_sala`/`bloco` não continham nenhuma das palavras-chave conhecidas',
        '("ático"/"atico", "auditorio"/"auditório", "coworking" — ver ADR 0005 §6). Nenhum',
        'tipo_espaco foi adivinhado. Classifique manualmente e crie o registro em',
        '`reservas_espaco` você mesmo, se fizer sentido para o novo modelo.',
        '',
        naoMapeados.length === 0
          ? 'Nenhuma. Todas as linhas de espacos_fisicos foram classificadas automaticamente.'
          : '| espacos_fisicos.id | empresa_id | identificador_sala | bloco | data_inicio_ocupacao |\n' +
            '|---|---|---|---|---|\n' +
            naoMapeados
              .map(
                (l) =>
                  `| ${l.id} | ${l.empresa_id} | ${l.identificador_sala} | ${l.bloco || '_(vazio)_'} | ${l.data_inicio_ocupacao} |`
              )
              .join('\n'),
        '',
      ].join('\n');

      fs.mkdirSync(path.dirname(CAMINHO_RELATORIO), { recursive: true });
      fs.writeFileSync(CAMINHO_RELATORIO, conteudoRelatorio, 'utf8');
    }

    console.log(
      `[backfill reservas_espaco] ${criados} reserva(s) criada(s), ${naoMapeados.length} linha(s) de espacos_fisicos ` +
        `sem tipo_espaco identificável. ` +
        (process.env.NODE_ENV !== 'test' ? `Relatório em ${CAMINHO_RELATORIO}` : '(NODE_ENV=test — relatório não escrito)')
    );
  },

  down: async (qi) => {
    await qi.sequelize.transaction(async (transaction) => {
      await qi.sequelize.query(
        `DELETE FROM reservas_espaco WHERE observacoes LIKE :marcador`,
        { replacements: { marcador: `${MARCADOR}%` }, transaction }
      );
    });
  },
};
