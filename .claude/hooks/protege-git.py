#!/usr/bin/env python3
"""Travas de git do CLAUDE.md §0.3 e §9, aplicadas pelo harness.

Roda como hook PreToolUse em Bash. Três regras:

- `git push --force` é **negado**. O §9 proíbe sem exceção — a única já feita foi
  autorizada à mão, em resposta a incidente de segurança, fora de sessão de agente.
- **Desviar dos hooks de git é negado.** Os hooks de verdade (pre-commit, pre-push)
  vivem no `--git-common-dir` e são instalados por `scripts/instala-hooks.sh`, que diz
  "NÃO se usa core.hooksPath". Em 18/09/2026 um subagente rodou
  `git -c core.hooksPath=/dev/null commit` e trava nenhuma viu, porque este hook
  ancorava em `^git\\s+commit` — bastava uma opção global entre o `git` e o verbo.
  Agora o segmento é desmontado (`_comum.comando_git`) e são negados: `core.hooksPath`
  por `-c`, `--config-env` ou `GIT_CONFIG_*`; `git config` ESCREVENDO essa chave
  (ler continua livre); `--no-verify` em qualquer subcomando e o `-n` do `commit`
  (`-n` no `push` é `--dry-run`, e passa); e `commit-tree`, que grava commit sem
  passar por hook nenhum.
- `git commit`/`merge` na `main` **pergunta** antes. O §0.3 diz para nunca trabalhar
  na main, mas bloquear de vez atrapalharia um commit legítimo de emergência; então o
  hook interrompe e devolve a decisão pro dono. A branch é lida no diretório em que o
  comando TERMINA (`cd …` e `git -C …` contam), não no do processo do hook.

Uso legítimo do desvio: `scripts/hooks/testa-pre-push.sh:40` (canário do pre-push). Ele
é chamado como `bash scripts/hooks/testa-pre-push.sh`, e o hook só lê o texto do comando;
quem copiar a linha de dentro dele para o Bash é negado — e é esse o efeito desejado.
"""
import json
import os
import re
import subprocess
import sys

from _comum import com_dirs_C, comando_git, diretorio_final, segmentos, sem_mensagem

HOOKS_PATH = "core.hookspath"  # sempre comparado em minúsculas

# Argumentos de `git push` que reescrevem histórico: --force, --force-with-lease[=…],
# -f solto ou em cluster (-fu).
FORCE = re.compile(r"^(--force(-with-lease)?(=.*)?|-[a-zA-Z]*f[a-zA-Z]*)$")
# --no-verify e as abreviações que o git ainda aceita como únicas (--no-veri, --no-verif).
NO_VERIFY = re.compile(r"^--no-veri(f|fy)?$")
# Cluster curto com `n`: -n, -an, -nm… Só vale no `commit`.
CLUSTER_N = re.compile(r"^-[a-zA-Z]*n[a-zA-Z]*$")
# GIT_CONFIG_KEY_n=core.hooksPath / GIT_CONFIG_PARAMETERS='core.hooksPath=…'. Conferido no
# texto cru (sem mensagem), porque `_comum.PREFIXO_INOCUO` apaga `VAR=x ` do começo do
# segmento antes de qualquer outra leitura.
CONFIG_POR_ENV = re.compile(r"GIT_CONFIG_(?:KEY_\d+|PARAMETERS)=\S*core\.hookspath", re.I)

CONFIG_LE = {
    "--get", "--get-all", "--get-regexp", "--get-urlmatch", "-l", "--list",
    "--show-origin", "--show-scope", "get", "list",
}
CONFIG_ESCREVE = {
    "--add", "--replace-all", "--unset", "--unset-all", "--edit", "-e",
    "--rename-section", "--remove-section", "set", "unset",
}

MOTIVO_FORCE = (
    "Bloqueado pelo hook protege-git: `git push --force` é proibido pelo CLAUDE.md §9, "
    "sem exceção. A única reescrita de histórico já feita foi autorizada à mão, em "
    "resposta ao incidente de dado real exposto, fora de sessão de agente. Se for esse "
    "o caso de novo, rode você mesmo no terminal."
)
MOTIVO_DESVIO = (
    "Bloqueado pelo hook protege-git: {motivo} desvia dos hooks de git (pre-commit e "
    "pre-push). Eles vivem no --git-common-dir e são instalados por "
    "scripts/instala-hooks.sh, que diz 'NÃO se usa core.hooksPath'. Em 18/09/2026 um "
    "subagente desligou os hooks com core.hooksPath=/dev/null e nenhuma trava viu — é o "
    "furo que esta regra fecha. O único uso legítimo do desvio é o canário do pre-push, "
    "chamado como `bash scripts/hooks/testa-pre-push.sh`, nunca copiando a linha de dentro "
    "dele. Se o hook de git estiver errado, corrija o hook; quem tiver de passar por cima "
    "faz à mão no terminal e diz no PR por quê (CLAUDE.md §0)."
)
MOTIVO_MAIN = (
    "O CLAUDE.md §0.3 diz para nunca trabalhar direto na `main`, e você está nela. "
    "O fluxo é branch → validar em localhost:3015 → PR → CI verde → merge. "
    "Confirme só se este commit for mesmo exceção consciente."
)


def branch_atual(cwd: str) -> str:
    try:
        r = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            cwd=cwd, capture_output=True, text=True, timeout=5,
        )
        return r.stdout.strip()
    except (OSError, subprocess.SubprocessError):
        return ""


def escreve_hooks_path(args: list[str]) -> bool:
    """`git config …` que ALTERA core.hooksPath. Leitura (--get, -l, chave sem valor) não."""
    baixo = [a.lower() for a in args]
    if HOOKS_PATH not in baixo:
        return False
    if any(a in CONFIG_ESCREVE for a in baixo):
        return True
    if any(a in CONFIG_LE for a in baixo):
        return False
    depois = baixo[baixo.index(HOOKS_PATH) + 1:]
    return any(not a.startswith("-") for a in depois)  # chave seguida de valor = escrita


def desvio_de_hook(cmd: str) -> str | None:
    """Motivo (curto, para a mensagem) quando o comando desvia dos hooks de git; senão None."""
    if CONFIG_POR_ENV.search(sem_mensagem(cmd)):
        return "`GIT_CONFIG_*` apontando core.hooksPath"
    for seg in segmentos(cmd):
        cg = comando_git(seg)
        if cg is None:
            continue
        if HOOKS_PATH in cg.configs or HOOKS_PATH in cg.config_env:
            return "`-c`/`--config-env` com core.hooksPath"
        if cg.subcomando == "commit-tree":
            return "`git commit-tree` (grava commit sem hook)"
        if cg.subcomando == "config" and escreve_hooks_path(cg.args):
            return "`git config` escrevendo core.hooksPath"
        if any(NO_VERIFY.match(a) for a in cg.args):
            return "`--no-verify`"
        if cg.subcomando == "commit" and any(CLUSTER_N.match(a) for a in cg.args):
            return "`-n` (--no-verify) no commit"
    return None


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
    cwd = str(entrada.get("cwd") or os.getcwd())
    comandos = [cg for cg in (comando_git(s) for s in segmentos(cmd)) if cg is not None]

    if any(cg.subcomando == "push" and any(FORCE.match(a) for a in cg.args) for cg in comandos):
        decide("deny", MOTIVO_FORCE)
        return

    motivo = desvio_de_hook(cmd)
    if motivo:
        decide("deny", MOTIVO_DESVIO.format(motivo=motivo))
        return

    for cg in comandos:
        if cg.subcomando in ("commit", "merge"):
            base = diretorio_final(cmd, cwd)
            onde = com_dirs_C(base, cg.dirs_C) if base else None
            if branch_atual(onde or cwd) == "main":
                decide("ask", MOTIVO_MAIN)
                return


if __name__ == "__main__":
    main()
