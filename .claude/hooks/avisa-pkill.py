#!/usr/bin/env python3
"""Aviso quando `pkill -f`/`pgrep -f` casa com a linha de comando do próprio shell.

Roda como hook PreToolUse em Bash e emite SÓ `additionalContext` — nunca
`permissionDecision` (nem `allow`, que pularia o sistema de permissões). É aviso,
não trava: mesmo desenho do `diario-de-sessoes`.

Por que existe: o harness executa cada comando como `bash -c '… eval <cmd>'`, então a
linha de comando do shell da sessão CONTÉM o texto do comando. `pkill -f 'bun dev'`
procura "bun dev" em todas as linhas de comando — inclusive na do próprio bash que o
está rodando — e mata o shell da sessão junto. Em 18 e 19/09/2026 isso derrubou o
shell duas vezes. O `-f` sem `-f` (`pkill bun`) compara só o nome do processo e não
tem esse problema; `pgrep -f` não mata, mas lista o próprio shell e confunde a leitura.

Como decide: para cada segmento que começa com `pkill` ou `pgrep` e tem `-f`/`--full`
(solto ou em cluster: -af, -fl, -fx…), pega o padrão (primeiro token que não é opção
nem valor de opção) e testa `re.search(padrão, comando inteiro)`. Casou → avisa.
Regex que o `re` não entende → avisa também (aviso é barato; o pkill usa ERE e o
dialeto pode divergir do Python — aviso a mais é aceitável, a menos não).

Saídas seguras que o aviso sugere: `pgrep -af <padrão>` para ver, anotar o PID e
`kill <pid>`; ou padrão com colchete (`[b]un dev`), que casa "bun dev" nos outros
processos mas não casa consigo mesmo, porque o texto literal é "[b]un dev".

Sem subprocess: custo zero. JSON ilegível sai calado, como os demais hooks.
"""
import json
import re
import sys

from _comum import segmentos, tokens_de

COMANDOS = ("pkill", "pgrep")
# -f solto ou em cluster de letras (-af, -fl, -fx). `-9f` não existe: o sinal é opção à parte.
FULL = re.compile(r"^(-[a-zA-Z]*f[a-zA-Z]*|--full)$")
# Opções de pkill/pgrep que consomem o token seguinte (quando não vêm coladas com `=`).
COM_VALOR = {
    "-u", "--uid", "-U", "--euid", "-g", "--pgroup", "-G", "--group", "-P", "--parent",
    "-s", "--session", "-t", "--terminal", "--signal", "--ns", "--nslist", "--cgroup",
    "-d", "--delimiter", "-r", "--runstates", "-O", "--older", "-F", "--pidfile",
}

AVISO = (
    "[hook avisa-pkill] `{comando} -f {padrao}`: este padrão casa com a linha de comando do "
    "próprio shell da sessão (o harness roda `bash -c '… eval <comando>'`, e a linha contém o "
    "texto do comando). Em 18-19/09/2026 isso matou o shell duas vezes. Prefira: "
    "`pgrep -af {padrao}` para ver, anotar o PID e `kill <pid>`; ou escreva o padrão com "
    "colchete (ex.: `[b]un dev`), que não casa consigo mesmo. Isto é aviso, não trava."
)


def padrao_de(tokens: list[str]) -> str | None:
    """Primeiro argumento posicional de `pkill`/`pgrep` (o padrão), pulando opções e valores."""
    i = 1
    while i < len(tokens):
        t = tokens[i]
        if t == "--":
            return tokens[i + 1] if i + 1 < len(tokens) else None
        if t.startswith("-") and len(t) > 1:
            if t in COM_VALOR:
                i += 2
                continue
            i += 1
            continue
        return t
    return None


def casa_com_a_propria_linha(cmd: str) -> tuple[str, str] | None:
    """(comando, padrão) quando um `pkill -f`/`pgrep -f` do comando casa com o próprio texto."""
    for seg in segmentos(cmd):
        tokens = tokens_de(seg)
        if not tokens or tokens[0] not in COMANDOS:
            continue
        if not any(FULL.match(t) for t in tokens[1:]):
            continue
        padrao = padrao_de(tokens)
        if padrao is None:
            continue
        try:
            casou = re.search(padrao, cmd) is not None
        except re.error:
            casou = True  # dialeto diferente: erra para o lado do aviso
        if casou:
            return tokens[0], padrao
    return None


def main() -> None:
    try:
        entrada = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        return
    cmd = str(entrada.get("tool_input", {}).get("command", ""))
    if not cmd:
        return
    achado = casa_com_a_propria_linha(cmd)
    if achado is None:
        return
    comando, padrao = achado
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "additionalContext": AVISO.format(comando=comando, padrao=padrao),
        }
    }))


if __name__ == "__main__":
    main()
