# Contexto do Projeto — Pollen Parque (Gestão de Afiliados)

Este documento descreve a arquitetura técnica, organização de diretórios, convenções e fluxo de dados do repositório Pollen Parque. Deve ser consultado por todos os agentes e desenvolvedores que atuam no projeto.

---

## 1. Visão Geral da Arquitetura

O projeto é um monorepo dividido em duas aplicações principais e uma pasta de governança/documentação:

- **`back/`**: API REST construída em Node.js com framework Express.
- **`front/`**: Aplicação web desenvolvida em Next.js (App Router), React, TypeScript e Tailwind CSS.
- **`docs/`**: Fonte da verdade de regras de negócio (`regras-de-negocio.md`), decisões arquiteturais sequenciais (`decisoes/NNNN-*.md`), contratos de API (`api/`), modelagem de dados (`modelagem/`) e registro histórico de entregas (`CHANGELOG.md`).

---

## 2. Estrutura Real do Backend (`back/src`)

O backend adota o padrão CommonJS (`require` / `module.exports`) e Express 5.2.1.

```
back/
├── package.json
├── package-lock.json
└── src/
    ├── app.js                   # Configuração da aplicação Express, middlewares globais e tratamento de erros
    ├── server.js                # Ponto de entrada (carrega dotenv e inicia o listener HTTP)
    ├── routes/
    │   └── index.js             # Roteador principal (/ e /health)
    ├── controllers/             # Manipuladores de requisições HTTP (validação de entrada e orquestração)
    ├── services/                # Regras de negócio e integrações externas
    │   └── emailAgentService.js # Serviço de integração com Google GenAI SDK (@google/genai)
    ├── models/                  # Esquemas e modelos de acesso a dados
    └── utils/                   # Funções utilitárias e helpers
```

### Componentes Existentes e Responsabilidades:

- **`src/server.js`**:
  - Carrega variáveis de ambiente via `dotenv.config()`.
  - Importa a instância configurada de `app` de `./app`.
  - Inicializa o servidor na porta definida em `process.env.PORT` (padrão `3000`).

- **`src/app.js`**:
  - Cria a instância do Express (`const app = express()`).
  - Registra middlewares globais essenciais: `cors()` e `express.json()`.
  - Conecta o roteador unificado (`app.use(routes)`).
  - Middleware de rota não encontrada (404): retorna `{ error: 'Rota não encontrada' }`.
  - Middleware centralizado de tratamento de erros (500): loga `err.stack` no console e responde com `{ error: 'Erro interno do servidor' }` sem expor detalhes internos.

- **`src/routes/index.js`**:
  - Instancia `Router()` do Express.
  - Define rotas básicas:
    - `GET /`: Retorna `{ message: 'API rodando com sucesso!' }`.
    - `GET /health`: Healthcheck retornando `{ status: 'ok' }`.
  - Ponto de montagem para os submódulos de rotas (afiliados, contratos, financeiro, emails).

- **`src/services/emailAgentService.js`**:
  - Preparado para encapsular a integração com o SDK `@google/genai` (versão `^2.22.0`).
  - Responsável por gerar os rascunhos de e-mail conforme a ADR 0002 e a regra RN-28.

- **`src/controllers/`** *(diretório preparado)*:
  - Recebe requisições HTTP (`req`, `res`, `next`).
  - Valida dados de entrada (body, query params, route params).
  - Chama os services correspondentes e retorna respostas com status HTTP adequados.

- **`src/models/`** *(diretório preparado)*:
  - Responsável pela persistência e manipulação das entidades do sistema (Afiliados, Planos, Contratos, Faturas, Histórico de E-mails).

- **`src/utils/`** *(diretório preparado)*:
  - Formatadores (CNPJ, CPF, moeda), validadores e helpers compartilhados.

---

## 3. Estrutura Real do Frontend (`front/src`)

O frontend é uma aplicação Next.js 16 (versão `16.3.5`) com App Router, React 19 (`19.2.8`), TypeScript 5 e Tailwind CSS v4 (`@tailwindcss/postcss: ^4`).

```
front/
├── package.json
├── package-lock.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
├── eslint.config.mjs            # ESLint 9 Flat Config
├── public/                      # Ativos estáticos e ícones SVG
└── src/
    └── app/
        ├── layout.tsx           # Layout raiz com fontes e metadata
        ├── page.tsx             # Página inicial
        ├── globals.css          # Estilização global com Tailwind CSS v4 (@import "tailwindcss")
        └── favicon.ico
```

### Detalhes Arquiteturais do Frontend:
- **App Router**:
  - Componentes são Server Components por padrão.
  - Componentes com estado interativo ou hooks de cliente (`useState`, `useEffect`) devem conter a diretiva `'use client'` no topo.
- **Tailwind CSS v4**:
  - Utiliza a nova engine CSS-first (`@import "tailwindcss";` no `globals.css` sem necessidade de `tailwind.config.js` legada).
- **Perfis de Acesso (RN-01)**:
  - A interface deve prever visualizações e permissões para:
    1. Equipe do programa (administradores)
    2. Empresa afiliada (área do cliente)
    3. Contabilidade/Financeiro (gestão de pagamentos e cobranças)
- **Diretriz de IA na UI (RN-28 / ADR 0002)**:
  - Telas de disparo de e-mails devem exibir uma área de edição para o rascunho sugerido por IA com badge indicando visualmente que o texto foi gerado por IA, exigindo confirmação explícita do usuário antes do envio.

---

## 4. Fluxo de Dados Esperado

O fluxo de dados da aplicação segue uma arquitetura em camadas estrita e desacoplada:

```
[ Cliente / Frontend (Next.js) ]
               │  HTTP Request (JSON)
               ▼
   [ back/src/routes/ ]          ── Roteamento e despacho de endpoints
               │
               ▼
 [ back/src/controllers/ ]       ── Validação de entrada, extração de parâmetros, status HTTP
               │
               ▼
  [ back/src/services/ ]         ── Regras de negócio (RN-XX), chamadas à IA (@google/genai)
               │
               ▼
   [ back/src/models/ ]          ── Acesso e persistência de dados
               │
               ▼
[ Resposta JSON padronizada ]    ── Retorno formatado ou propagação para middleware de erro
```

1. **Rotas (`routes/`)**: Definem o path e o método HTTP; vinculam middlewares de autenticação/validação ao controller correspondente. Não contêm lógica de negócio.
2. **Controllers (`controllers/`)**: Recebem `(req, res, next)`. Validam o payload. Não executam lógica complexa nem acessam o banco diretamente; delegam para a camada de serviço.
3. **Services (`services/`)**: Implementam as regras de negócio descritas em `docs/regras-de-negocio.md`. Interagem com integrações externas (Gemini) e com a camada de dados.
4. **Models (`models/`)**: Representam o estado das entidades e interagem com a base de dados.
5. **Tratamento de Erros**: Erros capturados em qualquer etapa são passados adiante via `next(err)` e manipulados pelo middleware centralizado em `src/app.js`.

---

## 5. Convenções Identificadas no Repositório

### 5.1. Código e Padrões
- **Módulos no Backend**: Padrão CommonJS (`require` e `module.exports`).
- **Módulos no Frontend**: Padrão ESM (`import` / `export`) com tipagem estrita via TypeScript.
- **Portas e Variáveis de Ambiente**:
  - `PORT` padrão é 3000.
  - Chaves de API (`GEMINI_API_KEY`) nunca devem ser hardcoded; utilizar exclusivamente `process.env`.
  - Novas variáveis devem ser documentadas em `.env.example`.
- **Respostas de Erro**:
  - 404: `{ "error": "Rota não encontrada" }`
  - 500: `{ "error": "Erro interno do servidor" }`
  - Erros da API devem manter consistência com o campo `error` nos objetos JSON retornados.

### 5.2. Governança e Regras de Negócio
- **Rastreabilidade**: Todas as regras de negócio são identificadas pelo prefixo `RN-` (ex.: `RN-01`, `RN-25`, `RN-28`) no arquivo `docs/regras-de-negocio.md`.
- **Alertas ⚠️**: Requisitos marcados com ⚠️ na seção "Pendências abertas" de `docs/regras-de-negocio.md` **não devem ser implementados** sem validação prévia.
- **ADRs (Architecture Decision Records)**: Novas decisões técnicas devem ser criadas em `docs/decisoes/` seguindo a sequência `NNNN-titulo.md`.
- **Changelog**: Cada etapa fechada deve ser registrada em `docs/CHANGELOG.md`.

### 5.3. Inteligência Artificial (ADR 0002 / RN-28)
- IA é limitada exclusivamente à geração de **rascunhos** de e-mail.
- **Envio direto por IA é proibido**: Exige aprovação e revisão humana prévia.
- Auditoria: Histórico deve registrar `geradoPorIA: true`, autor da revisão e timestamp.

