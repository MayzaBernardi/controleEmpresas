# 0008. Emissão automática de contrato e assinatura eletrônica externa (Satelitti)

Status: aceita

## Contexto

O fluxo de contratos modelado nas etapas anteriores (RN-07 a RN-10) previa:
o contrato é gerado a partir de uma minuta padrão preenchida manualmente
pela equipe fora do sistema; depois segue para abertura de chamado na
Procuradoria Jurídica (`numero_chamado_procuradoria`/`data_envio_procuradoria`/
`data_retorno_procuradoria`, em `contratos`); e só é considerado vigente
depois de assinado individualmente por representante legal + 3 assinantes
institucionais + reitor, com o sistema registrando o retorno desse fluxo
(tabela/model `Assinatura`).

O negócio corrigiu esse mapeamento: **não é esse o fluxo real**. Na prática:

1. A **equipe do programa** emite o contrato — hoje isso significa preencher
   manualmente a minuta padrão (`.docx`) com os dados da empresa.
2. A **contabilidade** baixa esse contrato já emitido.
3. A contabilidade envia o contrato para assinatura por um serviço de
   assinatura eletrônica externo, **"Satelitti"** — que já é citado por nome
   na própria minuta padrão (Cláusula Décima Segunda, "Da Assinatura
   Eletrônica"), com base no Art. 10, §2º da MP 2200-2/2001 e no Art. 6º do
   Decreto 10.278/2020. Esse envio e a coleta de assinatura acontecem
   **inteiramente fora do sistema** — não há chamado de Procuradoria nem
   necessidade de rastrear cada signatário individualmente dentro da
   aplicação.
4. Quando o contrato volta assinado (pelo Satelitti), a equipe confirma
   manualmente que ele está vigente.

## Decisões

### 1. Geração automática do PDF do contrato (substitui o preenchimento manual da minuta)

A Etapa 6 já criava o registro do contrato (`POST /contratos`, função
`contratosService.gerar`) mas deixava a geração do PDF em si "fora de
escopo" — o comentário no código dizia explicitamente que os contratos eram
"gerados manualmente pela equipe fora do sistema". Essa etapa implementa a
geração de fato:

- Reaproveitada a infraestrutura já existente em `back/src/utils/gerarPdf.js`
  (trabalho paralelo de outro módulo do sistema, não criada por esta etapa):
  `docxtemplater` + `pizzip` pra preencher um `.docx` com tags `{TAG}` e
  `libreoffice-convert` pra converter o resultado em PDF (base64).
- O template original enviado pelo negócio
  (`back/public/templates/Minuta contrato Programa de Afiliados (1).docx`)
  **não tinha tags de mesclagem** — usava blocos `XXXXXXXXXX` como
  placeholder manual, típico de um documento pensado pra preenchimento à
  mão. Uma cópia tageada foi preparada e versionada como
  `back/public/templates/minuta-contrato-afiliacao.docx` (o arquivo original
  permanece intacto, como referência/backup humano). Validado ponta a ponta:
  render do docx + conversão pra PDF com dados de exemplo, conferindo que
  cada tag cai no lugar certo do texto.
- Nova função `contratosService.emitir(id)` (rota
  `POST /contratos/:id/emitir`, só `equipe_programa`): busca o contrato e a
  empresa vinculada, valida que todos os dados exigidos pelo template estão
  preenchidos (ver seção 2 abaixo — se faltar algo, recusa com `400` listando
  exatamente o que falta), gera o PDF e grava o resultado nas colunas que
  **já existiam** desde a Etapa 8 (`arquivo_base64`/`arquivo_mimetype`/
  `arquivo_nome`, ADR 0007 §2) — não foi preciso nenhum storage novo. Também
  avança `status_contrato_id` para `em_assinatura` (status que já existia na
  tabela de referência desde a Etapa 4, mas não tinha uma transição
  automática associada até agora).
- O upload manual de arquivo (existente desde a Etapa 8) **continua
  disponível** como alternativa/correção — a emissão automática não é a
  única forma de um contrato ganhar um arquivo.

### 2. Novos campos em Empresa, exigidos só no momento de emitir

O template exige dados que o cadastro de Empresa não tinha: endereço
completo e identificação do representante legal. Adicionadas 6 colunas
nullable em `empresas` (migration
`20260917030000-add-endereco-representante-empresas.js`):
`endereco_logradouro`, `endereco_numero`, `endereco_complemento`,
`endereco_bairro`, `representante_legal_cpf`, `representante_legal_email`
(o nome do representante já existia, `representante_legal`, desde a Etapa
4). São opcionais no cadastro da empresa — só viram bloqueio na hora de
`emitir`, com mensagem de erro listando exatamente o que falta preencher.

**Por quê opcional na empresa em vez de obrigatório**: a maior parte das ~15
empresas de exemplo (e presumivelmente boa parte das reais) foi cadastrada
antes de existir a emissão automática — tornar os campos obrigatórios
quebraria o cadastro existente. A validação pertence ao momento em que o
dado é realmente necessário (emitir), não ao cadastro em si.

### 3. Aposentado: chamado na Procuradoria e coleta de assinatura por pessoa

RN-08 (Procuradoria Jurídica) e RN-09/RN-10 (assinatura individual por
representante legal + 3 assinantes + reitor, tabela `Assinatura`) **deixam
de fazer parte do fluxo ativo**. Nenhuma tabela ou coluna foi removida —
`numero_chamado_procuradoria`/`data_envio_procuradoria`/
`data_retorno_procuradoria` continuam em `contratos` e a tabela
`assinaturas`/model `Assinatura` continua no schema (histórico, contratos
antigos que passaram por esse fluxo antes desta etapa) — só não são mais
exigidos nem preenchidos pelo caminho novo (`emitir`/`marcarVigente`), e o
front nunca teve tela própria pra `Assinatura`, então não há UI pra remover
ali.

A confirmação de que o contrato voltou assinado (pelo Satelitti) passou a
ser uma ação manual simples da equipe: `contratosService.marcarVigente(id)`
(rota `PATCH /contratos/:id/vigente`, só `equipe_programa`), que avança
`status_contrato_id` para `vigente` — sem validação adicional, é uma
confirmação de confiança da equipe, já que o ato de assinatura em si
acontece inteiramente fora do sistema.

### 4. Acesso da Contabilidade ao PDF gerado

Nenhuma mudança de permissão foi necessária: a Contabilidade já tinha acesso
de leitura a `GET /contratos`/`GET /contratos/:id` desde a Etapa 6 (RN-33),
e o front (`front/src/app/(app)/contratos/page.tsx`) já expunha um botão
"Visualizar" (via `arquivo_base64`) pra qualquer papel com acesso à tela,
sem exigir permissão de gerenciamento — passou a funcionar automaticamente
para contratos emitidos, sem precisar de nenhuma mudança de RBAC.

## Consequências

- Só existe hoje **um** template (o de afiliação não residente). Empresas
  com `tipo_caso_especial` diferente (ex.: internacional, grande porte,
  RN-12/RN-13) usam o mesmo template por ora — se precisarem de cláusulas
  diferentes, isso é trabalho futuro (múltiplos templates por caso), fora do
  escopo desta etapa.
- `EMPRESA_TELEFONE` e `REPRESENTANTE_TELEFONE` (duas tags distintas no
  template) recebem o **mesmo** valor (`empresa.telefone`) — decisão
  deliberada pra não adicionar um sétimo campo novo em Empresa (telefone do
  representante) além dos 6 já aprovados com o negócio.
- O número do contrato exibido no topo do template (`Nº ___/2026`) usa o ano
  "2026" fixo no texto, assim como as referências ao "Edital nº 13/2026"
  espalhadas pelo documento — o template é específico deste edital/ano, não
  um modelo genérico "evergreen". Trocar de edital/ano exige um novo
  template (fora do escopo desta etapa).
