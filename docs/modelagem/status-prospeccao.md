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
| `codigo` | STRING(50) | sim | Único. Valores: `em_contato`, `nao_constatada`, `proposta_rejeitada` (redefinidos em 2026-09-16, ADR 0007 §3 — substituem os 5 códigos originais do ADR 0005). |
| `descricao` | TEXT | não | |

Sem `created_at`/`updated_at` (`timestamps: false`) — tabela de lookup
estática, seed inserido na própria migration
(`20260915020002-create-status-prospeccao.js`), redefinido pela migration de
dados `20260916000003-redefine-status-prospeccao.js`.

## Relacionamentos

- `hasMany` → `Prospeccao` (`status_prospeccao_id`).

## Notas

- Não existe mais um estado "convertida" (o antigo `convertido_para_formulario`
  foi removido) — a conversão de uma prospecção é só
  `Prospeccao.formulario_resposta_id` deixando de ser `null` (RN-36). Nenhum
  dos 3 códigos atuais filtra elegibilidade para a RN-36 — o critério é só
  `ativo = true` + `formulario_resposta_id IS NULL` (ver [`prospeccao.md`](./prospeccao.md)).
- Endpoint de leitura `GET /prospeccoes/status-disponiveis` (novo em
  2026-09-16) — antes não existia rota nenhuma para consultar esta tabela.
