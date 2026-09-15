# Empresa

Tabela: `empresas` · Model: [`Empresa`](../../back/src/models/Empresa.js) ·
Migration: [`20260915000002-create-empresas.js`](../../back/src/migrations/20260915000002-create-empresas.js) ·
ALTER: [`20260915020009`](../../back/src/migrations/20260915020009-alter-empresas-add-contato-fields.js), [`20260915020010`](../../back/src/migrations/20260915020010-alter-empresas-add-status-processo-id.js), [`20260915020011`](../../back/src/migrations/20260915020011-backfill-empresas-status-processo.js)

Cadastro formal de uma empresa afiliada (RF-01). Criado a partir da triagem
de uma submissão em `formulario_respostas` (RN-04).

## Campos

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | UUID (v4) | sim (gerado) | PK. UUID por ser exposta em rotas/links externos (ADR 0004 §1). |
| `razao_social` | STRING(255) | sim | Razão social da empresa. |
| `nome_fantasia` | STRING(255) | não | Nome fantasia, se houver. |
| `cnpj` | STRING(18) | condicional | Obrigatório (14 dígitos numéricos) quando `tipo_empresa = 'nacional'`. Único. |
| `identificador_estrangeiro` | STRING(100) | condicional | Obrigatório quando `tipo_empresa = 'internacional'`. |
| `tipo_empresa` | ENUM(`nacional`, `internacional`) | sim | Nacionalidade da empresa; default `nacional`. |
| `tipo_caso_especial` | ENUM(`nenhum`, `grande_porte`, `internacional`, `outro`) | sim | Flag de tratamento diferenciado (RF-11); default `nenhum`. Independente de `tipo_empresa`. |
| `descricao_caso_especial` | TEXT | não | Detalhamento livre do caso especial. |
| `status_processo` | STRING(50) | sim | Texto livre legado (RN-06, ⚠️ pendente). **Mantido intacto** — ver Notas. Default `inscricao_pendente`. |
| `status_processo_id` | INTEGER (FK → `status_processo.id`) | não | Adicionada na ADR 0005 §4. Código novo deve preferir esta coluna sobre `status_processo`. Ver [`status-processo.md`](./status-processo.md). |
| `contatos` | JSONB | sim | E-mail/telefone de contato; default `{}`. |
| `observacoes` | TEXT | não | Observações livres da equipe do programa. |
| `telefone` | STRING(30) | não | Adicionada na ADR 0005 §7. |
| `cidade` | STRING(255) | não | Adicionada na ADR 0005 §7. |
| `uf` | STRING(2) | não | Adicionada na ADR 0005 §7. |
| `representante_legal` | STRING(255) | não | Nome citado no contrato; distinto dos signatários formais em `assinaturas`. Adicionada na ADR 0005 §7. |
| `created_at` / `updated_at` | TIMESTAMP | sim (auto) | Gerenciados pelo Sequelize. |

## Relacionamentos

- `hasMany` → `Usuario` (`empresa_id`), `FormularioResposta`, `EspacoFisico`, `Contrato`, `Documento`, `FinanceiroLancamento`, `ReservaEspaco`.
- `hasOne` → `BeneficioExposicao`.
- `belongsTo` → `StatusProcesso` (`status_processo_id`, opcional).
- `belongsToMany` → `ComunicacaoEmail` via `ComunicacaoDestinatario`.

## Regras de negócio aplicadas

- **RN-32** (validator condicional no model): `tipo_empresa = 'internacional'` dispensa `cnpj` mas exige `identificador_estrangeiro`; `tipo_empresa = 'nacional'` exige `cnpj` com 14 dígitos numéricos (após remover máscara).
- **RN-33** (scope nomeado `paraEmpresa(empresaId)`): filtra `where: { [Op.and]: [{ id: empresaId }] }`, para que um usuário `empresa_afiliada` só enxergue seu próprio cadastro. Deve ser chamado explicitamente pelo controller — nunca é `defaultScope`. O filtro é embrulhado em `Op.and` (em vez de `where: { id: empresaId }` puro) porque a coluna de isolamento aqui é a própria PK — a mesma chave que `findByPk` usa internamente; sem o `Op.and`, um `Empresa.scope(...).findByPk(outroId)` faria o merge raso do Sequelize sobrescrever o filtro do scope em vez de combiná-lo com AND, vazando dados de outra empresa (bug real, encontrado e corrigido nesta modelagem).
- **RN-01**: base do isolamento por perfil entre os três atores do sistema.

## Notas

- `status_processo` é `STRING` livre (não ENUM/tabela de referência) porque RN-06 está marcada ⚠️ como pendência aberta — os valores usados no seed (`inscricao_pendente`, `contrato_elaboracao`, `aguardando_assinatura`, `ativa`, `encerrada`) são rascunho, sujeitos a mudança quando o negócio confirmar a lista definitiva.
- **`status_processo_id` não substitui `status_processo`** — as duas colunas coexistem por decisão explícita do ADR 0005 (nunca `DROP COLUMN` numa etapa com dado real já existente). O backfill de `status_processo_id` a partir do texto livre de `status_processo` é feito pela migration `20260915020011`, por comparação exata (case-insensitive) com o vocabulário da planilha legado — qualquer valor sem correspondência exata fica `NULL` e é listado em [`../revisao-manual/status-processo-nao-mapeado.md`](../revisao-manual/status-processo-nao-mapeado.md) para revisão manual, nunca adivinhado. Nos dados deste ambiente (seed do ADR 0004, vocabulário de rascunho diferente do da planilha real), **nenhuma linha bateu automaticamente** — o comportamento é o esperado, não um bug.
