---
name: estado-etl-estagio2
description: Estágio 2 do ETL e a baseline nova de golden master estão pendentes; o bloqueio é achar as duas listas de despesa na planilha
metadata: 
  node_type: memory
  type: project
  originSessionId: b0cf8b27-0b49-44da-a82c-3a0c96c8839f
  modified: 2026-08-07T11:08:14.355Z
---

Em 07/08/2026, na branch `feat/time-de-agentes` (nada commitado ainda):

**Pronto:** estágio 1 (`scripts/etl-estagio1-staging.py`) extrai os 7 meses e
concilia contra a aba `POSTO JORRO 2026`. Todos fecham; fevereiro fecha com a
janela dos dias 09–15 (9.134,560 L reais sem dia a que pertencer).

**Pendente:** estágio 2 (carga no sqlite) e a baseline nova. Decisão do dono: a
baseline nasce **marcada como não-validada**, porque vem de uma export de 07/08
e não da de 26/07 contra a qual janeiro foi conferido linha a linha.

**O nó a desatar — corrigido em 07/08/2026.** A versão anterior desta memória
dizia que as DUAS listas de despesa estavam fora da planilha. **Estava errado, e
o erro era meu, de busca:** o rótulo no painel é abreviado — `Desp,Mês.` — e a
varredura procurava a palavra "despesa" inteira.

Onde cada coisa está, conferido célula a célula na aba `POSTO JORRO 2026`:

- `despesa_categoria_mensal` → **existe**, linhas 258–285, categorias na coluna C
  (Frete, taxa de cartão, Contador, Sistema, Energia, IRPJ, CSLL, AVCB, Meio
  Ambiente, Alvará/IPTU, salários) × meses nas colunas D–O, total por categoria
  em P. A linha 286 fecha por mês, e os 7 meses somam **140.456,27 exato** — o
  mesmo número travado no spec.
- `despesa_mensal` → linha 286 (o total mensal daquela matriz).
- `compra_mensal` e `estoque_mensal` → **existem**, nos blocos "Compra" e
  "Estoque" de cada mês (a cada 31 linhas: 14, 45, 76…).
- custo histórico ano a ano → linha 292+, anos 2017 a 2026.
- `despesa_trimestral` (195.230,40) → **essa sim não está** em nenhuma das 12
  abas, nem o total nem os rótulos exclusivos dela (Embasa, extintor, Net, Luz,
  conserto de bomba). Veio de outra fonte.

Isso importa porque o `lucro-real.golden.spec.ts` registra decisão do dono de
31/07/2026: **a fonte de verdade do lucro real é a trimestral**, a maior. Usar a
mensal no lugar ignora 54.774,13 de despesa e superestima o lucro dos 7 meses em
~25%. Em 07/08 o dono mandou desconsiderar a trimestral por ora.

Contrato completo, lido dos 5 `*.golden.spec.ts`: `encerrante_diario`,
`resumo_mensal_bico`, `validacao_mensal`, `compra_mensal`, `despesa_mensal`,
`despesa_categoria_mensal`, `despesa_trimestral`, `estoque_mensal`, mais
`janeiro_referencia.sqlite` (`jan_frentista`, `jan_encerrante`) e
`docs/data/fixture_lucro_custo_mes01.json`.

Dois sinais de que a extração nova reproduz a antiga: soma dos 7 meses deu
283.506,342 contra os 283.506,34 travados no spec, e a lacuna de fevereiro deu
9.134,560 contra 9.134,563.

Escrever em `docs/data/` é negado pelo hook `protege-dados` — a criação dos
arquivos é feita à mão pelo dono. Fonte em [[planilha-fonte-onde-esta]].

**Existe um SEGUNDO ETL, em `~/Downloads` (visto em 07/08/2026):** `etl_jorro.py`
gera `jorro.db` num star schema (`dim_mes`, `dim_bico`, `dim_frentista`,
`dim_produto`, `dim_forma_pagto`, `fact_venda_bico`, `fact_venda_frentista`,
`fact_conferencia_dia`, `fact_frentista_mes`, `fact_pagamento`), 7 meses.
**Não é o `posto_jorro_2026.sqlite`**: nenhum nome de tabela do contrato dos
goldens aparece nele, então copiar/renomear não faz spec nenhum passar. Ele
também mistura extração com interpretação, o que a skill de ETL proíbe —
diferente do estágio 1 do repo, que só copia célula.

Ele também **não produz nenhuma tabela de despesa, compra ou estoque** — o único
campo com "despesa" no nome é `fact_pagamento.taxa_despesa`, que é taxa de meio
de pagamento. Cheguei a ler isso como corroboração de que as listas não existiam
na planilha; **não é**. O `etl_jorro.py` só varre as abas de mês e ignora a
`POSTO JORRO 2026`, que é justamente onde compra, estoque e despesa moram. Duas
buscas falhas não somam evidência: é a mesma falha duas vezes.
