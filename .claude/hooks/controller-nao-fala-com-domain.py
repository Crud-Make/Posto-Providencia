#!/usr/bin/env python3
"""Controller não fala com `Domain` — a regra CA-2, virada trava (21/09/2026).

Roda como hook PreToolUse em Write|Edit. Nega a escrita quando o conteúdo que vai
entrar num arquivo de `backend/app/<Modulo>/Http/Controllers/` referencia o `Domain`
de qualquer módulo, seja por `use App\\X\\Domain\\...` ou por nome plenamente
qualificado no corpo.

**Por que um hook, se já existe Deptrac e Pest Arch.** Três buracos, medidos:

1. O `deptrac.yaml` tem a aresta `Http → Domain` ABERTA desde o PR #111, porque
   `Resources` precisam tipar model. O Deptrac não distingue Resource de Controller,
   então a regra CA-2 vivia num COMENTÁRIO de YAML — que ferramenta nenhuma lê
   (`docs/arquitetura/regras.md`, linha CA-2: ❌ SEM TRAVA).
2. O `trava-php.py` roda Pest Arch a cada `.php` editado, mas **exige
   `backend/vendor`**; em worktree sem `composer install` ele avisa e segue. Este
   hook é textual e não depende de ferramenta nenhuma.
3. `PostToolUse` avisa DEPOIS da escrita. Este nega ANTES.

**Por que a trava importa agora.** Quem termina a refatoração é um modelo menor
(decisão do dono, 21/09). Regra que mora em documento é recado, e recado é a
primeira coisa que se ignora; regra que mora em ferramenta reprova igual para
todo mundo.

**Sem exceção, de propósito.** O dono recusou exceção de regra de arquitetura em
18/09 ("o código se adapta à regra, nunca o contrário"). Isso inclui a zona cinzenta
conhecida: enum de `Domain` usado num controller também é negado. A saída é a mesma
das outras: a leitura desce para `Application`, a escrita vira Command.

**Falha aberta, ao contrário do `so-fable-na-formula`.** Entrada ilegível deixa
passar: o erro para este lado custa uma violação que o Pest Arch e o `composer
gates` ainda pegam depois, enquanto travar toda escrita de PHP por um JSON
malformado pararia a sessão inteira.
"""
import json
import re
import sys

# Só Controllers. `Http/Resources/`, `Http/Requests/` e `Http/Middleware/` ficam de
# fora: tipar model num Resource é o uso legítimo que abriu a aresta no #111.
# `backend/app/<Modulo>/Http/Controllers/...` (modular) e também
# `backend/app/Http/Controllers/...` (o legado do template do Laravel, que a primeira
# versão desta trava DEIXAVA PASSAR — buraco B4, achado pelo plano da CA-2 em 21/09).
CONTROLLER = re.compile(r"(^|/)backend/app/([A-Za-z]+/)?Http/Controllers/[\w/]+\.php$")

# `use App\X\Domain\...` e o nome plenamente qualificado solto no corpo. Mais dois
# caminhos que escapavam (buraco B1/B4, medidos em 21/09): `App\Models\...`, o model
# do template, e `App\Compartilhado\Posto`, que é `final class Posto extends Model`
# (Posto.php:32) e por morar em Compartilhado escapava das três travas.
DOMINIO = re.compile(
    r"\bApp\\[A-Za-z]+\\Domain\\[A-Za-z]"
    r"|\bApp\\Models\\[A-Za-z]"
    r"|\bApp\\Compartilhado\\Posto\b"
)

MOTIVO = (
    "[hook controller-nao-fala-com-domain] NEGADO em {caminho}.\n"
    "O trecho referencia {achado} — e a regra CA-2 diz: **Controller não fala com "
    "`Domain`; escrita passa por `Application`** (docs/arquitetura/regras.md).\n\n"
    "Isto não é estilo, é a direção das camadas. O caminho:\n"
    "  • LEITURA → uma Query em `App\\<Modulo>\\Application` que devolve o que a tela precisa;\n"
    "  • ESCRITA → um Command em `App\\<Modulo>\\Application` (transacional, como o "
    "`GravaFechamentoDoDia`);\n"
    "  • só TIPAR a saída → isso é trabalho de `Http\\Resources`, que pode ver o model.\n\n"
    "Proibido resolver com exceção no `deptrac.yaml`, `@phpstan-ignore` ou movendo a "
    "classe de lugar para escapar do padrão do caminho. Se você acha que esta regra "
    "está errada neste caso, pare e pergunte ao dono — ele recusou exceção de regra "
    "de arquitetura em 18/09."
)


def conteudo_novo(dados: dict) -> str:
    """O texto que a ferramenta vai gravar: `content` no Write, `new_string` no Edit.

    Só o texto NOVO, nunca o arquivo inteiro do disco, e de propósito: bloquear uma
    edição de linha inocente só porque o arquivo já viola em outro ponto faria o
    hook ser desligado. Quem ADICIONA a referência é quem é barrado.
    """
    for chave in ("content", "new_string"):
        valor = dados.get(chave)
        if isinstance(valor, str) and valor:
            return valor
    return ""


def main() -> None:
    try:
        entrada = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        return

    dados = entrada.get("tool_input", {}) or {}
    caminho = str(dados.get("file_path") or "")
    if not CONTROLLER.search(caminho.replace("\\", "/")):
        return

    achado = DOMINIO.search(conteudo_novo(dados))
    if achado is None:
        return

    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": MOTIVO.format(
                caminho=caminho.split("/backend/")[-1],
                achado="`" + achado.group(0) + "...`",
            ),
        }
    }))


if __name__ == "__main__":
    main()
