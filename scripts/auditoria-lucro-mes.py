#!/usr/bin/env python3
"""
Audita o lucro de um mês contra a planilha e emite o SQL que preenche as
colunas de lucro da tabela `Fechamento` em produção.

POR QUE ESTE SCRIPT EXISTE: `apps/web/src/services/api/fechamento.service.ts`
lê `custo_combustiveis`, `lucro_bruto` e `lucro_liquido` como COLUNAS GRAVADAS
de `Fechamento` — não recalcula na leitura. Carregar o fechamento sem elas faz
o painel exibir lucro R$ 0,00.

A DIVERGÊNCIA QUE ELE MEDE: a planilha declara lucro usando um custo por litro
fixo (`compra_mensal.valor_venda`), que é `media_lt + 0,473` — o MESMO acréscimo
de 0,473 nos 4 combustíveis. Isso é custo operacional hardcoded, o que o §6 do
CLAUDE.md proíbe: o rateio tem de ser despesa real do mês ÷ litros do mês.

Este script calcula os dois e mostra a diferença, mas grava o CANÔNICO
(packages/utils/src/lucro.ts):

    lucro = receita − litros × (custo_medio_compra + despesa_operacional_litro)
    despesa_operacional_litro = despesas do mês ÷ litros do mês

NÃO ESCREVE NO BANCO. Emite SQL para ser aplicado conscientemente.

Uso:
    python3 scripts/auditoria-lucro-mes.py <mes>          # audita
    python3 scripts/auditoria-lucro-mes.py <mes> --sql    # emite o UPDATE
"""
import calendar
import sqlite3
import sys

BANCO = 'docs/data/posto_jorro_2026.sqlite'
ANO = 2026
POSTO_ID = 1

# Produto da planilha -> combustivel_id em produção.
PRODUTOS = {'G,Comum.': 1, 'G,Aditivada.': 2, 'Etanol.': 3, 'Ds.10.': 4}

# Rótulo do bico na planilha -> combustivel_id (mesmo mapa da carga de Leitura).
BICOS = {
    'G,C. Bico 01': 1, 'G,A.Bico 02': 2, 'Etanol,Bico 03': 3,
    'DS:.10,Bico 04': 4, 'G,C, Bico 05': 1, 'G,C. Bico 06': 1,
}


def erro(msg):
    print(f'ABORTADO: {msg}', file=sys.stderr)
    sys.exit(1)


def auditar(mes):
    cur = sqlite3.connect(BANCO).cursor()
    dias_reais = calendar.monthrange(ANO, mes)[1]

    # Custo médio de AQUISIÇÃO por combustível (compra_rs / compra_lt).
    custo_medio, custo_planilha = {}, {}
    for produto, media_lt, valor_venda in cur.execute(
        'SELECT produto, media_lt, valor_venda FROM compra_mensal WHERE ano=? AND mes=?',
        (ANO, mes)
    ):
        if produto not in PRODUTOS:
            erro(f'produto sem mapeamento: {produto!r}')
        custo_medio[PRODUTOS[produto]] = media_lt
        custo_planilha[PRODUTOS[produto]] = valor_venda
    if not custo_medio:
        erro(f'compra_mensal não tem o mês {mes}')

    # Despesa do mês — fonte trimestral, excluindo a linha de total.
    despesas = cur.execute(
        """SELECT ROUND(SUM(valor),2) FROM despesa_trimestral
           WHERE ano=? AND mes=? AND categoria<>'__TOTAL__'""", (ANO, mes)
    ).fetchone()[0]
    if not despesas:
        erro(f'sem despesa lançada para o mês {mes} — o rateio ficaria zerado')

    # Venda e litros por dia e por combustível, do encerrante já validado.
    linhas = cur.execute(
        """SELECT dia, bico, litros, venda_bico FROM encerrante_diario
           WHERE ano=? AND mes=? AND dado_incompleto=0 AND dia<=? AND litros IS NOT NULL""",
        (ANO, mes, dias_reais)
    ).fetchall()

    litros_mes = round(sum(l for _, _, l, _ in linhas), 3)
    if litros_mes <= 0:
        erro('litros do mês zerados')
    despesa_litro = despesas / litros_mes

    dias = {}
    for dia, bico, litros, venda in linhas:
        if bico not in BICOS:
            erro(f'bico sem mapeamento: {bico!r}')
        comb = BICOS[bico]
        if comb not in custo_medio:
            erro(f'combustível {comb} sem custo em compra_mensal do mês {mes}')
        d = dias.setdefault(dia, {'receita': 0.0, 'litros': 0.0,
                                  'custo': 0.0, 'custo_planilha': 0.0})
        d['receita'] += venda or 0.0
        d['litros'] += litros
        d['custo'] += litros * custo_medio[comb]
        d['custo_planilha'] += litros * custo_planilha[comb]

    total = {'receita': 0.0, 'litros': 0.0, 'custo': 0.0, 'custo_planilha': 0.0}
    saida = []
    for dia in sorted(dias):
        d = dias[dia]
        custo_comb = round(d['custo'], 2)
        receita = round(d['receita'], 2)
        rateio = round(d['litros'] * despesa_litro, 2)
        lucro_bruto = round(receita - custo_comb, 2)
        lucro_liquido = round(lucro_bruto - rateio, 2)
        saida.append({
            'data': f'{ANO}-{mes:02d}-{dia:02d}T00:00:00+00',
            'custo_combustiveis': custo_comb,
            'lucro_bruto': lucro_bruto,
            'despesa_rateada': rateio,
            'lucro_liquido': lucro_liquido,
            'margem_bruta': round(lucro_bruto / receita * 100, 4) if receita else 0.0,
            'margem_liquida': round(lucro_liquido / receita * 100, 4) if receita else 0.0,
        })
        for k in total:
            total[k] += d[k]

    receita_mes = round(total['receita'], 2)
    custo_mes = round(total['custo'], 2)
    lucro_canonico = round(receita_mes - custo_mes - despesas, 2)
    # O mesmo lucro pelo modelo da planilha: custo fixo por litro, despesa não
    # rateada (ela já está embutida no acréscimo fixo).
    lucro_planilha = round(receita_mes - round(total['custo_planilha'], 2), 2)

    declarado = cur.execute(
        'SELECT ROUND(SUM(lucro_bico),2) FROM resumo_mensal_bico WHERE ano=? AND mes=?',
        (ANO, mes)
    ).fetchone()[0]

    return saida, {
        'mes': mes, 'receita': receita_mes, 'litros': litros_mes,
        'custo_aquisicao': custo_mes, 'despesas': despesas,
        'despesa_litro': despesa_litro,
        'acrescimo_fixo_planilha': round(
            (round(total['custo_planilha'], 2) - custo_mes) / litros_mes, 4),
        'lucro_canonico': lucro_canonico,
        'lucro_modelo_planilha': lucro_planilha,
        'lucro_declarado': declarado,
    }


def sql(saida):
    valores = ',\n  '.join(
        f"('{r['data']}',{r['custo_combustiveis']:.2f},{r['lucro_bruto']:.2f},"
        f"{r['lucro_liquido']:.2f},{r['margem_bruta']:.4f},{r['margem_liquida']:.4f})"
        for r in saida
    )
    return (
        'UPDATE "Fechamento" f SET\n'
        '  custo_combustiveis = v.custo_combustiveis,\n'
        '  lucro_bruto = v.lucro_bruto,\n'
        '  lucro_liquido = v.lucro_liquido,\n'
        '  margem_bruta_percentual = v.margem_bruta,\n'
        '  margem_liquida_percentual = v.margem_liquida\n'
        f'FROM (VALUES\n  {valores}\n'
        ') AS v(data,custo_combustiveis,lucro_bruto,lucro_liquido,margem_bruta,margem_liquida)\n'
        f'WHERE f.data = v.data::timestamptz AND f.posto_id = {POSTO_ID};'
    )


if __name__ == '__main__':
    if len(sys.argv) < 2:
        erro('informe o mês (1-12)')
    mes = int(sys.argv[1])
    saida, r = auditar(mes)

    if '--sql' in sys.argv:
        print(sql(saida))
    else:
        print(f"AUDITORIA DE LUCRO — {r['mes']:02d}/{ANO}\n")
        print(f"  receita (encerrantes) ........ {r['receita']:>12,.2f}")
        print(f"  litros vendidos .............. {r['litros']:>12,.3f}")
        print(f"  custo de aquisição ........... {r['custo_aquisicao']:>12,.2f}")
        print(f"  despesas do mês .............. {r['despesas']:>12,.2f}")
        print(f"  despesa operacional por litro  {r['despesa_litro']:>12,.4f}  (real)")
        print(f"  acréscimo fixo da planilha ... {r['acrescimo_fixo_planilha']:>12,.4f}  "
              f"(hardcoded)\n")
        print(f"  LUCRO canônico (§6) .......... {r['lucro_canonico']:>12,.2f}  "
              f"margem {r['lucro_canonico'] / r['receita'] * 100:.2f}%")
        print(f"  lucro pelo modelo da planilha  {r['lucro_modelo_planilha']:>12,.2f}  "
              f"margem {r['lucro_modelo_planilha'] / r['receita'] * 100:.2f}%")
        print(f"  lucro DECLARADO na planilha .. {r['lucro_declarado']:>12,.2f}")
        print(f"\n  superestimativa da planilha .. "
              f"{r['lucro_declarado'] - r['lucro_canonico']:>12,.2f}  "
              f"({(r['lucro_declarado'] / r['lucro_canonico'] - 1) * 100:+.1f}%)")
        print(f"  dias com lucro gravado ....... {len(saida)}")
