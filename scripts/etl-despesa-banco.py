#!/usr/bin/env python3
"""Exporta a despesa lançada no app (tabela `Despesa`) para o staging do ETL.

    python3 scripts/etl-despesa-banco.py --saida DIR [--ano 2026]

**Por que este passo existe.** A planilha do posto acompanha só uma PARTE da
despesa: a matriz `Despeza, 2026.` soma R$ 140.456,27 nos 7 meses de 2026,
enquanto a tabela `Despesa` — alimentada pelo app, e conferida em 12/08/2026 —
soma **R$ 195.230,40** nos mesmos meses, em 108 lançamentos. A diferença de
R$ 54.774,13 são gastos reais que a planilha não registra: Embasa, Net, Luz,
extintor, conserto de bomba, Bombeiro AVCB, e salários lançados a R$ 2.100.

Pelo CLAUDE.md §6 — *toda despesa do posto entra no rateio, sem exceção* — é
esta lista que manda no custo por litro, não a da planilha. Logo: **venda e
encerrante vêm da planilha; despesa vem do banco.** Cada fonte no que ela é
autoridade.

**A história do nome.** Entre 31/07 e 12/08 esta lista se chamou
`despesa_trimestral` e era descrita como uma segunda aba da planilha. Nunca foi:
não existe apuração trimestral no posto, e nenhuma das 12 abas a contém. O nome
errado custou uma sessão inteira de investigação e quase custou a remoção de um
golden master correto. Hoje se chama `despesa_lancada`, que é o que ela é.

**Somente leitura.** Emite `SELECT` pela API de management e grava JSON no
diretório de staging. Não escreve no banco, não escreve em `docs/data/`.

O token sai de `.claude/settings.local.json` (fora do git) ou da variável de
ambiente `SUPABASE_ACCESS_TOKEN` — nunca da linha de comando, que fica no
histórico do shell.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

PROJETO = "kilndogpsffkgkealkaq"
API = f"https://api.supabase.com/v1/projects/{PROJETO}/database/query"

CONSULTA = """
SELECT
    EXTRACT(YEAR  FROM data)::int  AS ano,
    EXTRACT(MONTH FROM data)::int  AS mes,
    data::text                     AS data,
    descricao,
    categoria,
    valor::float8                  AS valor,
    status
FROM "Despesa"
WHERE EXTRACT(YEAR FROM data) = {ano}
ORDER BY data, id
"""


def token(repo: Path) -> str:
    if (t := os.environ.get("SUPABASE_ACCESS_TOKEN")):
        return t
    local = repo / ".claude" / "settings.local.json"
    if local.is_file():
        t = json.loads(local.read_text()).get("env", {}).get("SUPABASE_ACCESS_TOKEN")
        if t:
            return t
    raise SystemExit(
        "sem SUPABASE_ACCESS_TOKEN: exporte a variável ou preencha "
        "`.claude/settings.local.json`"
    )


def consulta(sql: str, chave: str) -> list[dict]:
    corpo = json.dumps({"query": sql}).encode()
    req = urllib.request.Request(
        API, data=corpo, method="POST",
        # O User-Agent é obrigatório: o WAF na frente da API devolve 403 (code
        # 1010) para o `Python-urllib/3.x` padrão, sem mensagem que explique.
        headers={"Authorization": f"Bearer {chave}",
                 "Content-Type": "application/json",
                 "User-Agent": "posto-providencia-etl/1.0"},
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        detalhe = e.read().decode("utf-8", "replace")[:300]
        raise SystemExit(f"consulta falhou ({e.code}): {detalhe}")


def main() -> int:
    p = argparse.ArgumentParser(description="Exporta Despesa do banco para o staging")
    p.add_argument("--saida", required=True, type=Path)
    p.add_argument("--ano", type=int, default=2026)
    args = p.parse_args()

    repo = Path(__file__).resolve().parents[1]
    linhas = consulta(CONSULTA.format(ano=args.ano), token(repo))

    por_mes: dict[int, float] = {}
    for l in linhas:
        por_mes[l["mes"]] = por_mes.get(l["mes"], 0.0) + (l["valor"] or 0.0)
    total = sum(por_mes.values())

    args.saida.mkdir(parents=True, exist_ok=True)
    destino = args.saida / "despesa_lancada.json"
    destino.write_text(json.dumps({
        "origem": f'tabela "Despesa" do projeto {PROJETO}',
        "ano": args.ano,
        "lancamentos": len(linhas),
        "total": round(total, 2),
        "por_mes": {str(m): round(v, 2) for m, v in sorted(por_mes.items())},
        "linhas": linhas,
    }, ensure_ascii=False, indent=2))

    print(f'tabela "Despesa", ano {args.ano}: {len(linhas)} lançamentos\n')
    print(f"{'mês':>4} {'lanç.':>7} {'total':>14}")
    for mes, v in sorted(por_mes.items()):
        n = sum(1 for l in linhas if l["mes"] == mes)
        print(f"{mes:>4} {n:>7} {v:>14,.2f}")
    print(f"{'':>4} {len(linhas):>7} {total:>14,.2f}   ← total do ano")
    print(f"\nstaging em {destino}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
