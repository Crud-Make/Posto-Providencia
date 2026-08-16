---
name: encerrante-nao-tem-turno
description: A Leitura é por DIA e por BICO, nunca por turno — o dono repetiu isso três vezes e o código insistia em filtrar por turno_id
metadata:
  type: feedback
---

O encerrante **não tem turno**. Uma leitura por bico por dia, e ponto. O dono
disse isso em 16/08/2026 três vezes, a última já irritado ("já falei 1000 vezes
que não tem turno") — porque eu continuei perguntando depois de ele já ter
respondido.

**Por quê:** o banco concorda com ele e sempre concordou. O índice único de
produção é `leitura_unica_bico_data (bico_id, data)`, sem turno. A tabela
`Leitura` também não tem coluna de frentista (foi o que o commit `635a6f2` já
tinha constatado). Quem é por turno é o `Fechamento`, não a leitura da bomba.

**Como aplicar:** nunca filtre `Leitura` por `turno_id` — nem em DELETE, nem em
conferência, nem ao ler para consolidar. Filtrar por turno em 16/08 produziu
três bugs de uma vez: `duplicate key` quando o painel (`turno_id: null`) e o app
do dono (`turno_id: 1`) tocavam o mesmo dia, uma guarda anti-RLS que não
enxergava a linha órfã, e — o pior, silencioso — encerrante do painel nunca
chegando a `Fechamento.total_vendas`.

E antes de perguntar de novo qualquer coisa sobre turno: a resposta já está
aqui. Ver [[app-do-dono-nasceu]].
