#!/usr/bin/env python3
"""Travas de git do CLAUDE.md §0.3 e §9, aplicadas pelo harness.

Roda como hook PreToolUse em Bash. Duas regras:

- `git push --force` é **negado**. O §9 proíbe sem exceção — a única já feita foi
  autorizada à mão, em resposta a incidente de segurança, fora de sessão de agente.
- `git commit` na `main` **pergunta** antes. O §0.3 diz para nunca trabalhar na main,
  mas bloquear de vez atrapalharia um commit legítimo de emergência; então o hook
  interrompe e devolve a decisão pro dono.
"""
import json
import re
import subprocess
import sys

from _comum import segmentos

# `git push` seguido de --force / --force-with-lease / -f, ainda que com flags no meio.
FORCE_PUSH = re.compile(
    r"^git\s+push\b.*?(--force(-with-lease)?\b|\s-f(\s|$))"
)
COMMIT = re.compile(r"^git\s+(commit|merge)\b")

MOTIVO_FORCE = (
    "Bloqueado pelo hook protege-git: `git push --force` é proibido pelo CLAUDE.md §9, "
    "sem exceção. A única reescrita de histórico já feita foi autorizada à mão, em "
    "resposta ao incidente de dado real exposto, fora de sessão de agente. Se for esse "
    "o caso de novo, rode você mesmo no terminal."
)
MOTIVO_MAIN = (
    "O CLAUDE.md §0.3 diz para nunca trabalhar direto na `main`, e você está nela. "
    "O fluxo é branch → validar em localhost:3015 → PR → CI verde → merge. "
    "Confirme só se este commit for mesmo exceção consciente."
)


def branch_atual() -> str:
    try:
        r = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            capture_output=True, text=True, timeout=5,
        )
        return r.stdout.strip()
    except (OSError, subprocess.SubprocessError):
        return ""


def decide(decisao: str, motivo: str) -> None:
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": decisao,
            "permissionDecisionReason": motivo,
        }
    }))


def main() -> None:
    try:
        entrada = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        return

    cmd = str(entrada.get("tool_input", {}).get("command", ""))
    if not cmd:
        return
    segs = segmentos(cmd)

    if any(FORCE_PUSH.search(s) for s in segs):
        decide("deny", MOTIVO_FORCE)
        return

    if any(COMMIT.match(s) for s in segs) and branch_atual() == "main":
        decide("ask", MOTIVO_MAIN)


if __name__ == "__main__":
    main()
