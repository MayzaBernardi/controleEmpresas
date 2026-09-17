# Contrato

Tabela: `contratos` · Model: [`Contrato`](../../back/src/models/Contrato.js) ·
Migration: [`20260915000006-create-contratos.js`](../../back/src/migrations/20260915000006-create-contratos.js) ·
ALTER: [`20260915020005`](../../back/src/migrations/20260915020005-alter-contratos-add-plano-id.js) (plano), [`20260915020006`](../../back/src/migrations/20260915020006-alter-contratos-add-isencao-taxa.js) (isenção)

Contrato de afiliação de uma empresa (RF-03, RF-07), incluindo renovações
encadeadas. **Atualizado em 2026-09-17 (ADR 0008)**: `numero_chamado_procuradoria`/
`data_envio_procuradoria`/`data_retorno_procuradoria` abaixo descrevem um fluxo
de Procuradoria Jurídica que foi **aposentado** (RN-08 aposentada) — as
colunas continuam existindo (histórico de contratos antigos), mas o fluxo
ativo hoje é emitir (`POST /contratos/:id/emitir`, RN-46) → contabilidade
baixa e envia para assinatura eletrônica externa (Satelitti, fora do
sistema) → equipe confirma manualmente `PATCH /contratos/:id/vigente`.

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
| `numero_chamado_procuradoria` | STRING(100) | não | Histórico — RN-08/RN-10, aposentadas (ADR 0008). Não preenchido pelo fluxo ativo. |
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
| `arquivo_nome` | STRING(500) | não | Nome do arquivo do contrato (PNG/PDF). Preenchido automaticamente por `contratosService.emitir` (`contrato-<numero_termo>.pdf`, RN-46/ADR 0008) ou manualmente via upload no cadastro/edição (RN-38/ADR 0007 §2) — as duas formas convivem. |
| `arquivo_mimetype` | STRING(150) | não | Ex.: `application/pdf`. ADR 0007 §2. |
| `arquivo_base64` | TEXT | não | Conteúdo do arquivo em base64, direto no Postgres — sem storage externo (RN-38/ADR 0007 §2). Gerado automaticamente por `contratosService.emitir` (RN-46/ADR 0008) a partir de `back/public/templates/minuta-contrato-afiliacao.docx`, ou definido manualmente via upload. |
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

- ~~**RN-09 / RN-11**: vigência formal depende de todas as assinaturas concluídas (ver [`assinatura.md`](./assinatura.md)).~~ **Aposentada (ADR 0008)**: `status_contrato_id = vigente` passou a ser uma confirmação manual da equipe (`contratosService.marcarVigente`), sem depender de assinaturas rastreadas individualmente no sistema — a assinatura em si acontece fora do sistema (serviço externo Satelitti).
- **RN-46 / RN-47** (ADR 0008, atualizada 2026-09-17): `contratosService.emitir` (só `equipe_programa`) gera `arquivo_base64`/`arquivo_mimetype`/`arquivo_nome` automaticamente a partir do template e avança `status_contrato_id` para `em_assinatura`; valida antes que a empresa vinculada tenha todos os dados exigidos pelo template (RN-47), recusando com `400` caso falte algo. `contratosService.marcarVigente` (`equipe_programa` **ou** `contabilidade`) avança para `vigente`, sem validação adicional.
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
