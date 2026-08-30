#!/usr/bin/env python3
"""
Estágio 3 do ETL: leva `estoque_mensal` (referência já validada) para a tabela
`HistoricoTanque` de produção.

Os estágios 1 e 2 já rodaram e estão em docs/data/posto_jorro_2026.sqlite. Este
script NÃO reinterpreta a planilha — mapeia o que já foi validado.

QUAIS COLUNAS, E EM QUE DATA:

    estoque_mensal.ano_passado    -> medição na VÉSPERA do mês  (abertura)
    estoque_mensal.estoque_tanque -> medição no ÚLTIMO dia do mês (fechamento)

A data da abertura é a véspera, e não o dia 01, de propósito: é o que faz o
`Estoque anterior` de fevereiro ser exatamente o mesmo número que o
`Estoque tanque` de janeiro. Gravar a abertura dentro do próprio mês criaria
dois estoques iniciais discordantes para a mesma data, e a tela de planilha —
que busca a última medição ANTERIOR ao início do período — leria o número
errado.

⚠️ POR QUE ESTA TABELA É A MAIS PERIGOSA DA CARGA: `volume_fisico` é o único
insumo da perda de combustível (`perca_sobra = medido − teórico`). O resto do
sistema não tem como contradizê-lo. Um valor trocado aqui inventa — ou apaga —
um furo de milhares de litros, que é o número que aponta o dedo para alguém.
Por isso o script confere as duas pontas contra a própria referência
(`compra_e_estoque` e `perca_sobra`) antes de emitir qualquer linha.

NÃO ESCREVE NO BANCO. Emite SQL idempotente (ON CONFLICT sobre `tanque_id, data`)
para ser aplicado conscientemente — mesma convenção de
`carga-historico-leitura.py` e `carga-historico-compra.py`.

Uso:
    python3 scripts/carga-historico-tanque.py <mes>          # confere e mostra
    python3 scripts/carga-historico-tanque.py <mes> --sql    # emite o SQL
"""
import calendar
import sqlite3
import sys
from datetime import date, timedelta

import os as _os
# Base de referencia. Sobreponivel por POSTO_BANCO_REFERENCIA para ler uma
# extracao ainda nao promovida; a pasta canonica so muda por decisao do dono.
BANCO = _os.environ.get('POSTO_BANCO_REFERENCIA', 'docs/data/posto_jorro_2026.sqlite')
ANO = 2026

# Produto da planilha -> tanque em produção.
# Conferido em 16/08/2026 contra as tabelas `Tanque` e `Combustivel`: há
# exatamente um tanque por combustível, e o combustível do cadastro bate com o
# rótulo da planilha nos 4 casos.
TANQUES = {
    'G,Comum.': (1, 'Tanque GC'),
    'G,Aditivada.': (2, 'Tanque GA'),
    'Etanol.': (3, 'Tanque ET'),
    'Ds.10.': (4, 'Tanque S10'),
}

# Litro é exato ao mililitro na planilha; a folga cobre só ruído de float.
TOLERANCIA_L = 0.002


def erro(msg):
    print(f'ABORTADO: {msg}', file=sys.stderr)
    sys.exit(1)


def carregar(mes):
    cur = sqlite3.connect(BANCO).cursor()
    linhas = cur.execute(
        """SELECT produto, ano_passado, compra_e_estoque, estoque_hoje,
                  perca_sobra, estoque_tanque
             FROM estoque_mensal WHERE ano=? AND mes=? ORDER BY produto""",
        (ANO, mes),
    ).fetchall()
    if not linhas:
        erro(f'mês {mes} não tem estoque na referência')

    compras = dict(
        cur.execute(
            'SELECT produto, compra_lt FROM compra_mensal WHERE ano=? AND mes=?',
            (ANO, mes),
        ).fetchall()
    )

    dias = calendar.monthrange(ANO, mes)[1]
    fechamento = date(ANO, mes, dias)
    abertura = date(ANO, mes, 1) - timedelta(days=1)

    registros = []
    for produto, anterior, compra_e_estoque, _hoje, perca, tanque in linhas:
        if produto not in TANQUES:
            erro(f'produto "{produto}" não tem tanque mapeado')
        if anterior is None or tanque is None:
            erro(f'{produto}: medição ausente (abertura={anterior}, tanque={tanque})')

        # Conferência 1: a própria referência tem de fechar `anterior + comprado`.
        # Se não fechar, o `ano_passado` que eu vou gravar não é o mesmo que a
        # planilha usou para apurar a perda — e a perda é o número que acusa.
        comprado = compras.get(produto)
        if comprado is not None:
            esperado = anterior + comprado
            if abs(esperado - compra_e_estoque) > TOLERANCIA_L:
                erro(
                    f'{produto}: {anterior} + {comprado} = {esperado:.3f}, '
                    f'mas a referência diz compra_e_estoque={compra_e_estoque:.3f}'
                )

        # Conferência 2: medido − teórico tem de reproduzir a perda da planilha.
        if abs((tanque - _hoje) - perca) > TOLERANCIA_L:
            erro(
                f'{produto}: {tanque} − {_hoje:.3f} = {tanque - _hoje:.3f}, '
                f'mas a referência diz perca_sobra={perca:.3f}'
            )

        tanque_id, nome = TANQUES[produto]
        registros.append((tanque_id, nome, produto, anterior, tanque, perca))

    return registros, abertura, fechamento, dias


def mostrar(registros, abertura, fechamento, dias, mes):
    print(f'mês {mes:02d} — {dias} dias no calendário')
    print(f'  abertura gravada em ..... {abertura}  (véspera do mês)')
    print(f'  fechamento gravado em ... {fechamento}')
    print(f'  tanques ................. {len(registros)}')
    print(f'  linhas a gravar ......... {len(registros) * 2}')
    print()
    print(f"  {'tanque':<12} {'abertura':>12} {'medido':>12} {'perca/sobra':>13}")
    for _id, nome, _produto, anterior, tanque, perca in registros:
        sinal = '' if perca < 0 else '+'
        print(f'  {nome:<12} {anterior:>12,.0f} {tanque:>12,.0f} {sinal}{perca:>12,.0f}')

    total_perca = sum(r[5] for r in registros)
    print(f"  {'TOTAL':<12} {sum(r[3] for r in registros):>12,.0f} "
          f"{sum(r[4] for r in registros):>12,.0f} {total_perca:>13,.0f}")


def sql(registros, abertura, fechamento):
    print('-- Carga de HistoricoTanque — gerada por scripts/carga-historico-tanque.py')
    print('-- Idempotente: reaplicar sobrescreve a medição da mesma data.')
    print('BEGIN;')
    for tanque_id, nome, _produto, anterior, tanque, _perca in registros:
        for data, volume, rotulo in (
            (abertura, anterior, 'abertura'),
            (fechamento, tanque, 'fechamento'),
        ):
            print(
                f'INSERT INTO "HistoricoTanque" (tanque_id, data, volume_fisico) '
                f"VALUES ({tanque_id}, '{data}', {volume}) "
                f'ON CONFLICT (tanque_id, data) DO UPDATE SET volume_fisico = EXCLUDED.volume_fisico; '
                f'-- {nome} {rotulo}'
            )
    print('COMMIT;')


def main():
    if len(sys.argv) < 2:
        erro('uso: carga-historico-tanque.py <mes> [--sql]')
    mes = int(sys.argv[1])
    if not 1 <= mes <= 12:
        erro('mês fora de 1..12')

    registros, abertura, fechamento, dias = carregar(mes)

    if '--sql' in sys.argv:
        sql(registros, abertura, fechamento)
    else:
        mostrar(registros, abertura, fechamento, dias, mes)


if __name__ == '__main__':
    main()
