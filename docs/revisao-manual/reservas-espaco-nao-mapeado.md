# Ocupações de espacos_fisicos sem tipo_espaco identificável para reservas_espaco

Gerado pela migration `20260915020012-backfill-reservas-espaco.js` em 2026-09-15T20:54:58.562Z.

Estas linhas de `espacos_fisicos` NÃO geraram registro em `reservas_espaco` porque
`identificador_sala`/`bloco` não continham nenhuma das palavras-chave conhecidas
("ático"/"atico", "auditorio"/"auditório", "coworking" — ver ADR 0005 §6). Nenhum
tipo_espaco foi adivinhado. Classifique manualmente e crie o registro em
`reservas_espaco` você mesmo, se fizer sentido para o novo modelo.

| espacos_fisicos.id | empresa_id | identificador_sala | bloco | data_inicio_ocupacao |
|---|---|---|---|---|
| 1 | b0cb1481-5016-4bdf-b1cb-51068bfb276b | Sala 10 | Bloco A | 2026-03-19 |
| 2 | 20fc35d5-ec4e-4102-8c0a-36bd57cd10cd | Sala 11 | Bloco A | 2026-03-19 |
| 3 | ae0fb8c8-98a9-4ca6-88eb-493cfd41c5e2 | Sala 12 | Bloco A | 2026-03-19 |
| 4 | c5f4cdfb-243a-48fd-a932-57536ceeadd4 | Sala 13 | Bloco A | 2026-03-19 |
| 5 | 49919b32-de07-449f-8ff1-72b2a75af9c8 | Sala 20 | Bloco B | 2026-02-27 |
| 6 | 061d09fd-708e-4596-9e04-cd9e459f7031 | Sala 21 | Bloco B | 2026-02-27 |
| 7 | f278ccf7-0802-4198-8353-3658e0410fee | Sala 30 | Bloco C | 2025-10-20 |
| 8 | f3334acb-f960-454b-af7f-64d8c1cca471 | Sala 31 | Bloco C | 2025-10-20 |
| 9 | f3946729-d09b-48c5-a19f-063881aaa223 | Sala 40 | Bloco A | 2025-07-17 |
