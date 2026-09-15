# Reserva de Espaço

Tabela: `reservas_espaco` · Model: [`ReservaEspaco`](../../back/src/models/ReservaEspaco.js) ·
Migration: [`20260915020008-create-reservas-espaco.js`](../../back/src/migrations/20260915020008-create-reservas-espaco.js) ·
Backfill: [`20260915020012-backfill-reservas-espaco.js`](../../back/src/migrations/20260915020012-backfill-reservas-espaco.js) ·
ADR: [`0005-mapeamento-planilha-legado.md`](../decisoes/0005-mapeamento-planilha-legado.md) §6

Registro individual de reserva de um espaço compartilhado do Pollen Parque
(sala do ático, auditório, coworking), com limite anual por tipo (RN-35).
**Não é uma evolução de `espacos_fisicos`** — são conceitos diferentes, ver
Notas abaixo.

## Campos

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | BIGINT (autoincrement) | sim (gerado) | PK. |
| `empresa_id` | UUID (FK → `empresas.id`, `ON DELETE CASCADE`) | sim | |
| `tipo_espaco` | ENUM(`sala_atico`, `auditorio`, `coworking`) | sim | |
| `data_reserva` | DATEONLY | não | Nullable — nem toda reserva (sobretudo as migradas do legado) tem data conhecida; nunca é inventada. |
| `status` | ENUM(`pre_reservado`, `confirmado`, `realizado`, `cancelado`) | sim | Default `pre_reservado`. |
| `observacoes` | TEXT | não | Linhas geradas pelo backfill trazem o marcador `[backfill-adr0005]` — ver Notas. |
| `created_at` / `updated_at` | TIMESTAMP | sim (auto) | |

## Relacionamentos

- `belongsTo` → `Empresa` (`empresa_id`).

## Regras de negócio aplicadas

- **RN-35** (validado em **service**, `back/src/services/reservaEspacoService.js`, não em hook de model): limite anual por tipo de espaço — `sala_atico` e `auditorio`: 1×/ano; `coworking`: 12×/ano. Conta apenas reservas com `status != 'cancelado'`, no ano de `data_reserva` (ou no ano corrente, se a reserva ainda não tem data). O service recusa a criação com mensagem clara se o limite já foi atingido — nunca falha silenciosamente nem ultrapassa o limite.
- **RN-33** (scope nomeado `paraEmpresa(empresaId)`, extensão do padrão de isolamento por perfil a esta nova entidade ligada a empresa).

## Notas

- **`espacos_fisicos` (ADR 0004) continua intacta e sem uso em código
  novo** — ela modela a ocupação de sala fixa e contínua de uma empresa
  (ex.: "Sala 12, Bloco A" por meses/anos), um conceito diferente de
  reserva pontual e recorrente de espaço compartilhado.
- **Backfill (ADR 0005 §6)**: a migration de dados tentou classificar cada
  linha existente de `espacos_fisicos` em um `tipo_espaco`, por
  correspondência de palavra-chave em `identificador_sala`/`bloco`
  ("ático"/"atico" → `sala_atico`; "auditorio"/"auditório" → `auditorio`;
  "coworking" → `coworking`). Quando uma linha migrou com sucesso, a data
  de `data_inicio_ocupacao` (já existente, não inventada) foi reaproveitada
  como `data_reserva`, com `status = 'confirmado'` e `observacoes` marcada
  com `[backfill-adr0005] origem: espacos_fisicos.id=<id>` (usado pelo
  `down()` da migration para reverter só o que ela mesma criou). Linhas sem
  correspondência de palavra-chave **não geraram reserva** — ficaram
  listadas em
  [`../revisao-manual/reservas-espaco-nao-mapeado.md`](../revisao-manual/reservas-espaco-nao-mapeado.md)
  para classificação manual.
