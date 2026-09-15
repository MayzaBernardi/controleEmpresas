# Log Auditoria

Tabela: `log_auditoria` · Model: [`LogAuditoria`](../../back/src/models/LogAuditoria.js) ·
Migration: [`20260915000012-create-log-auditoria.js`](../../back/src/migrations/20260915000012-create-log-auditoria.js)

Tabela única e genérica de auditoria — registra criação/alteração/remoção
de qualquer entidade do sistema (ADR 0004 §6).

## Campos

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | BIGINT (autoincrement) | sim (gerado) | PK. |
| `entidade` | STRING(100) | sim | Nome da tabela afetada (ex.: `'contratos'`). |
| `entidade_id` | STRING(100) | sim | UUID ou BIGINT do registro afetado, sempre como string. |
| `acao` | ENUM(`create`, `update`, `delete`) | sim | |
| `usuario_id` | BIGINT (FK → `usuarios.id`, `ON DELETE SET NULL`) | não | Quem executou a ação, quando aplicável. |
| `dados_anteriores` | JSONB | não | Snapshot antes da alteração (`null` em `create`). |
| `dados_novos` | JSONB | não | Snapshot depois da alteração (`null` em `delete`). |
| `created_at` | TIMESTAMP | sim (auto) | Sem `updated_at` — um log de auditoria nunca é editado. |

## Relacionamentos

- `belongsTo` → `Usuario` (`usuario_id`, opcional).

## Regras de negócio aplicadas

- Suporta o histórico auditável exigido para comunicações (RN-25) e, de forma genérica, para qualquer entidade sensível do sistema.

## Notas

- A escrita nesta tabela é responsabilidade explícita dos **services**, não de hooks do Sequelize (`afterCreate`/`afterUpdate`) — decisão deliberada da ADR 0004 §6 para manter controle explícito sobre o que é auditado, em vez de auditar tudo indiscriminadamente.
- Índice composto em (`entidade`, `entidade_id`) para consultas de histórico por registro.
