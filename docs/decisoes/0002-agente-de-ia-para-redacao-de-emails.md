# 0002. Agente de IA para redação de e-mails (RF-04)

Status: aceita

## Contexto

Ficou definido que o sistema deve usar agentes de IA em pelo menos uma
tarefa. Três candidatos foram avaliados, todos ligados a RFs já existentes:

- **RF-03 (geração de contrato)** — o contrato tem peso jurídico (segue para
  assinatura do reitor via Procuradoria). Preencher a minuta com um LLM
  introduziria risco de erro sem necessidade real, já que os dados já
  existem estruturados no cadastro — um preenchimento determinístico
  (template/mail-merge) resolve com mais segurança.
- **RF-05 (triagem de documentos)** — exigiria parsing de arquivo/OCR,
  maior custo de implementação para o prazo de uma semana até a
  apresentação.
- **RF-04 (redação de e-mails)** — menor risco, porque sempre há revisão
  humana antes do envio; mapeia direto a um RF já existente; é a opção mais
  demonstrável dado o prazo.

## Decisão

Usar um agente de IA para gerar **rascunhos** de e-mail (cobrança de
débito, aviso de vencimento de vigência, boas-vindas, comunicação em
massa). Alguém da equipe do programa sempre revisa e confirma antes do
envio — o agente nunca envia diretamente (ver RN-28 em
[`regras-de-negocio.md`](../regras-de-negocio.md)).

Geração de contrato (RF-03) permanece fora do escopo de IA por ora,
resolvida com template determinístico.

## Consequências

- RF-04 passa a depender de integração com um provedor de LLM (qual
  provedor/modelo específico é decisão técnica separada, a registrar em
  outro ADR quando a implementação começar).
- É necessário um passo de UI para revisão/edição do rascunho antes da
  confirmação de envio — não existe caminho de envio direto pelo agente.
- Indisponibilidade do provedor de IA não pode travar a comunicação: precisa
  existir opção de redigir o e-mail manualmente como alternativa.
- O histórico de e-mail (RN-25) deve indicar quando um rascunho foi gerado
  por IA, para fins de auditoria.
