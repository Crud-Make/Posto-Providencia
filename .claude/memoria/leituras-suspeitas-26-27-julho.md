---
name: leituras-suspeitas-26-27-julho
description: 26 e 27/07 existem na tabela Leitura mas não na planilha; o 27 tem cara de dado de teste — em aberto desde 07/08/2026
metadata: 
  node_type: memory
  type: project
  originSessionId: 9d1acbdf-2ebc-40d5-b39f-0f78c0987ac6
  modified: 2026-08-07T11:06:02.069Z
---

Achado em 07/08/2026, durante a correção do bico 2 de agosto. **Não tocado ainda.**

As linhas de **26 e 27 de julho** na tabela `Leitura` (Supabase, produção) **não
existem na planilha do posto**. O dia 27 traz a sequência
`300 / 150 / 200 / 400 / 100 / 50` — números redondos demais para leitura de bomba:
cara de dado de teste que entrou em produção.

Decidir se apaga ou se a planilha é que está incompleta. **A planilha decide**
(CLAUDE.md §0.4), então a conferência vem antes de qualquer DELETE — e apagar
exige reabrir a janela de escrita, hoje fechada.

Verificar contra a fonte pelo agente `planilha`; ver [[planilha-fonte-onde-esta]].
Os timestamps são UTC: [[timestamps-leitura-em-utc]].
