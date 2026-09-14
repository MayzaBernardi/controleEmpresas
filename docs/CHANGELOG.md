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
