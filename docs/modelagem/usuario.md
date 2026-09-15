# Usuário

Tabela: `usuarios` · Model: [`Usuario`](../../back/src/models/Usuario.js) ·
Migration: [`20260915000003-create-usuarios.js`](../../back/src/migrations/20260915000003-create-usuarios.js)

Usuários do sistema, autenticados via SSO institucional (RN-02 / ADR 0003 —
Auth.js). Não armazena senha local.

## Campos

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | BIGINT (autoincrement) | sim (gerado) | PK. |
| `nome` | STRING(255) | sim | Nome do usuário. |
| `email` | STRING(255) | sim | Único; identidade vinda do SSO. |
| `papel` | ENUM(`equipe_programa`, `empresa_afiliada`, `contabilidade`) | sim | Ator do sistema (RN-01). |
| `empresa_id` | UUID (FK → `empresas.id`, `ON DELETE SET NULL`) | condicional | Obrigatório quando `papel = 'empresa_afiliada'` (validator no model). |
| `ativo` | BOOLEAN | sim | Default `true`. |
| `created_at` / `updated_at` | TIMESTAMP | sim (auto) | |

## Relacionamentos

- `belongsTo` → `Empresa` (`empresa_id`).
- `hasMany` → `ComunicacaoEmail` (`revisado_por_usuario_id`), `LogAuditoria` (`usuario_id`).

## Regras de negócio aplicadas

- **RN-01 / RN-33** (validator no model): `papel = 'empresa_afiliada'` exige `empresa_id` preenchido, pré-condição para o scope `paraEmpresa` funcionar corretamente nos demais models.
- **RN-02 / RNF-01**: ausência de campo de senha — autenticação é 100% delegada ao Auth.js (ADR 0003).
