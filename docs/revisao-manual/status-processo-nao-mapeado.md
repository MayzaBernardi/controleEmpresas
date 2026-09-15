# Empresas sem mapeamento automático de status_processo_id

Gerado pela migration `20260915020011-backfill-empresas-status-processo.js` em 2026-09-15T20:54:58.550Z.

Estas empresas mantiveram `status_processo_id = NULL` porque o texto livre em
`status_processo` não bateu (comparação exata, case-insensitive) com nenhum dos
padrões conhecidos do mapeamento legado (ver ADR 0005 §4). Revise manualmente e
faça o UPDATE direto no banco, ou peça para o mapeamento ser ampliado com o texto
exato encontrado abaixo — nenhum valor foi adivinhado.

| id | razao_social | status_processo (texto legado) |
|---|---|---|
| f5f1d249-a5ac-4708-bb9b-682bdc788685 | Cedro Biociências Ltda | inscricao_pendente |
| 18ac85d1-3040-473b-b042-3f8fe6f5ca6c | Girassol EdTech Ltda | inscricao_pendente |
| fcea3f5a-4794-41eb-b418-adfcd107d494 | Nortis Automação Industrial Ltda | contrato_elaboracao |
| 749c517e-df06-4841-b1c5-eb619f0d2cee | Vetor Quântico Software Ltda | contrato_elaboracao |
| 6ffb473d-8ee3-4a73-bdfa-6861d04ac161 | Prisma Agroanalytics Ltda | aguardando_assinatura |
| 0cd9a9cb-b7c3-43e7-9756-d50731b7c1b6 | Zenith Materiais Avançados Ltda | aguardando_assinatura |
| b0cb1481-5016-4bdf-b1cb-51068bfb276b | Alfa Biotecnologia Ltda | ativa |
| 20fc35d5-ec4e-4102-8c0a-36bd57cd10cd | Órbita Sistemas Embarcados Ltda | ativa |
| ae0fb8c8-98a9-4ca6-88eb-493cfd41c5e2 | Helix Genomics International Inc. | ativa |
| c5f4cdfb-243a-48fd-a932-57536ceeadd4 | Kaizen Manufatura de Grande Porte Ltda | ativa |
| 49919b32-de07-449f-8ff1-72b2a75af9c8 | Latitude Robótica Ltda | ativa |
| 061d09fd-708e-4596-9e04-cd9e459f7031 | Solstício Nanotecnologia Ltda | ativa |
| f278ccf7-0802-4198-8353-3658e0410fee | Aurora Ópticas de Precisão Ltda | ativa |
| f3334acb-f960-454b-af7f-64d8c1cca471 | Meridiano Ciência de Dados Ltda | ativa |
| f3946729-d09b-48c5-a19f-063881aaa223 | Ventus Energias Renováveis Ltda | encerrada |
