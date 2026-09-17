# 0003. Persistência de dados e autenticação

Status: aceita

## Contexto

Com as etapas iniciais concluídas (organização do repositório no [ADR 0001](./0001-organizacao-do-repositorio-e-documentacao.md), levantamento de regras de negócio em [`docs/regras-de-negocio.md`](../regras-de-negocio.md) e definição do escopo de IA no [ADR 0002](./0002-agente-de-ia-para-redacao-de-emails.md)), o projeto avança para a viabilização técnica do núcleo funcional (RF-01 em diante).

Atualmente, o processo operacional de afiliação do Pollen Parque depende de formulários descentralizados e controle em planilhas manuais. Para viabilizar os requisitos funcionais prioritários — cadastro de empresas afiliadas (RF-01), acompanhamento do ciclo de vida e contratos (RF-03, RF-07), lançamento de notas e confirmação de pagamentos pela contabilidade (RF-06), além do histórico auditável de comunicações (RN-25) —, é indispensável definir a estratégia e a tecnologia de persistência de dados.

Paralelamente, o sistema estabelece três perfis de atores com fronteiras rígidas de acesso (RN-01: Equipe do programa, Empresa afiliada e Contabilidade/Financeiro) e o requisito mandatório de login institucional via SSO (RN-02 / RNF-01), sem senhas locais no sistema. Portanto, a estratégia de autenticação, emissão e validação de sessão precisa ser padronizada entre frontend e backend antes da criação dos controllers, rotas protegidas e telas.

Definir essas decisões neste momento destrava a formalização da modelagem de dados (`docs/modelagem/`) e a especificação dos contratos de API (`docs/api/`).

---

## 1. Banco de Dados: PostgreSQL

### Contexto

O domínio de gestão de afiliados requer armazenamento relacional com integridade referencial estrita entre empresas, representantes legais, contratos, faturas e registros de pagamento. Adicionalmente, funcionalidades como o histórico de auditoria de rascunhos de e-mail gerados por IA (RN-25) demandam capacidade de armazenar metadados semiestruturados com eficiência.

### Decisão

Adotar o **PostgreSQL** como Sistema Gerenciador de Banco de Dados Relacional (SGBD) do projeto.

### Alternativas consideradas

- **MySQL / MariaDB**: Embora populares e relacionais, o PostgreSQL oferece melhor maturidade no tratamento de dados semiestruturados via suporte nativo a `JSONB` (essencial para metadados de auditoria de IA e parâmetros dinâmicos de minutas), integridade transacional ACID mais estrita e ecossistema robusto para ambientes corporativos.
- **MongoDB / Bancos NoSQL**: Avaliados pela flexibilidade inicial de esquema, mas descartados porque a natureza do negócio é fundamentalmente relacional e transacional, exigindo constraints mandatórias de integridade referencial (chaves estrangeiras entre faturas, empresas e contratos) e garantia de unicidade (CNPJ/CPF).
- **SQLite**: Útil para desenvolvimento local embarcado, mas inviável para concorrência multiusuário em produção com acessos simultâneos dos diferentes perfis e desalinhado com a estratégia de containers prevista para deploy.

### Consequências

- **Para o `back/`**:
  - Instalação e uso do driver PostgreSQL para Node.js (`pg`, `pg-hstore`).
  - Configuração do pool de conexões gerenciado por variáveis de ambiente (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`).
- **Para o `front/`**:
  - Transparente. O frontend consome exclusivamente os endpoints da API REST e não possui acoplamento direto com o banco de dados.

---

## 2. ORM: Sequelize

### Contexto

Para manipular as tabelas no backend mantendo o fluxo arquitetural padronizado (`routes -> controllers -> services -> models`) definido para o projeto, é necessária uma camada de abstração e mapeamento objeto-relacional (ORM) que gerencie o ciclo de vida do schema (migrations, seeds) e facilite operações de consulta com segurança contra SQL injection.

### Decisão

Adotar o **Sequelize** como ORM da aplicação no backend Node.js.

### Alternativas consideradas

- **Prisma**: Amplamente utilizado no ecossistema Node.js, porém gera um cliente fortemente tipado voltado para TypeScript e depende de binários em Rust compilados por plataforma. Como o backend (`back/`) adota Node.js padrão com CommonJS (`require` / `module.exports`) em JavaScript puro sem etapa de transpilação/build, o Prisma adicionaria complexidade desnecessária de runtime e containerização.
- **TypeORM**: Fortemente orientado a decorators do TypeScript, resultando em uma experiência de desenvolvimento pouco ergonômica em código JavaScript CommonJS.
- **Query Builders puros (Knex.js) ou driver SQL nativo (`pg` puro)**: Proporcionariam controle granular sobre consultas, mas demandariam escrita manual de todo o código de mapeamento relacional, validação de modelos e boilerplate de CRUD, desacelerando a entrega em um cronograma curto.
- **Por que o Sequelize**: Trata-se de uma solução madura, com suporte nativo de primeira classe a CommonJS e Express, ecossistema estável de migrações (`sequelize-cli`), modelagem relacional orientada a classes/objetos e encaixe direto na pasta `back/src/models/` já preparada na arquitetura.

### Consequências

- **Para o `back/`**:
  - Adição dos pacotes `sequelize` e `sequelize-cli` como dependências.
  - Definição dos modelos de dados dentro de `back/src/models/`, encapsulando atributos, associações e hooks.
  - Implementação de migrações versionadas para evolução segura do schema em produção.
  - Manutenção do padrão: controllers não acessam o Sequelize diretamente; as operações de banco são orquestradas na camada de `services/`.
- **Para o `front/`**:
  - Nenhuma consequência direta; a persistência é encapsulada pela API.

---

## 3. Autenticação e Gestão de Sessão

> **Atualização (2026-09-17): decisão revertida.** A subseção abaixo (Auth.js + SSO
> institucional) foi a decisão original deste ADR e permanece registrada por histórico, mas
> **não é mais o que o sistema faz**. Validado com o time que não há um provedor de
> identidade institucional viável pra integrar (nenhum Google Workspace/Microsoft
> Entra/SAML disponível para o domínio dos usuários). A decisão atual é **autenticação
> local**: e-mail + senha própria do sistema, hash bcrypt (`bcryptjs`), sem senha em texto
> puro em nenhum lugar. RN-02 foi atualizado de acordo.
>
> Isso muda menos do que parece no `back/`: o `authMiddleware` já validava um JWT assinado
> com um segredo compartilhado (`AUTH_SECRET`) — decisão tomada deliberadamente compatível
> com uma futura migração para Auth.js, e que segue funcionando igual para JWT emitido por
> login local. O que muda é só *quem emite* o token: antes seria o Auth.js após o handshake
> OAuth/OIDC; agora é o próprio `back/` (`POST /auth/login`), depois de comparar a senha
> recebida com `usuarios.senha_hash` via `bcrypt.compare`.
>
> Não há autocadastro nem "esqueci minha senha" por e-mail (o projeto não tem infraestrutura
> de envio de e-mail) — só a `equipe_programa` cria usuário (`POST /usuarios`) e define ou
> reseta a senha de qualquer usuário (`PATCH /usuarios/:id`, campo opcional `senha`).

### Contexto (decisão original — não vale mais, ver acima)

O sistema possui regras mandatórias de autenticação e controle de acesso:

- **RN-01**: Segmentação estrita por ator (Equipe do programa, Empresa afiliada e Contabilidade/Financeiro).
- **RN-02 / RNF-01**: O login deve ser institucional (SSO), sem geração ou armazenamento de senhas locais na aplicação.

É necessário uma solução segura para orquestrar o fluxo de autenticação com provedores institucionais, gerar sessões protegidas por cookies seguros e permitir que tanto o frontend quanto o backend validem a identidade e o perfil do usuário logado.

### Decisão

Adotar o **Auth.js** (NextAuth / Auth.js) para autenticação e gestão de sessão no sistema.

### Alternativas consideradas

- **Autenticação manual com JWT e bcrypt**: Alto custo de implementação e manutenção, risco elevado de vulnerabilidades (armazenamento incorreto em localStorage, CSRF, ausência de rotação de chaves) e incompatibilidade direta com a regra RN-02 (que proíbe senha própria do sistema e exige SSO).
- **Passport.js**: Solução clássica do Express, mas exige amplo boilerplate manual para gerenciamento de tokens, sessões e cookies seguros, além de não oferecer integração nativa com a renderização server-side do Next.js App Router.
- **BaaS gerenciado proprietário (Firebase Auth / Supabase Auth)**: Adicionaria dependência de infraestrutura externa proprietária ou custos adicionais, gerando maior atrito para homologação e federação com o SSO institucional da universidade/parque.
- **Por que o Auth.js**: Solução aberta, agnóstica de provedores (OAuth 2.0 / OpenID Connect / SAML), concebida para integração nativa com o Next.js App Router, capaz de gerenciar cookies `HttpOnly` com criptografia JWE/JWT, gerenciar ciclo de renovação de sessão e emitir tokens verificáveis pelo backend Express via chave secreta compartilhada.

### Consequências

- **Para o `front/`**:
  - Instalação e configuração do Auth.js (`next-auth`) no Next.js 16.
  - Implementação do route handler de autenticação em `src/app/api/auth/[...nextauth]/route.ts`.
  - Configuração do middleware do Next.js para interceptação de rotas e bloqueio de acesso de acordo com o perfil do ator logado (RN-01).
  - Disponibilização do contexto de sessão para componentes de interface e leitura segura de dados em Server Components.
- **Para o `back/`**:
  - Criação de middleware de autenticação no Express (`back/src/middlewares/authMiddleware.js`) para validar a integridade do token de sessão do Auth.js (via segredo compartilhado `AUTH_SECRET`).
  - Injeção das credenciais do usuário autenticado em `req.user` (id, e-mail, perfil/role), permitindo que controllers e services façam a validação granular de permissão (RN-01) em cada requisição.

---

## Conexão com Regras de Negócio e Próximos Passos

Este ADR atende diretamente aos seguintes requisitos e regras:

- **RN-01 (Segmentação de acesso)**: Garantida pela atribuição de perfis de ator no token de sessão (`papel`/`empresaId` no JWT) e validação em `authMiddleware`/`requireRole` no backend.
- **RN-02 (Login)**: Revisado em 2026-09-17 — não é mais SSO institucional (ver nota no início da seção 3). É login local, `POST /auth/login` (e-mail + senha, hash bcrypt), usuário criado e senha definida/resetada só pela `equipe_programa`.
- **RF-01, RF-02, RF-06, RF-07 (Entidades de negócio)**: Viabilizados pela modelagem relacional no PostgreSQL via Sequelize.
- **RN-25 (Auditoria de IA)**: Suportada pelo armazenamento de metadados em colunas `JSONB` no PostgreSQL.

Com este ADR aprovado, a etapa subsequente é a formalização dos schemas em `docs/modelagem/` e dos endpoints em `docs/api/`.
