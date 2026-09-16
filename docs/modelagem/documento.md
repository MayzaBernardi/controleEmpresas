# Documento

Tabela: `documentos` · Model: [`Documento`](../../back/src/models/Documento.js) ·
Migration: [`20260915000008-create-documentos.js`](../../back/src/migrations/20260915000008-create-documentos.js)

Upload de documento de uma empresa, exigido pelo edital de afiliação
(RF-05), substituindo a troca por e-mail com a caixa NIT01.

## Campos

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | BIGINT (autoincrement) | sim (gerado) | PK. |
| `empresa_id` | UUID (FK → `empresas.id`, `ON DELETE CASCADE`) | sim | |
| `contrato_id` | UUID (FK → `contratos.id`, `ON DELETE SET NULL`) | não | Documento pode existir antes de haver contrato (ex.: cadastro inicial). |
| `tipo_documento` | ENUM(`estatuto_social`, `cnpj`, `certidao_negativa`, `procuracao`, `comprovante_endereco`, `minuta_contrato`, `outro`) | sim | |
| `nome_arquivo` | STRING(500) | sim | |
| `url_arquivo` | STRING(1000) | não | **Opcional desde 2026-09-16 (ADR 0007 §2)**: URL externa do arquivo. Um documento precisa ter `url_arquivo` OU `arquivo_base64` — nunca os dois obrigatórios juntos (validado no service, não no model). |
| `arquivo_mimetype` | STRING(150) | não | Ex.: `application/pdf`. ADR 0007 §2. |
| `arquivo_base64` | TEXT | não | Conteúdo do arquivo (PNG/PDF) em base64, direto no Postgres — sem storage externo. RN-38/ADR 0007 §2. |
| `status` | ENUM(`pendente`, `aprovado`, `rejeitado`) | sim | Default `pendente`. |
| `observacoes` | TEXT | não | |
| `ativo` | BOOLEAN | sim | Default `true`. Excluir é soft-delete (RN-37/ADR 0007). |
| `created_at` / `updated_at` | TIMESTAMP | sim (auto) | |

## Relacionamentos

- `belongsTo` → `Empresa` (`empresa_id`), `Contrato` (`contrato_id`, opcional).

## Regras de negócio aplicadas

- **RN-14**: documentos exigidos pelo edital devem ficar vinculados à empresa.
- **RN-15** (⚠️ pendência aberta): a lista de documentos obrigatórios por tipo de edital ainda não é um checklist formal — `tipo_documento` cobre os tipos conhecidos hoje, mas a obrigatoriedade por edital não é modelada nesta etapa.
- **RN-33** (scope nomeado `paraEmpresa(empresaId)`, `where` embrulhado em `Op.and` para permanecer seguro mesmo com `findByPk` — ver nota completa em [`empresa.md`](./empresa.md)).
- **RN-37** (ADR 0007): `ativo = false` é a única forma de "excluir" — nunca `DELETE`.
- **RN-38** (ADR 0007 §2): upload de arquivo (PNG/PDF) em base64, alternativo à URL externa.
