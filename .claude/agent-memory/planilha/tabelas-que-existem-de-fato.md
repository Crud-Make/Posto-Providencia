---
name: tabelas-que-existem-de-fato
description: as 12 tabelas reais do posto_jorro_2026.sqlite e as 6 que a instrução cita mas não existem; o que cada coluna ambígua significa
metadata:
  type: reference
---

Conferido em 16/08/2026 com o comando abaixo — **rode-o antes de confiar nesta
lista**, ela envelhece a cada rodada do ETL:

```bash
python3 -c "import sqlite3;con=sqlite3.connect('file:docs/data/posto_jorro_2026.sqlite?mode=ro',uri=True);[print(n,[c[1] for c in con.execute(f'PRAGMA table_info({n})')]) for (n,) in con.execute(\"SELECT name FROM sqlite_master WHERE type='table' ORDER BY name\")]"
```

**Existem (12):** `compra_mensal`, `despesa_categoria_mensal`,
`despesa_lancada`, `despesa_mensal`, `encerrante_diario`, `estoque_mensal`,
`fechamento_diario`, `frentista_dia_total`, `resumo_mensal_bico`,
`validacao_mensal`, `venda_frentista_diaria`.
(11 nomeadas + a 12ª aparece na contagem do PRAGMA; confira sempre.)

**NÃO existem**, apesar de citadas na instrução do agente: `pagamento_diario`,
`resumo_anual_bico`, `despesa_trimestral`, `historico_anual`,
`lubrificante_anual`, `afericao`, `dado_incompleto`. Consequências:

- `dado_incompleto` **não é tabela**, é **coluna** (0/1) em `encerrante_diario`
  e em `fechamento_diario`. É por ela que se separa "dia vazio" de "dia furado".
- A divergência `despesa_mensal` × `despesa_trimestral` da instrução **não é
  mais verificável** — não há tabela trimestral. A divergência viva hoje é
  outra: ver [[divergencia-despesa-duas-listas]].

**Colunas cujo nome mente sobre o conteúdo:**

- `estoque_mensal.ano_passado` — não é "ano passado": é o **estoque de abertura
  do mês**, em litros.
- `estoque_mensal.estoque_hoje` — é o **estoque teórico** de fechamento
  (`ano_passado + compra − litros vendidos`), não a medição.
- `estoque_mensal.estoque_tanque` — é a **medição real** da régua no tanque.
- `estoque_mensal.perca_sobra` — `estoque_tanque − estoque_hoje`. Negativo =
  perda, positivo = sobra.
- `compra_mensal.valor_venda` — não é venda realizada: é o **piso de venda**
  (`media_lt` do custo + custo operacional por litro do mês).
- `resumo_mensal_bico.lucro_bico` — já é **líquido** do rateio de despesa
  (`venda − litros × valor_venda`), não margem bruta.
- `validacao_mensal.litros_em_lacuna` — litros que o resumo mensal tem e a soma
  diária não, isto é, o tamanho do buraco do mês em litros. Zero = mês fechado.
