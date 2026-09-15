# Financeiro Lançamento

Tabela: `financeiro_lancamentos` · Model: [`FinanceiroLancamento`](../../back/src/models/FinanceiroLancamento.js) ·
Migration: [`20260915000009-create-financeiro-lancamentos.js`](../../back/src/migrations/20260915000009-create-financeiro-lancamentos.js)

Boleto/NF e controle de pagamento de uma empresa afiliada, lançado pela
Contabilidade (RF-06) — a "parte laranja" da planilha atual.

## Campos

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | BIGINT (autoincrement) | sim (gerado) | PK. |
| `empresa_id` | UUID (FK → `empresas.id`, `ON DELETE RESTRICT`) | sim | |
| `contrato_id` | UUID (FK → `contratos.id`, `ON DELETE SET NULL`) | não | |
| `numero_documento` | STRING(100) | não | Número do boleto. |
| `numero_nota_fiscal` | STRING(100) | não | |
| `valor` | DECIMAL(12,2) | sim | |
| `forma_pagamento` | ENUM(`boleto`, `pix`, `parcelado`) | sim | ⚠️ RN-20: PIX/parcelado estão no schema para não travar a modelagem futura, mas **não estão confirmados** — não implementar fluxo de PIX/parcelamento sem validação do negócio. |
| `parcela_numero` / `total_parcelas` | INTEGER | sim | Default `1`/`1` (pagamento único). |
| `data_vencimento` | DATEONLY | sim | |
| `data_pagamento` | DATEONLY | não | `null` enquanto não confirmado. |
| `status_financeiro_id` | INTEGER (FK → `status_financeiro.id`) | sim | Estado formal, registrado manualmente pela Contabilidade. Ver [`status-financeiro.md`](./status-financeiro.md). |
| `comprovante_url` | STRING(1000) | não | |
| `observacoes` | TEXT | não | |
| `created_at` / `updated_at` | TIMESTAMP | sim (auto) | |

### Campos virtuais (não persistidos)

| Getter | Tipo | Descrição |
|---|---|---|
| `estaAtrasado` | boolean | `data_vencimento < hoje` **e** `data_pagamento` nulo. |

## Relacionamentos

- `belongsTo` → `Empresa` (`empresa_id`), `Contrato` (`contrato_id`, opcional), `StatusFinanceiro` (`status_financeiro_id`).

## Regras de negócio aplicadas

- **RN-16**: lançamento é responsabilidade da Contabilidade, não da equipe do programa (reforçado na camada de controller/permissão, não no schema).
- **RN-17 / RN-31** (getter virtual `estaAtrasado`, calculado em leitura, nunca persistido): empresa em débito = `data_vencimento` ultrapassada sem `data_pagamento` registrado. A coluna `status_financeiro_id` continua representando apenas o estado formal.
- **RN-19**: a empresa afiliada consulta seus próprios lançamentos via scope `paraEmpresa`.
- **RN-20** (⚠️ pendência aberta): `forma_pagamento` já modela `pix`/`parcelado`, mas nenhuma regra de conciliação foi implementada — não construir fluxo de negócio sobre esses valores sem confirmação.
- **RN-33** (scope nomeado `paraEmpresa(empresaId)`, `where` embrulhado em `Op.and` para permanecer seguro mesmo com `findByPk` — ver nota completa em [`empresa.md`](./empresa.md)).

## Notas

- `status_financeiro_id` usa tabela de referência (não ENUM) pelo mesmo motivo de `status_contrato_id`: permitir novos estados sem `ALTER TYPE` (ADR 0004 §2).
