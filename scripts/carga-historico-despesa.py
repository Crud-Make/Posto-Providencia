#!/usr/bin/env python3
"""
Estágio 3 do ETL: leva a despesa do mês (referência já validada) para a tabela
`Despesa` de produção.

⚠️ DUAS FONTES QUE DISCORDAM — leia antes de mudar o padrão.

A referência tem duas listas de despesa para o mesmo mês, e elas NÃO batem:

  `despesa_categoria_mensal`  itens da planilha        jan/2026: R$ 22.158,46
  `despesa_lancada`           export da tabela do app  jan/2026: R$ 35.523,58

A da planilha é a que faz o `lucro_bico` da própria planilha fechar — é o total
que o golden `planilha-mensal.golden.spec.ts` reproduz. A do app é MAIS COMPLETA:
inclui gastos reais que a planilha não registra (Bombeiro AVCB, conserto de
bomba, extintor, Luz, Net, Embasa). Pelo §6 do CLAUDE.md — *toda despesa do posto
entra no rateio, sem exceção* — a lista do app é a autoridade, e a planilha
subregistra em R$ 13.365,12 só em janeiro.

Escolher uma muda o custo do litro e, por consequência, o lucro de TODO produto:

    planilha : 22.158,46 ÷ 46.843,062 = R$ 0,4730/L
    app      : 35.523,58 ÷ 46.843,062 = R$ 0,7583/L

Por isso a fonte é argumento OBRIGATÓRIO, sem padrão: escolher calado por alguém
é exatamente o erro que a skill etl-planilha-posto-providencia manda evitar.

A linha `Total.` de `despesa_categoria_mensal` é EXCLUÍDA: ela é o total, não um
item. Somá-la junto dobraria o mês (44.316,92 = 2 × 22.158,46) — verificado.

NÃO ESCREVE NO BANCO. Emite SQL idempotente (apaga o mês e regrava, para o total
nunca somar duas cargas).

Uso:
    python3 scripts/carga-historico-despesa.py <mes> --fonte planilha|app
    python3 scripts/carga-historico-despesa.py <mes> --fonte planilha --sql
"""
import calendar
import sqlite3
import sys
from datetime import date

BANCO = 'docs/data/posto_jorro_2026.sqlite'
ANO = 2026
POSTO_ID = 1

# A linha de total da matriz de categorias — nunca é um item.
ROTULO_TOTAL = 'Total.'


def erro(msg):
    print(f'ABORTADO: {msg}', file=sys.stderr)
    sys.exit(1)


def escapar(texto):
    return str(texto).replace("'", "''")


def carregar(mes, fonte):
    cur = sqlite3.connect(BANCO).cursor()

    if fonte == 'planilha':
        linhas = cur.execute(
            """SELECT categoria, valor FROM despesa_categoria_mensal
                WHERE ano=? AND mes=? AND categoria<>? AND valor<>0
                ORDER BY valor DESC""",
            (ANO, mes, ROTULO_TOTAL),
        ).fetchall()
        itens = [(c, c, v, 'pago') for c, v in linhas]

        # Conferência: os itens têm de reproduzir o total que a planilha declara.
        # Se não reproduzirem, ou falta item ou a linha `Total.` mudou de nome —
        # e nos dois casos o custo do litro sairia errado em silêncio.
        declarado = cur.execute(
            'SELECT valor FROM despesa_mensal WHERE ano=? AND mes=?', (ANO, mes)
        ).fetchone()
        if declarado and abs(sum(v for _, _, v, _ in itens) - declarado[0]) > 0.01:
            erro(
                f'itens somam {sum(v for _, _, v, _ in itens):.2f} mas '
                f'despesa_mensal declara {declarado[0]:.2f}'
            )
    else:
        linhas = cur.execute(
            """SELECT descricao, categoria, valor, status FROM despesa_lancada
                WHERE ano=? AND mes=? ORDER BY valor DESC""",
            (ANO, mes),
        ).fetchall()
        itens = [(d, c, v, s or 'pago') for d, c, v, s in linhas]

    if not itens:
        erro(f'mês {mes} não tem despesa na fonte "{fonte}"')

    return itens


def main():
    if len(sys.argv) < 2:
        erro('uso: carga-historico-despesa.py <mes> --fonte planilha|app [--sql]')

    mes = int(sys.argv[1])
    if not 1 <= mes <= 12:
        erro('mês fora de 1..12')

    if '--fonte' not in sys.argv:
        erro('--fonte é obrigatório: "planilha" (total da planilha) ou "app" '
             '(lista completa da tabela Despesa). A escolha muda o custo do litro.')
    fonte = sys.argv[sys.argv.index('--fonte') + 1]
    if fonte not in ('planilha', 'app'):
        erro('--fonte tem de ser "planilha" ou "app"')

    itens = carregar(mes, fonte)
    dia = date(ANO, mes, calendar.monthrange(ANO, mes)[1])
    total = sum(v for _, _, v, _ in itens)

    if '--sql' in sys.argv:
        print(f'-- Despesa {mes:02d}/{ANO} — fonte "{fonte}" — '
              f'{len(itens)} itens, R$ {total:,.2f}')
        print('BEGIN;')
        print(f'DELETE FROM "Despesa" WHERE posto_id={POSTO_ID} '
              f"AND data >= '{ANO}-{mes:02d}-01' AND data <= '{dia}';")
        for descricao, categoria, valor, status in itens:
            cat = 'NULL' if categoria is None else f"'{escapar(categoria)}'"
            print(
                f'INSERT INTO "Despesa" (descricao,categoria,valor,data,status,posto_id) '
                f"VALUES ('{escapar(descricao)}',{cat},{valor},'{dia}','{escapar(status)}',{POSTO_ID});"
            )
        print('COMMIT;')
    else:
        print(f'mês {mes:02d} — fonte "{fonte}", lançamento em {dia}')
        print(f'  itens ..................... {len(itens)}')
        print(f'  total ..................... R$ {total:,.2f}')
        print()
        for descricao, _categoria, valor, _status in itens:
            print(f'  {valor:>10,.2f}  {descricao}')


if __name__ == '__main__':
    main()
