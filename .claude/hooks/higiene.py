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
- **`docs/data/` sumido.** Descoberto em 07/08: a pasta não existia mais, os cinco
  golden masters estouravam no `new Database()` e o agente `planilha` estava sem
  fonte — e nada disso aparecia até alguém rodar o teste. Como o diretório é
  gitignored, `git status` fica limpo enquanto a prova de auditoria não existe.
  Este é o pior dos quatro: silencioso E bloqueia o §0.6 inteiro.

Silencioso por princípio: aviso que aparece toda sessão vira ruído e deixa de ser
lido. Só fala quando tem o que dizer.
"""
import json
import re
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


# Só considera plugin o prefixo COM HÍFEN (`claude-mem:`, `mattpocock-skills:`).
#
# Uma lista negra de palavras seria caça a fantasma sem fim: este arquivo tem
# `bun:test`, `bun:sqlite` e o placeholder `arquivo:linha`, e a próxima seção
# inventaria outro. O hífen separa nome de plugin de palavra solta em pt-BR sem
# precisar enumerar nada.
#
# Preço consciente: plugin de nome sem hífen que seja desinstalado passa batido.
# Aceito de propósito — este aviso guarda exatidão de documentação, não dinheiro,
# e aviso ruidoso deixa de ser lido (§14). Para o lado do dinheiro a escolha é a
# oposta: o `portao-golden` erra para o aviso a mais.
CITACAO_PLUGIN = re.compile(r"`([a-z][a-z0-9]*(?:-[a-z0-9]+)+):([a-z][a-z0-9:-]*)`")

# Span de crase DUPLA (`` `x` ``) é a notação markdown para exibir uma crase
# literal — ou seja, é sempre EXEMPLO, nunca uso. O §14 documenta o próprio
# detector com `` `prefixo-com-hifen:algo` ``, e até 07/08/2026 ele acusava esse
# exemplo como plugin ausente: um falso positivo auto-referencial, disparando em
# toda sessão. Isso é pior que não avisar — o §14 diz que aviso que aparece
# sempre deixa de ser lido, e este treinava exatamente esse reflexo.
#
# Some-se o span inteiro antes de procurar citação. O teste sintético não pegava
# porque nunca rodava contra o CLAUDE.md real; agora roda (ver `testa-hooks.py`).
EXEMPLO_LITERAL = re.compile(r"``.+?``", re.DOTALL)


def plugins_citados_ausentes() -> list[str]:
    """Skills de plugin que o CLAUDE.md manda usar e que não estão instaladas.

    Este hook existe porque o mesmo acidente já aconteceu **quatro vezes** aqui, e
    é sempre silencioso: o graphify sumiu da máquina e o §12 seguiu mandando usá-lo;
    o MCP do Supabase sumiu e o agente `rls` seguiu citando três ferramentas
    inexistentes; `claude-mem` e `mattpocock-skills` sumiram e seis linhas do §13
    seguiram apontando para elas; e o próprio `symlinks_quebrados` acima confere um
    diretório que não existe mais, devolvendo lista vazia em silêncio.

    O padrão é sempre **a instrução sobrevivendo à ferramenta**. Ninguém percebe,
    porque skill ausente não dá erro: ela simplesmente não carrega, e o trabalho
    segue com uma orientação a menos.
    """
    claude_md = RAIZ / "CLAUDE.md"
    if not claude_md.is_file():
        return []
    texto = EXEMPLO_LITERAL.sub(" ", claude_md.read_text())
    citados = {pref for pref, _ in CITACAO_PLUGIN.findall(texto)}
    if not citados:
        return []
    instalados: set[str] = set()
    if INSTALADOS.is_file():
        try:
            conf = json.loads(INSTALADOS.read_text())
            # chave no formato "engraph@engraph"
            instalados = {k.split("@")[0] for k in conf.get("plugins", {})}
        except (json.JSONDecodeError, OSError):
            return []
    return sorted(citados - instalados)


def mcp_sem_read_only() -> bool:
    """Verdadeiro quando o MCP do Supabase está sem `--read-only`.

    Existe porque tirar o flag é uma janela que se abre à mão e se fecha à mão —
    e o passo de fechar é o que se esquece. Sem ele, `execute_sql` escreve em
    PRODUÇÃO. A trava do §14 (`deny` do `apply_migration`) continua valendo, mas
    ela não cobre o `execute_sql`: as duas são complementares, não redundantes.
    """
    arquivo = RAIZ / ".mcp.json"
    if not arquivo.is_file():
        return False
    try:
        conf = json.loads(arquivo.read_text())
    except (json.JSONDecodeError, OSError):
        return False
    args = conf.get("mcpServers", {}).get("supabase", {}).get("args", [])
    return bool(args) and "--read-only" not in args


def fonte_auditavel_sumida() -> list[str]:
    """Arquivos que os golden masters abrem por caminho fixo e não estão lá.

    Lista fixa de propósito, ao contrário do resto do hook: são exatamente os
    caminhos citados em `packages/utils/src/*.golden.spec.ts`. Se um spec novo
    passar a abrir outro arquivo, ele entra aqui — conferir com
    `grep -rn 'docs/data' packages/utils/src/*.golden.spec.ts`.
    """
    esperados = (
        "docs/data/janeiro_referencia.sqlite",
        "docs/data/posto_jorro_2026.sqlite",
        "docs/data/fixture_lucro_custo_mes01.json",
    )
    return [c for c in esperados if not (RAIZ / c).exists()]


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

    fantasmas = plugins_citados_ausentes()
    if fantasmas:
        avisos.append(
            "· 👻 O CLAUDE.md manda usar plugin que não está instalado: "
            + ", ".join(fantasmas)
            + ". Skill ausente não dá erro — ela só não carrega, e o trabalho segue "
            "com uma orientação a menos. Ou instale, ou tire a linha do §13: tabela "
            "que cita ferramenta inexistente é pior que tabela sem a linha."
        )

    if mcp_sem_read_only():
        avisos.append(
            "· 🔓 O MCP do Supabase está SEM `--read-only` — `execute_sql` escreve "
            "em PRODUÇÃO nesta sessão. Se a janela de escrita já cumpriu o que "
            "abriu, devolva o flag em `.mcp.json` e reinicie. Este arquivo é "
            "versionado: **não commite sem o flag**."
        )

    sumidos = fonte_auditavel_sumida()
    if sumidos:
        avisos.append(
            "· 🔴 Fonte auditável ausente: " + ", ".join(sumidos)
            + ". Os golden masters abrem esses caminhos direto e estouram no "
            "`new Database()` — enquanto isso durar, o §0.6 proíbe mexer em "
            "qualquer fórmula, e o agente `planilha` não tem número para dar. "
            "`docs/data/` é gitignored, então o git não recupera: só o .xlsx "
            "original do posto refaz a cadeia (ETL em `git show d4491b2^:"
            "docs/data/xlsx_to_csv.py`). Confirme com `bun run test:golden`."
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
