#!/usr/bin/env python3
"""
Estágio 3 do ETL: leva `encerrante_diario` (referência já validada) para a
tabela `Leitura` de produção.

Os estágios 1 e 2 (extração e conferência contra o resumo mensal) já rodaram e
estão em docs/data/posto_jorro_2026.sqlite. Este script NÃO reinterpreta a
planilha — ele mapeia o que já foi validado para o schema do sistema.

NÃO ESCREVE NO BANCO. Emite SQL idempotente (ON CONFLICT DO NOTHING sobre o
índice único `leitura_unica_bico_data`) para ser aplicado conscientemente.

Uso:
    python3 scripts/carga-historico-leitura.py <mes>          # confere e mostra
    python3 scripts/carga-historico-leitura.py <mes> --sql    # emite o SQL

Regras da skill etl-planilha-posto-providencia aplicadas aqui:
  - linha com `dado_incompleto` NUNCA entra (lacuna de fevereiro 09-14);
  - total de litros do mês tem de bater com a referência, senão aborta;
  - preço ausente é derivado, mas só se o derivado bater com o preço de outro
    bico do MESMO combustível no MESMO dia — senão aborta.
"""
import calendar
import sqlite3
import sys
from collections import defaultdict

BANCO = 'docs/data/posto_jorro_2026.sqlite'
ANO = 2026

# Rótulo da planilha -> (bico_id, combustivel_id) em produção.
# Conferido em 02/08/2026 contra a tabela Bico: o combustível do cadastro bate
# com o prefixo do rótulo nos 6 casos.
BICOS = {
    'G,C. Bico 01': (7, 1),   # Gasolina Comum
    'G,A.Bico 02': (8, 2),    # Gasolina Aditivada
    'Etanol,Bico 03': (9, 3),  # Etanol
    'DS:.10,Bico 04': (10, 4),  # Diesel S10
    'G,C, Bico 05': (11, 1),  # Gasolina Comum
    'G,C. Bico 06': (12, 1),  # Gasolina Comum
}

USUARIO_ID, TURNO_ID, POSTO_ID = 1, 1, 1


def erro(msg):
    print(f'ABORTADO: {msg}', file=sys.stderr)
    sys.exit(1)


def carregar(mes):
    cur = sqlite3.connect(BANCO).cursor()
    linhas = cur.execute(
        """SELECT dia, bico, inicial, fechamento, litros, valor_lt, venda_bico, dado_incompleto
           FROM encerrante_diario WHERE ano=? AND mes=? ORDER BY dia, bico""",
        (ANO, mes),
    ).fetchall()
    if not linhas:
        erro(f'mês {mes} não existe na referência')

    dias_reais = calendar.monthrange(ANO, mes)[1]
    completas, incompletas, fora_do_calendario = [], 0, 0

    # Preço por (dia, combustivel) para conferir o derivado.
    preco_conhecido = defaultdict(set)
    for dia, bico, _, _, _, valor_lt, _, incompleto in linhas:
        if valor_lt is not None and not incompleto and bico in BICOS:
            preco_conhecido[(dia, BICOS[bico][1])].add(round(valor_lt, 4))

    for dia, bico, inicial, fechamento, litros, valor_lt, venda, incompleto in linhas:
        if dia > dias_reais:
            fora_do_calendario += 1
            continue
        if incompleto:
            incompletas += 1
            continue
        if bico not in BICOS:
            erro(f'bico desconhecido na referência: {bico!r}')
        if inicial is None or fechamento is None or litros is None:
            erro(f'dia {dia} bico {bico}: lado ausente escapou de dado_incompleto')

        bico_id, comb_id = BICOS[bico]
        preco = valor_lt

        if preco is None:
            if not litros:
                erro(f'dia {dia} bico {bico}: sem preço e sem litros, impossível derivar')
            derivado = round(venda / litros, 4)
            esperados = preco_conhecido.get((dia, comb_id), set())
            if not esperados:
                erro(f'dia {dia} bico {bico}: preço ausente e nenhum outro bico do mesmo '
                     f'combustível no dia para conferir o derivado {derivado}')
            if not any(abs(derivado - e) < 0.01 for e in esperados):
                erro(f'dia {dia} bico {bico}: preço derivado {derivado} não bate com o dos '
                     f'outros bicos do combustível {comb_id} no dia: {sorted(esperados)}')
            preco = derivado

        completas.append({
            'data': f'{ANO}-{mes:02d}-{dia:02d}T00:00:00+00',
            'bico_id': bico_id, 'combustivel_id': comb_id,
            'inicial': inicial, 'final': fechamento, 'litros': litros,
            'preco': preco, 'valor': venda,
        })

    # Conferência independente: o total do que vai entrar mais o que ficou de
    # fora tem de reconstruir o total da referência.
    total_ref = cur.execute(
        'SELECT ROUND(SUM(litros),3) FROM encerrante_diario WHERE ano=? AND mes=?', (ANO, mes)
    ).fetchone()[0]
    total_entra = round(sum(r['litros'] for r in completas), 3)
    total_fora = cur.execute(
        """SELECT ROUND(COALESCE(SUM(litros),0),3) FROM encerrante_diario
           WHERE ano=? AND mes=? AND (dado_incompleto=1 OR dia>?)""", (ANO, mes, dias_reais)
    ).fetchone()[0]

    if abs((total_entra + total_fora) - total_ref) > 0.01:
        erro(f'litros não fecham: entram {total_entra} + fora {total_fora} != referência {total_ref}')

    return completas, {
        'mes': mes, 'dias_reais': dias_reais, 'incompletas': incompletas,
        'fora_do_calendario': fora_do_calendario, 'total_ref': total_ref,
        'total_entra': total_entra, 'total_fora': total_fora,
    }


def sql(linhas):
    valores = ',\n  '.join(
        f"('{r['data']}',{r['bico_id']},{r['combustivel_id']},{r['inicial']:.3f},"
        f"{r['final']:.3f},{r['litros']:.3f},{r['preco']:.4f},{r['valor']:.2f},"
        f"{USUARIO_ID},{TURNO_ID},{POSTO_ID})"
        for r in linhas
    )
    return (
        'INSERT INTO "Leitura" (data,bico_id,combustivel_id,leitura_inicial,leitura_final,'
        'litros_vendidos,preco_litro,valor_total,usuario_id,turno_id,posto_id) VALUES\n  '
        + valores
        + '\nON CONFLICT (bico_id, data) DO NOTHING;'
    )


if __name__ == '__main__':
    if len(sys.argv) < 2:
        erro('informe o mês (1-12)')
    mes = int(sys.argv[1])
    linhas, resumo = carregar(mes)

    if '--sql' in sys.argv:
        print(sql(linhas))
    else:
        print(f"mês {resumo['mes']:02d} — {resumo['dias_reais']} dias no calendário")
        print(f"  linhas que ENTRAM ......... {len(linhas)}")
        print(f"  incompletas descartadas ... {resumo['incompletas']}")
        print(f"  slots fora do calendário .. {resumo['fora_do_calendario']}")
        print(f"  litros que entram ......... {resumo['total_entra']}")
        print(f"  litros descartados ........ {resumo['total_fora']}")
        print(f"  litros na referência ...... {resumo['total_ref']}  (soma confere)")
