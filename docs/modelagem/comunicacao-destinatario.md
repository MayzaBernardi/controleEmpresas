# Comunicação Destinatário

Tabela: `comunicacoes_destinatarios` · Model: [`ComunicacaoDestinatario`](../../back/src/models/ComunicacaoDestinatario.js) ·
Migration: [`20260915000011-create-comunicacoes-destinatarios.js`](../../back/src/migrations/20260915000011-create-comunicacoes-destinatarios.js)

Tabela de junção N:N entre `comunicacoes_email` e `empresas` — lista quais
empresas receberam (ou deveriam receber) um e-mail individual ou em massa.

## Campos

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `comunicacao_email_id` | BIGINT (FK → `comunicacoes_email.id`, `ON DELETE CASCADE`) | sim | PK composta (parte 1). |
| `empresa_id` | UUID (FK → `empresas.id`, `ON DELETE CASCADE`) | sim | PK composta (parte 2). |
| `created_at` | TIMESTAMP | sim (auto) | Sem `updated_at` — é um vínculo imutável, não um registro editável. |

## Relacionamentos

- `belongsTo` → `ComunicacaoEmail` (`comunicacao_email_id`), `Empresa` (`empresa_id`).
- Usada como `through` explícito em `Empresa.belongsToMany(ComunicacaoEmail)` e `ComunicacaoEmail.belongsToMany(Empresa)`.

## Notas

- Modelada como model próprio (não apenas `through: 'comunicacoes_destinatarios'` por nome de string) para manter a convenção do projeto de um arquivo de model por entidade e para permitir, no futuro, acrescentar colunas próprias (ex.: status de entrega individual) sem reestruturar a associação.
