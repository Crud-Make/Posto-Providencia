---
name: estado-etl-estagio2
description: O ETL fechou e foi promovido — estágios 1, 2 e o export de despesa rodam, docs/data/ está no disco e os 5 golden masters passam; nada pendente
metadata: 
  node_type: memory
  type: project
  originSessionId: b0cf8b27-0b49-44da-a82c-3a0c96c8839f
  modified: 2026-08-13T00:56:16.558Z
---

Estado em **12/08/2026**, branch `feat/etl-estagio2` (empurrada para o origin).

**O pipeline está completo e roda de ponta a ponta:**

```bash
python3 scripts/etl-estagio1-staging.py --xlsx ~/Downloads/"Posto,Jorro, 2026.xlsx" --saida docs/data-staging/estagio1
python3 scripts/etl-despesa-banco.py --saida docs/data-staging/estagio1
python3 scripts/etl-estagio2-carga.py --staging docs/data-staging/estagio1 --saida docs/data-staging/estagio2
```

Estágio 1 lê a planilha (blocos de dia + aba `POSTO JORRO 2026`); o export lê a
tabela `Despesa` do Supabase; o estágio 2 monta os três artefatos. **Cada fonte
no que ela é autoridade: planilha manda em venda e encerrante, banco manda em
despesa** — ver [[despesa-vem-do-banco]].

**A promoção foi feita** (conferido em 12/08/2026, fim do dia): `docs/data/`
está no disco com os três artefatos byte a byte idênticos aos do estágio 2, e os
goldens passam contra ela.

**Pendência achada em 12/08/2026 — o mês 07 aborta a carga de fechamento.**
`python3 scripts/carga-historico-fechamento.py 7` para com
`ABORTADO: frentista fora do cadastro: 'Posto - Jorro' (dia 1)`. Meses 01–06
carregam e reconciliam normalmente. Causa: a lista de rótulos ignorados do estágio 1
(`scripts/etl-estagio1-staging.py:268`) é `{"caixa", "%", "posto - p - jorro"}`, e o
mês 07 grafa **`Posto - Jorro`**, sem o `- P -`; `normaliza()` tira acento e
pontuação de borda, não colapsa o miolo. São 175 linhas em `venda_frentista_diaria`
e 25 em `frentista_dia_total`, R$ 162,99, todas em `Dinheiro`.

**O abort é o comportamento certo — o conserto óbvio é o errado.** Adicionar
`'Posto - Jorro'` ao dict `FRENTISTAS` de `carga-historico-fechamento.py:55-61`
faria R$ 162,99 virarem venda de um frentista inexistente em produção. Corrigir é na
linha 268 do estágio 1.

**A reconciliação do estágio 2 passa verde nessas linhas** e é estruturalmente
incapaz de ver o defeito: a linha "Venda Frentistas" da planilha também soma essa
coluna, então `venda_frentistas == Σ das formas` bate. Quem pegaria é uma asserção
de **domínio fechado de `frentista`** — que não existe: **nenhum dos 5 goldens toca
`fechamento_diario`, `frentista_dia_total` nem `venda_frentista_diaria`**.

O trio existe desde `da26b5b` e está populado (212 / 1.452 / 10.164 linhas). O
`CHANGELOG.md` afirmava a lacuna como aberta porque o commit que a fechou não
voltou para corrigir o texto — **a documentação sobreviveu à ferramenta, com o sinal
invertido**.

Promover é ato do dono por desenho — o hook `protege-dados` nega `cp`/`mv` para
`docs/data/` vindo de agente. Se um dia a pasta sumir de novo (já sumiu uma vez,
e como é gitignored o `git status` fica limpo enquanto os 5 goldens estouram),
quem repõe é o dono:

```bash
mkdir -p docs/data && cp docs/data-staging/estagio2/*.{sqlite,json} docs/data/
```

**Como conferir se está tudo de pé** (nunca confie na contagem escrita aqui —
ela envelhece; rode e compare):

```bash
bun run test:golden      # 393 pass, 0 fail em 12/08
bun run test             # 171 pass em 12/08
```

**Armadilhas já pagas, que não se redescobrem de graça:**

- O bloco `Posto Jorro, mês 0.` (L426 da aba de resumo) é RASCUNHO: repete os
  litros de janeiro com lucro inflado. Fica em `secoes_ignoradas`.
- Fronteira de seção vem de **toda** linha com rótulo na coluna B. Usar o rótulo
  de mês seguinte fazia o mês 07 engolir o bloco anual.
- `litros_em_lacuna` é **resíduo do mês** em mililitro inteiro, não soma de
  janelas — a diferença é de 3 mL e a tolerância do golden é 2 mL.
- Rótulo de bico diverge entre abas (`DS:.10` no dia, `Ds:.500` no resumo) e
  cada tabela carrega o da sua. Uniformizar quebra dois goldens de lados opostos.
- `Venda Concentrador` aparece junto das formas de pagamento em 116 dias e não é
  forma: é encerrante atribuído.

Fonte da planilha em [[planilha-fonte-onde-esta]].
