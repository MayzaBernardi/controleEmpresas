# Documentação do projeto

Este projeto é desenvolvido em etapas curtas (a "Semana de Desenvolvimento de
Software com IA" vai de segunda a sexta). Para não perder o raciocínio por
trás de cada decisão, **toda etapa fechada gera um documento**, do tipo
correspondente ao que foi decidido/entregue nela. A regra é simples:

> Fechou uma etapa → identifique o tipo de decisão/entrega → registre no
> arquivo certo (criando-o se ainda não existir) → adicione uma linha no
> [`CHANGELOG.md`](./CHANGELOG.md) apontando para ele.

## Tipos de documento e quando criar cada um

| Tipo                                   | Onde                                             | Quando criar/atualizar                                                                                                                                                                                           |
| -------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Regra de negócio**                   | [`regras-de-negocio.md`](./regras-de-negocio.md) | Sempre que uma regra do negócio (não técnica) for definida, confirmada ou mudar. É um documento vivo, único — não um por etapa.                                                                                  |
| **Decisão técnica/arquitetural (ADR)** | `decisoes/NNNN-titulo.md`                        | Sempre que se fechar uma decisão estrutural: escolha de banco/ORM, estratégia de autenticação, organização de pastas, correção de infraestrutura do repo, etc. Um arquivo por decisão, numerado sequencialmente. |
| **Documentação de API**                | `api/<modulo>.md`                                | Quando os endpoints de um módulo (ex.: afiliados, contratos, financeiro) ficam estáveis o suficiente para outra pessoa (ou o front) consumir.                                                                    |
| **Modelagem de dados**                 | `modelagem/<entidade>.md`                        | Quando o schema de uma entidade é fechado (campos, relações, constraints).                                                                                                                                       |
| **Changelog de etapas**                | [`CHANGELOG.md`](./CHANGELOG.md)                 | Sempre, ao final de cada etapa — mesmo que só aponte para os documentos acima. É o índice cronológico do projeto.                                                                                                |

## Convenção dos ADRs

Cada arquivo em `decisoes/` segue o formato:

```
# NNNN. Título da decisão

Status: proposta | aceita | substituída por NNNN

## Contexto
## Decisão
## Consequências
```

## Estado atual

- `regras-de-negocio.md` — criado (etapa 1), atualizado (etapa 2, etapa 4, etapa 5).
- `decisoes/0001-organizacao-do-repositorio-e-documentacao.md` — criado (etapa 0/1).
- `decisoes/0002-agente-de-ia-para-redacao-de-emails.md` — criado (etapa 2).
- `decisoes/0003-persistencia-e-autenticacao.md` — criado (etapa 3).
- `decisoes/0004-modelagem-banco-afiliados.md` — criado (etapa 4).
- `decisoes/0005-mapeamento-planilha-legado.md` — criado (etapa 5).
- `modelagem/` — populado na etapa 4 (13 tabelas) e ampliado na etapa 5 (+6 tabelas): um arquivo por entidade + `er-diagram.md`.
- `revisao-manual/` — criado na etapa 5: relatórios de backfill sem correspondência automática confiável, para revisão manual da equipe (não é um tipo de doc permanente como os demais — conteúdo muda a cada backfill rodado).
- `api/` — ainda vazio, será populado quando os endpoints REST (controllers/services de `back/src/`) começarem a ser implementados.
