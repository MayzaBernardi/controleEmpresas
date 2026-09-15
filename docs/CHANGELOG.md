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
