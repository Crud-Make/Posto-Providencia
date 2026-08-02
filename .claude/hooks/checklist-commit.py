#!/usr/bin/env python3
"""Aplica o checklist do fim do CLAUDE.md na hora do commit, em vez de lembrar dele.

Roda como hook PreToolUse em Bash. Confere o que está de fato indo no commit —
`git diff --cached`, não a mensagem — e **pergunta** (nunca nega) quando falta algo:

- Arquivo de fórmula no commit → o §0.6 exige golden master rodando.
- Código mudou e o `CHANGELOG.md` não veio junto → o §9 pede a cada bug corrigido
  ou funcionalidade concluída.

Pergunta em vez de negar porque os dois casos têm exceção legítima: refatoração
estrutural que não toca conta, commit de WIP numa branch. A decisão continua sendo
do dono; o hook só garante que ela seja consciente — mesmo desenho do `protege-git`
para commit na `main`.

Inspecionar o índice, e não o texto do comando, imuniza este hook contra o bug que
mordeu o `protege-git` duas vezes: mensagem que *descreve* a mudança não é a mudança.
"""
import json
import re
import subprocess
import sys

from _comum import segmentos

COMMIT = re.compile(r"^git\s+commit\b")
# -a/--all põem no commit o que está só modificado; aí o índice ainda não reflete tudo.
TUDO = re.compile(r"(^|\s)(-\w*a\w*|--all)(\s|$)")

FORMULA = re.compile(
    r"^packages/utils/src/(?!.*\.(test|spec)\.ts$)[\w.-]+\.ts$"
    r"|^apps/web/src/services/api/aggregator\.service\.ts$"
)
# Mudança que não pede CHANGELOG: doc, config de editor, o próprio changelog.
DISPENSA_CHANGELOG = re.compile(
    r"^(docs/|\.claude/|\.vscode/|CHANGELOG\.md$|README\.md$|.*\.md$)"
)


def arquivos_do_commit(cmd: str) -> list[str]:
    args = ["git", "diff", "--name-only"]
    args += ["HEAD"] if TUDO.search(cmd) else ["--cached"]
    try:
        r = subprocess.run(args, capture_output=True, text=True, timeout=5)
    except (OSError, subprocess.SubprocessError):
        return []
    return [linha for linha in r.stdout.splitlines() if linha.strip()]


def pendencias(arquivos: list[str]) -> list[str]:
    faltas = []

    formulas = [a for a in arquivos if FORMULA.search(a)]
    if formulas:
        faltas.append(
            "· Fórmula no commit (" + ", ".join(formulas[:3])
            + ("…" if len(formulas) > 3 else "")
            + "). O §0.6 não abre exceção: `bun run test:golden` tem de ter rodado "
            "verde. Se ainda não rodou, cancele e rode."
        )

    codigo = [a for a in arquivos if not DISPENSA_CHANGELOG.search(a)]
    if codigo and "CHANGELOG.md" not in arquivos:
        faltas.append(
            "· `CHANGELOG.md` não está no commit, mas código mudou ("
            + ", ".join(codigo[:3]) + ("…" if len(codigo) > 3 else "")
            + "). O §9 pede a seção [Não Lançado] atualizada a cada bug corrigido "
            "ou funcionalidade concluída."
        )

    return faltas


def main() -> None:
    try:
        entrada = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        return

    cmd = str(entrada.get("tool_input", {}).get("command", ""))
    if not cmd or not any(COMMIT.match(s) for s in segmentos(cmd)):
        return

    faltas = pendencias(arquivos_do_commit(cmd))
    if not faltas:
        return

    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "ask",
            "permissionDecisionReason": (
                "Checklist do CLAUDE.md com pendência neste commit:\n"
                + "\n".join(faltas)
                + "\n\nConfirme só se for exceção consciente."
            ),
        }
    }))


if __name__ == "__main__":
    main()
