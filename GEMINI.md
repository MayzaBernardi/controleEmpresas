# Diretrizes e Regras do Projeto — Pollen Parque (Gestão de Afiliados)

Este arquivo define as regras de desenvolvimento que o assistente de IA deve seguir estritamente ao trabalhar neste repositório.

---

## 1. Fonte da Verdade e Documentação

- **Regras de Negócio**: Consulte sempre `docs/regras-de-negocio.md` antes de implementar fluxos de negócio.
  - Respeite os IDs das regras (`RN-01`, `RN-02`, etc.) ao documentar ou referenciar regras no código.
  - **Atenção aos alertas ⚠️**: Itens marcados com ⚠️ na seção "Pendências abertas" de `docs/regras-de-negocio.md` **não devem ser implementados** até confirmação explícita do time de negócio.
- **Decisões Técnicas e Arquiteturais (ADRs)**: Estão em `docs/decisoes/`. Toda nova decisão estrutural deve ser registrada como um novo ADR sequencial (`NNNN-titulo.md`) seguindo a convenção em `docs/README.md`.
- **Changelog de Etapas**: Ao concluir qualquer etapa de desenvolvimento, atualize o arquivo `docs/CHANGELOG.md` referenciando os documentos e entregas correspondentes.
- **APIs e Modelagem**: Endpoints devem ser documentados em `docs/api/<modulo>.md` e schemas em `docs/modelagem/<entidade>.md`.

---

## 2. Escopo e Diretrizes de Inteligência Artificial (RF-04 / ADR 0002)

- **Geração de Rascunhos de E-mail**:
  - A IA é utilizada exclusivamente para **redigir rascunhos** de e-mails (cobrança de débito, aviso de vencimento de vigência, boas-vindas e comunicados).
  - **NUNCA envie e-mails diretamente pela IA**: É obrigatória a existência de um passo de revisão e confirmação humana antes do disparo (RN-28).
  - **Histórico e Auditoria**: Todo e-mail gerado com assistência de IA deve registrar a flag `geradoPorIA: true`, autor da revisão e timestamp no histórico (RN-25).
  - **Fallback**: O sistema deve permitir a redação manual caso o serviço de IA esteja temporariamente indisponível.
- **Fora do Escopo de IA**:
  - Geração de contratos (RF-03): Deve ser feita por template determinístico (sem LLM).
  - Triagem de documentos (RF-05): Fora do escopo atual.

---

## 3. Backend (`back/`) — Node.js / Express

- **Estrutura de Pastas**:
  - `src/controllers/`: Manipulação de requisições HTTP e validação de entrada.
  - `src/services/`: Regras de negócio e integrações externas (ex.: `emailAgentService.js`).
  - `src/routes/`: Definição de endpoints Express.
- **Segurança e Variáveis de Ambiente**:
  - Nunca exponha chaves de API (`GEMINI_API_KEY`) no código ou no versionamento. Utilize sempre `process.env`.
  - Mantenha `.env.example` sincronizado com os nomes das variáveis necessárias.
- **Tratamento de Erros**:
  - Respostas de erro devem ser amigáveis e não expor stack traces sensíveis em produção.

---

## 4. Frontend (`front/`) — Next.js / React / Tailwind

- **Fluxo de Aprovação Humana**:
  - Telas de disparo de e-mail devem exibir claramente o rascunho gerado pela IA com campo editável para revisão humana antes do botão de confirmação de envio.
  - Indicar visualmente que o rascunho inicial foi sugerido por IA.
- **Atores e Perfis de Acesso**:
  - Respeitar a segmentação por perfis (RN-01): Equipe do programa, Empresa afiliada e Contabilidade/Financeiro.

