#!/usr/bin/env python3
"""Lint type-aware no arquivo .ts/.tsx que acabou de ser editado, pela catraca.

Roda como hook PostToolUse em Write/Edit. Chama `scripts/catraca.mjs eslint <arquivo>`
do frontend: a dívida congelada em `.catraca/eslint.json` passa, erro NOVO volta para
o agente na hora (exit 2), com arquivo:linha e regra — `any`, Result do neverthrow
descartado, promise solta, `if (valor)` com número, import que fura o FSD.

Por que no momento da edição: o pre-commit pega o mesmo erro, mas aí o agente já
empilhou mais cinco edições em cima dele. Aqui custa ~3 s e o contexto ainda está ali.

Por que NÃO roda `tsc`: o type-check é do projeto inteiro e leva ~80 s. Por edição
seria insuportável. Ele fica no pre-push e no CI, também pela catraca.

PostToolUse não desfaz a escrita: o exit 2 é feedback para corrigir, não bloqueio.
Se a ferramenta quebrar (sem node_modules, eslint com config inválida) o hook avisa
em vez de ficar calado — trava que não roda e trava verde são indistinguíveis de fora.
"""
import json
import subprocess
import sys
from pathlib import Path

EXTENSOES = (".ts", ".tsx")
# O mesmo que o eslint.config.mjs ignora; lintar aqui daria "arquivo ignorado" e ruído.
FORA = ("/node_modules/", "/dist/", "/__canarios__/", "/supabase/functions/", "/scripts/", "/spikes/")
TIMEOUT = 90


def alvo(caminho: str) -> tuple[Path, str] | None:
    """(raiz do frontend, caminho relativo a ela) quando o arquivo é do lint; senão None.

    Sobe a partir do arquivo até achar `scripts/catraca.mjs` — assim funciona em
    qualquer worktree, não só na do CLAUDE_PROJECT_DIR.
    """
    if not caminho.endswith(EXTENSOES) or caminho.endswith(".d.ts"):
        return None
    arquivo = Path(caminho).resolve()
    if any(f in f"/{arquivo.as_posix()}" for f in FORA):
        return None
    for pasta in arquivo.parents:
        if (pasta / "scripts" / "catraca.mjs").is_file():
            relativo = arquivo.relative_to(pasta).as_posix()
            return (pasta, relativo) if relativo.startswith(("apps/", "packages/")) else None
    return None


def main() -> int:
    try:
        entrada = json.load(sys.stdin)
    except json.JSONDecodeError:
        return 0
    caminho = str(entrada.get("tool_input", {}).get("file_path", ""))
    achado = alvo(caminho)
    if achado is None:
        return 0
    raiz, relativo = achado
    if not (raiz / "node_modules" / ".bin" / "eslint").exists():
        print(f"[hook trava-ts] {relativo} NÃO foi lintado: falta node_modules em {raiz} (worktree nova?).", file=sys.stderr)
        return 1
    try:
        feito = subprocess.run(
            ["bun", "scripts/catraca.mjs", "eslint", relativo],
            cwd=raiz, capture_output=True, text=True, timeout=TIMEOUT,
        )
    except (OSError, subprocess.TimeoutExpired) as erro:
        print(f"[hook trava-ts] {relativo} NÃO foi lintado: {erro}", file=sys.stderr)
        return 1
    if feito.returncode == 0:
        return 0
    print(
        f"[hook trava-ts] erro NOVO de lint em {relativo} — corrija antes de seguir.\n"
        f"{feito.stderr.strip() or feito.stdout.strip()}\n"
        "  → a dívida antiga está congelada em frontend/.catraca/eslint.json; o que aparece acima é seu.\n"
        "  → nunca resolva com eslint-disable nem com `catraca --aceitar-divida` sem o dono pedir.",
        file=sys.stderr,
    )
    return 2


if __name__ == "__main__":
    sys.exit(main())
