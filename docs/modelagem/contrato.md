# Contrato

Tabela: `contratos` · Model: [`Contrato`](../../back/src/models/Contrato.js) ·
Migration: [`20260915000006-create-contratos.js`](../../back/src/migrations/20260915000006-create-contratos.js) ·
ALTER: [`20260915020005`](../../back/src/migrations/20260915020005-alter-contratos-add-plano-id.js) (plano), [`20260915020006`](../../back/src/migrations/20260915020006-alter-contratos-add-isencao-taxa.js) (isenção)

Contrato de afiliação de uma empresa (RF-03, RF-07), incluindo renovações
encadeadas e o acompanhamento do trâmite na Procuradoria Jurídica (RN-08).

## Campos

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | UUID (v4) | sim (gerado) | PK. UUID por ser exposta em rotas/links externos (ADR 0004 §1). |
| `empresa_id` | UUID (FK → `empresas.id`, `ON DELETE RESTRICT`) | sim | |
| `contrato_anterior_id` | UUID (FK → `contratos.id`, `ON DELETE SET NULL`) | não | Autorreferência para encadear renovações (RF-07, ADR 0004 §5). `null` no primeiro contrato de uma empresa. |
| `numero_termo` | STRING(100) | não | Único. `null` enquanto o contrato ainda está em elaboração. |
| `data_inicio_vigencia` | DATEONLY | sim | |
| `data_termino_vigencia` | DATEONLY | sim | Vigência anual (RN-21). |
| `status_contrato_id` | INTEGER (FK → `status_contrato.id`) | sim | Estado formal, registrado manualmente pela equipe. Ver [`status-contrato.md`](./status-contrato.md). |
| `numero_chamado_procuradoria` | STRING(100) | não | RN-08/RN-10. |
| `data_envio_procuradoria` | DATEONLY | não | |
| `data_retorno_procuradoria` | DATEONLY | não | |
| `valor_anuidade` | DECIMAL(12,2) | sim | |
| `observacoes` | TEXT | não | |
| `plano_id` | BIGINT (FK → `planos_afiliacao.id`) | não | Nullable — contratos legados não têm plano atribuído retroativamente. ADR 0005 §1. |
| `isento_taxa` | BOOLEAN | sim | Default `false`. RN-34. |
| `motivo_isencao` | TEXT | condicional | Obrigatório quando `isento_taxa = true` (RN-34). |
| `documento_referencia` | STRING(100) | condicional | Ex.: `"DISTRATO 129/2023-1"`. Obrigatório quando `isento_taxa = true` (RN-34). |
| `isencao_inicio` | DATEONLY | não | |
| `isencao_fim` | DATEONLY | não | |
| `arquivo_nome` | STRING(500) | não | Nome do arquivo do contrato assinado (PNG/PDF), anexado no cadastro/edição. ADR 0007 §2. |
| `arquivo_mimetype` | STRING(150) | não | Ex.: `application/pdf`. ADR 0007 §2. |
| `arquivo_base64` | TEXT | não | Conteúdo do arquivo em base64, direto no Postgres — sem storage externo (RN-38/ADR 0007 §2). |
| `ativo` | BOOLEAN | sim | Default `true`. Excluir é soft-delete (RN-37/ADR 0007). |
| `created_at` / `updated_at` | TIMESTAMP | sim (auto) | |

### Campos virtuais (não persistidos)

| Getter | Tipo | Descrição |
|---|---|---|
| `estaVencido` | boolean | `data_termino_vigencia < hoje`. |
| `estaProximoVencimento` | boolean | `hoje <= data_termino_vigencia <= hoje + 60 dias`. |

## Relacionamentos

- `belongsTo` → `Empresa` (`empresa_id`), `StatusContrato` (`status_contrato_id`), `PlanoAfiliacao` (`plano_id`, opcional), `Contrato as contratoAnterior` (`contrato_anterior_id`).
- `hasMany` → `Contrato as renovacoes` (inverso da autorreferência), `Assinatura`, `Documento`, `FinanceiroLancamento`.

## Regras de negócio aplicadas

- **RN-09 / RN-11**: vigência formal depende de todas as assinaturas concluídas (ver [`assinatura.md`](./assinatura.md)) — não é uma constraint de banco, é responsabilidade do service ao transicionar `status_contrato_id` para `vigente`.
- **RN-30** (getters virtuais `estaVencido`/`estaProximoVencimento`, calculados em leitura, nunca persistidos):
  - "Renovação pendente": `data_termino_vigencia ≤ hoje + 60 dias` **e** `status_contrato_id` formal ainda `vigente`. A combinação com o status formal é feita no service (os getters do model só cobrem a parte de data).
  - "Encerrado por vencimento": `data_termino_vigencia < hoje` **e** sem contrato subsequente vigente vinculado via `contrato_anterior_id`.
- **RN-33** (scope nomeado `paraEmpresa(empresaId)`, `where` embrulhado em `Op.and` para permanecer seguro mesmo com `findByPk` — ver nota completa em [`empresa.md`](./empresa.md)).
- **RN-34** (validator condicional no model, ADR 0005 §2): `isento_taxa = true` exige `motivo_isencao` e `documento_referencia` preenchidos.
- **RN-37** (ADR 0007): `ativo = false` é a única forma de "excluir" — nunca `DELETE`.
- **RN-38** (ADR 0007 §2): upload de arquivo (PNG/PDF) em base64, sem storage externo.
- **RN-42** (ADR 0007 §5): no front, "Renovar" não chama mais `POST /contratos/:id/renovar` direto — leva para Comunicações com um rascunho de e-mail. O endpoint continua existindo para a criação de fato do contrato renovado.

## Notas

- `status_contrato_id` usa tabela de referência (não ENUM) para permitir novos estados via `INSERT` sem `ALTER TYPE` (ADR 0004 §2).
