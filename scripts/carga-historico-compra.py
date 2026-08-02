#!/usr/bin/env python3
"""
Estágio 3 do ETL: leva `compra_mensal` (referência já validada) para a tabela
`Compra` de produção.

POR QUE ESTA CARGA EXISTE: `Combustivel.preco_custo` é um valor ÚNICO por
combustível, sem histórico — guarda o custo do último mês carregado. A RPC
`get_dashboard_proprietario` calculava o lucro com ele, aplicando o custo de
julho sobre as vendas de janeiro. `Compra` é a única fonte de custo por época,
e a migration `20260802_rpc_custo_historico` passa a lê-la.

QUAL CAMPO: `media_lt` (= `compra_rs / compra_lt`), o custo de AQUISIÇÃO puro.
NÃO `valor_venda`, que na planilha é `media_lt + despesa_do_mês ÷ litros` — esse
já embute a despesa, e o painel a desconta de novo em `montarResumoDoMes`. Usar
`valor_venda` aqui reproduziria a contagem dupla de 97,7% corrigida em 31/07.

⚠️ FRAGILIDADE HERDADA DA PLANILHA, consciente: o custo do mês vem só das
compras DAQUELE mês, sem ponderar o estoque que veio do mês anterior — a
planilha não valoriza estoque em reais, controla só em litros. Em fevereiro o
Diesel tem compra de 1 litro por R$ 5,00, e esse R$ 5,00/L passa a ser o custo
de ~1.768 L vendidos. O script AVISA nesse caso em vez de calar.

NÃO ESCREVE NO BANCO. Emite SQL idempotente.

Uso:
    python3 scripts/carga-historico-compra.py <mes>          # confere
    python3 scripts/carga-historico-compra.py <mes> --sql    # emite o SQL
"""
import calendar
import sqlite3
import sys

BANCO = 'docs/data/posto_jorro_2026.sqlite'
ANO = 2026
POSTO_ID, FORNECEDOR_ID = 1, 3

PRODUTOS = {'G,Comum.': 1, 'G,Aditivada.': 2, 'Etanol.': 3, 'Ds.10.': 4}

# Abaixo disto a compra do mês é pequena demais para representar o custo do que
# foi vendido — sinaliza, não bloqueia (o dado é o que a planilha tem).
LITROS_MINIMOS_CONFIAVEIS = 100.0


def erro(msg):
    print(f'ABORTADO: {msg}', file=sys.stderr)
    sys.exit(1)


def carregar(mes):
    cur = sqlite3.connect(BANCO).cursor()
    linhas = cur.execute(
        """SELECT produto, compra_lt, compra_rs, media_lt FROM compra_mensal
           WHERE ano=? AND mes=? ORDER BY produto""", (ANO, mes)
    ).fetchall()
    if not linhas:
        erro(f'compra_mensal não tem o mês {mes}')

    # Lançada no último dia do mês; a RPC casa por mês-calendário, não por dia.
    data = f'{ANO}-{mes:02d}-{calendar.monthrange(ANO, mes)[1]:02d}'

    # Litros VENDIDOS no mês, para dimensionar a fragilidade acima.
    vendidos = dict(cur.execute(
        """SELECT bico, SUM(litros) FROM encerrante_diario
           WHERE ano=? AND mes=? AND dado_incompleto=0 GROUP BY bico""", (ANO, mes)))
    BICO_COMB = {'G,C. Bico 01': 1, 'G,A.Bico 02': 2, 'Etanol,Bico 03': 3,
                 'DS:.10,Bico 04': 4, 'G,C, Bico 05': 1, 'G,C. Bico 06': 1}
    litros_por_comb = {}
    for bico, litros in vendidos.items():
        if bico in BICO_COMB:
            litros_por_comb[BICO_COMB[bico]] = litros_por_comb.get(BICO_COMB[bico], 0) + (litros or 0)

    itens, avisos = [], []
    for produto, compra_lt, compra_rs, media_lt in linhas:
        if produto not in PRODUTOS:
            erro(f'produto sem mapeamento: {produto!r}')
        comb = PRODUTOS[produto]
        if not compra_lt:
            erro(f'{produto}: compra de 0 litros, custo por litro indefinido')

        # Confere o custo contra a divisão crua — a referência não pode ter
        # `media_lt` que não seja `compra_rs / compra_lt`.
        derivado = round(compra_rs / compra_lt, 4)
        if abs(derivado - round(media_lt, 4)) > 0.0001:
            erro(f'{produto}: media_lt {media_lt} != compra_rs/compra_lt {derivado}')

        vendido = litros_por_comb.get(comb, 0)
        if compra_lt < LITROS_MINIMOS_CONFIAVEIS and vendido > compra_lt:
            avisos.append(
                f'{produto}: comprou {compra_lt:.0f} L mas vendeu {vendido:.0f} L — '
                f'o custo de R$ {derivado:.4f}/L vem de uma compra que não cobre o mês'
            )

        itens.append({'data': data, 'combustivel_id': comb, 'produto': produto,
                      'litros': compra_lt, 'total': compra_rs, 'custo': derivado})

    return itens, {'mes': mes, 'data': data, 'avisos': avisos,
                   'litros': round(sum(i['litros'] for i in itens), 2),
                   'total': round(sum(i['total'] for i in itens), 2)}


def sql(itens):
    valores = ',\n  '.join(
        f"('{i['data']}',{i['combustivel_id']},{i['litros']:.2f},{i['total']:.2f},{i['custo']:.4f})"
        for i in itens
    )
    return (
        'INSERT INTO "Compra" (data,combustivel_id,fornecedor_id,quantidade_litros,'
        'valor_total,custo_por_litro,observacoes,posto_id)\n'
        f'SELECT v.data::timestamptz,v.combustivel_id,{FORNECEDOR_ID},v.litros,v.total,v.custo,\n'
        "  'Consolidado mensal da planilha (compra_mensal) — ETL estágio 3',"
        f'{POSTO_ID}\n'
        f'FROM (VALUES\n  {valores}\n) AS v(data,combustivel_id,litros,total,custo)\n'
        'WHERE NOT EXISTS (SELECT 1 FROM "Compra" c\n'
        '  WHERE c.data=v.data::timestamptz AND c.combustivel_id=v.combustivel_id\n'
        f'    AND c.posto_id={POSTO_ID});'
    )


if __name__ == '__main__':
    if len(sys.argv) < 2:
        erro('informe o mês (1-12)')
    mes = int(sys.argv[1])
    itens, resumo = carregar(mes)

    if '--sql' in sys.argv:
        print(sql(itens))
    else:
        print(f"mês {resumo['mes']:02d} — lançamento em {resumo['data']}")
        print(f"  produtos .................. {len(itens)}")
        print(f"  litros comprados .......... {resumo['litros']}")
        print(f"  valor total ............... {resumo['total']}")
        for i in itens:
            print(f"    {i['produto']:16} {i['litros']:>9.0f} L  R$ {i['custo']:.4f}/L")
        if resumo['avisos']:
            print(f"\n  AVISOS ({len(resumo['avisos'])}):")
            for a in resumo['avisos']:
                print(f'    ⚠️  {a}')
