# Comunicação Email

Tabela: `comunicacoes_email` · Model: [`ComunicacaoEmail`](../../back/src/models/ComunicacaoEmail.js) ·
Migration: [`20260915000010-create-comunicacoes-email.js`](../../back/src/migrations/20260915000010-create-comunicacoes-email.js)

Histórico auditável de e-mail (individual ou em massa) enviado ou em
rascunho pelo sistema, incluindo rascunhos assistidos por IA (RF-04, ADR
0002).

## Campos

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | BIGINT (autoincrement) | sim (gerado) | PK. |
| `assunto` | STRING(500) | sim | |
| `corpo_html` | TEXT | sim | |
| `gerado_por_ia` | BOOLEAN | sim | Default `false`. `true` quando o texto inicial veio do agente de IA (RN-28). |
| `revisado_por_usuario_id` | BIGINT (FK → `usuarios.id`, `ON DELETE SET NULL`) | condicional | Obrigatório antes de `status` virar `aprovado`/`enviado` quando `gerado_por_ia = true` (validator no model). |
| `revisado_em` | TIMESTAMP | não | |
| `status` | ENUM(`rascunho`, `aprovado`, `enviado`, `falha`) | sim | Default `rascunho`. |
| `data_envio` | TIMESTAMP | não | |
| `observacoes_ia` | TEXT | não | |
| `ativo` | BOOLEAN | sim | Default `true`. Excluir é soft-delete (RN-37/ADR 0007) — funciona em qualquer `status`, diferente de editar `assunto`/`corpo_html` (só permitido em `rascunho`). |
| `created_at` / `updated_at` | TIMESTAMP | sim (auto) | |

## Relacionamentos

- `belongsTo` → `Usuario as revisadoPor` (`revisado_por_usuario_id`).
- `belongsToMany` → `Empresa`, através de `ComunicacaoDestinatario` (ver [`comunicacao-destinatario.md`](./comunicacao-destinatario.md)).

## Regras de negócio aplicadas

- **RN-24**: suporta envio individual e em massa — a distinção é feita pela quantidade de linhas em `comunicacoes_destinatarios`, não por um campo próprio.
- **RN-25**: histórico auditável — quem enviou (`revisado_por_usuario_id`), para quem (`comunicacoes_destinatarios`), quando (`data_envio`) e conteúdo (`assunto`/`corpo_html`).
- **RN-28** (validator no model): um e-mail com `gerado_por_ia = true` não pode ser marcado `aprovado`/`enviado` sem `revisado_por_usuario_id` preenchido — a IA nunca envia diretamente, sempre depende de revisão humana confirmada.
- **RN-37** (ADR 0007): `ativo = false` é a única forma de "excluir" — nunca `DELETE`.
- **RN-43** (ADR 0007 §6): a sugestão de corpo a partir do assunto (no front, ao criar rascunho) hoje é gerada por template local, não por chamada real a um provedor de LLM — `gerado_por_ia: true` é marcado de qualquer forma, e a revisão humana obrigatória (RN-28) não muda.
