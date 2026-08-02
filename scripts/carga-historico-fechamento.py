#!/usr/bin/env python3
"""
Estágio 3 do ETL: leva a venda por frentista (referência já validada) para as
tabelas `Fechamento` e `FechamentoFrentista` de produção.

Os estágios 1 e 2 já rodaram e estão em docs/data/posto_jorro_2026.sqlite. Este
script NÃO reinterpreta a planilha — mapeia o que já foi validado.

NÃO ESCREVE NO BANCO. Emite SQL idempotente (`WHERE NOT EXISTS`) para ser
aplicado conscientemente.

Uso:
    python3 scripts/carga-historico-fechamento.py <mes>          # confere
    python3 scripts/carga-historico-fechamento.py <mes> --sql    # emite o SQL

DECISÕES DE MAPEAMENTO (e por quê):

  `total_vendas` sai de `fechamento_diario.venda_concentrador_total`, que é o
  rollup dos encerrantes — o MESMO número que já está na tabela `Leitura` em
  produção. NÃO usamos `caixa_venda_concentrador` (o total escrito no bloco de
  caixa da planilha) porque em janeiro ele diverge: ver a checagem
  `total_do_bloco` abaixo, que reporta cada dia em que a célula de total da
  planilha não reconstitui a soma da própria grade.

  `Recebimento` NÃO é carregada de propósito. As formas eletrônicas já entram
  em `FechamentoFrentista` (valor_pix / valor_cartao_credito / ...), e a regra
  canônica é "recebimento eletrônico já compõe o conferido — não some de novo"
  (skill fechamento-posto-providencia). Carregar as duas contaria em dobro.

  `valor_conferido` usa a fórmula canônica de packages/utils/src/fechamento.ts:
  dinheiro + moedas + pix + credito + debito + nota + baratao.
"""
import calendar
import sqlite3
import sys
from collections import defaultdict

BANCO = 'docs/data/posto_jorro_2026.sqlite'
ANO = 2026
USUARIO_ID, TURNO_ID, POSTO_ID = 1, 1, 1

# Nome na planilha -> id em produção. Conferido em 02/08/2026 contra a tabela
# Frentista: os 8 nomes da planilha existem no cadastro, com grafia idêntica.
# Leandro é 239 (cadastrado depois dos 7 primeiros) — os scripts legados de
# importação hardcodavam 7 colunas fixas e PERDIAM as 18 linhas dele.
FRENTISTAS = {
    'Filip': 1, 'Paulo': 2, 'Barbra': 3, 'Rosimeire': 4,
    'Sinho': 5, 'Nayla': 6, 'Elyon': 7, 'Leandro': 239,
}

# Rótulo da forma na planilha -> coluna de FechamentoFrentista.
FORMAS = {
    'Dinheiro': 'valor_dinheiro',
    'Moeda': 'valor_moedas',
    'Pix': 'valor_pix',
    'Cartao Credito': 'valor_cartao_credito',
    'Cartao Debito': 'valor_cartao_debito',
    'Notas': 'valor_nota',
    'Baratao': 'baratao',
}


def erro(msg):
    print(f'ABORTADO: {msg}', file=sys.stderr)
    sys.exit(1)


def carregar(mes):
    cur = sqlite3.connect(BANCO).cursor()

    linhas = cur.execute(
        """SELECT dia, frentista, forma, valor FROM venda_frentista_diaria
           WHERE ano=? AND mes=? ORDER BY dia, frentista""",
        (ANO, mes),
    ).fetchall()
    if not linhas:
        erro(f'mês {mes} não existe na referência')

    dias_reais = calendar.monthrange(ANO, mes)[1]

    # (dia, frentista) -> {coluna: valor}
    grade = defaultdict(lambda: {c: 0.0 for c in FORMAS.values()})
    for dia, frentista, forma, valor in linhas:
        if dia > dias_reais:
            continue
        if frentista not in FRENTISTAS:
            erro(f'frentista fora do cadastro: {frentista!r} (dia {dia})')
        if forma not in FORMAS:
            erro(f'forma de pagamento desconhecida: {forma!r} (dia {dia})')
        if valor:
            grade[(dia, frentista)][FORMAS[forma]] += valor

    # Encerrante atribuído a cada frentista pela planilha (para a diferença
    # individual). Pode ser NULL quando o frentista não trabalhou no dia.
    encerrantes = {
        (d, f): v for d, f, v in cur.execute(
            """SELECT dia, frentista, venda_concentrador FROM frentista_dia_total
               WHERE ano=? AND mes=?""", (ANO, mes))
    }

    # Cabeçalho do dia: venda dos bicos (rollup dos encerrantes) e o total que a
    # planilha escreveu no bloco de caixa.
    dias = {
        d: {'venda_bicos': vb or 0.0, 'total_do_bloco': tb}
        for d, vb, tb in cur.execute(
            """SELECT dia, venda_concentrador_total, caixa_venda_frentista
               FROM fechamento_diario WHERE ano=? AND mes=? AND dia<=?""",
            (ANO, mes, dias_reais))
    }

    fechamentos, frentistas_linhas, avisos = [], [], []
    for dia in sorted(dias):
        do_dia = {k: v for k, v in grade.items() if k[0] == dia}
        if not do_dia:
            continue

        conferido_dia = 0.0
        for (_, nome), buckets in sorted(do_dia.items()):
            conferido = round(sum(buckets.values()), 2)
            if conferido == 0:
                continue  # frentista sem venda no dia não vira linha
            conferido_dia += conferido
            encerrante = encerrantes.get((dia, nome))
            frentistas_linhas.append({
                'dia': dia, 'frentista_id': FRENTISTAS[nome], 'nome': nome,
                'buckets': {c: round(v, 2) for c, v in buckets.items()},
                'conferido': conferido,
                'encerrante': None if encerrante is None else round(encerrante, 2),
                'diferenca': (None if encerrante is None
                              else round(encerrante - conferido, 2)),
            })

        conferido_dia = round(conferido_dia, 2)
        venda_bicos = round(dias[dia]['venda_bicos'], 2)

        # A célula de total do bloco de caixa da planilha tem de reconstituir a
        # soma da própria grade. Quando não reconstitui, a fórmula de soma da
        # planilha está com o range curto (achado real: 29/01, a coluna da
        # Barbra ficou fora). A grade manda; o total só vira aviso.
        total_do_bloco = dias[dia]['total_do_bloco']
        if total_do_bloco is not None and abs(total_do_bloco - conferido_dia) > 0.01:
            avisos.append(
                f'dia {dia:02d}: total do bloco de caixa da planilha '
                f'{total_do_bloco:.2f} != soma da grade {conferido_dia:.2f} '
                f'(dif {total_do_bloco - conferido_dia:+.2f}) — usando a grade'
            )

        fechamentos.append({
            'dia': dia,
            'data': f'{ANO}-{mes:02d}-{dia:02d}T00:00:00+00',
            'total_vendas': venda_bicos,
            'total_recebido': conferido_dia,
            # Convenção canônica: FALTA é positivo, SOBRA é negativo.
            'diferenca': round(venda_bicos - conferido_dia, 2),
        })

    # Conferência independente: o conferido do mês tem de reconstruir a soma
    # crua da referência, sem passar por nenhum total da planilha.
    total_ref = cur.execute(
        'SELECT ROUND(SUM(valor),2) FROM venda_frentista_diaria WHERE ano=? AND mes=? AND dia<=?',
        (ANO, mes, dias_reais)).fetchone()[0]
    total_carga = round(sum(f['total_recebido'] for f in fechamentos), 2)
    if abs(total_carga - total_ref) > 0.01:
        erro(f'conferido não fecha: carga {total_carga} != referência {total_ref}')

    return fechamentos, frentistas_linhas, {
        'mes': mes, 'dias': len(fechamentos), 'linhas': len(frentistas_linhas),
        'total_ref': total_ref, 'total_carga': total_carga,
        'venda_bicos': round(sum(f['total_vendas'] for f in fechamentos), 2),
        'avisos': avisos,
    }


def sql(fechamentos, frentistas_linhas):
    """Emite 2 comandos (pai e filhos), cada um com um VALUES único.

    Um INSERT por linha estouraria o tamanho de payload aceito pelo caminho de
    aplicação; agrupar em VALUES mantém a carga do mês inteiro numa transação.
    """
    valores_pai = ',\n  '.join(
        f"('{f['data']}',{f['total_vendas']:.2f},{f['total_recebido']:.2f},{f['diferenca']:.2f})"
        for f in fechamentos
    )
    pai = (
        'INSERT INTO "Fechamento" (data,total_vendas,total_recebido,diferenca,'
        'status,usuario_id,turno_id,posto_id)\n'
        f'SELECT v.data::timestamptz,v.total_vendas,v.total_recebido,v.diferenca,'
        f"'FECHADO',{USUARIO_ID},{TURNO_ID},{POSTO_ID}\n"
        f'FROM (VALUES\n  {valores_pai}\n) AS v(data,total_vendas,total_recebido,diferenca)\n'
        'WHERE NOT EXISTS (SELECT 1 FROM "Fechamento" f\n'
        f'  WHERE f.data=v.data::timestamptz AND f.turno_id={TURNO_ID} '
        f'AND f.posto_id={POSTO_ID});'
    )

    por_dia = {f['dia']: f['data'] for f in fechamentos}
    colunas = list(FORMAS.values())
    linhas_filho = []
    for r in frentistas_linhas:
        vals = ','.join(f"{r['buckets'][c]:.2f}" for c in colunas)
        cartao = r['buckets']['valor_cartao_credito'] + r['buckets']['valor_cartao_debito']
        dif = 'NULL' if r['diferenca'] is None else f"{r['diferenca']:.2f}"
        enc = 'NULL' if r['encerrante'] is None else f"{r['encerrante']:.2f}"
        linhas_filho.append(
            f"('{por_dia[r['dia']]}',{r['frentista_id']},{vals},{cartao:.2f},"
            f"{r['conferido']:.2f},{enc},{dif})"
        )
    filhos = (
        f'INSERT INTO "FechamentoFrentista" (fechamento_id,frentista_id,'
        f'{",".join(colunas)},valor_cartao,valor_conferido,encerrante,'
        f'diferenca_calculada,posto_id)\n'
        f'SELECT f.id,v.frentista_id,{",".join("v." + c for c in colunas)},'
        f'v.valor_cartao,v.valor_conferido,v.encerrante,v.diferenca_calculada,{POSTO_ID}\n'
        f'FROM (VALUES\n  ' + ',\n  '.join(linhas_filho) + '\n'
        f') AS v(data,frentista_id,{",".join(colunas)},valor_cartao,valor_conferido,'
        f'encerrante,diferenca_calculada)\n'
        f'JOIN "Fechamento" f ON f.data=v.data::timestamptz '
        f'AND f.turno_id={TURNO_ID} AND f.posto_id={POSTO_ID}\n'
        'WHERE NOT EXISTS (SELECT 1 FROM "FechamentoFrentista" ff\n'
        '  WHERE ff.fechamento_id=f.id AND ff.frentista_id=v.frentista_id);'
    )
    return pai + '\n\n' + filhos


if __name__ == '__main__':
    if len(sys.argv) < 2:
        erro('informe o mês (1-12)')
    mes = int(sys.argv[1])
    fechamentos, frentistas_linhas, resumo = carregar(mes)

    if '--sql' in sys.argv:
        print(sql(fechamentos, frentistas_linhas))
    else:
        print(f"mês {resumo['mes']:02d}")
        print(f"  dias (Fechamento) ......... {resumo['dias']}")
        print(f"  linhas de frentista ....... {resumo['linhas']}")
        print(f"  venda pelos bicos ......... {resumo['venda_bicos']}")
        print(f"  conferido da carga ........ {resumo['total_carga']}")
        print(f"  conferido na referência ... {resumo['total_ref']}  (confere)")
        print(f"  diferença do mês .......... "
              f"{round(resumo['venda_bicos'] - resumo['total_carga'], 2):+} "
              f"(positivo = FALTA)")
        if resumo['avisos']:
            print(f"\n  AVISOS ({len(resumo['avisos'])}) — total da planilha não "
                  f"reconstitui a grade:")
            for a in resumo['avisos']:
                print(f'    {a}')
