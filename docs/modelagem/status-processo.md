# Status Processo

Tabela: `status_processo` · Model: [`StatusProcesso`](../../back/src/models/StatusProcesso.js) ·
Migration: [`20260915020004-create-status-processo.js`](../../back/src/migrations/20260915020004-create-status-processo.js) ·
ADR: [`0005-mapeamento-planilha-legado.md`](../decisoes/0005-mapeamento-planilha-legado.md) §4

Tabela de referência com o funil completo de estágios do processo de
afiliação de uma empresa, na ordem real usada pela equipe (a partir da
planilha de controle legado). Substitui gradualmente o texto livre em
`empresas.status_processo` — **sem removê-lo** (ver [`empresa.md`](./empresa.md)).

## Campos

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | INTEGER (autoincrement) | sim (gerado) | PK. |
| `codigo` | STRING(50) | sim | Único. |
| `ordem` | INTEGER | sim | Único. Posição no funil (1 a 8), para ordenação/UI. |
| `descricao` | TEXT | não | |

Sem `created_at`/`updated_at` (`timestamps: false`) — tabela de lookup
estática, seed inserido na própria migration.

## Valores (seed, em ordem)

| ordem | codigo |
|---|---|
| 1 | `aguardando_envio_documentos` |
| 2 | `contrato_elaborado_encaminhado_assinatura` |
| 3 | `aguardando_assinatura_contrato` |
| 4 | `aguardando_pagamento_boleto` |
| 5 | `afiliada_ativa` |
| 6 | `renovacao_pendente` |
| 7 | `inadimplente` |
| 8 | `encerrada` |

## Relacionamentos

- `hasMany` → `Empresa` (`status_processo_id`).

## Notas

- **Diferença importante em relação a RN-30/RN-31**: `renovacao_pendente` e
  `inadimplente` existem aqui como estágios do funil da **empresa**,
  registrados manualmente pela equipe — não são o mesmo mecanismo do
  cálculo on-the-fly de `Contrato.estaProximoVencimento`/
  `FinanceiroLancamento.estaAtrasado` (RN-30/RN-31), que operam por
  contrato/lançamento individual, não por empresa. Não confundir os dois.
- O backfill de `empresas.status_processo_id` a partir do texto livre
  legado está documentado em [`empresa.md`](./empresa.md) e no relatório
  [`../revisao-manual/status-processo-nao-mapeado.md`](../revisao-manual/status-processo-nao-mapeado.md).
