#!/usr/bin/env python3
"""Dependência nunca entra por symlink: `vendor` e `node_modules` se instalam.

Roda como hook PreToolUse em Bash e **nega** `ln -s` (e `cp -s`) cujo alvo ou nome
termine em `vendor` ou `node_modules`.

Por que existe: em 18/09/2026 (PR #115) o `backend/vendor` de uma worktree era symlink
para o da árvore principal. O autoload do Composer resolve `$baseDir` pelo caminho REAL
do vendor (`vendor/composer/autoload_psr4.php`), então o Pest carregou `App\\` e `Tests\\`
da árvore de ORIGEM — sadia — e o gate deu verde testando o código errado
(`scripts/hooks/testa-pre-push.sh:9-11`, caso 3: "com ele, o App\\ carregado é o da
árvore de origem, sadio, e o push passava"). `node_modules` com `@posto/*` tem o mesmo
risco (memória worktree-nao-herda-dependencias). A saída é sempre a mesma:
`composer install` em `backend/` e `bun install` em `frontend/`, na própria worktree.

Isto revoga a receita antiga de "ligar os 7 node_modules" ao abrir worktree.

O que continua livre: `ln -sfn <principal>/docs/data docs/data` (o único symlink de
worktree que vale — dado auditável, não dependência; `scripts/hooks/pre-push` faz o
mesmo), qualquer `ln` que não aponte para vendor/node_modules, e a menção em mensagem
de commit ou `echo` (regra do `_comum.segmentos`: comando que executa INICIA o segmento).

Hook próprio, e não bloco no `protege-git`: `ln` não é git, e o padrão daqui é um hook
por regra. Só nega; JSON ilegível sai calado, como os demais.
"""
import json
import re
import sys

from _comum import segmentos, tokens_de

DEPENDENCIA = {"vendor", "node_modules"}
# `-s` solto ou em cluster (-sfn, -sf, -fs) e `--symbolic`; no cp, `-s`/`--symbolic-link`.
LN_SIMBOLICO = re.compile(r"^(-[a-zA-Z]*s[a-zA-Z]*|--symbolic)$")
CP_SIMBOLICO = re.compile(r"^(-[a-zA-Z]*s[a-zA-Z]*|--symbolic-link)$")

MOTIVO = (
    "Bloqueado pelo hook protege-dependencias: `{alvo}` é dependência, e dependência não "
    "entra por symlink. Em 18/09/2026 o vendor linkado fez o autoload do Composer resolver "
    "$baseDir pelo caminho real e o Pest carregar App\\ da árvore de ORIGEM — gate verde "
    "testando o código errado (scripts/hooks/testa-pre-push.sh:9-11). node_modules com "
    "@posto/* tem o mesmo risco. Instale de verdade na worktree: `composer install` em "
    "backend/ e `bun install --frozen-lockfile` em frontend/. O único symlink de worktree "
    "que vale é o de docs/data (dado auditável, não dependência)."
)


def alvos_de_dependencia(cmd: str) -> list[str]:
    """Caminhos de `ln -s`/`cp -s` cujo nome final é vendor ou node_modules (alvo OU link)."""
    achados: list[str] = []
    for seg in segmentos(cmd):
        tokens = tokens_de(seg)
        if not tokens:
            continue
        flag = {"ln": LN_SIMBOLICO, "cp": CP_SIMBOLICO}.get(tokens[0])
        if flag is None or not any(flag.match(t) for t in tokens[1:]):
            continue
        for caminho in (t for t in tokens[1:] if not t.startswith("-")):
            nome = caminho.strip("'\"").rstrip("/").rsplit("/", 1)[-1]
            if nome in DEPENDENCIA:
                achados.append(caminho)
    return achados


def nega(alvo: str) -> None:
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": MOTIVO.format(alvo=alvo),
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
    alvos = alvos_de_dependencia(cmd)
    if alvos:
        nega(alvos[0])


if __name__ == "__main__":
    main()
