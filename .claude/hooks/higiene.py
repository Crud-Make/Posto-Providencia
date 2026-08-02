#!/usr/bin/env python3
"""Confere a saúde do ferramental no início da sessão. Cala a boca quando está tudo ok.

Roda como hook SessionStart. Três coisas que já falharam em silêncio aqui e que
ninguém percebe olhando o código do projeto:

- **Cache órfão de plugin.** A atualização do claude-mem de 24/07 deixou a versão
  13.12.1 para trás: 473 MB parados, 65× a versão viva. Descoberto por acaso em
  02/08, quase duas semanas depois.
- **Grafo velho.** O §12 manda tratar o grafo como hipótese, mas hipótese vinda de
  índice desatualizado é pior que nenhuma — aponta para arquivo que já mudou. Os
  hooks `post-commit`/`post-checkout` reconstroem sozinhos; se pararem, ninguém avisa.
- **Symlink de skill quebrado.** As skills de domínio são cópia única no repo mais
  symlink na pasta pai (decisão de 29/07, para drift ser impossível). Symlink
  apontando para o vazio não dá erro: a skill simplesmente deixa de existir, e
  perder a skill de fechamento é perder a fonte de verdade do cálculo.

Silencioso por princípio: aviso que aparece toda sessão vira ruído e deixa de ser
lido. Só fala quando tem o que dizer.
"""
import json
import subprocess
from pathlib import Path

CASA = Path.home()
RAIZ = Path(__file__).resolve().parent.parent.parent
CACHE = CASA / ".claude/plugins/cache"
INSTALADOS = CASA / ".claude/plugins/installed_plugins.json"
SKILLS_PAI = RAIZ.parent / ".claude/skills"
GRAFO = RAIZ / "graphify-out/graph.html"

# Órfão pequeno não paga o ruído do aviso; 50 MB é onde passa a valer a limpeza.
LIMITE_ORFAO_MB = 50

# O rebuild do grafo roda em background depois do commit e leva de segundos a minutos.
# Sem folga, QUALQUER commit recente dispara o aviso — o hook reclamaria toda sessão e
# viraria ruído, que é o oposto do que ele existe para fazer. Achado testando em 02/08,
# logo após um rebase: "grafo 0h mais velho que o último commit".
TOLERANCIA_GRAFO_H = 2


def caches_orfaos() -> list[str]:
    """Versão em cache que o installed_plugins.json não referencia mais."""
    if not INSTALADOS.exists() or not CACHE.is_dir():
        return []
    try:
        dados = json.loads(INSTALADOS.read_text())
    except (json.JSONDecodeError, OSError):
        return []

    vivos = {
        str(inst.get("installPath", "")).rstrip("/")
        for versoes in dados.get("plugins", {}).values()
        for inst in versoes
    }

    achados = []
    for versao in CACHE.glob("*/*/*"):
        if not versao.is_dir() or str(versao).rstrip("/") in vivos:
            continue
        mb = sum(f.stat().st_size for f in versao.rglob("*") if f.is_file()) // 1_048_576
        if mb >= LIMITE_ORFAO_MB:
            achados.append(f"{versao.relative_to(CACHE)} ({mb} MB)")
    return achados


def grafo_velho() -> str | None:
    """Grafo mais antigo que o último commit = os hooks de rebuild pararam."""
    if not GRAFO.exists():
        return None
    try:
        r = subprocess.run(
            ["git", "-C", str(RAIZ), "log", "-1", "--format=%ct"],
            capture_output=True, text=True, timeout=5,
        )
        commit = int(r.stdout.strip())
    except (OSError, subprocess.SubprocessError, ValueError):
        return None

    horas = (commit - GRAFO.stat().st_mtime) / 3600
    if horas < TOLERANCIA_GRAFO_H:
        return None
    return f"grafo está {int(horas)}h mais velho que o último commit"


def symlinks_quebrados() -> list[str]:
    if not SKILLS_PAI.is_dir():
        return []
    return [
        p.name for p in SKILLS_PAI.iterdir()
        if p.is_symlink() and not p.resolve().exists()
    ]


def main() -> None:
    avisos = []

    orfaos = caches_orfaos()
    if orfaos:
        avisos.append(
            "· Cache de plugin órfão ocupando disco: " + ", ".join(orfaos)
            + ". Nenhum está em uso; podem ser apagados."
        )

    velho = grafo_velho()
    if velho:
        avisos.append(
            f"· O {velho} — os hooks post-commit/post-checkout podem ter parado. "
            "Rebuild da raiz numa passada só: `graphify update . --force` (§12 — "
            "nunca indexar sub-pasta e juntar com merge-graphs)."
        )

    quebrados = symlinks_quebrados()
    if quebrados:
        avisos.append(
            "· Symlink de skill apontando para o vazio: " + ", ".join(quebrados)
            + ". Essas skills não estão carregando — a fonte de verdade do domínio "
            "está fora do ar."
        )

    if not avisos:
        return

    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "SessionStart",
            "additionalContext": "[hook higiene]\n" + "\n".join(avisos),
        }
    }))


if __name__ == "__main__":
    main()
