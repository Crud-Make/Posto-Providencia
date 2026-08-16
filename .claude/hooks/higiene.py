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
- **Ativo crítico fora do git.** Começou como "`docs/data/` sumido", descoberto em
  07/08. Virou manifesto (`.claude/ativos-criticos.json`) em 16/08, depois que três
  ativos se perderam no mesmo dia e a lista fixa de três caminhos não pegou nenhum
  deles — porque `docs/data/` estava intacto e o que sumiu foi a planilha fonte.
  Ver `ativos_criticos()`. É o pior da lista: silencioso E bloqueia o §0.6 inteiro.

Silencioso por princípio: aviso que aparece toda sessão vira ruído e deixa de ser
lido. Só fala quando tem o que dizer.
"""
import hashlib
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


def resolve(caminho: str) -> Path:
    """Relativo = raiz do repo. Começando com `~` ou `/` = absoluto."""
    p = Path(caminho).expanduser()
    return p if p.is_absolute() else RAIZ / p


def sha256_de(arquivo: Path) -> str | None:
    """Hash em blocos: a planilha tem ~1 MB e não precisa ir inteira para a RAM."""
    h = hashlib.sha256()
    try:
        with arquivo.open("rb") as f:
            for bloco in iter(lambda: f.read(1 << 20), b""):
                h.update(bloco)
    except OSError:
        return None
    return h.hexdigest()


def ativos_criticos() -> list[str]:
    """Confere o manifesto dos arquivos que o git não protege.

    Substituiu uma lista fixa de três caminhos de `docs/data/`. A lista funcionava
    e ainda assim não pegou nada em 16/08/2026, quando três ativos se perderam no
    mesmo dia: `docs/data/` estava intacto, e a planilha fonte — que ninguém tinha
    pensado em conferir — foi para a lixeira às 08:38.

    O problema era a forma, não o conteúdo: **cada checagem existia porque aquela
    coisa específica já tinha quebrado uma vez.** Uma lista de cicatrizes nunca
    cobre a próxima ferida. Aqui o hook sabe *como* conferir e o manifesto declara
    *o que importa*, então ativo novo entra em `.claude/ativos-criticos.json` sem
    tocar em código.

    Três formas de perder um arquivo, e as três são silenciosas:

    - **sumiu** — apagado, movido, lixeira. `git status` fica limpo porque o ativo
      é gitignored ou mora fora do repo.
    - **encolheu** — reescrito por cima com uma fração do conteúdo. Foi o caso do
      `settings.json` global: 3.694 bytes viraram 22, e com eles foram as travas de
      `sudo`, `rm` e `dd`. O arquivo continua lá, válido, e vazio de tudo que
      importava.
    - **mudou** — conteúdo trocado sob um caminho que devia ser imutável. Só vale
      para quem declara `sha256`; a planilha do posto é o caso, porque uma
      substituição silenciosa dela envenena todo golden master a jusante.

    Erra para o aviso a mais, como o `portao-golden`: isto guarda a fonte do
    dinheiro, e a escolha do §14 nesse lado é sempre a oposta do silêncio.
    """
    manifesto = RAIZ / ".claude/ativos-criticos.json"
    if not manifesto.is_file():
        return ["o próprio manifesto `.claude/ativos-criticos.json` não existe — "
                "nenhum ativo crítico está sendo conferido"]
    try:
        ativos = json.loads(manifesto.read_text()).get("ativos", [])
    except (json.JSONDecodeError, OSError):
        return ["`.claude/ativos-criticos.json` está ilegível — nenhum ativo "
                "crítico está sendo conferido"]

    problemas = []
    for ativo in ativos:
        caminho = str(ativo.get("caminho", ""))
        if not caminho:
            continue
        porque = str(ativo.get("porque", "")).strip()
        alvo = resolve(caminho)

        if not alvo.exists():
            problemas.append(f"**{caminho} SUMIU** — {porque}")
            continue

        minimo = ativo.get("bytes_minimos")
        if isinstance(minimo, int):
            try:
                tamanho = alvo.stat().st_size
            except OSError:
                tamanho = None
            if tamanho is not None and tamanho < minimo:
                problemas.append(
                    f"**{caminho} ENCOLHEU** — {tamanho} bytes, esperado no mínimo "
                    f"{minimo}. {porque}"
                )
                continue

        esperado = ativo.get("sha256")
        if esperado:
            obtido = sha256_de(alvo)
            if obtido and obtido != esperado:
                problemas.append(
                    f"**{caminho} MUDOU DE CONTEÚDO** — sha256 {obtido[:12]}…, "
                    f"esperado {str(esperado)[:12]}…. {porque}. Se foi troca "
                    f"legítima (planilha nova do posto, por exemplo), atualize o "
                    f"hash em `.claude/ativos-criticos.json` no mesmo commit."
                )
    return problemas


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

    criticos = ativos_criticos()
    if criticos:
        avisos.append(
            "· 🔴 Ativo crítico fora do git com problema:\n    "
            + "\n    ".join(criticos)
            + "\n  O git não recupera nenhum destes. Antes de qualquer outra coisa: "
            "**procure na lixeira** (`~/.local/share/Trash/files/`), que foi onde a "
            "planilha estava em 16/08, e confira o hash contra "
            "`.claude/ativos-criticos.json` antes de dar por restaurado. Enquanto "
            "faltar fonte de `docs/data/`, o §0.6 proíbe mexer em fórmula — confirme "
            "com `bun run test:golden`."
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
