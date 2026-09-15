# Prospecção

Tabela: `prospeccoes` · Model: [`Prospeccao`](../../back/src/models/Prospeccao.js) ·
Migration: [`20260915020003-create-prospeccoes.js`](../../back/src/migrations/20260915020003-create-prospeccoes.js) ·
ADR: [`0005-mapeamento-planilha-legado.md`](../decisoes/0005-mapeamento-planilha-legado.md) §3

Etapa de lead/prospecção, **anterior** ao formulário de inscrição —
representa o contato inicial com uma empresa potencialmente interessada
(hoje, tipicamente via WhatsApp/material enviado, RN-03), antes de haver
qualquer registro formal no sistema.

## Campos

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | UUID (v4) | sim (gerado) | PK. |
| `nome_empresa` | STRING(255) | sim | |
| `cidade` | STRING(255) | não | |
| `uf` | STRING(2) | não | |
| `email_contato` | STRING(255) | não | |
| `telefone_contato` | STRING(30) | não | |
| `responsavel_interno` | STRING(255) | não | Quem na equipe do programa fez o contato/enviou o material. |
| `status_prospeccao_id` | INTEGER (FK → `status_prospeccao.id`) | sim | Default `1` (`identificado`). Ver [`status-prospeccao.md`](./status-prospeccao.md). |
| `formulario_resposta_id` | BIGINT (FK → `formulario_respostas.id`, `ON DELETE SET NULL`) | não | Preenchido só quando/se a prospecção converte (RN-36). |
| `observacoes` | TEXT | não | |
| `created_at` / `updated_at` | TIMESTAMP | sim (auto) | |

## Relacionamentos

- `belongsTo` → `StatusProspeccao` (`status_prospeccao_id`), `FormularioResposta` (`formulario_resposta_id`, opcional).

## Regras de negócio aplicadas

- **RN-36** (implementada em service, não em hook de model —
  `back/src/services/prospeccaoService.js`): quando um `FormularioResposta`
  é criado, se existir uma prospecção em aberto com o mesmo
  `email_contato`/`nome_empresa`, ela é vinculada
  (`formulario_resposta_id`) e seu `status_prospeccao_id` avança para
  `convertido_para_formulario`.

## Notas

- Sem scope `paraEmpresa` (RN-33): esta tabela é de uso interno da equipe
  do programa (RN-01), não é vinculada a um `empresa_id` — a prospecção só
  passa a ter uma empresa "de verdade" depois que converte em cadastro.
- Sem backfill de dados legados: a planilha não tinha uma aba de
  prospecção correlacionável com segurança aos `formulario_respostas`
  já existentes (ADR 0005 §3) — a tabela começa vazia.
