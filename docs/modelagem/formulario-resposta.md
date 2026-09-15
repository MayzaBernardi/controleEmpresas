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
| `empresa_id` | UUID (FK → `empresas.id`, `ON DELETE SET NULL`) | não | `null` até a equipe do programa triar a submissão e criar/vincular o cadastro. |
| `email_contato` | STRING(255) | sim | E-mail informado no formulário. |
| `payload_respostas` | JSONB | sim | Corpo bruto das respostas do formulário — schema do formulário em si não é fixo no banco. |
| `status_triagem` | STRING(50) | sim | Default `aguardando`; usado como `triado` no seed. |
| `observacoes_triagem` | TEXT | não | Anotação da equipe do programa durante a triagem. |
| `created_at` / `updated_at` | TIMESTAMP | sim (auto) | |

## Relacionamentos

- `belongsTo` → `Empresa` (`empresa_id`, opcional).

## Regras de negócio aplicadas

- **RN-04**: o processo de afiliação só é considerado formalmente iniciado quando a empresa preenche este formulário — é o ponto de entrada que grava direto no banco, substituindo o formulário externo.

## Notas

- `payload_respostas` é armazenado como JSONB propositalmente: o schema do formulário do edital pode variar entre editais/anos, e travar essas colunas exigiria migrations a cada mudança de formulário — inaceitável para o ritmo de iteração de um protótipo semanal.
