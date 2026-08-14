#!/usr/bin/env python3
"""Trava que devolve o "somente leitura" aos agentes que ganharam memória.

Roda como hook PreToolUse **de agente**, declarado no frontmatter de cada
`.claude/agents/*.md` que usa `memory:` — não em `.claude/settings.json`. Só
vale para o agente que o declara; a sessão principal não passa por aqui.

Por que existe: ligar `memory:` num agente **habilita `Read`, `Write` e `Edit`
automaticamente**, para ele conseguir manter os próprios arquivos de memória.
Isso é documentado pela Anthropic e não é opcional — não adianta omitir `Write`
do campo `tools:`, o harness devolve mesmo assim.

O efeito colateral é que `grafo`, `planilha`, `rls`, `conformidade`, `schema` e
`historico` se anunciam como somente-leitura ("nunca edita código") e passariam
a poder editar código. A promessa viraria mentira sem trava.

Então a regra é de caminho, não de ferramenta: **escrita só dentro do diretório
de memória do próprio agente**. Qualquer outro alvo é negado, com o motivo dito
por extenso para o agente entender que não é falha dele.
"""
import json
import os
import sys

# Único lugar onde estes agentes podem escrever. Casa com `memory: project`, que
# a Anthropic resolve para `.claude/agent-memory/<nome-do-agente>/`.
PERMITIDO = ".claude/agent-memory/"

MOTIVO = (
    "Bloqueado pelo hook memoria-somente: `{alvo}` está fora de "
    "`.claude/agent-memory/`. Este agente é somente-leitura; as ferramentas "
    "`Write`/`Edit` só existem no contexto dele porque `memory:` as habilita "
    "automaticamente, e servem exclusivamente para manter a própria memória. "
    "Se a conclusão do trabalho é que um arquivo precisa mudar, **escreva o "
    "patch na resposta** para o dono aplicar — não aplique você."
)


def nega(motivo: str) -> None:
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": motivo,
        }
    }))


def dentro_da_memoria(alvo: str) -> bool:
    """Verdadeiro só se o caminho normalizado cai sob o diretório de memória.

    Normaliza antes de comparar porque `a/../.claude/agent-memory/x` e
    `.claude/agent-memory/../../etc/passwd` passariam por um `in` ingênuo — o
    primeiro como falso negativo, o segundo como falso POSITIVO, que é o que
    importa. `normpath` resolve os dois casos antes da comparação.
    """
    normalizado = os.path.normpath(alvo).replace(os.sep, "/")
    return f"/{PERMITIDO}" in f"/{normalizado}"


def main() -> None:
    try:
        entrada = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        return  # payload ilegível: não é motivo pra travar o trabalho

    alvo = str(entrada.get("tool_input", {}).get("file_path", ""))
    if not alvo:
        return

    if not dentro_da_memoria(alvo):
        nega(MOTIVO.format(alvo=alvo))


if __name__ == "__main__":
    main()
