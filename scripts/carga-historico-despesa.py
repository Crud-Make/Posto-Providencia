#!/usr/bin/env python3
"""
Estágio 3 do ETL: leva `despesa_trimestral` (referência já validada) para a
tabela `Despesa` de produção.

Fonte de verdade: a tabela TRIMESTRAL, não a mensal. As duas existem na
planilha e divergem R$ 54.774 em 7 meses; a trimestral é a que o dono
confirmou. Ver docs de estado e a skill etl-planilha-posto-providencia.

ARMADILHA já paga: `despesa_trimestral` guarda uma categoria `__TOTAL__` que é
o total do mês, não uma despesa. Somar a coluna crua devolve o DOBRO. Este
script exclui `__TOTAL__` das linhas e o usa como conferência independente.

NÃO ESCREVE NO BANCO. Emite SQL idempotente (`WHERE NOT EXISTS` sobre
data+descricao+valor, já que `Despesa` não tem índice único) para ser aplicado
conscientemente.

Uso:
    python3 scripts/carga-historico-despesa.py <mes>         # confere e mostra
    python3 scripts/carga-historico-despesa.py <mes> --sql   # emite o SQL
"""
import calendar
import sqlite3
import sys

BANCO = 'docs/data/posto_jorro_2026.sqlite'
ANO = 2026
POSTO_ID = 1

# Rótulo cru da planilha -> categoria do app (apps/web/.../despesas/types.ts).
# O rótulo cru vira a `descricao`, para o dado continuar rastreável à planilha.
CATEGORIAS = {
    'Contador': 'Contabilidade',
    'Luz': 'Energia Elétrica',
    'Net': 'Internet/Telefone',
    'Embasa': 'Água e Saneamento',
    'FGTS.': 'Encargos Sociais',
    'Imposto': 'Impostos',
    'Inposto atrasado': 'Impostos',
    'Alvara/ iptu': 'Impostos',
    'Concerto da Bomba': 'Manutenção',
    'extintor': 'Manutenção',
    'Bonbeiro AVCB': 'Manutenção',
    # Folha: o rótulo traz o nome do funcionário (e às vezes o dia do pagamento).
    'Paulo = 20': 'Folha de Pagamento',
    'Nayla = 20': 'Folha de Pagamento',
    'Leandro = 10': 'Folha de Pagamento',
    'Elyon = 10': 'Folha de Pagamento',
    'Felip': 'Folha de Pagamento',
    'Felip = 01': 'Folha de Pagamento',
    'Rosimeire': 'Folha de Pagamento',
    'Rosimeire = 01': 'Folha de Pagamento',
    # Sem categoria própria na lista do app.
    'Frete': 'Outros',
    'Sistema.': 'Outros',
    'Posto BR.': 'Outros',
    'Despesa extras': 'Outros',
    'Despeza com das taxas dos Cartao.': 'Outros',
    'Eco Valle': 'Outros',
    'Meio Ambiente': 'Outros',
    'Meio amniente': 'Outros',
    'ibamentro': 'Outros',
}


def erro(msg):
    print(f'ABORTADO: {msg}', file=sys.stderr)
    sys.exit(1)


def carregar(mes):
    cur = sqlite3.connect(BANCO).cursor()
    linhas = cur.execute(
        """SELECT categoria, valor FROM despesa_trimestral
           WHERE ano=? AND mes=? ORDER BY valor DESC""",
        (ANO, mes),
    ).fetchall()
    if not linhas:
        erro(f'mês {mes} não existe na referência')

    # A despesa do mês é lançada no último dia dele — mesma convenção da carga
    # de julho que já está em produção (2026-07-31).
    data = f'{ANO}-{mes:02d}-{calendar.monthrange(ANO, mes)[1]:02d}'

    total_planilha, itens, zeradas = None, [], 0
    for categoria, valor in linhas:
        if categoria == '__TOTAL__':
            total_planilha = round(valor, 2)
            continue
        if not valor:
            zeradas += 1
            continue
        if categoria not in CATEGORIAS:
            erro(f'categoria sem mapeamento: {categoria!r} (mês {mes})')
        itens.append({
            'descricao': categoria,
            'categoria': CATEGORIAS[categoria],
            'valor': round(valor, 2),
            'data': data,
        })

    if total_planilha is None:
        erro(f'mês {mes} não tem linha __TOTAL__ para conferir')

    # Conferência independente: a soma das categorias tem de reconstruir o
    # total que a própria planilha escreveu.
    soma = round(sum(i['valor'] for i in itens), 2)
    if abs(soma - total_planilha) > 0.01:
        erro(f'não fecha: soma das categorias {soma} != __TOTAL__ da planilha {total_planilha}')

    return itens, {'mes': mes, 'data': data, 'zeradas': zeradas,
                   'soma': soma, 'total_planilha': total_planilha}


def sql(itens):
    partes = []
    for i in itens:
        descricao = i['descricao'].replace("'", "''")
        partes.append(
            f"INSERT INTO \"Despesa\" (descricao,categoria,valor,data,status,posto_id)\n"
            f"SELECT '{descricao}','{i['categoria']}',{i['valor']:.2f},'{i['data']}','pago',{POSTO_ID}\n"
            f"WHERE NOT EXISTS (SELECT 1 FROM \"Despesa\" WHERE data='{i['data']}'\n"
            f"  AND descricao='{descricao}' AND valor={i['valor']:.2f} AND posto_id={POSTO_ID});"
        )
    return '\n'.join(partes)


if __name__ == '__main__':
    if len(sys.argv) < 2:
        erro('informe o mês (1-12)')
    mes = int(sys.argv[1])
    itens, resumo = carregar(mes)

    if '--sql' in sys.argv:
        print(sql(itens))
    else:
        print(f"mês {resumo['mes']:02d} — lançamento em {resumo['data']}")
        print(f"  linhas que ENTRAM ......... {len(itens)}")
        print(f"  categorias zeradas ........ {resumo['zeradas']} (descartadas)")
        print(f"  soma das categorias ....... {resumo['soma']}")
        print(f"  __TOTAL__ da planilha ..... {resumo['total_planilha']}  (confere)")
