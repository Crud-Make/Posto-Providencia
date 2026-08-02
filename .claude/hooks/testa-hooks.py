#!/usr/bin/env python3
"""Bateria dos hooks do projeto. Rode após mexer em qualquer um deles:

    python3 .claude/hooks/testa-hooks.py

Existe porque a primeira versão do `protege-git` bloqueou o próprio commit que a
documentava: a mensagem *citava* `git push --force` e o hook casou com o texto.
Um hook errado ou trava trabalho legítimo, ou deixa passar o que devia barrar —
e os dois modos são silenciosos até doer.

Nota: o literal da flag é montado em partes aqui de propósito. Escrito inteiro,
ele dispararia o hook da sessão que estiver rodando este arquivo.
"""
import importlib.util
import json
import subprocess
import sys
from pathlib import Path

HOOKS = Path(__file__).resolve().parent
RAIZ = HOOKS.parent.parent
FORCE = "--" + "force"


def carrega(arquivo: str):
    """Importa um hook pelo caminho — o hífen do nome não é módulo Python válido."""
    sys.path.insert(0, str(HOOKS))  # os hooks fazem `from _comum import ...`
    spec = importlib.util.spec_from_file_location(arquivo.removesuffix(".py"), HOOKS / arquivo)
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    return modulo

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


# Roteamento: frase do dono → agentes que devem ser sugeridos. Os negativos importam
# tanto quanto os positivos: hook que fala demais deixa de ser lido (§14).
CASOS_ROTA = [
    ("onde fica o cálculo do lucro?", ["grafo"]),
    ("quem usa o fechamento.ts?", ["grafo"]),
    ("o que quebra se eu mexer no diferenca?", ["grafo"]),
    ("quais arquivos importam o encerrante mensal", ["grafo"]),
    ("quanto deu julho?", ["planilha"]),
    ("esse valor bate com o real?", ["planilha"]),
    ("qual a fórmula da planilha pro rateio", ["planilha"]),
    ("a tabela Leitura está protegida?", ["rls"]),
    ("o que um anônimo consegue ler?", ["rls"]),
    # Termo solto do domínio NÃO dispara: a skill de fechamento já cobre sozinha.
    ("como calcula o valor conferido?", []),
    ("a diferença está errada no dia 10", []),
    ("de onde vem esse valor?", []),
    ("vamos refatorar o dashboard", []),
    ("arruma esse bug do gráfico", []),
]

# Golden master: True = tem de avisar. Teste e spec nunca avisam (não são fórmula).
CASOS_GOLDEN = [
    ("packages/utils/src/fechamento.ts", True),
    ("packages/utils/src/lucro.ts", True),
    ("packages/utils/src/despesa.ts", True),
    ("packages/utils/src/formatters.ts", True),
    (f"{RAIZ}/packages/utils/src/encerrante-mensal.ts", True),
    ("apps/web/src/services/api/aggregator.service.ts", True),
    ("packages/utils/src/fechamento.test.ts", False),
    ("packages/utils/src/fechamento.golden.spec.ts", False),
    ("apps/web/src/App.tsx", False),
    ("CHANGELOG.md", False),
]

# Checklist de commit: arquivos no commit → quantas pendências. Testa a função pura,
# porque o hook inteiro depende do índice do git e não dá para fixar aqui.
CASOS_CHECKLIST = [
    (["packages/utils/src/fechamento.ts"], 2),          # fórmula + changelog
    (["packages/utils/src/fechamento.ts", "CHANGELOG.md"], 1),  # só fórmula
    (["apps/web/src/App.tsx"], 1),                      # só changelog
    (["apps/web/src/App.tsx", "CHANGELOG.md"], 0),
    (["docs/notas.md"], 0),
    ([".claude/hooks/roteia-consulta.py"], 0),
    ([], 0),
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


def roda_contexto(script: str, payload: dict) -> str:
    """Para hook que injeta contexto em vez de decidir permissão."""
    r = subprocess.run(
        ["python3", str(HOOKS / script)],
        input=json.dumps(payload), capture_output=True, text=True,
    )
    saida = r.stdout.strip()
    if not saida:
        return ""
    return json.loads(saida)["hookSpecificOutput"]["additionalContext"]


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

    print("── roteia-consulta ──")
    for prompt, esperado in CASOS_ROTA:
        ctx = roda_contexto("roteia-consulta.py", {"prompt": prompt})
        obtido = sorted(a for a in ("grafo", "planilha", "rls") if f"`{a}`" in ctx)
        ok = obtido == sorted(esperado)
        falhas += not ok
        print(f"  {'✓' if ok else '✗'} {prompt[:58]:60} {', '.join(obtido) or 'nao roteia'}")

    print("── portao-golden ──")
    for alvo, esperado in CASOS_GOLDEN:
        ctx = roda_contexto("portao-golden.py", {"tool_input": {"file_path": alvo}})
        ok = bool(ctx) == esperado
        falhas += not ok
        curto = alvo.replace(f"{RAIZ}/", "")
        print(f"  {'✓' if ok else '✗'} {curto:60} {'avisa' if ctx else 'silencio'}")

    print("── checklist-commit ──")
    pendencias = carrega("checklist-commit.py").pendencias
    for arquivos, esperado in CASOS_CHECKLIST:
        obtido = len(pendencias(arquivos))
        ok = obtido == esperado
        falhas += not ok
        rotulo = ", ".join(arquivos) or "(commit vazio)"
        print(f"  {'✓' if ok else '✗'} {rotulo[:58]:60} {obtido} pendencia(s)")

    print("── higiene (fumaça) ──")
    r = subprocess.run(
        ["python3", str(HOOKS / "higiene.py")],
        input="{}", capture_output=True, text=True, timeout=60,
    )
    ok = r.returncode == 0 and (not r.stdout.strip() or "hookSpecificOutput" in r.stdout)
    falhas += not ok
    print(f"  {'✓' if ok else '✗'} roda sem estourar{'':43} "
          f"{'com aviso' if r.stdout.strip() else 'silencio'}")
    if r.stderr.strip():
        print(f"      stderr: {r.stderr.strip()[:80]}")

    print(f"\n{'TODOS OS CASOS PASSARAM' if not falhas else f'{falhas} FALHA(S)'}")
    return 1 if falhas else 0


if __name__ == "__main__":
    raise SystemExit(main())
