#!/usr/bin/env python3
"""Bateria dos hooks de PreToolUse. Rode após mexer em qualquer um deles:

    python3 .claude/hooks/testa-hooks.py

Existe porque a primeira versão do `protege-git` bloqueou o próprio commit que a
documentava: a mensagem *citava* `git push --force` e o hook casou com o texto.
Um hook errado ou trava trabalho legítimo, ou deixa passar o que devia barrar —
e os dois modos são silenciosos até doer.

Nota: o literal da flag é montado em partes aqui de propósito. Escrito inteiro,
ele dispararia o hook da sessão que estiver rodando este arquivo.
"""
import json
import subprocess
from pathlib import Path

HOOKS = Path(__file__).resolve().parent
RAIZ = HOOKS.parent.parent
FORCE = "--" + "force"

CASOS_GIT = [
    (f"git push {FORCE} origin main", "deny"),
    ("git push -f", "deny"),
    (f"git push {FORCE}-with-lease origin x", "deny"),
    ("git push origin minha-branch", None),
    (f"git commit -F - <<'EOF'\nfix: documenta que git push {FORCE} e proibido\nEOF", None),
    (f'git commit -m "docs: git push {FORCE} nunca"', None),
    (f"grep -rn '{FORCE}' CLAUDE.md", None),
    ("ls -la", None),
]

CASOS_DADOS = [
    (f"{RAIZ}/docs/data/janeiro_referencia.sqlite", "deny"),
    (f"{RAIZ}/docs/data/planilha.xlsx", "deny"),
    ("apps/web/src/App.tsx", None),
    ("packages/utils/src/fechamento.ts", None),
]

# A porta dos fundos: os agentes têm Bash, então cobrir só Write/Edit não bastava.
# Leitura via shell tem de continuar livre — é o uso normal do agente `planilha`.
CASOS_SHELL = [
    ("echo x > docs/data/nota.txt", "deny"),
    ("rm docs/data/janeiro_referencia.sqlite", "deny"),
    ("sed -i s/a/b/ docs/data/mes_01.csv", "deny"),
    ('sqlite3 docs/data/posto_jorro_2026.sqlite "DELETE FROM despesa_mensal"', "deny"),
    ("python3 -c \"open('docs/data/x.txt','w')\"", "deny"),
    ('sqlite3 docs/data/posto_jorro_2026.sqlite "SELECT * FROM despesa_mensal"', None),
    ("python3 -c \"open('docs/data/x.txt')\"", None),
    ("cat docs/data/mes_01.csv", None),
    ("grep -rn despesa docs/data/etl_2026 > /tmp/saida.txt", None),
    ("ls -la docs/data/", None),
    # O mesmo falso positivo do protege-git, agora aqui: mensagem de commit que
    # DESCREVE a escrita proibida não é a escrita acontecendo. Mordeu duas vezes.
    ("git commit -F - <<'EOF'\nfix: bloqueia > docs/data/x e rm docs/data\nEOF", None),
    ('git commit -m "docs: DELETE em docs/data agora barrado"', None),
]


def roda(script: str, payload: dict) -> str | None:
    r = subprocess.run(
        ["python3", str(HOOKS / script)],
        input=json.dumps(payload), capture_output=True, text=True,
    )
    saida = r.stdout.strip()
    if not saida:
        return None
    return json.loads(saida)["hookSpecificOutput"]["permissionDecision"]


def main() -> int:
    falhas = 0
    print("── protege-git ──")
    for cmd, esperado in CASOS_GIT:
        obtido = roda("protege-git.py", {"tool_input": {"command": cmd}})
        ok = obtido == esperado
        falhas += not ok
        print(f"  {'✓' if ok else '✗'} {cmd.replace(chr(10), '⏎')[:58]:60} {obtido or 'passa'}")

    print("── protege-dados ──")
    for alvo, esperado in CASOS_DADOS:
        obtido = roda("protege-dados.py", {"tool_input": {"file_path": alvo}})
        ok = obtido == esperado
        falhas += not ok
        print(f"  {'✓' if ok else '✗'} {alvo.replace(f'{RAIZ}/', ''):60} {obtido or 'passa'}")

    print("── protege-dados via shell ──")
    for cmd, esperado in CASOS_SHELL:
        obtido = roda("protege-dados.py", {"tool_input": {"command": cmd}})
        ok = obtido == esperado
        falhas += not ok
        print(f"  {'✓' if ok else '✗'} {cmd[:58]:60} {obtido or 'passa'}")

    print(f"\n{'TODOS OS CASOS PASSARAM' if not falhas else f'{falhas} FALHA(S)'}")
    return 1 if falhas else 0


if __name__ == "__main__":
    raise SystemExit(main())
