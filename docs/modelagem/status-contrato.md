# Status Contrato

Tabela: `status_contrato` · Model: [`StatusContrato`](../../back/src/models/StatusContrato.js) ·
Migration: [`20260915000001-create-status-referencia.js`](../../back/src/migrations/20260915000001-create-status-referencia.js)

Tabela de referência (lookup) para o estado formal de um contrato. Usa
tabela em vez de ENUM para permitir novos estados via `INSERT`, sem
`ALTER TYPE` (ADR 0004 §2).

## Campos

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | INTEGER (autoincrement) | sim (gerado) | PK. |
| `codigo` | STRING(50) | sim | Único. Valores seed: `elaboracao`, `em_assinatura`, `vigente`, `renovacao_pendente`, `encerrado`, `rescindido`. |
| `descricao` | TEXT | não | |

Sem `created_at`/`updated_at` (`timestamps: false`) e `freezeTableName: true`
no model — tabela de lookup estática, não uma entidade transacional.

## Relacionamentos

- `hasMany` → `Contrato` (`status_contrato_id`).

## Notas

- `renovacao_pendente` existe como valor de referência mas, na prática, o
  estado "renovação pendente" é **calculado em leitura** (RN-30) a partir de
  `data_termino_vigencia` — não é a equipe do programa que faz essa
  transição manualmente todo dia. O valor fica disponível para o caso de a
  equipe querer registrar esse estado formalmente também.
