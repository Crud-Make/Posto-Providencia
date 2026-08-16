---
name: fixture-lucro-custo-mes01
description: o custo operacional por litro do mês 01 só existe no fixture JSON, em nenhuma tabela — é a única fonte com esse agregado já calculado
metadata:
  type: reference
---

`docs/data/fixture_lucro_custo_mes01.json` é a **única** fonte na máquina que
traz o **custo operacional por litro** já calculado (chave
`mes_01_despesa_operacional_por_litro_rs`), além de `mes_01_total`
(litros/venda/lucro) e do cruzamento compra × custo × estoque.

**Por que importa:** nenhuma das 12 tabelas guarda esse número. Sem o fixture, a
resposta correta para "qual o custo por litro" é devolver os **inputs** e a
fórmula (CLAUDE.md §6: despesas reais do mês ÷ litros vendidos no mês), nunca a
divisão feita de cabeça. Com o fixture, existe procedência para o mês 01 — e só
para ele.

Confere com `compra_mensal.valor_venda`: o piso de venda de cada produto é
`media_lt + esse custo por litro`. E com `resumo_mensal_bico.lucro_bico`, que é
`venda − litros × valor_venda`. Ou seja, o custo por litro do fixture é o mesmo
que o ETL usou para gerar as duas colunas — não é um número solto.

**Margem bruta não existe em lugar nenhum**: nem tabela, nem fixture. É venda
menos custo de compra, e o `lucro_bico` já vem líquido do rateio. Marcar como
ausente e devolver os inputs.

Leitura (16/08/2026):

```bash
python3 -c "import json;print(json.load(open('docs/data/fixture_lucro_custo_mes01.json')))"
```

Ver [[tabelas-que-existem-de-fato]] e [[divergencia-despesa-duas-listas]] — o
fixture usou a lista da planilha como divisor, não a `despesa_lancada`.
