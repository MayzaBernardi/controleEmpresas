# Assinatura

Tabela: `assinaturas` · Model: [`Assinatura`](../../back/src/models/Assinatura.js) ·
Migration: [`20260915000007-create-assinaturas.js`](../../back/src/migrations/20260915000007-create-assinaturas.js)

Signatário de um contrato — representante legal, os 3 assinantes
institucionais e o reitor (RN-09).

## Campos

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | BIGINT (autoincrement) | sim (gerado) | PK. |
| `contrato_id` | UUID (FK → `contratos.id`, `ON DELETE CASCADE`) | sim | |
| `nome_signatario` | STRING(255) | sim | |
| `email_signatario` | STRING(255) | sim | |
| `papel_assinatura` | ENUM(`representante_legal`, `assinante_institucional_1`, `assinante_institucional_2`, `assinante_institucional_3`, `reitor`) | sim | Único junto com `contrato_id` (constraint `assinaturas_contrato_papel_unique`). |
| `status` | ENUM(`pendente`, `assinado`, `rejeitado`) | sim | Default `pendente`. |
| `data_assinatura` | TIMESTAMP | não | Preenchido quando `status = 'assinado'`. |
| `observacoes` | TEXT | não | |
| `created_at` / `updated_at` | TIMESTAMP | sim (auto) | |

## Relacionamentos

- `belongsTo` → `Contrato` (`contrato_id`).

## Regras de negócio aplicadas

- **RN-09**: um contrato só é vigente após as 5 assinaturas (`representante_legal` + 3 institucionais + `reitor`) estarem `assinado`.
- **RN-10**: o sistema registra o retorno do fluxo de assinatura (hoje recebido por e-mail), mas não participa da coleta em si — esta tabela é o registro passivo desse retorno.
