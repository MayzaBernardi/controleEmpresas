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
| `url_arquivo` | STRING(1000) | sim | Local de armazenamento do arquivo (fora do escopo desta modelagem — apenas a referência é persistida). |
| `status` | ENUM(`pendente`, `aprovado`, `rejeitado`) | sim | Default `pendente`. |
| `observacoes` | TEXT | não | |
| `created_at` / `updated_at` | TIMESTAMP | sim (auto) | |

## Relacionamentos

- `belongsTo` → `Empresa` (`empresa_id`), `Contrato` (`contrato_id`, opcional).

## Regras de negócio aplicadas

- **RN-14**: documentos exigidos pelo edital devem ficar vinculados à empresa.
- **RN-15** (⚠️ pendência aberta): a lista de documentos obrigatórios por tipo de edital ainda não é um checklist formal — `tipo_documento` cobre os tipos conhecidos hoje, mas a obrigatoriedade por edital não é modelada nesta etapa.
- **RN-33** (scope nomeado `paraEmpresa(empresaId)`, `where` embrulhado em `Op.and` para permanecer seguro mesmo com `findByPk` — ver nota completa em [`empresa.md`](./empresa.md)).
