#!/usr/bin/env python3
"""Diário compartilhado entre sessões — quem mexeu no quê, e onde.

POR QUE EXISTE. Em 16/08/2026 duas sessões trabalharam no mesmo repositório ao
mesmo tempo e nenhuma sabia da outra. O custo, medido:

  - as duas editaram `apps/pwa-frentista/src/services/api.ts`. A segunda
    commitou entre a conferência da primeira e o `git add` dela, e o commit
    saiu pela metade — só o CHANGELOG, sem o código que ele descrevia.
  - uma delas empurrou três branches para o remoto, incluindo a branch da
    outra, ANTES de o dono validar qualquer coisa. O §9 pede "ok" explícito
    para push; ninguém desobedeceu de propósito, é que ninguém sabia.
  - uma gravou linha de teste no banco e a outra tomou `duplicate key` sem
    entender por quê — o diagnóstico levou dez minutos e três consultas.
  - três servidores de dev subiram em portas diferentes servindo ÁRVORES
    diferentes, e conferir a correção na porta errada mostra o bug intacto.

Nada disso é erro de julgamento. É ausência de sinal: sessão não enxerga
sessão. Este hook fabrica o sinal.

O QUE ELE FAZ. Registra em `.claude/logs/sessoes.jsonl` os eventos que
importam para outra sessão — commit, push, escrita de arquivo, SQL de
escrita — e, no início de cada sessão, mostra o que as OUTRAS fizeram nas
últimas horas e quem está vivo agora.

O QUE ELE NÃO FAZ, e é decisão: não bloqueia nada. Um hook que barrasse
escrita concorrente pararia trabalho legítimo (duas sessões em arquivos
diferentes é o caso comum e saudável). O problema nunca foi permissão, foi
informação. Ele informa e sai do caminho.

Silencioso quando não há nada de outra sessão — aviso que aparece sempre
deixa de ser lido, que é a regra do `higiene.py`.
"""
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

RAIZ = Path(os.environ.get("CLAUDE_PROJECT_DIR", "."))
DIARIO = RAIZ / ".claude" / "logs" / "sessoes.jsonl"
# Janela do que se considera "recente" ao abrir a sessão. 6h cobre um turno de
# trabalho sem trazer a semana inteira.
JANELA_H = 6
# Teto de linhas lidas do fim do arquivo. O diário é append-only e cresce; ler
# tudo num repo de meses seria caro para um hook que roda a cada ferramenta.
TETO_LINHAS = 400

# Onde o harness abre socket por sessão viva nesta máquina. Contar arquivos ali
# é mais barato e mais confiável do que varrer processos.
SOCKS = Path(f"/run/user/{os.getuid()}/cc-socks")

ESCRITA_SQL = re.compile(
    r"\b(insert\s+into|update\s+|delete\s+from|truncate|alter\s+table|drop\s+)", re.I
)


# Preenchido uma vez, no `main`, a partir do payload do harness.
_EU = ""


def sessao_id(entrada: dict | None = None) -> str:
    """Identidade curta e estável da sessão, para separar 'eu' de 'os outros'.

    @remarks Sai do `session_id` do PAYLOAD, não do PID. O hook roda num
             processo novo a cada ferramenta, então PID muda toda vez — e com
             ele a identidade, fazendo a sessão enxergar a si mesma na lista de
             "outras". Foi o primeiro defeito que o teste deste hook pegou.
    """
    global _EU
    if entrada is not None:
        _EU = str(
            entrada.get("session_id")
            or os.environ.get("CLAUDE_SESSION_ID")
            or os.getppid()
        )[:12]
    return _EU


def arvore() -> str:
    """Qual worktree — é o que distingue 3015 de 3016 de 3017."""
    try:
        r = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            cwd=RAIZ, capture_output=True, text=True, timeout=3,
        )
        return Path(r.stdout.strip()).name if r.returncode == 0 else "?"
    except Exception:
        return "?"


def branch() -> str:
    try:
        r = subprocess.run(
            ["git", "branch", "--show-current"],
            cwd=RAIZ, capture_output=True, text=True, timeout=3,
        )
        return r.stdout.strip() or "(destacado)"
    except Exception:
        return "?"


def anotar(tipo: str, resumo: str) -> None:
    """Append-only. Falha em silêncio: diário não pode derrubar ferramenta."""
    try:
        DIARIO.parent.mkdir(parents=True, exist_ok=True)
        linha = {
            "t": int(time.time()),
            "sessao": sessao_id(),
            "arvore": arvore(),
            "branch": branch(),
            "tipo": tipo,
            "resumo": resumo[:300],
        }
        with DIARIO.open("a", encoding="utf-8") as f:
            f.write(json.dumps(linha, ensure_ascii=False) + "\n")
    except Exception:
        pass


def eventos_recentes() -> list[dict]:
    if not DIARIO.exists():
        return []
    try:
        linhas = DIARIO.read_text(encoding="utf-8").splitlines()[-TETO_LINHAS:]
    except Exception:
        return []
    corte = time.time() - JANELA_H * 3600
    eu = sessao_id()
    fora = []
    for ln in linhas:
        try:
            e = json.loads(ln)
        except Exception:
            continue
        if e.get("t", 0) >= corte and e.get("sessao") != eu:
            fora.append(e)
    return fora


def sessoes_vivas() -> int:
    try:
        return len(list(SOCKS.glob("*.sock")))
    except Exception:
        return 0


# ─── PostToolUse: registrar ──────────────────────────────────────────────────

def registrar(entrada: dict) -> None:
    nome = entrada.get("tool_name", "")
    ent = entrada.get("tool_input", {}) or {}

    if nome in ("Write", "Edit", "NotebookEdit"):
        caminho = str(ent.get("file_path", ""))
        try:
            caminho = str(Path(caminho).relative_to(RAIZ))
        except Exception:
            pass
        # Ruído que não interessa a outra sessão.
        if any(p in caminho for p in (".claude/logs", "node_modules", "/tmp/")):
            return
        anotar("arquivo", caminho)
        return

    if nome == "Bash":
        cmd = str(ent.get("command", ""))
        # Só o que outra sessão precisa saber. `git status`, `ls` e afins não.
        if re.search(r"\bgit\s+commit\b", cmd):
            anotar("commit", _ultimo_commit())
        elif re.search(r"\bgit\s+push\b", cmd):
            anotar("push", cmd[:160])
        elif re.search(r"\bgit\s+(checkout|switch)\s+-b\b", cmd):
            anotar("branch-nova", branch())
        elif re.search(r"\bgit\s+worktree\s+add\b", cmd):
            anotar("worktree", cmd[:160])
        elif re.search(r"--port\s*=?\s*(\d{4})", cmd) and "vite" in cmd:
            porta = re.search(r"--port\s*=?\s*(\d{4})", cmd).group(1)
            anotar("servidor", f"porta {porta} servindo {arvore()}")
        return

    if nome.startswith("mcp__supabase__"):
        sql = str(ent.get("query", ""))
        if ESCRITA_SQL.search(sql):
            anotar("banco", re.sub(r"\s+", " ", sql)[:200])
        return


def _ultimo_commit() -> str:
    try:
        r = subprocess.run(
            ["git", "log", "--oneline", "-1"],
            cwd=RAIZ, capture_output=True, text=True, timeout=3,
        )
        return r.stdout.strip()
    except Exception:
        return "(commit)"


# ─── SessionStart: contar o que os outros fizeram ────────────────────────────

ROTULO = {
    "commit": "commit",
    "push": "PUSH",
    "branch-nova": "branch nova",
    "worktree": "worktree",
    "arquivo": "editou",
    "banco": "ESCREVEU NO BANCO",
    "servidor": "subiu servidor",
}


def abrir_sessao() -> None:
    eventos = eventos_recentes()
    vivas = sessoes_vivas()

    if not eventos and vivas <= 1:
        return  # silêncio é o estado saudável

    linhas = ["[diário de sessões]"]

    if vivas > 1:
        linhas.append(
            f"· {vivas} sessões abertas nesta máquina. Antes de editar, confira "
            f"se outra está no mesmo arquivo — `ListAgents` mostra quem, e "
            f"`SendMessage` fala com ela."
        )

    if eventos:
        por_sessao: dict[str, list[dict]] = {}
        for e in eventos:
            por_sessao.setdefault(e.get("sessao", "?"), []).append(e)

        linhas.append(f"· nas últimas {JANELA_H}h, OUTRAS sessões fizeram:")
        for sid, evs in por_sessao.items():
            arv = evs[-1].get("arvore", "?")
            br = evs[-1].get("branch", "?")
            linhas.append(f"  ── sessão {sid} · árvore `{arv}` · branch `{br}`")

            # Os graves primeiro, e sempre por extenso.
            for e in evs:
                if e["tipo"] in ("push", "banco", "branch-nova", "worktree", "servidor"):
                    linhas.append(f"     {ROTULO[e['tipo']]}: {e['resumo']}")

            commits = [e for e in evs if e["tipo"] == "commit"]
            for e in commits[-5:]:
                linhas.append(f"     commit: {e['resumo']}")
            if len(commits) > 5:
                linhas.append(f"     (+{len(commits) - 5} commits antes destes)")

            arquivos = sorted({e["resumo"] for e in evs if e["tipo"] == "arquivo"})
            if arquivos:
                mostra = arquivos[:8]
                linhas.append(f"     editou {len(arquivos)} arquivo(s): " + ", ".join(mostra))
                if len(arquivos) > 8:
                    linhas.append(f"     (+{len(arquivos) - 8} outros)")

        linhas.append(
            "· se algum desses arquivos é o seu, leia o disco antes de editar: "
            "seu contexto pode estar velho."
        )

    print("\n".join(linhas), file=sys.stderr)


def main() -> int:
    try:
        entrada = json.load(sys.stdin)
    except Exception:
        return 0

    sessao_id(entrada)  # fixa a identidade desta sessão antes de qualquer uso

    evento = entrada.get("hook_event_name", "")
    if evento == "SessionStart":
        abrir_sessao()
    else:
        registrar(entrada)
    return 0


if __name__ == "__main__":
    sys.exit(main())
