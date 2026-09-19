#!/usr/bin/env python3
"""Aplica o checklist do fim do CLAUDE.md na hora do commit, em vez de lembrar dele.

Roda como hook PreToolUse em Bash. Confere o que está de fato indo no commit e
**pergunta** (nunca nega) quando falta algo:

- Arquivo de fórmula no commit → o §0.6 exige golden master rodando.
- Código mudou e o `CHANGELOG.md` não veio junto → o §9 pede a cada bug corrigido
  ou funcionalidade concluída.

Pergunta em vez de negar porque os dois casos têm exceção legítima: refatoração
estrutural que não toca conta, commit de WIP numa branch. A decisão continua sendo
do dono; o hook só garante que ela seja consciente — mesmo desenho do `protege-git`
para commit na `main`.

O que o hook enxerga como "o que vai no commit":

1. o índice (`git diff --name-only --cached`, ou `HEAD` quando o commit tem `-a`), lido
   no diretório em que o comando TERMINA (`cd …` e `git -C …` contam);
2. mais o que cada `git add` ANTERIOR ao commit, no mesmo comando, vai pôr no índice —
   simulado com `git add --dry-run` (man git-add: "Don't actually add the file(s), just
   show if they exist and/or will be ignored"). Até 19/09/2026 o hook lia só o índice, no
   diretório do processo: `git add x.ts && git commit -m …` passava sem pergunta porque,
   na hora do hook, o índice ainda estava vazio (foi assim que o 0af5e41 subiu sem
   CHANGELOG), e um `cd ../outra && git commit` era avaliado no repo errado.

Quando não dá para apurar (`cd $D`, `git add $F`, xargs, add interativo, git que falha)
o hook **pergunta** com o motivo, em vez de liberar em silêncio como fazia antes.

Inspecionar o índice, e não o texto do comando, imuniza este hook contra o bug que
mordeu o `protege-git` duas vezes: mensagem que *descreve* a mudança não é a mudança.
"""
import json
import os
import re
import subprocess
import sys
from pathlib import Path

from _comum import com_dirs_C, comando_git, diretorios, e_formula, segmentos

# -a/--all põem no commit o que está só modificado; aí o índice ainda não reflete tudo.
TUDO = re.compile(r"(^|\s)(-\w*a\w*|--all)(\s|$)")

# O que é fórmula vem de `_comum.FORMULA` (lista única; desde 19/09/2026 inclui o backend).
# Mudança que não pede CHANGELOG: doc, config de editor, o próprio changelog.
DISPENSA_CHANGELOG = re.compile(
    r"^(docs/|\.claude/|\.vscode/|CHANGELOG\.md$|README\.md$|.*\.md$)"
)

# `git add` que só se resolve executando (variável, subshell, xargs) ou que abre diálogo.
NAO_SIMULAVEL = re.compile(r"[$`]|\bxargs\b")
INTERATIVO = {"-p", "--patch", "-i", "--interactive", "-e", "--edit"}
LINHA_DO_DRY_RUN = re.compile(r"^(?:add|remove) '(.*)'$")
TIMEOUT = 10

MOTIVO_NAO_APUREI = (
    "Checklist do CLAUDE.md: não consegui apurar o que vai neste commit — o `cd` ou o "
    "`git add` dependem de variável/subshell/xargs, o add é interativo, ou o git falhou "
    "no diretório em que o comando roda. Separe `git add` e `git commit` em chamadas "
    "distintas (aí o índice diz tudo), ou confirme só se for exceção consciente."
)


def _git(args: list[str], onde: str) -> str | None:
    try:
        r = subprocess.run(["git", *args], cwd=onde, capture_output=True, text=True, timeout=TIMEOUT)
    except (OSError, subprocess.SubprocessError):
        return None
    return r.stdout if r.returncode == 0 else None


def simula_add(onde: str, args: list[str]) -> list[str] | None:
    """Caminhos, relativos ao topo do repo, que `git add <args>` poria no índice."""
    args = [a for a in args if a not in ("-n", "--dry-run")]
    saida = _git(["add", "--dry-run", *args], onde)
    topo = _git(["rev-parse", "--show-toplevel"], onde)
    prefixo = _git(["rev-parse", "--show-prefix"], onde)
    if saida is None or topo is None or prefixo is None:
        return None
    topo, prefixo = topo.strip(), prefixo.strip()
    achados = []
    for linha in saida.splitlines():
        m = LINHA_DO_DRY_RUN.match(linha)
        if not m:
            continue
        caminho = m.group(1)
        # Normaliza para "relativo ao topo": se o git imprimiu relativo ao cwd de um
        # subdiretório, o prefixo entra.
        if prefixo and not Path(topo, caminho).exists() and Path(onde, caminho).exists():
            caminho = prefixo + caminho
        achados.append(caminho)
    return achados


def no_indice(onde: str, tudo: bool) -> list[str] | None:
    saida = _git(["diff", "--name-only", "HEAD" if tudo else "--cached"], onde)
    if saida is None:
        return None
    return [linha for linha in saida.splitlines() if linha.strip()]


def arquivos_do_commit(cmd: str, cwd: str) -> list[str] | None:
    """Índice + o que os `git add` do mesmo comando vão pôr nele. None = não dá para apurar."""
    segs = segmentos(cmd)
    dirs = diretorios(cmd, cwd)
    comandos = [comando_git(s) for s in segs]
    idx = next((i for i, cg in enumerate(comandos) if cg and cg.subcomando == "commit"), None)
    if idx is None:
        return []
    arquivos: list[str] = []
    for i in range(idx):
        cg = comandos[i]
        if cg is None or cg.subcomando != "add":
            continue
        if NAO_SIMULAVEL.search(segs[i]) or any(a in INTERATIVO for a in cg.args):
            return None
        onde = com_dirs_C(dirs[i], cg.dirs_C) if dirs[i] else None
        simulado = simula_add(onde, cg.args) if onde else None
        if simulado is None:
            return None
        arquivos += simulado
    commit = comandos[idx]
    onde = com_dirs_C(dirs[idx], commit.dirs_C) if dirs[idx] else None
    indice = no_indice(onde, bool(TUDO.search(" ".join(commit.args)))) if onde else None
    if indice is None:
        return None
    return list(dict.fromkeys(arquivos + indice))


def pendencias(arquivos: list[str]) -> list[str]:
    faltas = []

    formulas = [a for a in arquivos if e_formula(a, com_testes_de_regra=False)]
    if formulas:
        texto = (
            "· Fórmula no commit (" + ", ".join(formulas[:3])
            + ("…" if len(formulas) > 3 else "")
            + "). O §0.6 não abre exceção: `bun run test:golden` tem de ter rodado "
            "verde. Se ainda não rodou, cancele e rode."
        )
        if any(a.endswith(".php") for a in formulas):
            texto += (
                " Dinheiro do backend não tem golden PHP (pendência de 19/09/2026): "
                "`cd backend && composer gates` verde também, e o golden do TS que consome o número."
            )
        faltas.append(texto)

    codigo = [a for a in arquivos if not DISPENSA_CHANGELOG.search(a)]
    if codigo and "CHANGELOG.md" not in arquivos:
        faltas.append(
            "· `CHANGELOG.md` não está no commit, mas código mudou ("
            + ", ".join(codigo[:3]) + ("…" if len(codigo) > 3 else "")
            + "). O §9 pede a seção [Não Lançado] atualizada a cada bug corrigido "
            "ou funcionalidade concluída."
        )

    return faltas


def pergunta(motivo: str) -> None:
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "ask",
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
    comandos = [comando_git(s) for s in segmentos(cmd)]
    if not any(cg and cg.subcomando == "commit" for cg in comandos):
        return

    arquivos = arquivos_do_commit(cmd, str(entrada.get("cwd") or os.getcwd()))
    if arquivos is None:
        pergunta(MOTIVO_NAO_APUREI)
        return

    faltas = pendencias(arquivos)
    if not faltas:
        return
    pergunta(
        "Checklist do CLAUDE.md com pendência neste commit:\n"
        + "\n".join(faltas)
        + "\n\nConfirme só se for exceção consciente."
    )


if __name__ == "__main__":
    main()
