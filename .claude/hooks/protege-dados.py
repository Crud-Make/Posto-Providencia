#!/usr/bin/env python3
"""Trava de escrita na fonte auditável do posto (CLAUDE.md §6).

Roda como hook PreToolUse em Write|Edit|NotebookEdit **e em Bash**. Lê o JSON do
harness na stdin e nega quando o alvo é dado auditável real.

Por que existe: o §6 diz que `docs/data/` nunca se edita e o xlsx original é
prova de auditoria. Instrução no CLAUDE.md é forte, mas depende de eu lembrar.
Isto não depende.

Por que também em Bash: cobrir só Write/Edit deixava a porta dos fundos aberta —
os agentes têm Bash, e `> docs/data/x` ou `sqlite3 ... "DELETE"` passariam por
fora da trava. Leitura via Bash continua livre; é o uso normal do agente
`planilha`.
"""
import json
import re
import sys

from _comum import segmentos

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


MOTIVO_SHELL = (
    "Bloqueado pelo hook protege-dados: este comando escreve em `docs/data/`, que é "
    "fonte auditável (CLAUDE.md §6). Leitura é livre — `SELECT` com `mode=ro`, `cat`, "
    "`grep` passam normalmente. Escrita, não: é a prova contra a qual os golden "
    "masters rodam. Se a alteração for mesmo necessária, é decisão do dono, feita à "
    "mão fora do agente."
)

# Escrita via shell em docs/data. Cada padrão exige que o comando INICIE o segmento —
# é o que separa executar de apenas mencionar. Leitura não casa nenhum deles.
ESCRITA_SHELL = (
    re.compile(r"^(rm|mv|cp|truncate|shred|dd)\b.*docs/data"),
    re.compile(r"^sed\b.*-i.*docs/data"),
    re.compile(r"^tee\b.*docs/data"),
    # sqlite3 sobre uma base de docs/data com verbo que altera
    re.compile(r"^sqlite3\b.*docs/data.*\b(INSERT|UPDATE|DELETE|DROP|ALTER)\b", re.I),
    # python abrindo caminho de docs/data em modo de escrita
    re.compile(r"^(python3?|bun|node)\b.*open\([^)]*docs/data[^)]*['\"][wax]"),
)
# Redirecionamento pode aparecer em qualquer posição do segmento — `>` fora de aspas
# é sempre operador, nunca menção.
REDIRECIONA = re.compile(r">>?\s*[^|;&\s]*docs/data")


def nega(motivo: str) -> None:
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": motivo,
        }
    }))


def main() -> None:
    try:
        entrada = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        return  # payload ilegível: não é motivo pra travar o trabalho

    entradas = entrada.get("tool_input", {})

    cmd = str(entradas.get("command", ""))
    if cmd:
        for seg in segmentos(cmd):
            if REDIRECIONA.search(seg) or any(p.search(seg) for p in ESCRITA_SHELL):
                nega(MOTIVO_SHELL)
                return
        return

    alvo = str(entradas.get("file_path", ""))
    if not alvo:
        return

    protegido = any(p in alvo for p in PROTEGIDOS) or (
        alvo.endswith(EXTENSOES_PROVA) and "/docs/" in alvo
    )
    if protegido:
        nega(MOTIVO.format(alvo=alvo))


if __name__ == "__main__":
    main()
