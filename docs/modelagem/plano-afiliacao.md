# Plano de Afiliação

Tabela: `planos_afiliacao` · Model: [`PlanoAfiliacao`](../../back/src/models/PlanoAfiliacao.js) ·
Migration: [`20260915020001-create-planos-afiliacao.js`](../../back/src/migrations/20260915020001-create-planos-afiliacao.js) ·
Seeder: [`20260915020000-planos-afiliacao.js`](../../back/src/seeders/20260915020000-planos-afiliacao.js) ·
ADR: [`0005-mapeamento-planilha-legado.md`](../decisoes/0005-mapeamento-planilha-legado.md) §1

Enquadramento de valor da anuidade de afiliação, identificado ao comparar o
schema com a planilha de controle legado.

## Campos

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | BIGINT (autoincrement) | sim (gerado) | PK. |
| `nome` | STRING(255) | sim | Único. |
| `valor` | DECIMAL(12,2) | sim | Valor da anuidade para esse plano. |
| `ativo` | BOOLEAN | sim | Default `true`. |
| `created_at` / `updated_at` | TIMESTAMP | sim (auto) | |

## Seed inicial (via seeder, não via migration)

| Nome | Valor |
|---|---|
| Microempresa ou Startup | R$ 600,00 |
| Empresa de Pequeno Porte | R$ 1.200,00 |
| Empresa de Médio Porte | R$ 2.400,00 |
| Pessoa jurídica, sem fins lucrativos | R$ 100,00 |

## Relacionamentos

- `hasMany` → `Contrato` (`plano_id`).

## Notas

- `contratos.plano_id` é **nullable**: contratos legados (anteriores a esta
  etapa) não têm plano atribuído retroativamente — não há como inferir com
  segurança qual dos 4 planos cada contrato antigo corresponde só a partir
  de `valor_anuidade`. Atribuir retroativamente é uma revisão manual futura.
