#!/usr/bin/env python3
"""Trava de escrita na fonte auditável do posto (CLAUDE.md §6).

Roda como hook PreToolUse em Write|Edit|NotebookEdit. Lê o JSON do harness na
stdin e nega a escrita quando o alvo é dado auditável real.

Por que existe: o §6 diz que `docs/data/` nunca se edita e o xlsx original é
prova de auditoria. Instrução no CLAUDE.md é forte, mas depende de eu lembrar.
Isto não depende.
"""
import json
import sys

# Caminhos que não se escreve. Substring simples — basta o alvo passar por aqui.
PROTEGIDOS = ("/docs/data/", "docs/data/")
EXTENSOES_PROVA = (".xlsx", ".sqlite", ".sqlite3")

MOTIVO = (
    "Bloqueado pelo hook protege-dados: `{alvo}` é fonte auditável (CLAUDE.md §6). "
    "O xlsx original não se edita e docs/data/ não se altera — é a prova contra a "
    "qual os golden masters rodam. Para LER esse dado, use o agente `planilha`, "
    "que abre o sqlite em mode=ro. Se a alteração for mesmo necessária, ela é "
    "decisão do dono, feita à mão fora do agente."
)


def main() -> None:
    try:
        entrada = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        return  # payload ilegível: não é motivo pra travar o trabalho

    alvo = str(entrada.get("tool_input", {}).get("file_path", ""))
    if not alvo:
        return

    protegido = any(p in alvo for p in PROTEGIDOS) or (
        alvo.endswith(EXTENSOES_PROVA) and "/docs/" in alvo
    )
    if not protegido:
        return

    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": MOTIVO.format(alvo=alvo),
        }
    }))


if __name__ == "__main__":
    main()
