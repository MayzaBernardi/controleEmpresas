# Status Financeiro

Tabela: `status_financeiro` · Model: [`StatusFinanceiro`](../../back/src/models/StatusFinanceiro.js) ·
Migration: [`20260915000001-create-status-referencia.js`](../../back/src/migrations/20260915000001-create-status-referencia.js)

Tabela de referência (lookup) para o estado formal de um lançamento
financeiro. Usa tabela em vez de ENUM pelo mesmo motivo de
[`status-contrato.md`](./status-contrato.md) (ADR 0004 §2).

## Campos

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | INTEGER (autoincrement) | sim (gerado) | PK. |
| `codigo` | STRING(50) | sim | Único. Valores seed: `pendente`, `pago`, `atrasado`, `cancelado`. |
| `descricao` | TEXT | não | |

Sem `created_at`/`updated_at` (`timestamps: false`) e `freezeTableName: true`
no model.

## Relacionamentos

- `hasMany` → `FinanceiroLancamento` (`status_financeiro_id`).

## Notas

- `atrasado` existe como valor de referência, mas o atraso "oficial" exposto
  pela API é **calculado em leitura** (RN-31), comparando `data_vencimento`
  com a data atual quando `data_pagamento` é nulo — a coluna
  `status_financeiro_id` continua representando apenas o estado formal
  lançado manualmente pela Contabilidade.
