#!/usr/bin/env python3
"""Gates do backend no arquivo .php que acabou de ser editado.

Roda como hook PostToolUse em Write/Edit, só para `backend/{app,routes,tests,database}`:

  1. Pint no arquivo — CORRIGE a formatação (não só testa). É o único passo que escreve.
  2. PHPStan (Larastan, nível do phpstan.neon) no arquivo.
  3. PHPMD no arquivo (CCN ≤ 10).
  4. Deptrac no app inteiro — direção das camadas, e ciclo entre módulos só aparece inteiro.
  5. Pest em tests/Arch — strict_types, dd(), env(), controller sem model/Request cru, enums.

Custo medido em 18/09/2026: ~5,5 s. O que reprovar volta para o agente com exit 2 e a
saída da ferramenta; o `composer gates` completo (com Pest inteiro e cobertura 85 %) fica
no pre-push, onde já estava.

Não roda a suíte Feature: ela usa o Postgres do docker-compose e passaria a depender de
container de pé a cada edição. PostToolUse não desfaz a escrita — é feedback, não bloqueio.
Ferramenta ausente (worktree sem `composer install`) avisa em vez de ficar calada.
"""
import json
import subprocess
import sys
from pathlib import Path

PASTAS = ("app/", "routes/", "tests/", "database/")
TIMEOUT = 60


def alvo(caminho: str) -> tuple[Path, str] | None:
    """(raiz do backend, caminho relativo a ela) quando o arquivo é gate do backend; senão None."""
    if not caminho.endswith(".php") or caminho.endswith(".blade.php"):
        return None
    arquivo = Path(caminho).resolve()
    for pasta in arquivo.parents:
        if (pasta / "composer.json").is_file() and (pasta / "artisan").is_file():
            relativo = arquivo.relative_to(pasta).as_posix()
            return (pasta, relativo) if relativo.startswith(PASTAS) else None
    return None


def passos(relativo: str) -> list[tuple[str, list[str]]]:
    bin_ = "vendor/bin/"
    lista = [
        ("PHPStan", [bin_ + "phpstan", "analyse", "--no-progress", "--memory-limit=1G", "--error-format=raw", relativo]),
        # --no-cache: o .deptrac.cache é versionado e cada rodada o sujaria no git status.
        ("Deptrac", [bin_ + "deptrac", "analyse", "--no-progress", "--no-cache"]),
        ("Pest Arch", [bin_ + "pest", "--compact", "tests/Arch"]),
    ]
    if relativo.startswith(("app/", "routes/")):
        lista.insert(1, ("PHPMD", [bin_ + "phpmd", relativo, "text", "phpmd.xml"]))
    return lista


def main() -> int:
    try:
        entrada = json.load(sys.stdin)
    except json.JSONDecodeError:
        return 0
    achado = alvo(str(entrada.get("tool_input", {}).get("file_path", "")))
    if achado is None:
        return 0
    raiz, relativo = achado
    if not (raiz / "vendor" / "bin" / "phpstan").exists():
        print(f"[hook trava-php] {relativo} NÃO foi checado: falta backend/vendor (rode composer install).", file=sys.stderr)
        return 1

    reprovados: list[str] = []
    try:
        subprocess.run(["vendor/bin/pint", relativo], cwd=raiz, capture_output=True, timeout=TIMEOUT)
        for nome, comando in passos(relativo):
            feito = subprocess.run(comando, cwd=raiz, capture_output=True, text=True, timeout=TIMEOUT)
            if feito.returncode != 0:
                saida = (feito.stdout + feito.stderr).strip()
                reprovados.append(f"── {nome} ──\n{saida[-2500:]}")
    except (OSError, subprocess.TimeoutExpired) as erro:
        print(f"[hook trava-php] {relativo} NÃO foi checado: {erro}", file=sys.stderr)
        return 1

    if not reprovados:
        return 0
    print(
        f"[hook trava-php] {relativo} reprovou em {len(reprovados)} gate(s) — corrija antes de seguir.\n"
        + "\n".join(reprovados)
        + "\n  → nunca resolva com baseline do PHPStan, @phpstan-ignore ou exceção no deptrac.yaml sem o dono pedir.",
        file=sys.stderr,
    )
    return 2


if __name__ == "__main__":
    sys.exit(main())
