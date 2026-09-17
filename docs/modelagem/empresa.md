# Empresa

Tabela: `empresas` · Model: [`Empresa`](../../back/src/models/Empresa.js) ·
Migration: [`20260915000002-create-empresas.js`](../../back/src/migrations/20260915000002-create-empresas.js) ·
ALTER: [`20260915020009`](../../back/src/migrations/20260915020009-alter-empresas-add-contato-fields.js), [`20260915020010`](../../back/src/migrations/20260915020010-alter-empresas-add-status-processo-id.js), [`20260915020011`](../../back/src/migrations/20260915020011-backfill-empresas-status-processo.js), [`20260917030000`](../../back/src/migrations/20260917030000-add-endereco-representante-empresas.js) (RN-46/RN-47, ADR 0008)

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
| `status_processo` | STRING(50) | sim | RN-06 (resolvida 2026-09-17): só 3 valores possíveis — `contrato_elaboracao` (default, toda empresa nasce aqui), `ativa` (setado automaticamente por `contratosService.emitir`) e `encerrada` (nunca gravado — calculado em leitura por `empresasService.aplicarStatusEncerradaPorVencimento`, ver Notas). Continua `STRING` livre, não `ENUM`. |
| `status_processo_id` | INTEGER (FK → `status_processo.id`) | não | Adicionada na ADR 0005 §4, a partir de um vocabulário de 8 estados vindo da planilha legado (`aguardando_envio_documentos`, `afiliada_ativa`, etc. — ver [`status-processo.md`](./status-processo.md)). **Não é o campo usado pelo front nem pela regra RN-06 acima** — é um campo histórico do backfill da ADR 0005, sem leitura/escrita fora dele; `status_processo` (a coluna de texto acima) é a fonte da verdade em uso. |
| `contatos` | JSONB | sim | E-mail/telefone de contato; default `{}`. |
| `observacoes` | TEXT | não | Observações livres da equipe do programa. |
| `telefone` | STRING(30) | não | Adicionada na ADR 0005 §7. |
| `cidade` | STRING(255) | não | Adicionada na ADR 0005 §7. |
| `uf` | STRING(2) | não | Adicionada na ADR 0005 §7. |
| `representante_legal` | STRING(255) | não | Nome citado no contrato. Adicionada na ADR 0005 §7. |
| `endereco_logradouro` | STRING(255) | condicional | Rua/avenida do endereço. Adicionada na ADR 0008 §2 — obrigatório só no momento de emitir contrato (RN-47), opcional no cadastro. |
| `endereco_numero` | STRING(20) | condicional | Idem — RN-47/ADR 0008 §2. |
| `endereco_complemento` | STRING(100) | não | Idem, mas nunca obrigatório (nem para emitir) — nem todo endereço tem complemento. ADR 0008 §2. |
| `endereco_bairro` | STRING(150) | condicional | Idem `endereco_logradouro` — RN-47/ADR 0008 §2. |
| `representante_legal_cpf` | STRING(14) | condicional | CPF do representante legal, exigido pelo template de contrato. RN-47/ADR 0008 §2. |
| `representante_legal_email` | STRING(255) | condicional | E-mail do representante legal, exigido pelo template de contrato. RN-47/ADR 0008 §2. |
| `ativo` | BOOLEAN | sim | Default `true`. Excluir a empresa é sempre soft-delete (RN-37/ADR 0007) — `false` some da listagem, nunca remove a linha. |
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
- **RN-37** (ADR 0007): `ativo = false` é a única forma de "excluir" uma empresa — nunca `DELETE`. `GET /empresas` só retorna `ativo = true`.
- **RN-47** (ADR 0008): `endereco_logradouro`/`endereco_numero`/`endereco_bairro`/`representante_legal_cpf`/`representante_legal_email` (mais `cidade`/`uf`/`telefone`/`representante_legal`, já existentes) são exigidos por `contratosService.emitir` no momento de emitir um contrato — não há validação de obrigatoriedade no model da Empresa em si, a checagem é feita no service de Contrato (`back/src/services/contratosService.js`), que recusa com `400` listando o que falta.

## Notas

- `status_processo` é `STRING` livre (não `ENUM`) por decisão deliberada — não porque a lista de valores ainda esteja em aberto (RN-06 já foi resolvida): evita precisar de `ALTER TYPE` se o negócio pedir um 4º estado no futuro, mesmo padrão de `status_contrato_id`/`status_financeiro_id` (que usam tabela de referência) e de vários outros campos de status deste projeto.
- `empresasService.aplicarStatusEncerradaPorVencimento` (RN-06) roda dentro de `listar()`/`buscarPorId()`: para toda empresa com `status_processo = 'ativa'` persistido, verifica se existe algum `Contrato` dela (`ativo: true`) com status `em_assinatura`, ou `vigente` com `data_termino_vigencia >= hoje` — se não existir nenhum, reescreve `status_processo` para `'encerrada'` **só no objeto da resposta**, nunca com `.save()`. Mesmo espírito de RN-30 (`Contrato.estaVencido`), adaptado pra service por precisar cruzar com outra tabela.
- **`status_processo_id` não substitui `status_processo`** — as duas colunas coexistem por decisão explícita do ADR 0005 (nunca `DROP COLUMN` numa etapa com dado real já existente). O backfill de `status_processo_id` a partir do texto livre de `status_processo` é feito pela migration `20260915020011`, por comparação exata (case-insensitive) com o vocabulário da planilha legado — qualquer valor sem correspondência exata fica `NULL` e é listado em [`../revisao-manual/status-processo-nao-mapeado.md`](../revisao-manual/status-processo-nao-mapeado.md) para revisão manual, nunca adivinhado. Nos dados deste ambiente (seed do ADR 0004, vocabulário de rascunho diferente do da planilha real), **nenhuma linha bateu automaticamente** — o comportamento é o esperado, não um bug.
