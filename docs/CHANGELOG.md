# Changelog de etapas

Registro cronológico de etapas fechadas do desenvolvimento. Cada linha aponta
para o(s) documento(s) produzido(s)/atualizado(s) naquela etapa — a etapa só
conta como fechada quando o link existe. Ver convenção em
[`docs/README.md`](./README.md).

## 2026-09-14 — Etapa 0: setup do repositório

- Repositório git estava inicializado em `/root` (home do usuário) em vez de
  `projetoIA/`, arriscando versionar arquivos sensíveis. Reinicializado em
  `/root/projetoIA/`, cobrindo `back/` e `front/`, branch `main`.
- Doc: [`decisoes/0001-organizacao-do-repositorio-e-documentacao.md`](./decisoes/0001-organizacao-do-repositorio-e-documentacao.md)

## 2026-09-14 — Etapa 1: convenção de documentação e regras de negócio

- Definida a convenção de documentação do projeto (tipos de doc por tipo de
  etapa fechada).
- Escrito o primeiro levantamento de regras de negócio a partir do
  levantamento inicial de requisitos (fluxo, atores, RFs, RNFs), com pontos
  ainda pendentes de validação marcados explicitamente.
- Docs: [`README.md`](./README.md), [`regras-de-negocio.md`](./regras-de-negocio.md), [`decisoes/0001-organizacao-do-repositorio-e-documentacao.md`](./decisoes/0001-organizacao-do-repositorio-e-documentacao.md)

## 2026-09-14 — Etapa 2: escopo de IA definido (RF-04)

- Definido que o sistema usará um agente de IA para redigir rascunhos de
  e-mail (RF-04), com revisão humana obrigatória antes do envio. Contrato
  (RF-03) e triagem de documentos (RF-05) ficaram fora do escopo de IA por
  ora — avaliados e descartados por risco (contrato) e custo de
  implementação no prazo (documentos).
- Docs: [`regras-de-negocio.md`](./regras-de-negocio.md) (RN-28), [`decisoes/0002-agente-de-ia-para-redacao-de-emails.md`](./decisoes/0002-agente-de-ia-para-redacao-de-emails.md)

## 2026-09-15 — Etapa 3: definição de persistência e autenticação

- Definida a stack técnica de dados e segurança do projeto: PostgreSQL como SGBD relacional, Sequelize como ORM no backend CommonJS e Auth.js para autenticação, gestão de sessão e integração com SSO institucional (RN-02 / RNF-01).
- Doc: [`decisoes/0003-persistencia-e-autenticacao.md`](./decisoes/0003-persistencia-e-autenticacao.md)

## 2026-09-15 — Etapa 4: modelagem do banco de dados (RF-01 a RF-09)

- Implementado o schema relacional completo do domínio de afiliados: 12 migrations `sequelize-cli` (`back/src/migrations/`), 13 models Sequelize com associações, validações condicionais e scopes nomeados (`back/src/models/`), e um seeder com ~15 empresas cobrindo os diferentes estágios do fluxo (`back/src/seeders/`).
- Formalizadas as 4 regras de negócio que governam essa modelagem: status de contrato calculado por vencimento (RN-30), atraso financeiro calculado em leitura (RN-31), validação condicional de empresa internacional (RN-32) e isolamento de dados por perfil via scope nomeado (RN-33).
- Documentado o contrato de dados de cada uma das 13 tabelas em `docs/modelagem/<entidade>.md` e o diagrama entidade-relacionamento consolidado.
- Adicionado `docker-compose.yml` com serviço PostgreSQL local, usando exclusivamente as variáveis `POSTGRES_*` já previstas em `back/.env.example`; `back/.env.example` atualizado com essas variáveis (antes ausentes, apesar de já lidas por `back/src/config/`).
- Migrations e seeder validados de ponta a ponta (`db:migrate`, `db:migrate:undo:all`, `db:seed`) contra uma instância PostgreSQL real antes do commit.
- Docs: [`decisoes/0004-modelagem-banco-afiliados.md`](./decisoes/0004-modelagem-banco-afiliados.md), [`regras-de-negocio.md`](./regras-de-negocio.md) (RN-30 a RN-33), [`modelagem/`](./modelagem/) (13 contratos de dados + `er-diagram.md`)

## 2026-09-15 — Etapa 5: mapeamento de lacunas da planilha de controle legado

- Comparado o schema (etapa 4) com a planilha de controle real da equipe (`Planilhas_controle_de_informações_afiliados.xlsx`), identificando 7 lacunas: plano de afiliação com valor, isenção de taxa contratual, etapa de prospecção/leads, funil completo de status do processo, controle de exposição de marca (telão/site), reservas de espaço compartilhado com limite anual, e campos de contato adicionais da empresa.
- Implementadas via **12 migrations incrementais** (`20260915020001` a `20260915020012`) sobre um banco **já com dados reais** — nenhuma migration usa `DROP TABLE`/`DROP COLUMN`; toda migration que transforma dado roda em transação com `down()` funcional. Backup (`pg_dump`) documentado e executado antes de aplicar.
- 6 tabelas novas (`planos_afiliacao`, `status_prospeccao`, `prospeccoes`, `status_processo`, `beneficios_exposicao`, `reservas_espaco`) e 4 `ALTER TABLE` em `contratos`/`empresas`, todas com model Sequelize correspondente (`back/src/models/`).
- Backfill de `empresas.status_processo_id` (a partir do texto livre legado) e de `reservas_espaco` (a partir de `espacos_fisicos`): mapeamento por correspondência exata/palavra-chave, nunca por suposição — registros sem correspondência confiável ficam `NULL` e são listados em `docs/revisao-manual/` para revisão manual da equipe.
- Duas novas regras de negócio implementadas como **service** (não hook de model), para manter a lógica visível e testável na camada correta: limite anual de reservas por tipo de espaço (RN-35, `reservaEspacoService.js`) e transição automática de prospecção para formulário (RN-36, `prospeccaoService.js`). Mais RN-34 (isenção de taxa, validator de model).
- Diagrama ER (`docs/modelagem/er-diagram.md`) e 6 novos contratos de dados atualizados; `empresa.md`, `contrato.md` e `espaco-fisico.md` atualizados para os novos campos/relacionamentos.
- Docs: [`decisoes/0005-mapeamento-planilha-legado.md`](./decisoes/0005-mapeamento-planilha-legado.md), [`regras-de-negocio.md`](./regras-de-negocio.md) (RN-34 a RN-36), [`modelagem/`](./modelagem/), [`revisao-manual/`](./revisao-manual/)

## 2026-09-15 — Etapa 6: implementação de controllers, services e routes (RF-01 a RF-11)

- Implementada a camada de API REST completa sobre a modelagem das etapas 4 e 5: 13 módulos funcionais (empresas, formulário de inscrição, prospecção, contratos, assinaturas, documentos, financeiro, planos de afiliação, espaços físicos, reservas de espaço, benefícios de exposição, comunicações/e-mail, auditoria, usuários), seguindo à risca o fluxo `routes -> controllers -> services -> models` (ADR 0003).
- Infraestrutura compartilhada nova: `ApiError`/`wrapSequelizeErrors`/`asyncHandler` (`back/src/utils/`), `authMiddleware`/`requireRole` (`back/src/middlewares/`). `authMiddleware` valida um JWT assinado com `AUTH_SECRET` — um atalho de desenvolvimento (`POST /auth/dev-login`, desabilitado em produção) enquanto o Auth.js real (ADR 0003) não é implementado no `front/`.
- RN-33 (isolamento por perfil) aplicado em todos os módulos ligados a empresa, seguindo o padrão seguro já documentado na modelagem: nunca combinar o scope `paraEmpresa` com busca por PK na mesma chamada — busca manual + comparação de `empresa_id`, retornando 404 (nunca 403) para não revelar a existência do recurso a outra empresa.
- RN-30/RN-31 (renovação pendente / atraso financeiro) expostos como endpoints derivados (`GET /contratos/renovacao-pendente`, `GET /financeiro-lancamentos/atrasados`), calculados em leitura via os getters virtuais dos models, nunca uma coluna.
- RN-34 (isenção de taxa), RN-35 (limite anual de reservas) e RN-36 (conversão de prospecção) expostos via API sem duplicar a regra — os controllers/services só chamam as validações e services já existentes das etapas anteriores.
- Coleção Postman (`docs/postman/pollen-parque.postman_collection.json`, 61 requisições em 14 pastas) para testes manuais — variáveis de collection para os 3 perfis (tokens obtidos via `dev-login`), scripts de teste que encadeiam IDs entre requisições, e casos negativos (RBAC, RN-32, RN-34, RN-35, RN-28) com asserções automáticas. Validada de ponta a ponta com `newman` contra um servidor real antes do commit.
- Implementação paralelizada em agentes por módulo, cada um validando manualmente contra o Postgres de desenvolvimento real antes de reportar; integração final (montagem de `routes/index.js`, coleção Postman, testes cruzados de isolamento entre módulos) feita depois de todos os módulos prontos.
- Docs: [`api/mapeamento-geral.md`](./api/mapeamento-geral.md) (mapeamento que orientou a implementação), [`postman/`](./postman/).

## 2026-09-16 — Etapa 7: interface web da equipe do programa (front/)

- Implementadas a tela de login (sem senha, RN-02) e as 11 telas de módulo acessíveis ao ator `equipe_programa` (Empresas, Formulários de Inscrição, Prospecção, Contratos, Documentos, Financeiro, Planos de Afiliação, Espaços & Reservas, Comunicações, Auditoria, Usuários), consumindo a API REST da etapa 6.
- Sessão via `localStorage` (provisório, até o Auth.js real da ADR 0003 existir no front), design system extraído do site institucional (`front/src/app/globals.css`), componentes/hooks compartilhados (`useApiResource`, `Badge`, `PageHeader`, formulários).
- Validado de ponta a ponta com backend + Postgres reais rodando: `tsc --noEmit`, ESLint e `next build` limpos; 69 testes de back continuam passando; tour completo pelas 11 telas via navegador headless (Playwright), incluindo os fluxos de escrita (criar, editar, aprovar/rejeitar) contra dados reais.
- Docs: [`decisoes/0006-interface-web-equipe-programa.md`](./decisoes/0006-interface-web-equipe-programa.md).

## 2026-09-16 — Etapa 8: ajustes de cadastro pós-feedback

- Revisão do negócio sobre as telas da etapa 7 gerou um conjunto de mudanças transversais: toda tela de cadastro (Empresas, Prospecção, Contratos, Documentos, Comunicações) ganhou editar e excluir (sempre soft-delete via `ativo`, nunca `DELETE` — RN-37); Contratos e Documentos ganharam upload de arquivo (PNG/PDF em base64, direto no Postgres — RN-38); a taxonomia de `status_prospeccao` foi simplificada para 3 estados sem "convertida" (RN-39); `status_triagem` do Formulário de Inscrição simplificado para 2 estados (RN-40).
- Formulário de Inscrição ganhou uma versão pública sem autenticação (`/inscricao`) com aba de benefícios (conteúdo ainda provisório, ⚠️ RN-41) e passou a sumir da listagem de triagem quando a empresa vinculada já tem contrato ativo (RN-40).
- O botão "Renovar" em Contratos deixou de recriar o contrato automaticamente — agora leva para Comunicações com um rascunho de e-mail de renovação pré-preenchido (RN-42). Comunicações também ganhou sugestão de corpo de e-mail a partir do assunto, por template local — a integração real com um provedor de LLM (ADR 0002) ainda não tem `GEMINI_API_KEY` configurada (RN-43).
- 4 migrations novas (`20260916000001` a `20260916000004`), seed corrigido (`cidade`/`uf` de empresas nunca tinham sido preenchidos), limite do body do Express elevado para 15mb (upload em base64). Endpoint novo `GET /prospeccoes/status-disponiveis` (não existia leitura para essa tabela de referência). 69 testes de back continuam passando, incluindo os reescritos para a nova regra de conversão de prospecção (RN-36 atualizada).
- Docs: [`decisoes/0007-ajustes-cadastro-pos-feedback.md`](./decisoes/0007-ajustes-cadastro-pos-feedback.md), [`regras-de-negocio.md`](./regras-de-negocio.md) (RN-36 atualizada, RN-37 a RN-43 novas), [`modelagem/`](./modelagem/) (Empresa, Prospecção, Status Prospecção, Contrato, Documento, Comunicação Email, Formulário Resposta atualizados), [`api/mapeamento-geral.md`](./api/mapeamento-geral.md).

## 2026-09-17 — Etapa 9: nota fiscal nasce paga, boleto continua manual (RN-44)

- Revisão do negócio: cadastrar um lançamento financeiro do tipo **Nota Fiscal** não tem etapa manual de "confirmar pagamento" — na prática, quando a contabilidade cadastra a nota, ela já foi paga. Um lançamento do tipo **Boleto** continua no fluxo original (nasce pendente, confirmação manual depois). A primeira versão desta etapa aplicava o "nasce pago" a todo lançamento, sem distinguir os dois casos — corrigido ainda dentro desta mesma etapa a pedido do negócio.
- Novo campo `tipo_lancamento` (ENUM `nota_fiscal`/`boleto`, default `boleto`) em `financeiro_lancamentos`, migration `back/src/migrations/20260917010000-add-tipo-lancamento-financeiro-lancamentos.js` — não dava para inferir o tipo pelos campos já existentes `numero_documento`/`numero_nota_fiscal` (independentes, opcionais, podem coexistir no mesmo registro; há lançamentos de seed com os dois preenchidos e ainda pendentes). Lançamentos pré-existentes foram classificados como `boleto` pela migration, preservando seu comportamento original.
- `financeiroService.lancar` (`back/src/services/financeiroService.js`) passou a ramificar por `tipo_lancamento`: `nota_fiscal` grava automaticamente `data_pagamento` = data do cadastro e `status_financeiro_id` = "pago", ignorando o que vier no body; `boleto` mantém a lógica original (status do body ou "pendente" por padrão, `data_pagamento` só se vier no body).
- `financeiroService.confirmarPagamento` (`PATCH /financeiro-lancamentos/:id/pagamento`) não foi alterado — continua confirmando boletos pendentes e regularizando lançamentos legados.
- Front (`front/src/app/(app)/financeiro-lancamentos/page.tsx`): novo campo obrigatório "Tipo de lançamento" (Nota Fiscal/Boleto) no formulário de cadastro, nova coluna "Tipo" (badge) na tabela, e subtítulo da tela reescrito para explicar a diferença entre os dois tipos. Botão "Confirmar pagamento" mantido sem mudança.
- 69 testes de back continuam passando; `tsc --noEmit` e ESLint do front sem erros.
- Docs: [`regras-de-negocio.md`](./regras-de-negocio.md) (RN-44), [`modelagem/financeiro-lancamento.md`](./modelagem/financeiro-lancamento.md) atualizado.

## 2026-09-17 — Etapa 10: Contabilidade ganha leitura de Documentos (RN-45)

- A Contabilidade passou a enxergar a tela "Documentos" (RN-45): visualiza e baixa/abre os arquivos gerais de todas as empresas, mas não cadastra, edita, aprova/rejeita nem exclui — essas ações continuam restritas a `equipe_programa` (cadastro também aberto a `empresa_afiliada` para os próprios documentos).
- Back: `GET /documentos` (`back/src/routes/documentos.js`) passou a aceitar o papel `contabilidade`, além de `equipe_programa`/`empresa_afiliada`. `POST /documentos` e `PATCH /documentos/:id` não mudaram. `documentosService.listar` já cobria o caso sem alteração: qualquer papel que não seja `empresa_afiliada` recebe todos os documentos ativos de todas as empresas (mesmo caminho já usado por `equipe_programa`).
- Front: `Documentos` adicionado ao menu de `contabilidade` (`front/src/app/(app)/layout.tsx`); a tela (`front/src/app/(app)/documentos/page.tsx`) ganhou a flag `podeCadastrar` (equipe_programa/empresa_afiliada) que esconde o botão "Registrar documento" e o formulário de cadastro para quem só tem leitura — os links de abrir/baixar arquivo já funcionavam para qualquer papel com acesso à listagem, sem precisar de mudança.
- 69 testes de back continuam passando; `tsc --noEmit` e ESLint do front sem erros. Validado manualmente: `contabilidade` recebe 200 em `GET /documentos` (24 documentos, 9 empresas distintas) e 403 em `POST`/`PATCH /documentos`.
- Docs: [`regras-de-negocio.md`](./regras-de-negocio.md) (RN-45, tabela de Atores atualizada), [`modelagem/documento.md`](./modelagem/documento.md) atualizado.

## 2026-09-17 — Etapa 11: emissão automática de contrato e assinatura externa (Satelitti)

- Remapeamento de fluxo, corrigido junto com o negócio: o sistema tinha modelado um fluxo de contrato que não existe na prática (chamado na Procuradoria Jurídica + coleta de assinatura pessoa a pessoa, tabela `assinaturas`). O fluxo real é: `equipe_programa` **emite** o contrato → `contabilidade` baixa o PDF já gerado → envia por um serviço de assinatura eletrônica externo, **Satelitti** (citado por nome na própria minuta padrão), inteiramente fora do sistema → quando volta assinado, a equipe confirma manualmente que o contrato está vigente. RN-08/RN-09/RN-10/RN-11 aposentadas (tabela/colunas continuam no schema, como histórico); RN-46/RN-47 novas. Ver [`decisoes/0008-emissao-automatica-contrato-assinatura-externa.md`](./decisoes/0008-emissao-automatica-contrato-assinatura-externa.md) para o detalhamento completo da decisão.
- Nova função `contratosService.emitir` (`POST /contratos/:id/emitir`, só `equipe_programa`): gera o PDF do contrato a partir de uma minuta padrão preenchida com os dados do contrato/empresa, reaproveitando a infraestrutura de geração de PDF já existente em `back/src/utils/gerarPdf.js` (`docxtemplater` + `pizzip` + `libreoffice-convert`, trabalho de outro módulo do sistema — só uma exportação nomeada nova, `numeroPorExtenso`, foi adicionada lá, sem tocar no resto). Grava o resultado nas colunas `arquivo_base64`/`arquivo_mimetype`/`arquivo_nome` que já existiam desde a Etapa 8, e avança `status_contrato_id` para `em_assinatura`.
- Template original enviado pelo negócio (`back/public/templates/Minuta contrato Programa de Afiliados (1).docx`) não tinha tags de mesclagem — usava blocos `XXXXXXXXXX` como placeholder manual. Preparada uma cópia tageada, `back/public/templates/minuta-contrato-afiliacao.docx` (16 trechos do documento mapeados e validados um a um contra o texto original antes da edição, script de preparação com verificação automática de que cada trecho batia exatamente com o esperado antes de aplicar qualquer substituição); validada ponta a ponta (render do docx + conversão pra PDF com dados de exemplo). O arquivo original permanece intacto ao lado, como referência humana.
- Nova função `contratosService.marcarVigente` (`PATCH /contratos/:id/vigente`, só `equipe_programa`): confirmação manual de que o contrato voltou assinado do Satelitti, avança `status_contrato_id` para `vigente`, sem validação adicional.
- 6 campos novos em `empresas` (migration `20260917030000-add-endereco-representante-empresas.js`, todos opcionais no cadastro): `endereco_logradouro`, `endereco_numero`, `endereco_complemento`, `endereco_bairro`, `representante_legal_cpf`, `representante_legal_email` — exigidos pelo template, mas só bloqueiam a ação de emitir (com erro `400` listando exatamente o que falta), nunca o cadastro/edição da empresa em si.
- Front: `front/src/app/(app)/empresas/page.tsx` ganhou os 6 campos novos no formulário. `front/src/app/(app)/contratos/page.tsx` ganhou os botões "Emitir contrato" e "Marcar como vigente" (mesmo padrão de estado/confirmação já usado em `BotaoConfirmarPagamento`, financeiro-lancamentos) — o botão "Visualizar" do arquivo do contrato já existia e já funcionava pra qualquer papel com acesso à tela (incluindo `contabilidade`, que já tinha leitura de `/contratos` desde a Etapa 6), sem precisar de nenhuma mudança de permissão.
- Validado ponta a ponta contra o Postgres de desenvolvimento real: preenchimento dos campos novos de uma empresa do seed, emissão de um contrato real (PDF de ~240KB em base64 gerado, `status_contrato_id` mudando para `em_assinatura`), confirmação de que `contabilidade` já enxerga o arquivo emitido e não pode chamar `emitir` (403), e confirmação de `marcarVigente` avançando para `vigente`. 69 testes de back continuam passando; `tsc --noEmit` e ESLint do front sem erros.
- Docs: [`decisoes/0008-emissao-automatica-contrato-assinatura-externa.md`](./decisoes/0008-emissao-automatica-contrato-assinatura-externa.md), [`regras-de-negocio.md`](./regras-de-negocio.md) (RN-07 atualizada, RN-08/RN-09/RN-10/RN-11 aposentadas, RN-46/RN-47 novas, tabela de Atores atualizada), [`modelagem/`](./modelagem/) (`empresa.md`, `contrato.md`, `assinatura.md` atualizados).
- Ajuste de UX ainda dentro desta etapa: o botão "Emitir contrato" passou a checar no front, antes de chamar a API, se algum dado exigido pela RN-47 ainda está vazio — se estiver, abre um pop-up ("Completar dados para emitir o contrato") pré-preenchido com o que já existe, em vez de só devolver a mensagem de erro do backend; salva contrato + empresa e emite em sequência. Padrão visual (usado depois em outros pop-ups novos): overlay escuro + cartão centralizado, título/rótulos centralizados, campos com fundo branco e borda preta.

## 2026-09-17 — Etapa 12: formulário de inscrição vira empresa, status de empresa simplificado (RN-04-A, RN-06)

- Resolvida a RN-06 (pendência em aberto desde a Etapa 1 sobre os nomes/transições de status de uma empresa): `empresas.status_processo` passou a ter só 3 valores — `contrato_elaboracao` (nasce aqui, sempre), `ativa` (setada automaticamente quando um contrato da empresa é **emitido**, RN-46) e `encerrada` (nunca gravada — calculada em leitura, ver abaixo). Antes eram 5 valores de rascunho (`inscricao_pendente`, `contrato_elaboracao`, `aguardando_assinatura`, `ativa`, `encerrada`), nunca formalmente confirmados com o negócio.
- Nova regra RN-04-A: um `FormularioResposta` recebido não virava `Empresa` de nenhum jeito — a coluna `formulario_respostas.empresa_id` existia desde a Etapa 4 mas nenhum código a preenchia. Nova ação explícita "Criar nova empresa" (`POST /formulario-respostas/:id/criar-empresa`, só `equipe_programa`): abre um pop-up com os dados da submissão (`payload_respostas`) pré-preenchidos e editáveis (razão social, tipo — nacional/internacional —, CNPJ ou identificador estrangeiro, telefone, cidade, UF), cria a Empresa reaproveitando `empresasService.criar` (herda a validação RN-32) já com `status_processo = 'contrato_elaboracao'`, e vincula `empresa_id` de volta no formulário. Chamar de novo no mesmo formulário já vinculado é recusado com `400`.
- `contratosService.emitir` ganhou um efeito colateral: ao emitir com sucesso, também avança `empresa.status_processo` para `'ativa'` (idempotente — não regrava/audita de novo se já estava `ativa`, por exemplo numa reemissão).
- `empresasService` ganhou `aplicarStatusEncerradaPorVencimento`, chamada dentro de `listar()`/`buscarPorId()`: para toda empresa persistida como `'ativa'`, verifica se existe algum contrato dela `em_assinatura` ou `vigente`-e-não-vencido; se não existir nenhum, a resposta da API mostra `'encerrada'` **sem gravar isso no banco** — mesmo espírito de RN-30 (`Contrato.estaVencido`), só que cruzando com outra tabela, por isso fica no service em vez de getter virtual do model. A ação "Renovar" (RN-42) continua disponível normalmente na tela de Contratos independente do que a empresa estiver mostrando.
- Front: nova coluna "Ações" com botão "Detalhes" (pop-up) em `front/src/app/(app)/formulario-respostas/page.tsx`, mesmo formulário de criação também adicionado à página de detalhe (`[id]/page.tsx`) para quem já estiver navegando por ela. `front/src/app/(app)/empresas/page.tsx` com `STATUS_INFO` reduzido às 3 chaves novas.
- Durante a validação manual desta etapa, encontrado e corrigido um dado de demonstração órfão sem relação com esta mudança: o contrato vigente da empresa "Órbita Sistemas Embarcados Ltda" estava com `ativo = false` no banco de desenvolvimento (sem registro de auditoria — alterado fora da aplicação, resíduo anterior a esta sessão), o que fazia o novo cálculo de `encerrada` classificá-la erroneamente; restaurado `ativo = true` para bater com a narrativa original do seed (empresa "ativa" de verdade).
- 69 testes de back continuam passando; `tsc --noEmit` e ESLint do front sem erros. Validado ponta a ponta contra o Postgres de desenvolvimento: criação de empresa a partir de formulário (caminho válido e inválido — RN-32), recusa de vínculo duplicado, transição `contrato_elaboracao` → `ativa` ao emitir um contrato real, e o cálculo de `encerrada` conferido tanto pela API quanto por leitura direta do banco (coluna persistida nunca muda).
- Docs: [`regras-de-negocio.md`](./regras-de-negocio.md) (RN-06 resolvida, RN-04-A nova), [`modelagem/empresa.md`](./modelagem/empresa.md) e [`modelagem/formulario-resposta.md`](./modelagem/formulario-resposta.md) atualizados.
- Correção ainda dentro desta etapa: `formularioService.listar` (RN-40) só tirava um formulário da listagem de triagem quando o CNPJ já tinha contrato ativo — mesmo já convertido em Empresa (RN-04-A), continuava aparecendo em Triagem até ganhar contrato. Agora sai da listagem assim que `empresa_id` é preenchido, incondicionalmente; o critério por CNPJ continua valendo só para o caso de a empresa ainda não ter sido convertida pela ação RN-04-A. Validado manualmente: formulário some da listagem de Formulários de Inscrição no instante em que "Criar nova empresa" é confirmado.

## 2026-09-17 — Etapa 13: prospecção nasce "não constatada" (RN-39)

- Ajuste de negócio: o status padrão de uma prospecção recém-criada passou de `em_contato` para `nao_constatada` (`prospeccaoService.js`, constante `STATUS_PROSPECCAO_PADRAO`) — a equipe ainda não confirmou contato no momento do cadastro; só depois de entrar em contato de verdade é que alguém muda manualmente para `em_contato` (seguiu adiante) ou `proposta_rejeitada` (recusou). O formulário de cadastro no front não envia status (deixa o backend decidir), então não precisou de mudança no front.
- 69 testes de back continuam passando (nenhum dependia do valor padrão — todos os fixtures de teste já passavam `status_prospeccao_id` explícito). Validado manualmente contra o Postgres de desenvolvimento: prospecção criada sem informar status nasceu com o id de `nao_constatada`.
- Docs: [`regras-de-negocio.md`](./regras-de-negocio.md) (RN-39 atualizada), [`modelagem/prospeccao.md`](./modelagem/prospeccao.md) atualizado.

## 2026-09-17 — Etapa 14: Contabilidade também marca contrato como vigente (RN-46)

- `PATCH /contratos/:id/vigente` (`contratosService.marcarVigente`) passou a aceitar `contabilidade`, além de `equipe_programa` — é a contabilidade quem envia o contrato para o Satelitti e assina em nome do Pollen, então é quem sabe quando a assinatura foi finalizada. `POST /contratos/:id/emitir` continua exclusivo de `equipe_programa`, sem mudança.
- Front: o botão "Marcar como vigente" em `front/src/app/(app)/contratos/page.tsx` deixou de ficar dentro do bloco de ações restrito a `podeGerenciar` — ganhou uma flag própria (`podeMarcarVigente`, equipe_programa ou contabilidade). Os demais botões da linha (Emitir, Renovar, Editar, Excluir) continuam só para `equipe_programa`.
- Validado manualmente: `contabilidade` recebe 200 em `PATCH /contratos/:id/vigente` e continua recebendo 403 em `POST /contratos/:id/emitir`. 69 testes de back continuam passando; `tsc --noEmit` e ESLint do front sem erros.
- Docs: [`regras-de-negocio.md`](./regras-de-negocio.md) (RN-46 atualizada), [`modelagem/contrato.md`](./modelagem/contrato.md) atualizado.
