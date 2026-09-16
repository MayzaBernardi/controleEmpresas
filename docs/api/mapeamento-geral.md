# Mapeamento geral de rotas e controllers

Status: **implementado (etapa 6) e testado manualmente** — todas as
rotas/controllers/services abaixo existem em `back/src/` e foram validadas
contra o Postgres de desenvolvimento real (isolamento RN-33, RBAC, e as
regras de negócio específicas de cada módulo). Coleção Postman para
exploração manual em [`../postman/`](../postman/).

Este documento **ainda não foi promovido** para o formato final
`api/<modulo>.md` descrito em [`../README.md`](../README.md) (um arquivo
por módulo, o contrato de API estável). Continua servindo como o
inventário único de referência por enquanto — a promoção (quebrar em 13
arquivos, um por módulo, com request/response de exemplo) é trabalho
pendente, não bloqueante, a ser feito conforme cada módulo for
efetivamente usado pelo `front/`.

Serve para alinhar, antes de escrever qualquer controller, quais rotas
existem, qual controller/service cada uma aciona, qual model ela toca e
**quem pode acessar** (RN-01/RN-33) — para não descobrir isso ao acaso
durante a implementação.

## Convenções gerais (valem para todos os módulos abaixo)

- **Camadas**: `routes -> controllers -> services -> models`, sem pular
  camada (ADR 0003, `.agents/agents/backend.md`). Controllers não acessam
  Sequelize diretamente.
- **Autenticação**: `authMiddleware.js` (a criar) valida a sessão do
  Auth.js e popula `req.user = { id, papel, empresa_id }` (ADR 0003 §3).
  Toda rota autenticada passa por ele antes do controller.
- **Autorização por perfil (RN-01)**: cada controller (ou um middleware
  `requireRole(...papeis)` reutilizável, a criar) verifica `req.user.papel`
  antes de agir. Quando o recurso é de uma empresa específica, o
  controller aplica o scope `paraEmpresa` (RN-33) explicitamente — nunca
  `defaultScope`.
- **Erros**: sempre `{ "error": "mensagem amigável" }`, nunca stack trace
  em produção (`src/app.js`, já implementado).
- **IDs em rota**: `empresas` e `contratos` usam UUID na URL (ADR 0004 §1);
  as demais entidades usam o BIGINT/INTEGER autoincremento.
- **`GET /empresas/me`** (em vez de `GET /empresas/:id`) é o padrão
  recomendado para o autoatendimento da empresa afiliada — evita depender
  de `findByPk` com scope na própria PK (achado de segurança já corrigido
  em `Empresa.js`, ver [`../modelagem/empresa.md`](../modelagem/empresa.md));
  o controller já sabe `req.user.empresa_id`, não precisa de `:id` na URL
  para esse caso de uso.

## Legenda de perfis

`EP` = equipe_programa · `EA` = empresa_afiliada · `CT` = contabilidade ·
`pub` = sem autenticação (endpoint público)

---

## 1. Empresas / Afiliados (RF-01, RF-02, RF-08, RF-11)

| Método | Rota | Controller | Service | Model(s) | Perfil | Notas |
|---|---|---|---|---|---|---|
| GET | `/empresas` | `empresasController.listar` | `empresasService.listar` | `Empresa` | EP, CT (leitura) | EA não usa esta rota (ver `/empresas/me`) |
| GET | `/empresas/me` | `empresasController.minhaEmpresa` | `empresasService.buscarPorId` | `Empresa` | EA | `req.user.empresa_id`, sem scope por PK |
| GET | `/empresas/:id` | `empresasController.detalhar` | `empresasService.buscarPorId` | `Empresa` | EP, CT | |
| POST | `/empresas` | `empresasController.criar` | `empresasService.criar` | `Empresa` | EP | Normalmente a partir de um `formulario_respostas`/`prospeccao` triado (RN-04) |
| PATCH | `/empresas/:id` | `empresasController.atualizar` | `empresasService.atualizar` | `Empresa` | EP | Inclui `tipo_caso_especial`/`descricao_caso_especial` (RF-11) e `ativo` (RN-37) |
| PATCH | `/empresas/:id/status-processo` | `empresasController.atualizarStatusProcesso` | `empresasService.atualizarStatusProcesso` | `Empresa`, `StatusProcesso` | EP | Move `status_processo_id` no funil (ADR 0005 §4); RN-06 ⚠️ ainda pendente de confirmação — usar com cautela |

"Excluir" (2026-09-16, ADR 0007) é `PATCH /empresas/:id` com `{ "ativo": false }`
— soft-delete, sem rota `DELETE` dedicada (RN-37). `GET /empresas` só retorna
`ativo = true`.

## 2. Formulário de Inscrição (RF-01, RN-04)

| Método | Rota | Controller | Service | Model(s) | Perfil | Notas |
|---|---|---|---|---|---|---|
| POST | `/formulario-respostas` | `formularioController.submeter` | `formularioService.registrarSubmissao` | `FormularioResposta` | pub | Chama `prospeccaoService.vincularProspeccaoAoFormulario` (RN-36) logo em seguida, na mesma transação. No front, esta rota é usada pela página pública `/inscricao` (ADR 0007 §4) |
| GET | `/formulario-respostas` | `formularioController.listar` | `formularioService.listar` | `FormularioResposta` | EP | Para triagem. No front, esconde formulários cuja empresa vinculada já tem contrato ativo (RN-40) — calculado no front, não filtrado pelo back |
| GET | `/formulario-respostas/:id` | `formularioController.detalhar` | `formularioService.buscarPorId` | `FormularioResposta` | EP | |
| PATCH | `/formulario-respostas/:id/triagem` | `formularioController.triar` | `formularioService.triar` | `FormularioResposta` | EP | Atualiza `status_triagem`/`observacoes_triagem`; pode disparar `POST /empresas`. `status_triagem` só usa `aguardando`/`finalizado` desde 2026-09-16 (RN-40) |

## 3. Prospecção (ADR 0005 §3, RN-36)

| Método | Rota | Controller | Service | Model(s) | Perfil | Notas |
|---|---|---|---|---|---|---|
| GET | `/prospeccoes/status-disponiveis` | `prospeccaoController.listarStatusDisponiveis` | `prospeccaoService.listarStatusDisponiveis` | `StatusProspeccao` | EP | Lookup pro front montar o seletor de status na edição (não é ENUM fixo, é tabela) |
| GET | `/prospeccoes` | `prospeccaoController.listar` | `prospeccaoService.listar` (novo método) | `Prospeccao`, `StatusProspeccao` | EP | Sem scope por empresa — não é dado de empresa afiliada ainda. Só retorna `ativo=true` e `formulario_resposta_id=null` (excluídas e convertidas somem daqui) |
| POST | `/prospeccoes` | `prospeccaoController.criar` | `prospeccaoService.criar` (novo método) | `Prospeccao` | EP | |
| PATCH | `/prospeccoes/:id` | `prospeccaoController.atualizar` | `prospeccaoService.atualizar` (novo método) | `Prospeccao` | EP | Edição de dados, mudança de status, ou soft-delete via `ativo: false` (decisão de negócio 2026-09-16: excluir nunca é hard-delete) |

Taxonomia de `status_prospeccao` redefinida com o negócio em 2026-09-16: só 3 códigos
(`em_contato`, `nao_constatada`, `proposta_rejeitada`) — não existe mais um status
"convertida"; a conversão em si é só `formulario_resposta_id` deixando de ser null.

`vincularProspeccaoAoFormulario` (já implementado) não tem rota própria —
só é chamado internamente pelo módulo 2.

## 4. Contratos (RF-03, RF-07, RF-10, RN-07 a RN-11, RN-30, RN-34)

| Método | Rota | Controller | Service | Model(s) | Perfil | Notas |
|---|---|---|---|---|---|---|
| GET | `/contratos` | `contratosController.listar` | `contratosService.listar` | `Contrato` | EP; EA/CT via scope `paraEmpresa` | |
| GET | `/contratos/:id` | `contratosController.detalhar` | `contratosService.buscarPorId` | `Contrato` | EP; EA/CT via scope | Inclui `estaVencido`/`estaProximoVencimento` (RN-30) na resposta |
| GET | `/contratos/renovacao-pendente` | `contratosController.listarRenovacaoPendente` | `contratosService.listarRenovacaoPendente` | `Contrato` | EP | Filtro derivado on-the-fly (RN-30), não uma coluna |
| POST | `/contratos` | `contratosController.gerar` | `contratosService.gerarAPartirDeMinuta` | `Contrato` | EP | RF-03: template determinístico, **sem LLM** (ADR 0002) |
| PATCH | `/contratos/:id` | `contratosController.atualizar` | `contratosService.atualizar` | `Contrato` | EP | Inclui `status_contrato_id`, `numero_chamado_procuradoria`, isenção de taxa (RN-34, validado no model) |
| POST | `/contratos/:id/renovar` | `contratosController.renovar` | `contratosService.renovar` | `Contrato` | EP | Cria novo registro com `contrato_anterior_id` (RF-07) |

Decisão de negócio (2026-09-16): contratos são gerados manualmente pela equipe fora do
sistema — `arquivo_nome`/`arquivo_mimetype`/`arquivo_base64` (PNG/PDF em base64, sem storage
externo) permitem anexar o arquivo assinado no cadastro/edição. `ativo` (soft-delete) segue o
mesmo padrão de Usuario/PlanoAfiliacao/EspacoFisico — excluir nunca é hard-delete;
`GET /contratos` só retorna `ativo=true`. No front, o botão "Renovar" não chama mais
`POST /contratos/:id/renovar` diretamente — ele leva para Comunicações com um rascunho de
e-mail de renovação pré-preenchido; a criação do contrato renovado em si continua disponível
via este endpoint.

## 5. Assinaturas (RN-09, RN-10)

| Método | Rota | Controller | Service | Model(s) | Perfil | Notas |
|---|---|---|---|---|---|---|
| GET | `/contratos/:contratoId/assinaturas` | `assinaturasController.listarPorContrato` | `assinaturasService.listarPorContrato` | `Assinatura` | EP; EA via scope do contrato pai | |
| PATCH | `/assinaturas/:id` | `assinaturasController.atualizar` | `assinaturasService.atualizar` | `Assinatura` | EP | Registra retorno recebido por e-mail da Procuradoria (RN-10); sistema não participa da coleta em si |

## 6. Documentos (RF-05, RN-14, RN-15)

| Método | Rota | Controller | Service | Model(s) | Perfil | Notas |
|---|---|---|---|---|---|---|
| GET | `/documentos` | `documentosController.listar` | `documentosService.listar` | `Documento` | EP; EA via scope `paraEmpresa` | Só retorna `ativo=true` |
| POST | `/documentos` | `documentosController.upload` | `documentosService.upload` | `Documento` | EA (os próprios), EP (em nome de qualquer empresa) | Desde 2026-09-16 (ADR 0007 §2): aceita upload direto (`arquivo_mimetype`/`arquivo_base64`, PNG/PDF em base64 no banco) como alternativa a `url_arquivo` — precisa de pelo menos um dos dois |
| PATCH | `/documentos/:id` | `documentosController.atualizar` | `documentosService.atualizar` | `Documento` | EP | Renomeado de `avaliar` em 2026-09-16 — além de aprovar/rejeitar (`status`, RN-15 ⚠️ checklist ainda pendente), também edita `tipo_documento`/`nome_arquivo`/`url_arquivo`/arquivo e `ativo` (RN-37, exclusão) |

## 7. Financeiro (RF-06, RF-09, RN-16 a RN-19, RN-20 ⚠️, RN-31)

| Método | Rota | Controller | Service | Model(s) | Perfil | Notas |
|---|---|---|---|---|---|---|
| GET | `/financeiro-lancamentos` | `financeiroController.listar` | `financeiroService.listar` | `FinanceiroLancamento` | CT (todos); EP (leitura, RN-16 — equipe não edita); EA via scope `paraEmpresa` (RN-19) | |
| GET | `/financeiro-lancamentos/atrasados` | `financeiroController.listarAtrasados` | `financeiroService.listarAtrasados` | `FinanceiroLancamento` | CT, EP | Derivado on-the-fly (RN-31), não uma coluna |
| POST | `/financeiro-lancamentos` | `financeiroController.lancar` | `financeiroService.lancar` | `FinanceiroLancamento` | CT | RN-16: só contabilidade lança boleto/NF. `forma_pagamento` pix/parcelado existe no schema mas **não implementar fluxo** sem confirmação (RN-20 ⚠️) |
| PATCH | `/financeiro-lancamentos/:id/pagamento` | `financeiroController.confirmarPagamento` | `financeiroService.confirmarPagamento` | `FinanceiroLancamento` | CT | Seta `data_pagamento` |

## 8. Planos de Afiliação (ADR 0005 §1)

| Método | Rota | Controller | Service | Model(s) | Perfil | Notas |
|---|---|---|---|---|---|---|
| GET | `/planos-afiliacao` | `planosController.listar` | `planosService.listar` (novo) | `PlanoAfiliacao` | EP, EA, CT (catálogo, leitura livre) | |
| PATCH | `/planos-afiliacao/:id` | `planosController.atualizar` | `planosService.atualizar` (novo) | `PlanoAfiliacao` | EP | Ex.: ativar/desativar ou reajustar valor |

## 9. Espaços Físicos (legado) e Reservas de Espaço (RN-35, ADR 0005 §6)

| Método | Rota | Controller | Service | Model(s) | Perfil | Notas |
|---|---|---|---|---|---|---|
| GET | `/espacos-fisicos` | `espacosFisicosController.listar` | `espacosFisicosService.listar` (novo) | `EspacoFisico` | EP; EA via scope | Conceito legado (sala fixa) — ver [`../modelagem/espaco-fisico.md`](../modelagem/espaco-fisico.md) |
| GET | `/reservas-espaco` | `reservasEspacoController.listar` | `reservaEspacoService` (adicionar `listar`) | `ReservaEspaco` | EP; EA via scope | |
| POST | `/reservas-espaco` | `reservasEspacoController.criar` | `reservaEspacoService.criarReserva` (já existe) | `ReservaEspaco` | EA (solicita a própria), EP (cria em nome de qualquer empresa) | RN-35: limite anual por tipo, já validado no service |
| PATCH | `/reservas-espaco/:id` | `reservasEspacoController.atualizarStatus` | `reservaEspacoService` (adicionar `atualizarStatus`) | `ReservaEspaco` | EP | Confirmar/realizar/cancelar |

## 10. Benefícios de Exposição (ADR 0005 §5)

| Método | Rota | Controller | Service | Model(s) | Perfil | Notas |
|---|---|---|---|---|---|---|
| GET | `/empresas/:empresaId/beneficios-exposicao` | `beneficiosExposicaoController.detalhar` | `beneficiosExposicaoService.buscarPorEmpresa` (novo) | `BeneficioExposicao` | EP; EA via scope (a própria) | |
| PATCH | `/empresas/:empresaId/beneficios-exposicao` | `beneficiosExposicaoController.atualizar` | `beneficiosExposicaoService.upsert` (novo) | `BeneficioExposicao` | EP | `telao_ativo`/`marca_site_ativo`; cria o registro 1:1 se ainda não existir |

## 11. Comunicações / E-mail (RF-04, RN-24, RN-25, RN-27, RN-28, ADR 0002)

| Método | Rota | Controller | Service | Model(s) | Perfil | Notas |
|---|---|---|---|---|---|---|
| POST | `/comunicacoes-email/rascunho` | `comunicacoesController.criarRascunho` | `comunicacoesService.criarRascunho` | `ComunicacaoEmail` | EP | `gerado_por_ia: true`. O texto do corpo chega pronto no body — a "geração" hoje é um conjunto de templates locais no front por palavra-chave do assunto (`front/src/lib/sugestaoEmail.ts`, RN-43/ADR 0007 §6), não uma chamada real a `emailAgentService`/Gemini (ADR 0002, `GEMINI_API_KEY` ainda não configurada) |
| GET | `/comunicacoes-email` | `comunicacoesController.listar` | `comunicacoesService.listar` | `ComunicacaoEmail`, `ComunicacaoDestinatario` | EP | Histórico auditável (RN-25). Só retorna `ativo=true` |
| PATCH | `/comunicacoes-email/:id` | `comunicacoesController.editar` | `comunicacoesService.editar` | `ComunicacaoEmail` | EP | Edição de `assunto`/`corpo_html` só em `status='rascunho'`; `ativo` (RN-37, exclusão) funciona em qualquer status |
| POST | `/comunicacoes-email/:id/aprovar` | `comunicacoesController.aprovar` | `comunicacoesService.aprovar` | `ComunicacaoEmail` | EP | Seta `revisado_por_usuario_id`/`revisado_em` — obrigatório antes de enviar (RN-28, já validado no model) |
| POST | `/comunicacoes-email/:id/enviar` | `comunicacoesController.enviar` | `comunicacoesService.enviar` | `ComunicacaoEmail` | EP | Só a partir de `status = 'aprovado'`; **nunca** chamado automaticamente pela IA (RN-28) |

## 12. Auditoria (RN-25)

| Método | Rota | Controller | Service | Model(s) | Perfil | Notas |
|---|---|---|---|---|---|---|
| GET | `/log-auditoria` | `auditoriaController.listar` | `auditoriaService.listar` (novo) | `LogAuditoria` | EP | Filtros `entidade`/`entidade_id`. Sem rota de escrita — services gravam internamente (ADR 0004 §6) |

## 13. Usuários (RN-01, RN-02)

| Método | Rota | Controller | Service | Model(s) | Perfil | Notas |
|---|---|---|---|---|---|---|
| GET | `/usuarios` | `usuariosController.listar` | `usuariosService.listar` (novo) | `Usuario` | EP | Gestão de quem tem acesso |
| PATCH | `/usuarios/:id` | `usuariosController.atualizar` | `usuariosService.atualizar` (novo) | `Usuario` | EP | Vincular `empresa_id`, mudar `papel`, `ativo` |

Login em si **não é uma rota deste backend** — é o fluxo do Auth.js
(ADR 0003 §3); o Express só valida o token já emitido, via
`authMiddleware.js`.

---

## O que já existe hoje vs. o que falta

**Superado** — registro histórico de antes da etapa 6 (a tabela abaixo já não reflete o estado atual: todos os itens listados como "não existe"/"a criar" foram implementados). Mantido só como histórico da ordem de implementação seguida.

| Peça | Status |
|---|---|
| `back/src/config/`, `back/src/models/` | Prontos (ADR 0004/0005) |
| `back/src/services/prospeccaoService.js`, `reservaEspacoService.js` | Prontos — mas cada um só tem a função da regra que motivou sua criação (`vincularProspeccaoAoFormulario`, `criarReserva`); as demais funções de cada service (`listar`, `atualizar` etc.) ainda não existem |
| `back/src/services/emailAgentService.js` | Arquivo existe, vazio — integração real com `@google/genai` ainda não implementada |
| `back/src/routes/index.js` | Só tem `/` e `/health` — nenhum submódulo montado ainda |
| `back/src/controllers/`, `back/src/middlewares/` (`authMiddleware.js`) | Diretórios ainda não existem |
| Demais services (`empresasService`, `contratosService`, `financeiroService` etc.) | Não existem — tudo a criar |

## Ordem sugerida de implementação

Por dependência de dado, não por número de RF:

1. **Middleware de autenticação/autorização** (`authMiddleware.js`, `requireRole`) — tudo depende disso.
2. **Empresas** (módulo 1) — âncora de quase todo o resto.
3. **Formulário + Prospecção** (módulos 2 e 3) — fluxo de entrada, já tem o service de conversão pronto.
4. **Contratos + Assinaturas** (módulos 4 e 5).
5. **Documentos** (módulo 6) — depende de empresa e, opcionalmente, contrato.
6. **Financeiro** (módulo 7) — depende de empresa e contrato.
7. **Planos, Espaços/Reservas, Benefícios de Exposição** (módulos 8 a 10) — independentes entre si, podem vir em paralelo depois do núcleo.
8. **Comunicações/E-mail** (módulo 11) — depende de Empresas existirem para ter destinatários.
9. **Auditoria** (módulo 12) — só leitura, pode vir a qualquer momento depois que algum service já esteja gravando nela.
10. **Usuários** (módulo 13) — gestão administrativa, baixa urgência para o protótipo.
