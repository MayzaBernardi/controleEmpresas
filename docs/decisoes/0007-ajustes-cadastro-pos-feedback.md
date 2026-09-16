# 0007. Ajustes de cadastro pós-feedback: exclusão, upload de arquivo, taxonomia de prospecção

Status: aceita

## Contexto

Após a primeira rodada de telas (ADR 0006), o negócio revisou as 11 telas e
pediu um conjunto de ajustes que tocam tanto UI quanto modelagem: toda tela
de cadastro precisava de editar/excluir; Contratos e Documentos precisavam de
upload de arquivo; a taxonomia de status de Prospecção e do Formulário de
Inscrição precisava ser simplificada; e o fluxo de renovação de contrato
precisava passar por Comunicações em vez de ser automático.

## Decisões

### 1. Excluir cadastro é sempre soft-delete (`ativo = false`)

Coluna `ativo` (BOOLEAN, default `true`) adicionada em `empresas`,
`prospeccoes`, `contratos`, `documentos` e `comunicacoes_email` — mesmo
padrão já usado em `usuarios`/`planos_afiliacao`/`espacos_fisicos`. Excluir
pelo front é um `PATCH` normal na rota de atualização (`{ "ativo": false }`),
reaproveitando a rota existente em vez de criar `DELETE` novo. `GET` de cada
um desses recursos só retorna `ativo = true`; a linha nunca é removida do
banco e pode ser reativada pela mesma rota.

**Por quê**: decisão explícita do negócio — nunca hard-delete. Empresas,
contratos, documentos e comunicações são referenciados por outras tabelas e
têm peso de auditoria/histórico; um `DELETE` de verdade quebraria essas
referências ou exigiria `CASCADE`, perdendo dado que pode ser preciso
consultar depois (ex.: um contrato "excluído por engano" continua no banco,
só sai da listagem).

### 2. Upload de arquivo (Contratos e Documentos): base64 direto no Postgres

Colunas novas `arquivo_nome`/`arquivo_mimetype`/`arquivo_base64` em
`contratos`; `arquivo_mimetype`/`arquivo_base64` em `documentos` (que já
tinha `nome_arquivo`). Nenhum storage externo (S3 ou equivalente) — o
conteúdo do arquivo (PNG ou PDF) é lido no browser, convertido pra base64
(`front/src/lib/arquivo.ts`) e enviado no mesmo body JSON do
`POST`/`PATCH`. `back/src/app.js` teve o limite do `express.json()` elevado
para `15mb` para caber isso; o front aplica um teto de 8MB por arquivo antes
de enviar.

Em `documentos`, isso torna `url_arquivo` **opcional** — um documento agora
precisa de pelo menos um dos dois (`url_arquivo` OU `arquivo_base64`), nunca
os dois obrigatórios ao mesmo tempo.

**Por quê**: decisão explícita do negócio ("deve ficar salvo no banco").
Simplicidade de infraestrutura para o estágio atual do projeto (sem serviço
de storage configurado) — trade-off consciente: base64 infla o tamanho em
~33% e não é o padrão recomendado para arquivos grandes a longo prazo. Se o
volume de contratos/documentos crescer a ponto de o tamanho do banco virar
problema, migrar para storage de objeto (S3-like) com `url_arquivo` passando
a apontar pra lá é a evolução natural — as colunas base64 foram desenhadas
para poderem ficar `NULL` nesse cenário sem quebrar nada.

### 3. Taxonomia de `status_prospeccao` simplificada (3 estados, sem "convertida")

Migration de dados (`20260916000003-redefine-status-prospeccao.js`)
substitui os 5 códigos antigos (`identificado`, `material_enviado`,
`aguardando_retorno`, `convertido_para_formulario`, `descartado`) por 3:
`em_contato`, `nao_constatada`, `proposta_rejeitada`.

RN-36 (vínculo automático de prospecção com formulário) mudou junto: não
existe mais um status "convertida" — a conversão passou a ser só
`formulario_resposta_id` deixando de ser `null`. A listagem
(`GET /prospeccoes`) filtra `ativo = true` e `formulario_resposta_id IS
NULL`; uma prospecção convertida simplesmente some da lista de prospecção
(a empresa/formulário dela já aparece nas telas correspondentes). O
critério de elegibilidade pra vincular também mudou: antes checava um
conjunto de status "em aberto"; agora checa só `ativo = true` e
`formulario_resposta_id IS NULL` — com só 3 status e nenhum representando
"convertida", o status em si não é mais um filtro de elegibilidade.

Endpoint novo `GET /prospeccoes/status-disponiveis` (antes não existia
nenhuma rota de leitura para `status_prospeccao`) — necessário pro front
montar o seletor de status na tela de edição.

**Por quê**: decisão do negócio — o funil real de prospecção é mais simples
do que o rascunho original modelava.

### 4. Formulário de Inscrição: status simplificado, link público, benefícios

`status_triagem` (continua `STRING(50)` livre, sem tabela de referência)
passou a usar só dois valores: `aguardando` ("Aguardando preenchimento") e
`finalizado` ("Finalizado") — antes era `aguardando`/`triado`. Migration de
dados (`20260916000004-simplifica-status-triagem.js`) renomeia `triado` →
`finalizado` nos dados existentes.

Nova página pública `/inscricao` no front (sem autenticação, reaproveitando
a rota já pública `POST /formulario-respostas`), pensada para ser enviada
por link direto — a equipe copia o link na tela interna de Formulários de
Inscrição (botão dedicado). A página tem uma aba de benefícios de afiliação
com **conteúdo provisório/genérico** — o negócio ainda vai fornecer o
material oficial para substituir.

Regra nova: um formulário cuja empresa vinculada já tem contrato ativo
(vigente, não vencido) sai da listagem de triagem — a empresa passa a
aparecer normalmente na listagem de Empresas. Calculado no front cruzando
`GET /formulario-respostas` com `GET /contratos` (sem endpoint novo no
back).

### 5. Renovação de contrato aciona Comunicações, não recria o contrato direto

O botão "Renovar" (nas telas de Contratos) não chama mais
`POST /contratos/:id/renovar` diretamente. Ele leva a equipe para a tela de
Comunicações com um rascunho de e-mail pré-preenchido, pedindo que a empresa
entre em contato para a renovação — mensagem varia conforme o contrato já
estar vencido (tom de "volte a aproveitar os benefícios") ou só próximo do
vencimento (tom de "está em período de renovação"). A rota
`POST /contratos/:id/renovar` continua existindo e funcional — a criação de
fato do contrato renovado agora é uma ação separada (via o mesmo formulário
de cadastro), não mais um clique único.

**Por quê**: decisão do negócio — o processo real de renovação começa com
contato humano com a empresa, não com a criação automática de um novo
registro de contrato.

### 6. Sugestão de corpo de e-mail: template local, não LLM real ainda

Ao preencher o campo "Assunto" de um rascunho em Comunicações (ao perder o
foco, se o corpo ainda não foi editado manualmente — ou por um botão
"Sugerir corpo"), o front gera um corpo inicial a partir de um conjunto de
templates por palavra-chave (`front/src/lib/sugestaoEmail.ts`) — sem chamada
a nenhuma API externa.

**Por quê**: `GEMINI_API_KEY` (ADR 0002) ainda não está configurada — decisão
explícita do negócio de não bloquear a funcionalidade esperando a chave.
Quando a integração real com Gemini (ou outro provedor) for implementada,
`sugerirCorpoEmail` é o ponto de troca — a UI (botão + auto-sugestão no blur)
não muda, só a fonte do texto. `gerado_por_ia: true` continua sendo marcado
em todo rascunho criado por este fluxo (RN-25/RN-28), mesmo a sugestão sendo
por template — a revisão humana obrigatória antes de aprovar/enviar não
muda em nada.

## Tabelas e colunas novas (resumo)

| Tabela/alteração | Tipo |
|---|---|
| `empresas.ativo`, `prospeccoes.ativo`, `contratos.ativo`, `documentos.ativo`, `comunicacoes_email.ativo` | ALTER |
| `contratos.arquivo_nome` / `arquivo_mimetype` / `arquivo_base64` | ALTER |
| `documentos.arquivo_mimetype` / `arquivo_base64` | ALTER |
| `documentos.url_arquivo` (NOT NULL → NULL) | ALTER |
| `status_prospeccao` (dados: 5 códigos → 3) | migration de dados |
| `formulario_respostas.status_triagem` (dados: `triado` → `finalizado`) | migration de dados |

## Conexão com Regras de Negócio

- **RN-36** atualizada (não existe mais status "convertida"), **RN-37** a
  **RN-43** novas — registradas em `docs/regras-de-negocio.md`.
