# Coleção Postman — Pollen Parque

`pollen-parque.postman_collection.json` — importe direto no Postman
(File → Import → selecione o arquivo). Formato v2.1, sem environment
separado: as variáveis (`baseUrl`, tokens, IDs encadeados) já estão na
própria collection.

## Como usar

1. Suba a API localmente (`cd back && npm run dev`, ou `node src/server.js`)
   com o Postgres rodando (`docker compose up -d`, ou o Postgres nativo já
   configurado neste ambiente).
2. Rode as 3 requisições da pasta **"0. Auth (dev)"** primeiro — elas
   emitem um token por perfil (equipe_programa, contabilidade,
   empresa_afiliada) e salvam automaticamente em variáveis da collection
   (`tokenEquipePrograma`, `tokenContabilidade`, `tokenEmpresaAfiliada`),
   usadas pelo header `Authorization: Bearer ...` de todas as demais
   requisições.
   - `POST /auth/dev-login` é um atalho de desenvolvimento/teste — não
     existe em produção (`NODE_ENV=production` retorna 404). Substitui o
     login real via Auth.js/SSO institucional, que ainda não está
     implementado no `front/` (ver ADR 0003). Recebe `{ "email": "..." }`
     de um usuário já cadastrado no banco e devolve um token válido.
3. Rode **"1. Empresas > Listar empresas"** e **"4. Contratos > Listar
   contratos (equipe_programa)"** pelo menos uma vez — capturam
   `empresaId`, `contratoId` e `contratoComAssinaturasId` usados como
   exemplo nas demais pastas.
4. A partir daí, as pastas podem ser exploradas em qualquer ordem — cada
   uma tem descrições explicando o que a rota faz e qual regra de negócio
   está em jogo. Requisições marcadas `[RN-XX]`/`[RBAC]` são casos
   negativos propositais (esperam 400/403/404), com asserção automática.

## Rodando a collection inteira mais de uma vez

Algumas requisições criam dado real (empresa, contrato, reserva de
espaço, comunicação de e-mail) que fica no banco depois da execução — é
proposital, para você poder inspecionar o resultado. Duas coisas a saber
se for rodar a collection inteira repetidas vezes:

- **RN-35 (limite anual de reservas)**: a pasta "9. Espaços Físicos e
  Reservas" cria reservas de `sala_atico` (limite 1×/ano) para a mesma
  empresa a cada execução — a partir da 2ª vez que a collection roda, a
  criação vai corretamente retornar 400 (limite já atingido), não é bug.
- **`cnpj` de empresa** é gerado aleatoriamente a cada execução
  (pre-request script em "Criar empresa"), então repetir a collection não
  esbarra em conflito de unicidade nesse campo.

Se quiser voltar ao estado de seed original entre execuções, é um
protótipo local — pode recriar o banco (`docs/decisoes/0004-modelagem-
banco-afiliados.md` e `0005-mapeamento-planilha-legado.md` documentam os
comandos de migrate/seed).

## O que NÃO está coberto ainda

- Upload real de arquivo (documentos) — só a referência (`url_arquivo`) é
  persistida, não há storage de fato integrado.
- Envio real de e-mail (SMTP) — `POST /comunicacoes-email/:id/enviar` só
  faz a transição de estado (RN-25/RN-28), não dispara e-mail de verdade.
- Geração de PDF/documento de contrato — `POST /contratos` cria o registro
  no banco (RF-03), não um arquivo.

## Novidades (2026-09-16)

- `POST /comunicacoes-email/sugestao-corpo` (pasta "11. Comunicações /
  E-mail"): gera de verdade o corpo do e-mail via Gemini
  (`emailAgentService.js` + `GEMINI_API_KEY`) a partir só do assunto. Não
  persiste nada — o resultado (`corpo_html`) é o que se usa no corpo de
  "Criar rascunho de e-mail" em seguida.
- Formulários de inscrição (`GET /formulario-respostas`): nova regra
  RN-42 — some da listagem qualquer formulário cuja empresa (por CNPJ,
  vinculada ou só informada no payload) já tenha um contrato vigente
  dentro da data de validade.
