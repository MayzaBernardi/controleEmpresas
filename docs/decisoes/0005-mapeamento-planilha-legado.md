# 0005. Mapeamento de lacunas identificadas na planilha de controle legado

Status: aceita

## Contexto

Com o schema inicial (ADR 0004) implementado, migrado e **já populado com dados
reais de empresas afiliadas**, comparamos o schema com a planilha de controle
usada pela equipe do programa
(`Planilhas_controle_de_informações_afiliados.xlsx`). Essa comparação revelou
sete lacunas: dados e etapas do fluxo real que a planilha já registra, mas que
o schema inicial ainda não modelava.

Diferente do ADR 0004 — que partia de um banco vazio —, esta etapa **altera um
banco com dados existentes**. Isso muda o padrão de risco: qualquer migration
aqui não é só DDL, é potencialmente uma operação de transformação de dados que
pode corromper ou perder informação real se mal escrita. Por isso, esta etapa
segue regras de segurança adicionais, à parte das decisões de schema em si:

1. **Toda migration que popula ou transforma dados roda dentro de uma
   transação** (`queryInterface.sequelize.transaction`), com rollback
   completo se qualquer passo falhar no meio.
2. **Toda migration desta etapa tem um `down()` funcional**, que reverte de
   fato a mudança (schema e/ou dado), nunca um placeholder vazio.
3. **Nenhuma migration desta etapa usa `DROP TABLE` ou `DROP COLUMN`.** Onde
   uma coluna ou tabela antiga é substituída por uma nova estrutura, a
   antiga é mantida intacta e apenas para de ser escrita por código novo — a
   remoção definitiva fica para uma tarefa futura, depois de validação
   manual dos dados migrados.
4. **Nenhum mapeamento automático é aplicado "no escuro"**: sempre que um
   valor de dado existente (texto livre de status, texto livre de
   observação) não bate com um padrão conhecido com confiança, o registro
   fica com o novo campo `NULL` e é listado num relatório em
   `docs/revisao-manual/` para revisão humana — nunca um valor "chutado".
5. **Backup obrigatório antes de aplicar qualquer migration desta etapa.**
   Comando abaixo, a ser executado manualmente antes de `npm run db:migrate`.

### Comando de backup (executar manualmente antes de migrar)

```bash
cd back
set -a; source .env; set +a
PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
  -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USERNAME" \
  -d "$POSTGRES_DB" \
  -F c \
  -f "../backups/pollen_parque_$(date +%Y%m%d_%H%M%S).dump"
```

(cria a pasta `backups/` na raiz do repo se ainda não existir —
`mkdir -p ../backups` antes do comando acima; `backups/` deve ir para
`.gitignore`, dumps de banco não são versionados no git).

### Comando de restore (se algo der errado)

```bash
cd back
set -a; source .env; set +a
PGPASSWORD="$POSTGRES_PASSWORD" pg_restore \
  -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USERNAME" \
  -d "$POSTGRES_DB" --clean --if-exists \
  ../backups/pollen_parque_YYYYMMDD_HHMMSS.dump
```

---

## 1. Plano de afiliação com valor (`planos_afiliacao`)

### Decisão
Nova tabela `planos_afiliacao` (nome, valor, ativo), com FK nullable
`contratos.plano_id`. Nullable porque contratos já existentes não têm plano
atribuído retroativamente — não há informação confiável na planilha para
inferir automaticamente qual plano cada contrato já vigente corresponde
(o valor histórico em `contratos.valor_anuidade` não bate 1:1 com os 4 valores
de plano atuais em todos os casos legados). Atribuir `plano_id` a contratos
antigos é uma revisão manual futura, fora desta etapa.

### Consequências
- Novos contratos devem referenciar um `plano_id`; contratos legados
  continuam funcionando apenas com `valor_anuidade` preenchido.

---

## 2. Isenção de taxa (caso especial contratual)

### Decisão
Colunas novas em `contratos` (`isento_taxa`, `motivo_isencao`,
`documento_referencia`, `isencao_inicio`, `isencao_fim`), com validação
condicional no model: `isento_taxa = true` exige `motivo_isencao` e
`documento_referencia` preenchidos (RN-34).

### Consequências
- Contratos existentes recebem `isento_taxa = false` (default), sem
  necessidade de backfill — a planilha não indicava isenção retroativa para
  nenhum contrato já cadastrado nesta base.

---

## 3. Etapa de prospecção/leads (`prospeccoes`)

### Decisão
Nova tabela `prospeccoes` + tabela de referência `status_prospeccao`,
representando a etapa **anterior** ao formulário de inscrição (contato inicial
via WhatsApp/material, hoje fora do sistema — RN-03). A transição
prospecção → formulário é implementada como **service**
(`back/src/services/prospeccaoService.js`), não como hook automático do
model, para manter a lógica de negócio visível e testável na camada
correta (ADR 0003 já estabelece `routes -> controllers -> services ->
models`; um hook de model esconderia essa regra na camada errada).

### Consequências
- Nenhum backfill de dados aqui: a planilha não tem uma aba de prospecção
  histórica correlacionável 1:1 com `formulario_respostas` existentes sem
  risco de vincular a empresa errada — a tabela começa vazia e passa a ser
  alimentada a partir de agora.

---

## 4. Funil de status completo do processo (`status_processo`)

### Decisão
Nova tabela de referência `status_processo` com os 8 estágios do funil real
(`aguardando_envio_documentos` → ... → `encerrada`), com coluna `ordem` para
preservar a sequência do funil. Nova FK nullable
`empresas.status_processo_id`. **A coluna antiga `empresas.status_processo`
(STRING livre) é mantida intacta** — não é removida nem passa a ser
ignorada silenciosamente; código novo deve preferir `status_processo_id`,
mas nada no schema força a migração imediata de leitores existentes.

### Backfill
Migration de dados dedicada (`...-backfill-empresas-status-processo.js`),
dentro de uma transação, mapeando o texto livre de `status_processo` para o
`codigo` correspondente em `status_processo` via comparação exata
(case-insensitive, com trim), usando a tabela de mapeamento fornecida pela
equipe. Qualquer valor de `status_processo` que não bata **exatamente** com
um dos padrões conhecidos fica com `status_processo_id = NULL` e é listado em
[`../revisao-manual/status-processo-nao-mapeado.md`](../revisao-manual/status-processo-nao-mapeado.md)
para revisão manual — nenhum valor é adivinhado por aproximação/similaridade
de texto.

**Nota**: os dados atualmente na tabela `empresas` deste ambiente vieram do
seed de exemplo do ADR 0004 (`inscricao_pendente`, `contrato_elaboracao`,
`aguardando_assinatura`, `ativa`, `encerrada` — códigos de rascunho inventados
para ilustrar os estágios, não o vocabulário real da planilha). Portanto, ao
rodar esta migration hoje, **nenhuma linha bate com o mapeamento fornecido** e
todas as 15 empresas aparecem no relatório de não-mapeados — isso é o
comportamento correto e esperado (RN-06 continua ⚠️ pendente; não inventamos
uma correspondência só para "zerar" o relatório). O mapeamento passa a
funcionar de verdade assim que os dados reais da planilha estiverem na coluna
`status_processo`.

### Consequências
- RN-06 (⚠️ pendente) continua sem confirmação definitiva do negócio, mas
  agora tem uma tabela de referência pronta para quando for confirmada.

---

## 5. Controle de exposição de marca (`beneficios_exposicao`)

### Decisão
Nova tabela `beneficios_exposicao`, relação 1:1 com `empresas` (FK
`empresa_id` com `unique: true`, garantindo no máximo um registro por
empresa). Sem backfill: a planilha não tem uma coluna equivalente a
"telão"/"site" com dado estruturado a migrar — os valores começam em
`false`/`false` (default) e são preenchidos daqui pra frente pela equipe.

---

## 6. Reservas de espaço com granularidade individual (`reservas_espaco`)

### Decisão
Nova tabela `reservas_espaco`, registrando cada reserva individualmente
(`tipo_espaco`: `sala_atico` | `auditorio` | `coworking`; `status`:
`pre_reservado` | `confirmado` | `realizado` | `cancelado`). O limite anual
por tipo de espaço (sala_atico e auditorio: 1×/ano; coworking: 12×/ano) é
validado em **service** (`back/src/services/reservaEspacoService.js`), não
em hook de model, pela mesma razão do item 3.

**A tabela `espacos_fisicos` (ADR 0004) é mantida intacta e sem uso em
código novo** — ela modela um conceito diferente (ocupação de sala fixa e
contínua por uma empresa, ex. "Sala 12, Bloco A") do que `reservas_espaco`
modela (reserva pontual e recorrente de um espaço compartilhado
específico — sala do ático, auditório, coworking). Não são a mesma
entidade; por isso "substituir" aqui significa que `reservas_espaco` passa
a ser a tabela usada para o fluxo de reservas de espaço compartilhado daqui
pra frente, enquanto `espacos_fisicos` continua representando a alocação de
sala fixa.

### Backfill — limitação encontrada e comunicada, não contornada

A migration de dados (`...-backfill-reservas-espaco.js`) tentou classificar
cada linha existente de `espacos_fisicos` em um `tipo_espaco`
(`sala_atico`/`auditorio`/`coworking`) por correspondência de palavra-chave em
`identificador_sala`/`bloco` (ex.: contém "ático"/"atico" → `sala_atico`;
"auditorio"/"auditório" → `auditorio`; "coworking" → `coworking`).

**Nos dados atuais deste ambiente, nenhuma das 9 linhas de `espacos_fisicos`
contém essas palavras-chave** (são identificadores genéricos do seed do ADR
0004, ex. "Sala 10", "Bloco A") — a tabela `espacos_fisicos`, como
efetivamente implementada, não distingue tipo de espaço nem tem um campo de
observação com texto livre e data (diferente do que a descrição inicial desta
tarefa presumia, possivelmente descrevendo a estrutura da planilha, não a
estrutura desta tabela). Por isso, o backfill automático **não classificou
nenhuma linha com confiança** e todas as 9 foram listadas em
[`../revisao-manual/reservas-espaco-nao-mapeado.md`](../revisao-manual/reservas-espaco-nao-mapeado.md)
para classificação manual — nenhuma reserva foi criada adivinhando o tipo de
espaço. Nenhuma data foi inventada em nenhum caso.

### Consequências
- `reservas_espaco` começa praticamente vazia neste ambiente (0 linhas
  migradas automaticamente); a equipe precisa classificar manualmente as 9
  ocupações existentes usando o relatório, ou simplesmente começar a
  registrar reservas novas dali em diante caso as ocupações antigas não
  façam sentido como "reservas" no novo modelo.

---

## 7. Campos de contato adicionais em `empresas`

### Decisão
Colunas novas nullable em `empresas`: `telefone`, `cidade`, `uf`,
`representante_legal`. Sem backfill automático — a planilha tem esses dados,
mas trazê-los exige um script de importação à parte (fora do escopo desta
tarefa de modelagem), não uma inferência a partir de dados já no banco.

---

## Tabelas e colunas novas (resumo)

| Tabela/alteração | Tipo | PK |
|---|---|---|
| `planos_afiliacao` | nova | BIGSERIAL |
| `status_prospeccao` | nova (referência) | SERIAL |
| `prospeccoes` | nova | UUID |
| `status_processo` | nova (referência) | SERIAL |
| `beneficios_exposicao` | nova | BIGSERIAL |
| `reservas_espaco` | nova | BIGSERIAL |
| `contratos.plano_id` | ALTER | — |
| `contratos.isento_taxa` + 4 colunas | ALTER | — |
| `empresas.status_processo_id` | ALTER + backfill | — |
| `empresas.telefone/cidade/uf/representante_legal` | ALTER | — |

## Conexão com Regras de Negócio

- **RN-34** (isenção de taxa), **RN-35** (limite anual de reservas por tipo de
  espaço) e **RN-36** (transição de prospecção para formulário) — novas,
  registradas em `docs/regras-de-negocio.md`.
- **RN-06** (⚠️ pendente): `status_processo` (tabela de referência) agora
  existe, mas a pendência de confirmação com o negócio continua aberta.
