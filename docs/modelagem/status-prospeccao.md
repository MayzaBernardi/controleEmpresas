# Status Prospecção

Tabela: `status_prospeccao` · Model: [`StatusProspeccao`](../../back/src/models/StatusProspeccao.js) ·
Migration: [`20260915020002-create-status-prospeccao.js`](../../back/src/migrations/20260915020002-create-status-prospeccao.js) ·
ADR: [`0005-mapeamento-planilha-legado.md`](../decisoes/0005-mapeamento-planilha-legado.md) §3

Tabela de referência (lookup) para o estado de uma prospecção — mesma lógica
de `status_contrato`/`status_financeiro` (ADR 0004 §2): tabela em vez de
ENUM, para permitir novos estados via `INSERT` sem `ALTER TYPE`.

## Campos

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | INTEGER (autoincrement) | sim (gerado) | PK. |
| `codigo` | STRING(50) | sim | Único. Valores seed: `identificado`, `material_enviado`, `aguardando_retorno`, `convertido_para_formulario`, `descartado`. |
| `descricao` | TEXT | não | |

Sem `created_at`/`updated_at` (`timestamps: false`) — tabela de lookup
estática, seed inserido na própria migration.

## Relacionamentos

- `hasMany` → `Prospeccao` (`status_prospeccao_id`).

## Notas

- `identificado`, `material_enviado` e `aguardando_retorno` são os estados
  considerados "em aberto" pela regra RN-36 (transição automática para
  `convertido_para_formulario` quando a empresa preenche o formulário).
