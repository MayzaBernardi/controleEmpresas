# Benefício de Exposição

Tabela: `beneficios_exposicao` · Model: [`BeneficioExposicao`](../../back/src/models/BeneficioExposicao.js) ·
Migration: [`20260915020007-create-beneficios-exposicao.js`](../../back/src/migrations/20260915020007-create-beneficios-exposicao.js) ·
ADR: [`0005-mapeamento-planilha-legado.md`](../decisoes/0005-mapeamento-planilha-legado.md) §5

Controle de exposição de marca da empresa afiliada dentro do Pollen Parque
(telão e site institucional). Relação 1:1 com `empresas`.

## Campos

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | BIGINT (autoincrement) | sim (gerado) | PK. |
| `empresa_id` | UUID (FK → `empresas.id`, `ON DELETE CASCADE`, `UNIQUE`) | sim | `UNIQUE` garante no máximo um registro por empresa (1:1). |
| `telao_ativo` | BOOLEAN | sim | Default `false`. |
| `marca_site_ativo` | BOOLEAN | sim | Default `false`. |
| `observacoes` | TEXT | não | |
| `atualizado_em` | TIMESTAMP | sim | Default `NOW()`. Único timestamp da tabela (sem `created_at` separado, por especificação). |

## Relacionamentos

- `belongsTo` → `Empresa` (`empresa_id`).
- No lado de `Empresa`: `hasOne` (`beneficioExposicao`).

## Regras de negócio aplicadas

- **RN-33** (scope nomeado `paraEmpresa(empresaId)`, extensão do padrão de isolamento por perfil a esta nova entidade ligada a empresa).

## Notas

- Sem backfill: a planilha não tinha uma coluna estruturada equivalente —
  os registros começam com os defaults (`false`/`false`) e são preenchidos
  pela equipe a partir de agora (ADR 0005 §5).
