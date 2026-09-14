# Regras de Negócio — Sistema de Gestão de Afiliados (Pollen Parque)

Documento vivo. É a fonte da verdade sobre **como o negócio funciona**,
independente de como isso é implementado. Toda regra nova, confirmada ou
alterada com o time do programa/contabilidade deve ser atualizada aqui — e a
atualização é o que fecha a etapa correspondente (ver
[`docs/README.md`](./README.md)).

Cada regra tem um ID (`RN-xx`) para poder ser referenciada em código, PRs e
outros documentos. Regras marcadas com ⚠️ são inferidas do fluxo atual e
**precisam de confirmação** com o time de negócio — não foram ditas
explicitamente.

## 1. Atores

| Ator | O que pode fazer |
|---|---|
| Equipe do programa | Cadastra e gerencia empresas afiliadas, gera contratos, dispara comunicação, acompanha o processo ponta a ponta. |
| Empresa afiliada | Consulta seus próprios débitos e status; envia documentos exigidos. Não vê dados de outras empresas. |
| Contabilidade/Financeiro | Lança NF e boleto, confirma pagamentos. Só mexe na parte financeira — não edita cadastro nem contrato. |

- **RN-01** — Todo acesso ao sistema é segmentado por ator (RF-08): cada perfil só enxerga e edita o que é da sua responsabilidade. Uma empresa afiliada nunca vê dados de outra empresa.
- **RN-02** — O login é institucional (SSO), sem senha própria do sistema (RNF-01).

## 2. Cadastro de afiliados

- **RN-03** — O contato inicial de uma empresa interessada normalmente acontece por WhatsApp (envio de material/edital), mas isso **não é registrado no sistema** — o WhatsApp não é integrável e fica fora do fluxo digital.
- **RN-04** — O processo de afiliação só é considerado formalmente iniciado quando a empresa preenche o formulário de cadastro próprio do sistema, que grava direto no banco (RF-01), substituindo o formulário externo + planilha atual.
- **RN-05** — Uma empresa cadastrada deve poder ser listada e consultada pela equipe do programa a qualquer momento (RF-02).
- ⚠️ **RN-06** — Uma empresa pode existir no sistema em estados como: *cadastro iniciado*, *aguardando contrato/assinatura*, *ativa*, *inadimplente*, *em renovação*, *encerrada*. (Os nomes e transições exatas dos estados ainda não foram confirmados com o negócio — usar como rascunho até validar.)

## 3. Contrato e assinatura

- **RN-07** — O contrato é gerado automaticamente a partir de uma minuta padrão (modelo com campos variáveis, hoje preenchidos manualmente a partir de um PDF), usando os dados cadastrais da empresa (RF-03).
- **RN-08** — Após gerado, o contrato segue para abertura de chamado na Procuradoria Jurídica. **Esse fluxo é externo ao sistema e não muda** — o sistema não controla nem acelera esse processo (RF-10).
- **RN-09** — Um contrato só é considerado vigente depois de assinado por: o representante legal da empresa **+** 3 assinantes institucionais **+** o reitor.
- **RN-10** — O sistema registra o retorno desse fluxo de assinatura (eventos "documento inserido" / "documento concluído", hoje recebidos por e-mail), mas não participa do processo de coleta de assinaturas em si (RF-10).
- ⚠️ **RN-11** — Enquanto o contrato não estiver com todas as assinaturas concluídas, a empresa não deve ser tratada como afiliada ativa para fins de cobrança/vigência. (Ponto a confirmar: existe algum caso em que a cobrança começa antes da assinatura completa?)

## 4. Casos especiais de contratação

- **RN-12** — Empresas de grande porte em processo de alteração contratual recebem tratamento diferenciado (RF-11). ⚠️ O que muda exatamente no fluxo (aprovações extras, minuta diferente, etc.) ainda não foi detalhado — pendente de levantamento.
- **RN-13** — Empresas internacionais recebem tratamento diferenciado (RF-11). ⚠️ Mesma ressalva: regras específicas (moeda, formato de documento, idioma do contrato) ainda não foram detalhadas.

## 5. Documentos

- **RN-14** — Documentos exigidos pelo edital de afiliação devem ser enviados pela empresa e armazenados no sistema, vinculados a ela (RF-05), substituindo a troca por e-mail com a caixa NIT01.
- **RN-15** — A empresa deve conseguir ver quais documentos já enviou e (presumivelmente) quais ainda faltam. ⚠️ A lista de documentos obrigatórios por tipo de edital/caso ainda não foi formalizada num checklist — hoje está implícita no edital em PDF.

## 6. Financeiro

- **RN-16** — A emissão de nota fiscal e boleto é responsabilidade da contabilidade, não da equipe do programa. O sistema deve permitir que a contabilidade lance NF, boleto e vencimento, e confirme pagamento (RF-06). Isso corresponde à "parte laranja" da planilha atual.
- **RN-17** — Uma empresa é considerada **em débito/inadimplente** quando a data de vencimento é ultrapassada sem confirmação de pagamento registrada.
- **RN-18** — A cobrança de atraso depende de cruzar dados do sistema com a contabilidade — hoje isso é manual. A adesão da contabilidade ao sistema é condição de sucesso do projeto (RNF-05): sem a contabilidade lançando os dados nele, o controle financeiro fica incompleto.
- **RN-19** — A empresa afiliada deve poder consultar seus próprios débitos e status de pagamento a qualquer momento (RF-09), sem precisar pedir por e-mail/WhatsApp.
- ⚠️ **RN-20** — Formas de pagamento além de boleto único (PIX, parcelamento) estão em cogitação, mas **não confirmadas**. Não implementar até decisão do negócio — aumentam a complexidade do financeiro (conciliação, parcelas em aberto, etc.).

## 7. Vigência e renovação

- **RN-21** — A afiliação tem vigência **anual**. Ao fim do período, a anuidade precisa ser renovada (RF-07).
- ⚠️ **RN-22** — Não está definido se a renovação é automática (gera novo boleto/contrato sozinha) ou se depende de uma ação explícita da equipe do programa e/ou da empresa. Tratar como processo manual disparado pela equipe até confirmação.
- ⚠️ **RN-23** — Não está definido com quantos dias de antecedência o sistema deve avisar sobre vencimento da vigência.

## 8. Comunicação

- **RN-24** — O sistema deve permitir envio de e-mail individual e em massa para empresas afiliadas (RF-04), substituindo o envio manual hoje feito pela caixa NIT01.
- **RN-25** — Todo e-mail enviado pelo sistema deve ficar registrado com histórico auditável — quem enviou, para quem, quando, conteúdo (RF-04 + RNF-04).
- ⚠️ **RN-26** — A caixa de e-mail institucional que o sistema vai usar para enviar/receber ainda não foi definida. Bloqueia a implementação real do envio (hoje só é possível desenhar a funcionalidade, não configurar o remetente definitivo).
- **RN-27** — WhatsApp permanece fora do sistema — não há e não haverá integração automática nesta fase. A intenção do negócio é migrar o contato recorrente para e-mail (que gera histórico), mas o primeiro contato via WhatsApp continua acontecendo fora do sistema.
- **RN-28** — A redação de e-mails (individuais e em massa) é assistida por um agente de IA: o agente gera o rascunho do texto (ex.: cobrança de débito, aviso de vencimento de vigência, boas-vindas a novo afiliado), mas **nenhum e-mail é enviado sem revisão e confirmação explícita de alguém da equipe do programa**. O agente nunca envia diretamente. Ver [`decisoes/0002-agente-de-ia-para-redacao-de-emails.md`](./decisoes/0002-agente-de-ia-para-redacao-de-emails.md) para o porquê de e-mail ter sido escolhido como primeira tarefa com IA, em vez de contrato (RF-03) ou documentos (RF-05).

## 9. Escala

- **RN-29** — O sistema precisa suportar hoje ~22 afiliados fechados e ~23–30 em processo, com projeção de ~50 até o fim do ano e ~60 no ano seguinte (RNF-03). Não é um volume que exige otimizações de performance antecipadas — é baixo — mas a modelagem não deve assumir "poucos registros para sempre".

## Glossário

| Termo | Significado |
|---|---|
| Afiliado / empresa afiliada | Empresa que paga anuidade para ocupar espaço físico no Pollen Parque. |
| Minuta | Modelo de contrato padrão, com campos variáveis a preencher por empresa. |
| NIT01 | Caixa de e-mail institucional hoje usada para troca de documentos com empresas. |
| Procuradoria Jurídica | Setor externo responsável por coletar as assinaturas formais do contrato; fluxo mantido fora do sistema. |
| Vigência | Período em que a afiliação está válida (hoje, anual). |

## Pendências abertas (não implementar até confirmar)

Lista de tudo marcado com ⚠️ acima, para facilitar o acompanhamento:

1. Nomes/transições exatas do status de uma empresa (RN-06).
2. Se cobrança pode começar antes da assinatura completa do contrato (RN-11).
3. Regras específicas para grande porte em alteração contratual (RN-12).
4. Regras específicas para empresa internacional (RN-13).
5. Checklist formal de documentos obrigatórios por edital (RN-15).
6. PIX e parcelamento — decisão de escopo (RN-20).
7. Renovação automática vs. manual (RN-22).
8. Antecedência do aviso de vencimento de vigência (RN-23).
9. Caixa de e-mail institucional a ser usada pelo sistema (RN-26).
