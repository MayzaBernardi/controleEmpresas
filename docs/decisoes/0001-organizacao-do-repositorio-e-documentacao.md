# 0001. Organização do repositório e convenção de documentação

Status: aceita

## Contexto

O repositório git do projeto tinha sido inicializado em `/root` (a home do
usuário), em vez de dentro de `projetoIA/`. Como consequência, o working tree
incluía arquivos sensíveis da home (`.ssh/`, `.aws/`, `.gitconfig`,
histórico de shell, outros projetos não relacionados) como untracked —
nenhum commit chegou a ser feito, mas qualquer `git add .` ali arriscaria
versionar credenciais.

Além disso, não havia nenhuma convenção definida sobre onde e como registrar
decisões, regras de negócio e o histórico de etapas do desenvolvimento — algo
necessário dado o ritmo do projeto (etapas curtas, uma semana até a
apresentação) e o fato de que documentação será usada para avaliar o
raciocínio por trás do que foi construído.

## Decisão

1. Remover o repositório git de `/root` (sem histórico, nada foi perdido) e
   reinicializar em `/root/projetoIA/`, cobrindo `back/` e `front/` num único
   repositório. Branch principal: `main`.
2. Criar `docs/` na raiz do projeto com uma convenção fixa de tipos de
   documento, cada um associado ao tipo de entrega/decisão que fecha uma
   etapa: regras de negócio, ADRs (decisões técnicas), documentação de API,
   modelagem de dados, e um changelog cronológico de etapas. Ver
   [`docs/README.md`](../README.md) para o detalhamento.

## Consequências

- Arquivos da home do usuário não são mais alcançáveis pelo git deste
  projeto.
- Toda decisão estrutural relevante passa a ter um ADR rastreável — inclusive
  esta.
- Fica estabelecido que, ao fechar uma etapa, a etapa só é considerada
  "fechada" quando o documento correspondente existe e o `CHANGELOG.md` foi
  atualizado.
