# Formulário Resposta

Tabela: `formulario_respostas` · Model: [`FormularioResposta`](../../back/src/models/FormularioResposta.js) ·
Migration: [`20260915000004-create-formulario-respostas.js`](../../back/src/migrations/20260915000004-create-formulario-respostas.js)

Submissão bruta do formulário de inscrição (RF-01, RN-04), antes de virar
cadastro de empresa. Substitui o formulário externo + planilha do processo
atual.

## Campos

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | BIGINT (autoincrement) | sim (gerado) | PK. |
| `empresa_id` | UUID (FK → `empresas.id`, `ON DELETE SET NULL`) | não | `null` até a equipe usar a ação "Criar nova empresa" (RN-04-A, `POST /formulario-respostas/:id/criar-empresa`) — a única forma de preencher esta coluna hoje; recusa com `400` se já estiver preenchida. |
| `email_contato` | STRING(255) | sim | E-mail informado no formulário. |
| `payload_respostas` | JSONB | sim | Corpo bruto das respostas do formulário — schema do formulário em si não é fixo no banco. |
| `status_triagem` | STRING(50) | sim | Default `aguardando`. Só 2 valores usados: `aguardando` (Aguardando preenchimento) e `finalizado` (Finalizado) — simplificado em 2026-09-16 (RN-40/ADR 0007 §4; antes existia também `triado`). Continua `STRING` livre, sem tabela de referência. |
| `observacoes_triagem` | TEXT | não | Anotação da equipe do programa durante a triagem. |
| `created_at` / `updated_at` | TIMESTAMP | sim (auto) | |

## Relacionamentos

- `belongsTo` → `Empresa` (`empresa_id`, opcional).

## Regras de negócio aplicadas

- **RN-04**: o processo de afiliação só é considerado formalmente iniciado quando a empresa preenche este formulário — é o ponto de entrada que grava direto no banco, substituindo o formulário externo.
- **RN-04-A** (2026-09-17): `formularioService.criarEmpresa` cria o cadastro de `Empresa` a partir de `payload_respostas` (editável antes de confirmar, num pop-up no front) reaproveitando `empresasService.criar` (herda RN-32), e só então preenche `empresa_id`. Antes desta regra, a coluna existia mas nada a preenchia.
- **RN-40** (ADR 0007 §4, atualizada 2026-09-17): `status_triagem` simplificado para 2 valores. `formularioService.listar` tira um formulário da listagem de triagem em dois casos, o primeiro incondicional: (1) `empresa_id` preenchido (RN-04-A) — uma vez virado cadastro de Empresa, sai de Triagem na hora, tenha contrato ou não; (2) sem `empresa_id` ainda, mas o CNPJ de `payload_respostas` já corresponde a uma empresa (outra) com contrato ativo (vigente, não vencido) — cobre o caso de a empresa ter sido cadastrada/contratada por fora da ação RN-04-A.
- ⚠️ **RN-41** (ADR 0007 §4): existe uma versão pública desta submissão (`/inscricao` no front, sem autenticação) com aba de benefícios — conteúdo da aba ainda genérico/provisório, pendente do material oficial.

## Notas

- `payload_respostas` é armazenado como JSONB propositalmente: o schema do formulário do edital pode variar entre editais/anos, e travar essas colunas exigiria migrations a cada mudança de formulário — inaceitável para o ritmo de iteração de um protótipo semanal.
