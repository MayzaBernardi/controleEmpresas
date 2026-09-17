# Regras de Negócio — Sistema de Gestão de Afiliados (Pollen Parque)

Documento vivo. É a fonte da verdade sobre **como o negócio funciona**,
independente de como isso é implementado. Toda regra nova, confirmada ou
alterada com o time do programa/contabilidade deve ser atualizada aqui — e a
atualização é o que fecha a etapa correspondente (ver
[`docs/README.md`](./README.md)).

Cada regra tem um ID (`RN-xx`) para poder ser referenciada em código, PRs e
outros documentos. Regras marcadas com ⚠️ são inferidas do fluxo atual e
**precisam de confirmação** com o time de negócio — não foram ditas
explicitamente.

## 1. Atores

| Ator                     | O que pode fazer                                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Equipe do programa       | Cadastra e gerencia empresas afiliadas, gera/emite contratos (RN-46), dispara comunicação, acompanha o processo ponta a ponta. |
| Empresa afiliada         | Consulta seus próprios débitos e status; envia documentos exigidos. Não vê dados de outras empresas.             |
| Contabilidade/Financeiro | Lança NF e boleto, confirma pagamentos. Também visualiza/baixa os documentos gerais das empresas (RN-45) e os contratos já emitidos, para enviar à assinatura externa (RN-46) — mas não cadastra/edita documento nem contrato, nem mexe em outros dados de cadastro. |

- **RN-01** — Todo acesso ao sistema é segmentado por ator (RF-08): cada perfil só enxerga e edita o que é da sua responsabilidade. Uma empresa afiliada nunca vê dados de outra empresa.
- **RN-02** — ~~O login é institucional (SSO), sem senha própria do sistema (RNF-01).~~ **Revisado em 2026-09-17**: SSO institucional foi validado com o time como inviável. O login é local (e-mail + senha própria do sistema, hash bcrypt). Não há autocadastro nem "esqueci minha senha" por e-mail: a equipe do programa cria cada usuário e define/reseta a senha manualmente pela tela de Usuários (ver [ADR 0003 §3](./decisoes/0003-persistencia-e-autenticacao.md)).

## 2. Cadastro de afiliados

- **RN-03** — O contato inicial de uma empresa interessada normalmente acontece por WhatsApp (envio de material/edital), mas isso **não é registrado no sistema** — o WhatsApp não é integrável e fica fora do fluxo digital.
- **RN-04** — O processo de afiliação só é considerado formalmente iniciado quando a empresa preenche o formulário de cadastro próprio do sistema, que grava direto no banco (RF-01), substituindo o formulário externo + planilha atual.
- **RN-05** — Uma empresa cadastrada deve poder ser listada e consultada pela equipe do programa a qualquer momento (RF-02).
- **RN-06** — **Resolvida em 2026-09-17**: `empresas.status_processo` tem exatamente 3 valores: `contrato_elaboracao`, `ativa` e `encerrada`. Transições: toda empresa nasce em `contrato_elaboracao` — seja criada manualmente pela equipe, seja pela ação "Criar nova empresa" a partir de um `FormularioResposta` recebido (ver RN-04-A abaixo); passa para `ativa` automaticamente quando um contrato dela é **emitido** (`contratosService.emitir`, RN-46) — efeito colateral da emissão, sem endpoint próprio para setar isso manualmente; `encerrada` **nunca é gravado na coluna** — é calculado em leitura por `empresasService` (mesmo espírito de RN-30, mas cruzando com `Contrato` no service em vez de getter de model): uma empresa persistida como `ativa` aparece como `encerrada` na resposta da API quando nenhum contrato dela (ativo, não soft-deletado) está `em_assinatura` ou `vigente` dentro da vigência — ou seja, contrato vencido sem renovação. A ação de "Renovar" um contrato (RN-42) continua disponível normalmente mesmo com a empresa mostrando `encerrada` — não há bloqueio cruzado entre os dois.
- **RN-04-A** — **Adicionada em 2026-09-17**: um `FormularioResposta` não vira `Empresa` automaticamente — a equipe usa a ação explícita "Criar nova empresa" (`POST /formulario-respostas/:id/criar-empresa`, só `equipe_programa`), que abre um pop-up com os dados da submissão (`payload_respostas`) pré-preenchidos e editáveis, cria o cadastro de Empresa (reaproveitando toda validação de `empresasService.criar`, incluindo RN-32) e vincula `formulario_resposta.empresa_id` de volta — coluna que existia no schema desde a Etapa 4 mas nunca era preenchida por nenhum código antes desta regra. Chamar essa ação de novo no mesmo formulário depois de já vinculado é recusado com `400`.

## 3. Contrato e assinatura

- **RN-07** — O contrato é gerado automaticamente a partir de uma minuta padrão (modelo com campos variáveis), usando os dados cadastrais da empresa (RF-03). **Atualizada em 2026-09-17 (ADR 0008)**: a geração do PDF em si passou a ser automática (`POST /contratos/:id/emitir`, `contratosService.emitir`, só `equipe_programa`) — antes era preenchida manualmente pela equipe fora do sistema.
- ~~**RN-08** — Após gerado, o contrato segue para abertura de chamado na Procuradoria Jurídica. Esse fluxo é externo ao sistema e não muda — o sistema não controla nem acelera esse processo (RF-10).~~ **Aposentada em 2026-09-17 (ADR 0008)**: o mapeamento estava errado — não existe chamado de Procuradoria no fluxo real. Depois de emitido, o contrato vai direto para assinatura eletrônica externa (RN-46). Os campos `numero_chamado_procuradoria`/`data_envio_procuradoria`/`data_retorno_procuradoria` continuam em `contratos` (histórico de contratos antigos), mas não são mais exigidos nem preenchidos pelo fluxo ativo.
- ~~**RN-09** — Um contrato só é considerado vigente depois de assinado por: o representante legal da empresa + 3 assinantes institucionais + o reitor.~~ **Aposentada em 2026-09-17 (ADR 0008)**: a assinatura não é mais rastreada pessoa a pessoa dentro do sistema — acontece inteiramente no serviço de assinatura eletrônica externo (Satelitti, RN-46). A tabela/model `Assinatura` continua no schema (histórico), mas não é mais alimentada pelo fluxo ativo. Um contrato passa a "vigente" quando a equipe confirma manualmente que ele voltou assinado (RN-46).
- ~~**RN-10** — O sistema registra o retorno desse fluxo de assinatura (eventos "documento inserido"/"documento concluído", hoje recebidos por e-mail), mas não participa do processo de coleta de assinaturas em si (RF-10).~~ **Aposentada em 2026-09-17 (ADR 0008)**: não há mais eventos de assinatura a registrar — ver RN-46.
- ~~⚠️ **RN-11** — Enquanto o contrato não estiver com todas as assinaturas concluídas, a empresa não deve ser tratada como afiliada ativa para fins de cobrança/vigência.~~ **Aposentada em 2026-09-17 (ADR 0008)**: não existe mais "todas as assinaturas concluídas" como estado rastreado no sistema — o critério passou a ser simplesmente `status_contrato_id = vigente`, setado manualmente pela equipe (RN-46) quando o contrato volta assinado do serviço externo.

## 4. Casos especiais de contratação

- **RN-12** — Empresas de grande porte em processo de alteração contratual recebem tratamento diferenciado (RF-11). ⚠️ O que muda exatamente no fluxo (aprovações extras, minuta diferente, etc.) ainda não foi detalhado — pendente de levantamento.
- **RN-13** — Empresas internacionais recebem tratamento diferenciado (RF-11). ⚠️ Mesma ressalva: regras específicas (moeda, formato de documento, idioma do contrato) ainda não foram detalhadas.

## 5. Documentos

- **RN-14** — Documentos exigidos pelo edital de afiliação devem ser enviados pela empresa e armazenados no sistema, vinculados a ela (RF-05), substituindo a troca por e-mail com a caixa NIT01.
- **RN-15** — A empresa deve conseguir ver quais documentos já enviou e (presumivelmente) quais ainda faltam. ⚠️ A lista de documentos obrigatórios por tipo de edital/caso ainda não foi formalizada num checklist — hoje está implícita no edital em PDF.
- **RN-45** — **Adicionada em 2026-09-17**: a Contabilidade tem acesso de **leitura** aos documentos gerais das empresas (`GET /documentos`, sem isolamento por empresa — mesmo comportamento de listagem que a equipe do programa) para visualizar e baixar/abrir arquivos já enviados, mas não pode cadastrar (`POST /documentos`), editar, aprovar/rejeitar nem excluir (`PATCH /documentos/:id`) — essas ações continuam restritas a `equipe_programa` (e, no caso do cadastro, também `empresa_afiliada` para os próprios documentos). Reforça RN-01 ("cada perfil só enxerga e edita o que é da sua responsabilidade"): a Contabilidade ganha visibilidade a mais sem ganhar permissão de escrita nesse módulo.

## 6. Financeiro

- **RN-16** — A emissão de nota fiscal e boleto é responsabilidade da contabilidade, não da equipe do programa. O sistema deve permitir que a contabilidade lance NF, boleto e vencimento, e confirme pagamento (RF-06). Isso corresponde à "parte laranja" da planilha atual.
- **RN-17** — Uma empresa é considerada **em débito/inadimplente** quando a data de vencimento é ultrapassada sem confirmação de pagamento registrada.
- **RN-18** — A cobrança de atraso depende de cruzar dados do sistema com a contabilidade — hoje isso é manual. A adesão da contabilidade ao sistema é condição de sucesso do projeto (RNF-05): sem a contabilidade lançando os dados nele, o controle financeiro fica incompleto.
- **RN-19** — A empresa afiliada deve poder consultar seus próprios débitos e status de pagamento a qualquer momento (RF-09), sem precisar pedir por e-mail/WhatsApp.
- ⚠️ **RN-20** — Formas de pagamento além de boleto único (PIX, parcelamento) estão em cogitação, mas **não confirmadas**. Não implementar até decisão do negócio — aumentam a complexidade do financeiro (conciliação, parcelas em aberto, etc.).
- **RN-44** — **Adicionada em 2026-09-17**: todo lançamento financeiro tem um `tipo_lancamento` explícito, escolhido pela Contabilidade no cadastro: **Nota Fiscal** ou **Boleto**. Ao cadastrar um lançamento do tipo **Nota Fiscal**, o pagamento já é considerado efetivado no ato do cadastro — não existe passo manual de "confirmar pagamento" para esse tipo, porque na prática a nota só chega para cadastro depois de já ter sido paga: `financeiroService.lancar` (`back/src/services/financeiroService.js`) grava automaticamente `data_pagamento` = data do cadastro (hoje) e `status_financeiro_id` = "pago", ignorando qualquer valor de `data_pagamento`/`status_financeiro_id` enviado no corpo da requisição. Um lançamento do tipo **Boleto** mantém o fluxo original (RN-16/RF-06): nasce com `status_financeiro_id` = "pendente" (ou o que vier no body) e `data_pagamento` nula, até confirmação manual via `PATCH /financeiro-lancamentos/:id/pagamento` (`financeiroService.confirmarPagamento`). Não dá para inferir o tipo pelos campos `numero_documento`/`numero_nota_fiscal` — são independentes, opcionais e podem coexistir no mesmo registro (por isso o campo `tipo_lancamento` existe separadamente); lançamentos anteriores a esta regra (seed) foram classificados como `boleto` pela migration (`20260917010000-add-tipo-lancamento-financeiro-lancamentos.js`), preservando seu comportamento original — nenhum lançamento pré-existente virou "pago" retroativamente.

## 7. Vigência e renovação

- **RN-21** — A afiliação tem vigência **anual**. Ao fim do período, a anuidade precisa ser renovada (RF-07).
- ⚠️ **RN-22** — Não está definido se a renovação é automática (gera novo boleto/contrato sozinha) ou se depende de uma ação explícita da equipe do programa e/ou da empresa. Tratar como processo manual disparado pela equipe até confirmação.
- ⚠️ **RN-23** — Não está definido com quantos dias de antecedência o sistema deve avisar sobre vencimento da vigência.

## 8. Comunicação

- **RN-24** — O sistema deve permitir envio de e-mail individual e em massa para empresas afiliadas (RF-04), substituindo o envio manual hoje feito pela caixa NIT01.
- **RN-25** — Todo e-mail enviado pelo sistema deve ficar registrado com histórico auditável — quem enviou, para quem, quando, conteúdo (RF-04 + RNF-04).
- ⚠️ **RN-26** — A caixa de e-mail institucional que o sistema vai usar para enviar/receber ainda não foi definida. Bloqueia a implementação real do envio (hoje só é possível desenhar a funcionalidade, não configurar o remetente definitivo).
- **RN-27** — WhatsApp permanece fora do sistema — não há e não haverá integração automática nesta fase. A intenção do negócio é migrar o contato recorrente para e-mail (que gera histórico), mas o primeiro contato via WhatsApp continua acontecendo fora do sistema.
- **RN-28** — A redação de e-mails (individuais e em massa) é assistida por um agente de IA: o agente gera o rascunho do texto (ex.: cobrança de débito, aviso de vencimento de vigência, boas-vindas a novo afiliado), mas **nenhum e-mail é enviado sem revisão e confirmação explícita de alguém da equipe do programa**. O agente nunca envia diretamente. Ver [`decisoes/0002-agente-de-ia-para-redacao-de-emails.md`](./decisoes/0002-agente-de-ia-para-redacao-de-emails.md) para o porquê de e-mail ter sido escolhido como primeira tarefa com IA, em vez de contrato (RF-03) ou documentos (RF-05).

## 9. Escala

- **RN-29** — O sistema precisa suportar hoje ~22 afiliados fechados e ~23–30 em processo, com projeção de ~50 até o fim do ano e ~60 no ano seguinte (RNF-03). Não é um volume que exige otimizações de performance antecipadas — é baixo — mas a modelagem não deve assumir "poucos registros para sempre".

## Glossário

| Termo                       | Significado                                                                                              |
| --------------------------- | -------------------------------------------------------------------------------------------------------- |
| Afiliado / empresa afiliada | Empresa que paga anuidade para ocupar espaço físico no Pollen Parque.                                    |
| Minuta                      | Modelo de contrato padrão, com campos variáveis a preencher por empresa.                                 |
| NIT01                       | Caixa de e-mail institucional hoje usada para troca de documentos com empresas.                          |
| Procuradoria Jurídica       | Setor externo responsável por coletar as assinaturas formais do contrato; fluxo mantido fora do sistema. |
| Vigência                    | Período em que a afiliação está válida (hoje, anual).                                                    |

## 10. Dados, persistência e acesso

- **RN-30** — O status de um contrato em relação ao vencimento é calculado em tempo de leitura pelo serviço (`ContratosService`), comparando `data_termino_vigencia` com a data atual, sem alterar o banco de dados nem usar hooks de ORM. A coluna `status_contrato_id` no banco representa o estado formal registrado pela equipe; o estado derivado (renovação pendente, encerrado por vencimento) é exposto apenas na resposta da API.
  - Status "renovação pendente": `data_termino_vigencia` ≤ (hoje + 60 dias) e status formal ainda "vigente".
  - Status "encerrado por vencimento": `data_termino_vigencia` < hoje e sem contrato subsequente vigente vinculado.

- **RN-31** — O status de inadimplência de um lançamento financeiro é calculado em tempo de leitura pelo serviço (`FinanceiroService`), comparando `data_vencimento` com a data atual e verificando se `data_pagamento` é nula. A coluna `status_financeiro_id` no banco representa o estado formal registrado pela Contabilidade (RN-16); o status "atrasado" derivado é exposto apenas na resposta da API.

- **RN-32** — Uma empresa com `tipo_empresa = 'internacional'` não tem CNPJ obrigatório, mas deve ter `identificador_estrangeiro` preenchido. Uma empresa com `tipo_empresa = 'nacional'` deve ter `cnpj` preenchido com 14 dígitos numéricos válidos. Essa validação é aplicada na camada de model (Sequelize custom validator) e duplicada na camada de controller/validação de entrada antes de persistir.

- **RN-33** — Um usuário com `papel = 'empresa_afiliada'` só pode visualizar registros (empresas, contratos, documentos, financeiro, espaços físicos) vinculados ao seu próprio `empresa_id`. O isolamento é garantido pelo uso de scopes nomeados explícitos no Sequelize (ex.: `Contrato.scope({ method: ['paraEmpresa', session.empresa_id] })`), invocados obrigatoriamente no controller a partir dos dados da sessão autenticada (Auth.js). Não se usa `defaultScope` global para esse fim, pois controllers da equipe do programa precisam acessar registros de múltiplas empresas sem filtro. (Extensão: o mesmo padrão de scope nomeado se aplica também às entidades novas ligadas a empresa — `beneficios_exposicao` e `reservas_espaco`, ver ADR 0005.)

## 11. Isenção de taxa, reservas de espaço e prospecção (ADR 0005)

- **RN-34** — Um contrato pode ser marcado como isento da taxa de anuidade (`isento_taxa = true`) como caso especial contratual. Quando isento, o contrato **deve** ter `motivo_isencao` e `documento_referencia` preenchidos (ex.: número de um distrato/convênio que embasa a isenção) — um contrato não pode estar isento "sem justificativa registrada". A validação é aplicada na camada de model (Sequelize custom validator em `Contrato`).

- **RN-35** — Uma empresa tem um limite anual de reservas por tipo de espaço compartilhado: sala do ático (`sala_atico`) e auditório (`auditorio`) — 1× por ano cada; coworking — 12× por ano. O limite conta apenas reservas cujo `status` seja diferente de `cancelado`, no ano da `data_reserva` (ou no ano corrente, se a reserva ainda não tem data definida). A validação é feita em **service** (`back/src/services/reservaEspacoService.js`), não em hook do model — antes de criar a reserva, o service verifica a contagem do ano e recusa a criação com mensagem clara se o limite já foi atingido.

- **RN-36** — Quando uma empresa preenche o formulário de inscrição (RN-04) e já existia uma prospecção ainda não convertida (`formulario_resposta_id` nulo) e ativa, com o mesmo e-mail de contato ou nome de empresa, essa prospecção deve ser vinculada ao novo `formulario_respostas` (campo `formulario_resposta_id`). Implementado como **service** (`back/src/services/prospeccaoService.js`), chamado explicitamente por quem cria o `FormularioResposta` — não como hook automático do model, pelo mesmo motivo da RN-35 (regra de negócio deve ficar visível e testável na camada de service). **Atualizada em 2026-09-16 (ADR 0007)**: a taxonomia de `status_prospeccao` não tem mais um estado "convertida" (ver RN-39) — a conversão em si é só `formulario_resposta_id` deixando de ser nulo; o status que a prospecção tinha antes não muda, e o critério de elegibilidade para vincular deixou de depender do status (antes filtrava por um conjunto de status "em aberto", agora filtra só por `ativo = true` e `formulario_resposta_id IS NULL`).

## 12. Ajustes de cadastro pós-feedback (ADR 0007, 2026-09-16)

- **RN-37** — Excluir um cadastro de Empresas, Prospecção, Contratos, Documentos ou Comunicações nunca remove a linha do banco: é sempre soft-delete (`ativo = false`). O registro sai das listagens (`GET`) mas continua acessível por id e pode ser reativado (`ativo = true`) pela mesma rota de atualização (`PATCH`). Mesmo padrão já usado em Usuário/Plano de Afiliação/Espaço Físico.

- **RN-38** — Contratos e Documentos podem ter um arquivo (PNG ou PDF) anexado diretamente no cadastro/edição, armazenado em base64 no próprio PostgreSQL (colunas `arquivo_nome`/`arquivo_mimetype`/`arquivo_base64`) — sem storage externo (ADR 0007 §2). Em Documentos, isso é alternativo à URL externa (`url_arquivo`, agora opcional): o registro precisa ter pelo menos um dos dois, nunca é obrigatório ter os dois.

- **RN-39** — `status_prospeccao` tem 3 valores possíveis: `em_contato` (Em contato), `nao_constatada` (Não constatada) e `proposta_rejeitada` (Proposta rejeitada). Não existe um status "convertida" — ver RN-36 atualizada. **Atualizada em 2026-09-17**: toda prospecção nasce com status `nao_constatada` (`prospeccaoService.criar`, sem exigir isso no body) — a equipe ainda não confirmou contato com a empresa nesse momento. Só depois de a equipe efetivamente entrar em contato é que alguém muda manualmente para `em_contato` (seguiu adiante) ou `proposta_rejeitada` (recusou). Antes desta atualização, o padrão era `em_contato`, o que não fazia sentido pra uma prospecção recém-criada e ainda sem contato confirmado.

- **RN-40** — `formulario_respostas.status_triagem` tem 2 valores possíveis: `aguardando` (Aguardando preenchimento) e `finalizado` (Finalizado). Um formulário sai da listagem de triagem da equipe do programa assim que `empresa_id` é preenchido (RN-04-A — "Criar nova empresa", independente de já ter contrato ou não: a empresa passa a viver só na listagem de Empresas a partir daí) **ou**, mesmo sem cadastro ainda, quando o CNPJ do próprio `payload_respostas` já corresponde a uma empresa (outra) com contrato ativo (vigente, não vencido) — caso de um formulário respondido antes de virar cadastro. **Atualizada em 2026-09-17**: antes desta correção, um formulário só saía da listagem pelo critério de CNPJ+contrato — mesmo já convertido em Empresa (RN-04-A), continuava aparecendo em Triagem até ganhar contrato, o que não fazia sentido (a empresa já existe formalmente, não deveria continuar entre as "submissões brutas").

- ⚠️ **RN-41** — O formulário de inscrição (RF-01) tem uma versão pública, sem autenticação, acessível por link direto, com uma aba mostrando os benefícios de ser afiliado. **Pendência**: o conteúdo da aba de benefícios ainda é genérico/provisório — aguardando o material oficial da equipe do programa para substituir.

- **RN-42** — Na tela de Contratos, a ação de "renovar" não recria o contrato automaticamente: ela leva a equipe para a tela de Comunicações com um rascunho de e-mail já preenchido, pedindo que a empresa entre em contato para a renovação (o texto varia conforme o contrato já estar vencido — tom de "volte a aproveitar os benefícios" — ou só próximo do vencimento — tom de "está em período de renovação"). A criação de fato do contrato renovado continua existindo como ação separada.

- **RN-43** — A sugestão de corpo de e-mail a partir do assunto, na criação de rascunho em Comunicações, é gerada por um conjunto de templates locais por palavra-chave — não por um modelo de IA real (a integração com um provedor de LLM, prevista na RN-28/ADR 0002, ainda não tem uma chave de API configurada). O rascunho continua marcado `gerado_por_ia: true` e passa pela mesma revisão humana obrigatória antes de aprovar/enviar (RN-28 não muda).

## 13. Emissão de contrato e assinatura externa (ADR 0008, 2026-09-17)

- **RN-46** — O fluxo real de contrato é: (1) a `equipe_programa` **emite** o contrato (`POST /contratos/:id/emitir`) — o sistema gera automaticamente um PDF a partir da minuta padrão (`back/public/templates/minuta-contrato-afiliacao.docx`), preenchido com os dados do contrato e da empresa, e o contrato passa para o status `em_assinatura`; (2) a `contabilidade` baixa esse PDF (já tinha acesso de leitura a Contratos, RN-33 — nenhuma permissão nova precisou ser criada) e o envia para assinatura pelo serviço eletrônico externo **Satelitti** (citado por nome na própria minuta, cláusula de assinatura eletrônica) — esse envio e a coleta de assinaturas acontecem inteiramente **fora do sistema**; (3) quando o contrato retorna assinado, a `equipe_programa` **ou** a `contabilidade` confirma manualmente (`PATCH /contratos/:id/vigente`, `contratosService.marcarVigente`), avançando o status para `vigente`. **Atualizada em 2026-09-17**: `contabilidade` ganhou acesso a essa confirmação — é quem manda o contrato para o Satelitti e assina em nome do Pollen, então é quem sabe quando a assinatura foi finalizada (a ação de emitir continua exclusiva de `equipe_programa`). Isso substitui o mapeamento antigo de Procuradoria/assinatura individual (RN-08/RN-09/RN-10/RN-11, aposentadas — ver ADR 0008). O upload manual de arquivo (RN-38) continua disponível como alternativa/correção à emissão automática.
- **RN-47** — Para emitir um contrato, a empresa vinculada precisa ter preenchido: endereço completo (`endereco_logradouro`, `endereco_numero`, `endereco_bairro` — `endereco_complemento` é opcional), `cidade`, `uf`, `telefone`, `representante_legal`, `representante_legal_cpf`, `representante_legal_email` e um e-mail de contato (`contatos.email`); e o contrato precisa ter `numero_termo` preenchido. Esses campos são **opcionais no cadastro da empresa** (não bloqueiam criar/editar uma empresa) — só a ação de emitir contrato exige e recusa (`400`) com uma mensagem listando exatamente o que falta, caso algum esteja ausente.

## Pendências abertas (não implementar até confirmar)

Lista de tudo marcado com ⚠️ acima, para facilitar o acompanhamento:

1. Regras específicas para grande porte em alteração contratual (RN-12).
2. Regras específicas para empresa internacional (RN-13).
3. Checklist formal de documentos obrigatórios por edital (RN-15).
4. PIX e parcelamento — decisão de escopo (RN-20).
5. Renovação automática vs. manual (RN-22).
6. Antecedência do aviso de vencimento de vigência (RN-23).
7. Caixa de e-mail institucional a ser usada pelo sistema (RN-26).
8. Conteúdo real da aba de benefícios de afiliação no formulário público (RN-41) — hoje é texto genérico/provisório.
