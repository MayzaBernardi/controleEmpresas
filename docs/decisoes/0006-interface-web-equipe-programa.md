# 0006. Interface web da equipe do programa (front/)

Status: aceita

## Contexto

Com a API REST completa (etapa 6 / ADR 0003), o `front/` continuava apenas o
scaffold padrão do `create-next-app`, sem nenhuma tela real. Esta etapa
implementou a primeira interface navegável do sistema: login e as telas de
todos os 11 módulos acessíveis ao ator `equipe_programa` (RN-01), consumindo a
API já existente.

Ficaram **fora** desta etapa (pendentes de tarefa futura): telas para
`empresa_afiliada`/`contabilidade`, e uma página de detalhe de Empresa que
agregue contratos/documentos/financeiro/benefícios de exposição daquela
empresa num só lugar.

## Decisões

### 1. Autenticação: `localStorage`, não cookie httpOnly

Sessão (`token` + dados do usuário) guardada em `localStorage` via um
`AuthContext` (`front/src/lib/auth.tsx`), lido no fetch wrapper
(`front/src/lib/api.ts`) como header `Authorization: Bearer`.

**Isto é deliberadamente provisório**: o Auth.js real (ADR 0003 §3) ainda não
está implementado no front — hoje o único login que existe é o atalho de
desenvolvimento `POST /auth/dev-login` (e-mail sem senha, RN-02), que já
recusa a requisição em produção. Quando o Auth.js entrar, este mecanismo deve
virar sessão via cookie httpOnly emitido pelo servidor — `localStorage` é
vulnerável a XSS de um jeito que cookie httpOnly não é, e não deveria ser o
mecanismo definitivo de uma aplicação com dado real de empresas/financeiro.

### 2. Tela de login sem campo de senha

Consequência direta de RN-02 (login institucional/SSO, nunca senha própria do
sistema): a tela de login só pede e-mail. Isso já é compatível com o desenho
futuro do SSO — não é uma simplificação temporária que precisa ser desfeita
depois, é a forma correta mesmo quando o Auth.js entrar (a UI de senha nunca
deveria ter existido).

### 3. Identidade visual extraída do site institucional

Paleta de cores e tipografia de referência extraídas do CSS público de
`pollenparque.com.br` (tema WordPress: variáveis `--bs-primary`/`--bs-secondary`
etc.) — preto como cor primária, verde-limão (`#cfff92`) como accent de marca,
`border-radius: 0.8rem` como raio padrão. As fontes de marca (Helvetica Now
Text / Praktika Rounded) são comerciais e hospedadas no domínio deles — usamos
Inter/Baloo 2 (Google Fonts) como equivalentes livres. O wordmark "Pollen" com
o "P" maiúsculo e o "o" substituído por um círculo em gradiente verde
(`front/src/components/PollenLogo.tsx`) é uma reconstrução aproximada em CSS a
partir de uma captura de tela do logo oficial — **não é o arquivo de marca
real**; se/quando o SVG/PNG oficial for disponibilizado, deve substituir essa
reconstrução.

### 4. Padrão de tela: `useApiResource` + tabela + form inline expansível

Toda tela de listagem usa o hook `useApiResource` (`front/src/lib/useApiResource.ts`),
que centraliza fetch-ao-montar, uso do token da sessão, redirecionamento pro
login em 401, e um `recarregar()` para invalidar após mutação. Edição de um
registro em tabela expande uma `<tr>` de formulário logo abaixo da linha (não
modal, não navegação para outra rota) — mesmo padrão em Empresas, Prospecção,
Contratos, Documentos, Planos, Usuários.

### 5. Sem endpoint de leitura para algumas tabelas de referência

`status_contrato`/`status_financeiro`/`status_prospeccao` (antes desta etapa)
não tinham rota `GET` própria — o front nunca tinha precisado montar um
seletor a partir delas. Onde isso importava para uma tela (ex.: mostrar
"Vencido"/"Em dia" em Contratos), o front usa os campos virtuais já expostos
pelo model (`estaVencido`/`estaProximoVencimento`) em vez do `status_*_id`
cru. Nomes de empresa em telas que só retornam `empresa_id` (Contratos,
Documentos, Financeiro) são resolvidos no front cruzando com a lista já
carregada de `GET /empresas`, em vez de pedir um `include` novo no back.

## Consequências

- Qualquer nova tela de listagem para outro ator deve seguir o mesmo padrão
  (`useApiResource`, tokens de design em `globals.css`, componentes
  compartilhados em `front/src/components/`).
- A troca de `localStorage` por sessão httpOnly quando o Auth.js for
  implementado é trabalho pendente, não coberto por esta ADR.
- O wordmark do Pollen deve ser substituído pelo arquivo oficial assim que
  disponível.
