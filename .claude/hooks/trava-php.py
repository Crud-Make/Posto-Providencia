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

PHPStan só entra quando o arquivo está no escopo do `phpstan.neon`. Até 19/09/2026 o hook
mandava o PHPStan analisar QUALQUER .php editado, e o `phpstan.neon` exclui `tests/Arch`
(`excludePaths`): o PHPStan devolvia código 1 com "[ERROR] No files found to analyse." e o
hook lia isso como reprovação — exit 2 em cima de arquivo que o gate de verdade nem olha
(issue #122 §2). Duas camadas: o `excludePaths` do neon é lido (sem PyYAML, que não existe
na máquina) e, se ainda assim o PHPStan disser que não achou arquivo, isso não é erro.
Nada afrouxa: PHPStan segue em app/, routes/, tests/Feature; erro real continua exit 2.
"""
import json
import re
import subprocess
import sys
from fnmatch import fnmatch
from pathlib import Path

PASTAS = ("app/", "routes/", "tests/", "database/")
TIMEOUT = 60

# Texto do phar 2.2.x quando a lista de arquivos a analisar fica vazia (`handleReturn(1, …)`).
SEM_ARQUIVOS = "No files found to analyse"
# Item de lista do neon: `- caminho`, com sufixo opcional `(?)` (= "pode não existir").
ITEM_DE_LISTA = re.compile(r"^\s*-\s*(.+?)\s*(\(\?\))?\s*$")
# Subchaves aceitas dentro de `excludePaths:` (forma nova do PHPStan).
SUBCHAVES = ("analyse:", "analyseAndScan:")


def _recuo(linha: str) -> int:
    return len(linha) - len(linha.lstrip(" \t"))


def excluidos_do_phpstan(neon: str) -> list[str]:
    """Caminhos de `parameters.excludePaths` do phpstan.neon, sem PyYAML.

    Cobre a forma de lista (`excludePaths:` + `- x`), as subchaves `analyse:` /
    `analyseAndScan:` e o sufixo `(?)`. Sintaxe fora disso devolve o que conseguiu ler
    (ou nada): aí o PHPStan roda como sempre rodou, e a segunda camada segura o caso.
    """
    achados: list[str] = []
    linhas = neon.splitlines()
    i = 0
    while i < len(linhas):
        linha = linhas[i]
        if linha.strip().startswith("excludePaths:"):
            base = _recuo(linha)
            i += 1
            while i < len(linhas):
                atual = linhas[i]
                texto = atual.strip()
                if texto and not texto.startswith("#") and _recuo(atual) <= base:
                    break  # dedentou: acabou o bloco
                if texto in SUBCHAVES or not texto or texto.startswith("#"):
                    i += 1
                    continue
                m = ITEM_DE_LISTA.match(atual)
                if m:
                    achados.append(m.group(1).strip("'\""))
                i += 1
            continue
        i += 1
    return achados


def phpstan_se_aplica(raiz: Path, relativo: str) -> bool:
    """False quando `relativo` (ao backend) cai num excludePaths do phpstan.neon."""
    neon = raiz / "phpstan.neon"
    if not neon.is_file():
        return True
    for excluido in excluidos_do_phpstan(neon.read_text()):
        excluido = excluido.rstrip("/")
        if not excluido:
            continue
        if "*" in excluido:
            if fnmatch(relativo, excluido):
                return False
        elif relativo == excluido or relativo.startswith(excluido + "/"):
            return False
    return True


def nao_se_aplica(saida: str) -> bool:
    """Saída do PHPStan que diz 'não tinha arquivo para analisar' — não é reprovação."""
    return SEM_ARQUIVOS in saida


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


def passos(relativo: str, raiz: Path) -> list[tuple[str, list[str]]]:
    bin_ = "vendor/bin/"
    lista: list[tuple[str, list[str]]] = [
        # --no-cache: o .deptrac.cache é versionado e cada rodada o sujaria no git status.
        ("Deptrac", [bin_ + "deptrac", "analyse", "--no-progress", "--no-cache"]),
        ("Pest Arch", [bin_ + "pest", "--compact", "tests/Arch"]),
    ]
    if relativo.startswith(("app/", "routes/")):
        lista.insert(0, ("PHPMD", [bin_ + "phpmd", relativo, "text", "phpmd.xml"]))
    if phpstan_se_aplica(raiz, relativo):
        lista.insert(0, ("PHPStan", [bin_ + "phpstan", "analyse", "--no-progress", "--memory-limit=1G", "--error-format=raw", relativo]))
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
        for nome, comando in passos(relativo, raiz):
            feito = subprocess.run(comando, cwd=raiz, capture_output=True, text=True, timeout=TIMEOUT)
            if feito.returncode != 0:
                saida = (feito.stdout + feito.stderr).strip()
                if nome == "PHPStan" and nao_se_aplica(saida):
                    continue  # zero arquivos no escopo do neon não é reprovação
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
