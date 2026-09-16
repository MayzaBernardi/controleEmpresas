# Backend — Convenções de Código

Este documento registra o estilo de escrita adotado em `back/src` a partir de
2026-09-16, alinhado ao padrão pessoal do autor (referência: repositório
`~/zenith`). Complementa `.agents/agents/backend.md` e
`.agents/rules/project-context.md`, que continuam valendo para arquitetura,
camadas e regras de negócio — este arquivo trata só de **como o código é
escrito**.

## Controllers (`src/controllers/`)

- Cada função é exportada individualmente no ponto de declaração, nunca
  agrupada num `module.exports = {...}` no fim do arquivo:

  ```js
  exports.nomeDaFuncao = async (req, res) => {
    try {
      const resultado = await service.algo(...);
      return res.json(resultado);
    } catch (error) {
      if (error instanceof ApiError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error(error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };
  ```

- Toda função de controller tem seu próprio `try/catch` — não depende de
  `next(err)`/middleware de erro para o fluxo normal (esse middleware
  central em `src/app.js` continua existindo como rede de segurança para
  erros lançados pelos middlewares de rota, ex.: `authMiddleware`,
  `requireRole`).
- `ApiError` (status conhecido) vira `res.status(error.status)`; qualquer
  outro erro vira 500 genérico — **nunca** `error.message` bruto num 500,
  para não vazar detalhes internos (mantém a regra já documentada em
  `.agents/agents/backend.md`).
- Envelope de resposta: sucesso é o dado puro (`res.json(dado)` /
  `res.status(201).json(dado)`), erro é sempre `{ "error": "mensagem" }`.
  Isso é diferente do padrão `{ message, data }` do zenith — mantido assim
  de propósito porque já é o contrato documentado em
  `docs/api/mapeamento-geral.md` e validado contra a collection do
  Postman (`docs/postman/`). Não alterar sem atualizar os dois.

## Routes (`src/routes/`)

- `express.Router()` + import por desestruturação das funções do
  controller (não `const controller = require(...)` + `controller.fn`):

  ```js
  const { listar, criar } = require('../controllers/xController');
  ```

- Middlewares (`authMiddleware`, `requireRole(...)`) são aplicados **por
  rota**, inline, e não via `router.use(...)` no topo do arquivo — mesmo
  quando toda rota do arquivo usa o mesmo middleware.
- Uma declaração de rota por bloco, com linha em branco entre elas.
- Sem wrapper `asyncHandler` — cada controller já trata seu próprio erro
  (utilitário removido em 2026-09-16 por ter ficado sem uso).

## Models (`src/models/`)

- Mantém o padrão factory do `sequelize-cli`
  (`module.exports = (sequelize, DataTypes) => {...}` + `Model.associate`),
  **não** o `sequelize.define(...)` direto do zenith — decisão deliberada:
  os models daqui são carregados automaticamente por `models/index.js` do
  `sequelize-cli` e as migrations dependem desse formato (ADR 0003,
  `.agents/agents/backend.md`). Trocar isso quebraria o fluxo de
  migrations, não é só estilo.
