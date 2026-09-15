# 0004. Modelagem do banco de dados — Afiliados do Pollen Parque

Status: aceita

## Contexto

Com as decisões de persistência (PostgreSQL + Sequelize) e autenticação (Auth.js) formalizadas no [ADR 0003](./0003-persistencia-e-autenticacao.md), o projeto avança para a implementação do núcleo relacional do sistema. Antes de iniciar a codificação dos controllers e services dos requisitos funcionais (RF-01 ao RF-09), foi necessário definir o schema completo do banco de dados — incluindo entidades, relacionamentos, tipos de dados, estratégias de chave primária, representação de estados e mecanismos de isolamento de dados por perfil.

As decisões abaixo foram tomadas equilibrando simplicidade (o sistema tem ~50–60 afiliados, protótipo de uma semana) com correção técnica e segurança de acesso por perfil (RN-01, RN-33).

---

## 1. Chave Primária: UUID Seletivo em Vez de UUID Universal

### Decisão

Apenas as tabelas `empresas` e `contratos` usam `UUID` (v4) como chave primária. Todas as demais tabelas usam `BIGSERIAL` (inteiro autoincrementado).

### Alternativas consideradas

- **UUID universal (todas as tabelas)**: Elimina qualquer risco de enumeração em qualquer rota futura. Porém, adiciona overhead de armazenamento e verbosidade desnecessária em tabelas internas que jamais são expostas diretamente via link externo (ex.: `assinaturas`, `log_auditoria`, `comunicacoes_destinatarios`).
- **BIGSERIAL universal**: Simples e eficiente, porém recursos acessados diretamente por empresas afiliadas via link (ex.: `/contratos/:id/documentos`, `/empresas/:id/financeiro`) ficam vulneráveis a enumeração sequencial (IDOR), violando a intenção de RN-01 e RN-33.

### Consequências

- Os identificadores de `empresas` e `contratos` nunca permitem que um usuário externo adivinhe o ID de outro afiliado por incremento.
- Controllers e services que geram links públicos (ex.: tokens de upload de documentos, links de autoatendimento de empresas afiliadas) devem usar os UUIDs dessas tabelas como identificadores de rota.
- No Sequelize, `DataTypes.UUID` com `defaultValue: DataTypes.UUIDV4` é utilizado nessas duas tabelas; as demais declaram `id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true }`.

---

## 2. Representação de Estados: ENUM vs. Tabela de Referência

### Decisão

- **ENUMs nativos do PostgreSQL** são usados para campos cujos valores são estáveis e governados por regras de negócio imutáveis em tempo de execução: `papel` (usuários), `tipo_empresa`, `tipo_caso_especial`, `papel_assinatura`, `status_assinatura`, `tipo_documento`, `status_documento`, `forma_pagamento`, `status_comunicacao`.
- **Tabelas de referência** (`status_contrato` e `status_financeiro`) são usadas para os estados do processo de contratos e lançamentos financeiros, porque esses valores podem precisar de novos estados sem exigir `ALTER TYPE ... ADD VALUE` no PostgreSQL (operação que não pode ser revertida em uma transação e que trava a tabela em versões mais antigas do Postgres).

### Alternativas consideradas

- **ENUM para todos os campos de estado**: Simplificaria a modelagem, mas qualquer adição de estado no fluxo de contratos (ex.: estado intermediário "em_diligencia_juridica") exigiria DDL destrutivo.
- **Tabela de referência para todos os campos de estado**: Tornaria o schema mais flexível, mas adicionaria joins em queries simples para campos cujos valores nunca mudarão (ex.: papel de usuário, tipo de documento).

### Consequências

- Para adicionar um novo `status_contrato` ou `status_financeiro` no futuro, basta um `INSERT` na tabela de referência — não há necessidade de migration de DDL.
- Os modelos `StatusContrato` e `StatusFinanceiro` têm `timestamps: false` e `freezeTableName: true`.
- Controllers e services que filtram por status usam `include: [{ model: StatusContrato }]` ou buscam os IDs de referência de forma programática (ex.: `StatusContrato.findOne({ where: { codigo: 'vigente' } })`).

---

## 3. Cálculo de Status Derivados: On-the-Fly vs. Hooks vs. Job Agendado

### Decisão

Os estados derivados de tempo — "renovação pendente" (contrato a ≤ 60 dias do vencimento) e "atrasado" (lançamento vencido sem pagamento) — são **calculados em tempo de leitura no service**, comparando datas da instância com `new Date()`. A coluna de status no banco (`status_contrato_id` e `status_financeiro_id`) registra o estado formal atualizado manualmente pela equipe ou pela Contabilidade.

### Alternativas consideradas

- **Hooks `beforeFind`/`afterFind` no Sequelize**: Injetariam o estado derivado automaticamente, mas não funcionam em queries com `where: { status: ... }` pois o cálculo ocorre após o SELECT. Também dificultam a depuração e são executados em toda leitura, inclusive em operações internas.
- **Job agendado (cron)**: Atualizaria o banco periodicamente e permitiria filtros diretos por status. Porém, adiciona complexidade de infraestrutura (scheduler, gerenciamento de falhas de job) desnecessária para um protótipo de uma semana.
- **Campo calculado virtual no Sequelize (getter)**: Implementado como camada auxiliar nos models `Contrato` e `FinanceiroLancamento` (getters `estaProximoVencimento`, `estaVencido`, `estaAtrasado`) para consumo nos services, sem persistir no banco.

### Consequências

- A listagem de contratos com "renovação pendente" para a equipe do programa requer que o `ContratosService` faça a query por `data_termino_vigencia` com range de datas, não por um campo de status.
- Os getters virtuais (`estaProximoVencimento`, `estaVencido`, `estaAtrasado`) são utilitários de leitura nos models, disponíveis após a recuperação das instâncias.
- Se, no futuro, o volume de contratos crescer e as queries por status derivado ficarem lentas, a migração para um job agendado com coluna física pode ser feita sem alterar a interface pública da API (apenas o service muda internamente). Isso está documentado como evolução possível em `docs/regras-de-negocio.md` (RN-30, RN-31).

---

## 4. Isolamento de Dados por Perfil: Scope Nomeado vs. defaultScope Global

### Decisão

O isolamento de dados do perfil `empresa_afiliada` (RN-01, RN-33) é implementado via **scopes nomeados e explícitos** no Sequelize (ex.: `Contrato.scope({ method: ['paraEmpresa', empresaId] })`), chamados deliberadamente nos controllers a partir do `empresa_id` da sessão Auth.js autenticada. Não se usa `defaultScope` global.

### Alternativas consideradas

- **`defaultScope` global com `empresa_id`**: Simplificaria o código dos controllers, aplicando o filtro automaticamente em todas as queries do model. Porém, tornaria inoperante qualquer consulta da equipe do programa que precise enxergar múltiplas empresas (ex.: listagem geral de afiliados) — exigiria `Model.unscoped()` em todo controller administrativo, o que é propenso a erros de omissão.
- **Filtro manual em cada query (`where: { empresa_id }`)**: Funcionaria, mas é propenso a esquecer o filtro em queries futuras, especialmente em includes aninhados.

### Consequências

- Cada controller responsável por recursos de `empresa_afiliada` deve obrigatoriamente chamar o scope ao construir a query: `Contrato.scope({ method: ['paraEmpresa', req.user.empresa_id] }).findAll(...)`.
- O middleware de autenticação (Auth.js + `authMiddleware.js` no Express) injeta `req.user` com `{ id, papel, empresa_id }`.
- Scopes nomeados estão definidos nos models: `Empresa`, `Contrato`, `Documento`, `FinanceiroLancamento`, `EspacoFisico` (as 5 entidades listadas em RN-33).
- O agente backend deve sempre verificar se o controller aplica o scope correto com base em `req.user.papel` antes de executar qualquer query que envolva dados de empresa.
- **Detalhe de implementação Sequelize**: no model `Empresa`, a coluna de isolamento (`id`) é a própria PK — a mesma chave que `findByPk` usa internamente. Um `where` embrulhando a mesma chave faz o merge raso do Sequelize sobrescrever o filtro do scope em vez de combiná-lo com AND. Por isso, o `where` de todos os 5 scopes `paraEmpresa` é embrulhado em `{ [Op.and]: [...] }` (chave própria, nunca colide), garantindo que o isolamento se mantenha mesmo com `findByPk`. Ver comentário em `back/src/models/Empresa.js`.

---

## 5. Autorreferência de Contratos para Renovação

### Decisão

A tabela `contratos` possui a coluna `contrato_anterior_id UUID REFERENCES contratos(id)` para encadear contratos de renovação. A relação é declarada no Sequelize como `Contrato.belongsTo(Contrato, { as: 'contratoAnterior', foreignKey: 'contrato_anterior_id' })`.

### Consequências

- Para consultar o histórico completo de renovações de uma empresa, o service faz `Contrato.findAll({ where: { empresa_id }, include: [{ model: Contrato, as: 'contratoAnterior' }] })`.
- O campo `contrato_anterior_id` é nullable; o primeiro contrato de uma empresa sempre terá esse campo como `null`.

---

## 6. Tabela de Auditoria Genérica

### Decisão

Uma única tabela `log_auditoria` registra toda alteração de entidade com `entidade` (nome da tabela), `entidade_id` (UUID ou BIGINT em string), `acao` ('create', 'update', 'delete') e JSONB de dados anterior/novo. Sem `updated_at`.

### Alternativas consideradas

- **Tabelas de auditoria por entidade**: Fornece tipagem forte e queries de histórico mais eficientes, mas cria overhead de manutenção (nova tabela a cada entidade nova).
- **Extension temporal do Postgres (temporal_tables)**: Solução robusta, mas complexidade desnecessária para o protótipo.

### Consequências

- A escrita em `log_auditoria` é responsabilidade dos services (não de hooks do Sequelize), garantindo controle explícito sobre o que é auditado.
- Queries de auditoria filtram por `entidade` + `entidade_id` com índice composto.

---

## Tabelas Criadas (13 total, em 12 migrations — a primeira migration cria duas tabelas de referência)

| Tabela                       | PK          | Propósito                              |
| ---------------------------- | ----------- | -------------------------------------- |
| `status_contrato`            | SERIAL      | Lookup de status de contratos          |
| `status_financeiro`          | SERIAL      | Lookup de status financeiros           |
| `empresas`                   | UUID        | Cadastro de empresas afiliadas         |
| `usuarios`                   | BIGSERIAL   | Usuários do sistema (SSO)              |
| `formulario_respostas`       | BIGSERIAL   | Submissões brutas do formulário        |
| `espacos_fisicos`            | BIGSERIAL   | Controle de ocupação de espaço         |
| `contratos`                  | UUID        | Contratos de afiliação e renovações    |
| `assinaturas`                | BIGSERIAL   | Signatários do contrato (Procuradoria) |
| `documentos`                 | BIGSERIAL   | Uploads e documentação da empresa      |
| `financeiro_lancamentos`     | BIGSERIAL   | Boletos, NFs e pagamentos              |
| `comunicacoes_email`         | BIGSERIAL   | E-mails enviados ou em rascunho        |
| `comunicacoes_destinatarios` | PK Composta | Junção N:N e-mails ↔ empresas          |
| `log_auditoria`              | BIGSERIAL   | Histórico de alterações (JSONB)        |

## Consequências Globais

- A instalação do `pg`, `pg-hstore`, `sequelize` e `sequelize-cli` foi adicionada ao `back/package.json`.
- O arquivo `back/.sequelizerc` mapeia as pastas de migrations, models e seeders para `back/src/migrations/`, `back/src/models/` e `back/src/seeders/`.
- A leitura das variáveis de ambiente de banco é feita exclusivamente por `back/src/config/env.js` e `back/src/config/database.js`, sem acesso direto a `process.env` em outros módulos.
- A execução local do banco de dados é feita com `docker compose up -d` usando o `docker-compose.yml` na raiz do repositório.
