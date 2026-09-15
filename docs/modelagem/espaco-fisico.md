# Espaço Físico

Tabela: `espacos_fisicos` · Model: [`EspacoFisico`](../../back/src/models/EspacoFisico.js) ·
Migration: [`20260915000005-create-espacos-fisicos.js`](../../back/src/migrations/20260915000005-create-espacos-fisicos.js)

Controle de qual espaço físico do Pollen Parque uma empresa afiliada ocupa
de forma fixa e contínua (ex.: uma sala dedicada por meses/anos).

> **Desde a ADR 0005**: para reservas pontuais e recorrentes de espaço
> compartilhado (sala do ático, auditório, coworking), com limite anual por
> tipo (RN-35), use [`reserva-espaco.md`](./reserva-espaco.md)
> (`reservas_espaco`) — uma entidade diferente, não uma evolução desta.
> Esta tabela continua intacta e em uso para o conceito de sala fixa; não
> foi removida nem passou a ser preenchida por código novo além do que já
> existia.

## Campos

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | BIGINT (autoincrement) | sim (gerado) | PK. |
| `empresa_id` | UUID (FK → `empresas.id`, `ON DELETE CASCADE`) | sim | |
| `identificador_sala` | STRING(50) | sim | Ex.: "Sala 12". |
| `bloco` | STRING(50) | não | |
| `metragem_quadrada` | DECIMAL(8,2) | não | |
| `data_inicio_ocupacao` | DATEONLY | sim | |
| `data_fim_ocupacao` | DATEONLY | não | `null` enquanto a ocupação está ativa. |
| `ativo` | BOOLEAN | sim | Default `true`. |
| `created_at` / `updated_at` | TIMESTAMP | sim (auto) | |

## Relacionamentos

- `belongsTo` → `Empresa` (`empresa_id`).

## Regras de negócio aplicadas

- **RN-33** (scope nomeado `paraEmpresa(empresaId)`): filtra `where: { [Op.and]: [{ empresa_id: empresaId }] }`, listado explicitamente em RN-33 junto com empresas, contratos, documentos e financeiro. `Op.and` evita que o filtro seja sobrescrito por um `where.empresa_id` repetido na query — ver nota completa em [`empresa.md`](./empresa.md).
