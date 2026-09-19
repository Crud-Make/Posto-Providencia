#!/usr/bin/env python3
"""Bateria dos hooks do projeto. Rode após mexer em qualquer um deles:

    python3 .claude/hooks/testa-hooks.py

Existe porque a primeira versão do `protege-git` bloqueou o próprio commit que a
documentava: a mensagem *citava* `git push --force` e o hook casou com o texto.
Um hook errado ou trava trabalho legítimo, ou deixa passar o que devia barrar —
e os dois modos são silenciosos até doer.

Nota: o literal da flag é montado em partes aqui de propósito. Escrito inteiro,
ele dispararia o hook da sessão que estiver rodando este arquivo.
"""
import hashlib
import importlib.util
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

HOOKS = Path(__file__).resolve().parent
RAIZ = HOOKS.parent.parent
FORCE = "--" + "force"


def carrega(arquivo: str):
    """Importa um hook pelo caminho — o hífen do nome não é módulo Python válido."""
    sys.path.insert(0, str(HOOKS))  # os hooks fazem `from _comum import ...`
    spec = importlib.util.spec_from_file_location(arquivo.removesuffix(".py"), HOOKS / arquivo)
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    return modulo

CASOS_GIT = [
    (f"git push {FORCE} origin main", "deny"),
    ("git push -f", "deny"),
    (f"git push {FORCE}-with-lease origin x", "deny"),
    ("git push origin minha-branch", None),
    (f"git commit -F - <<'EOF'\nfix: documenta que git push {FORCE} e proibido\nEOF", None),
    (f'git commit -m "docs: git push {FORCE} nunca"', None),
    (f"grep -rn '{FORCE}' CLAUDE.md", None),
    ("ls -la", None),
    # O furo antigo: opção global entre `git` e o verbo cegava o `^git\s+push`.
    (f"git -C /tmp push {FORCE} origin x", "deny"),
    # Desvio de hook de git (incidente de 18/09: core.hooksPath=/dev/null por subagente).
    (f"git -c {'core.hooks' + 'Path'}=/dev/null commit -m x", "deny"),
    (f"git -C ../x -c {'core.hooks' + 'Path'}=/tmp push", "deny"),
    (f"GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0={'core.hooks' + 'Path'} GIT_CONFIG_VALUE_0=/dev/null git commit -m x", "deny"),
    (f"git --config-env={'core.hooks' + 'Path'}=X commit -m x", "deny"),
    (f"git config {'core.hooks' + 'Path'} /dev/null", "deny"),
    (f"git config --local --unset {'core.hooks' + 'Path'}", "deny"),
    (f"git commit {'--no-' + 'verify'} -m x", "deny"),
    (f"git commit {'--no-' + 'veri'} -m x", "deny"),
    ("git commit -nm x", "deny"),
    ("git commit -an -m x", "deny"),
    (f"git push {'--no-' + 'verify'}", "deny"),
    ("git commit-tree HEAD^{tree} -m x", "deny"),
    # Leitura e descrição continuam livres.
    (f"git config --get {'core.hooks' + 'Path'}", None),
    (f"git config {'core.hooks' + 'Path'}", None),
    ("git config -l", None),
    ("git push -n origin x", None),
    ("git commit -c HEAD", None),
    (f'git commit -m "docs: {"--no-" + "verify"} nunca"', None),
    (f"git commit -F - <<'EOF'\n{'core.hooks' + 'Path'} proibido\nEOF", None),
    (f"grep -rn {'no-' + 'verify'} scripts/", None),
    ("bash scripts/hooks/testa-pre-push.sh", None),
]

# _comum.comando_git: opção GLOBAL do git (antes do verbo) separada do subcomando.
# O furo que fecha: `git -C x push` e `git -c k=v commit` não casavam `^git\s+push`.
# Cada caso: segmento → (dirs_C, configs, subcomando) ou None.
HOOKS_PATH = "core.hooks" + "Path"
CASOS_GIT_PARSE = [
    (f"git -C ../x -c {HOOKS_PATH}=/dev/null commit -m a",
     (["../x"], {HOOKS_PATH.lower(): "/dev/null"}, "commit")),
    ("git commit -c HEAD", ([], {}, "commit")),           # -c pós-verbo é reuso de mensagem
    ("git push origin x", ([], {}, "push")),
    ("git -C/tmp status", (["/tmp"], {}, "status")),        # -C colado
    (f"git -c{HOOKS_PATH}=x log", ([], {HOOKS_PATH.lower(): "x"}, "log")),
    ("git --git-dir=.git --no-pager -p log", ([], {}, "log")),
    ("git --work-tree /tmp/a status", ([], {}, "status")),  # valor separado consumido
    ("sudo git -C a -C b push", (["a", "b"], {}, "push")),
    ("git --version", ([], {}, "")),
    ("ls", None),
    ("echo git push", None),
]

# _comum.diretorio_final: onde o ÚLTIMO segmento roda. None = não dá para saber.
CASOS_DIRETORIO = [
    ("cd ../pp-60 && git commit", "/a/b", "/a/pp-60"),
    ("cd ~/x && ls", "/a/b", str(Path.home() / "x")),
    ("cd $D && git commit", "/a/b", None),
    ("cd $(pwd)/x; ls", "/a/b", None),
    ("cd - && ls", "/a/b", None),
    ("git commit -m x", "/a/b", "/a/b"),
    ("cd /tmp && cd sub && ls", "/a/b", "/tmp/sub"),
    ("cd -- ../c && ls", "/a/b", "/a/c"),
    ("ls; cd", "/a/b", str(Path.home())),
]

CASOS_DADOS = [
    (f"{RAIZ}/docs/data/janeiro_referencia.sqlite", "deny"),
    (f"{RAIZ}/docs/data/planilha.xlsx", "deny"),
    ("apps/web/src/App.tsx", None),
    ("packages/utils/src/fechamento.ts", None),
]

# A porta dos fundos: os agentes têm Bash, então cobrir só Write/Edit não bastava.
# Leitura via shell tem de continuar livre — é o uso normal do agente `planilha`.
CASOS_SHELL = [
    ("echo x > docs/data/nota.txt", "deny"),
    ("rm docs/data/janeiro_referencia.sqlite", "deny"),
    ("sed -i s/a/b/ docs/data/mes_01.csv", "deny"),
    ('sqlite3 docs/data/posto_jorro_2026.sqlite "DELETE FROM despesa_mensal"', "deny"),
    ("python3 -c \"open('docs/data/x.txt','w')\"", "deny"),
    ('sqlite3 docs/data/posto_jorro_2026.sqlite "SELECT * FROM despesa_mensal"', None),
    ("python3 -c \"open('docs/data/x.txt')\"", None),
    ("cat docs/data/mes_01.csv", None),
    ("grep -rn despesa docs/data/etl_2026 > /tmp/saida.txt", None),
    ("ls -la docs/data/", None),
    # O mesmo falso positivo do protege-git, agora aqui: mensagem de commit que
    # DESCREVE a escrita proibida não é a escrita acontecendo. Mordeu duas vezes.
    ("git commit -F - <<'EOF'\nfix: bloqueia > docs/data/x e rm docs/data\nEOF", None),
    ('git commit -m "docs: DELETE em docs/data agora barrado"', None),
]


# protege-dependencias: vendor/node_modules nunca por symlink (18/09: vendor linkado
# fez o Pest testar o App\ da árvore de origem). docs/data linkado continua livre.
CASOS_DEPENDENCIA = [
    ("ln -s ../Posto-Providencia/backend/vendor backend/vendor", "deny"),
    ("ln -sfn /x/node_modules node_modules", "deny"),
    ("ln -s ../p/frontend/node_modules/ frontend/node_modules", "deny"),
    ("ln --symbolic ../p/backend/vendor/ vendor", "deny"),
    ("cd backend && ln -s ../../p/backend/vendor vendor", "deny"),
    ("cp -s ../p/backend/vendor vendor", "deny"),
    ("ln -sfn /home/thygas/Projetos/trabalho/Posto-Providencia/docs/data docs/data", None),
    ("ln -s ../a.txt b.txt", None),
    ("ln ../p/backend/vendor vendor", None),                  # hardlink não é o caso
    ("ls -la backend/vendor", None),
    ("echo 'ln -s vendor'", None),
    ('git commit -m "fix: proíbe ln -s vendor"', None),
    ("rm backend/vendor", None),
    ("cp -r ../p/backend/vendor vendor", None),               # cópia de verdade, não link
]

# Roteamento: frase do dono → agentes que devem ser sugeridos. Os negativos importam
# tanto quanto os positivos: hook que fala demais deixa de ser lido (§14).
#
# Lido do disco em vez de escrito à mão: agente novo que entre em `.claude/agents/`
# sem rota aqui vira o problema de 29/07 — instalado e nunca chamado.
AGENTES = sorted(p.stem for p in (RAIZ / ".claude/agents").glob("*.md"))

CASOS_ROTA = [
    ("onde fica o cálculo do lucro?", ["grafo"]),
    ("quem usa o fechamento.ts?", ["grafo"]),
    ("o que quebra se eu mexer no diferenca?", ["grafo"]),
    ("quais arquivos importam o encerrante mensal", ["grafo"]),
    ("quanto deu julho?", ["planilha"]),
    ("esse valor bate com o real?", ["planilha"]),
    ("qual a fórmula da planilha pro rateio", ["planilha"]),
    ("a tabela Leitura está protegida?", ["rls"]),
    ("a documentação está em dia com o código?", ["doc-cycle-onboard"]),
    ("atualiza o docs/architecture.md com esse diff", ["doc-cycle-onboard"]),
    ("esse diff muda a arquitetura?", ["doc-cycle-onboard"]),
    ("o que mudou na arquitetura desde a v4?", ["doc-cycle-onboard"]),
    ("o que um anônimo consegue ler?", ["rls"]),
    ("quantas violações de any existem?", ["conformidade"]),
    ("isso está dentro do padrão?", ["conformidade"]),
    ("qual o tamanho da dívida técnica hoje", ["conformidade"]),
    ("o tipo gerado está em dia com o banco?", ["schema"]),
    ("essa coluna existe mesmo no banco?", ["schema"]),
    ("qual migration criou a tabela de notas", ["schema"]),
    ("alguém já mexeu nesse arquivo?", ["historico"]),
    ("de quando é essa decisão de usar centavos", ["historico"]),
    ("sumiu a pasta docs, dá pra recuperar?", ["historico"]),
    ("qual commit apagou o CONTEXT.md", ["historico"]),
    # Termo solto do domínio NÃO dispara: a skill de fechamento já cobre sozinha.
    ("como calcula o valor conferido?", []),
    ("a diferença está errada no dia 10", []),
    ("de onde vem esse valor?", []),
    ("vamos refatorar o dashboard", []),
    ("arruma esse bug do gráfico", []),
    # Negativos dos agentes novos: verbo de ação não é pergunta de auditoria.
    ("remove o any desse arquivo", []),
    ("cria uma migration pra tabela nova", []),
    ("faz o commit disso", []),
]

# memoria-somente: escrita só dentro de .claude/agent-memory/. Nasceu porque
# `memory:` habilita Write/Edit à revelia do campo `tools:` — sem esta trava, o
# "somente leitura" dos seis agentes vira promessa vazia.
CASOS_MEMORIA = [
    (".claude/agent-memory/grafo/MEMORY.md", None),
    (f"{RAIZ}/.claude/agent-memory/schema/drift.md", None),
    ("packages/utils/src/fechamento.ts", "deny"),
    ("CLAUDE.md", "deny"),
    (".claude/agents/grafo.md", "deny"),
    # Travessia: o `..` sai do diretório de memória e não pode ser aceito.
    (".claude/agent-memory/../../packages/utils/src/lucro.ts", "deny"),
    # Nome parecido não é o diretório: agent-memory-local é o escopo `local`.
    (".claude/agent-memory-local/grafo/x.md", "deny"),
]

# Golden master: True = tem de avisar. Teste e spec nunca avisam (não são fórmula).
CASOS_GOLDEN = [
    ("packages/utils/src/fechamento.ts", True),
    ("packages/utils/src/lucro.ts", True),
    ("packages/utils/src/despesa.ts", True),
    ("packages/utils/src/formatters.ts", True),
    (f"{RAIZ}/packages/utils/src/encerrante-mensal.ts", True),
    ("apps/web/src/services/api/aggregator.service.ts", True),
    ("packages/utils/src/fechamento.test.ts", False),
    ("packages/utils/src/fechamento.golden.spec.ts", False),
    ("apps/web/src/App.tsx", False),
    ("CHANGELOG.md", False),
    # Backend (19/09): dinheiro em App\Agregacao e App\Fechamento\Domain avisa; teste,
    # controller e Cadastro (decisão pendente do dono) não.
    ("backend/app/Agregacao/Application/DadosDoPeriodo.php", True),
    ("app/Agregacao/Application/Periodo.php", True),
    (f"{RAIZ}/backend/app/Fechamento/Domain/Leitura.php", True),
    ("backend/tests/Feature/Agregacao/DashboardTest.php", False),
    ("backend/app/Cadastro/Domain/Combustivel.php", False),
    ("backend/app/Fechamento/Http/Controllers/X.php", False),
]

# Checklist de commit: arquivos no commit → quantas pendências. Testa a função pura,
# porque o hook inteiro depende do índice do git e não dá para fixar aqui.
CASOS_CHECKLIST = [
    (["frontend/packages/utils/src/fechamento.ts"], 2),          # fórmula + changelog
    (["frontend/packages/utils/src/fechamento.ts", "CHANGELOG.md"], 1),  # só fórmula
    (["frontend/apps/web/src/App.tsx"], 1),                      # só changelog
    (["frontend/apps/web/src/App.tsx", "CHANGELOG.md"], 0),
    (["docs/notas.md"], 0),
    ([".claude/hooks/roteia-consulta.py"], 0),
    ([], 0),
    (["backend/app/Agregacao/Application/DadosDoPeriodo.php"], 2),          # dinheiro PHP + changelog
    (["backend/app/Agregacao/Application/DadosDoPeriodo.php", "CHANGELOG.md"], 1),
    (["backend/tests/Feature/Agregacao/DashboardTest.php", "CHANGELOG.md"], 0),
]


# Detector de plugin fantasma: texto do CLAUDE.md -> prefixos que devem ser
# acusados. Os negativos carregam o desenho: `bun:test` e o placeholder
# `arquivo:linha` existem no CLAUDE.md real e não podem virar aviso.
CASOS_FANTASMA = [
    ("use `claude-mem:make-plan`", ["claude-mem"]),
    ("use `mattpocock-skills:tdd` e `claude-mem:do`", ["claude-mem", "mattpocock-skills"]),
    ("roda sob `bun:test`, nunca `bun test` puro", []),
    ("devolve `arquivo:linha` com evidência", []),
    ("o plugin `engraph:engraph` está instalado", []),
    ("`mcp__supabase__execute_sql` é somente leitura", []),
    ("branch `feat/#12-nome`", []),
    # Crase DUPLA é exemplo literal, não citação de uso. O §14 documenta o
    # detector com este exato texto, e ele acusava a si mesmo até 07/08/2026.
    ("considera plugin todo `` `prefixo-com-hifen:algo` `` citado aqui", []),
    # E o exemplo literal não pode cegar uma citação real na mesma linha.
    ("`` `exemplo-do:doc` `` mas use `claude-mem:do`", ["claude-mem"]),
]


# forca-delegacao: sequência de chamadas numa mesma thread -> o que cada uma
# devolve. `True` = nega. O teto é fixado em 3 no teste para a lista caber.
# Os dois casos que carregam o desenho inteiro:
#   - `agent_id` presente NUNCA é barrado, senão o hook bloqueia justamente o
#     `code-explorer` que ele mandou chamar;
#   - negar ZERA o contador, senão a trava vira parede e impede a leitura
#     pontual que o próprio agente acabou de apontar.
CASOS_DELEGACAO = [
    ("Read", {"file_path": "a.ts"}, None, False),
    ("Grep", {"pattern": "x"}, None, False),
    ("Glob", {"pattern": "*.ts"}, None, True),      # 3a: bate no teto
    ("Read", {"file_path": "b.ts"}, None, False),   # contador zerado, passa
    ("Bash", {"command": "cat packages/utils/src/fechamento.ts"}, None, False),
    ("Bash", {"command": "bun run test"}, None, False),      # nao e leitura
    ("Write", {"file_path": "c.ts"}, None, False),           # nem toda tool conta
    ("Bash", {"command": "rg valor_conferido apps/"}, None, True),   # 3a de novo
    # Subagente: mesmo estourando o teto varias vezes, nunca e barrado.
    ("Read", {"file_path": "d.ts"}, "ag_1", False),
    ("Read", {"file_path": "e.ts"}, "ag_1", False),
    ("Read", {"file_path": "f.ts"}, "ag_1", False),
    ("Read", {"file_path": "g.ts"}, "ag_1", False),
    ("Grep", {"pattern": "y"}, "ag_1", False),
    # Descricao nao e execucao — a mesma regra do _comum que o protege-dados usa.
    ("Bash", {"command": 'echo "cat arquivo.ts"'}, None, False),
]

# Refinamento do pipe: depois de um `|` o comando FILTRA o que ja entrou no
# contexto; antes dele, BUSCA no disco. `True` = conta como leitura.
# O primeiro caso e o falso positivo real de 16/08 — `git diff | grep '^@@'` foi
# barrado como se abrisse arquivo, no primeiro dia do hook.
CASOS_PIPE = [
    ("git diff -U0 | grep -E '^@@'", False),
    ("git log --oneline | head -20", False),
    ("ls -la | grep claude", False),
    ("bun run test | tail -5", False),
    # Antes do pipe, le mesmo: conta uma vez, pelo primeiro.
    ("cat packages/utils/src/fechamento.ts | head -40", True),
    ("grep -rn valor_conferido apps/ | wc -l", True),
    ("find . -name '*.sql' | head", True),
    # `;` e `&&` iniciam comando NOVO: o primeiro de cada pipeline e olhado.
    ("git status; cat CLAUDE.md", True),
    ("bun install && rg encerrante packages/", True),
    ("echo oi; git log | cat", False),
    # `||` nao pode ser confundido com pipe.
    ("test -f x || cat x", True),
    ("cat x || echo vazio", True),
]


def repo_temporario(pasta: Path, branch: str = "main") -> None:
    """Repo de laboratório com um commit, para hooks que leem branch e índice de verdade."""
    ident = ["-c", "user.name=canario", "-c", "user.email=canario@local"]
    subprocess.run(["git", "init", "-q", "-b", branch, str(pasta)], check=True, capture_output=True)
    (pasta / "CHANGELOG.md").write_text("# Changelog\n")
    subprocess.run(["git", *ident, "-C", str(pasta), "add", "CHANGELOG.md"], check=True, capture_output=True)
    subprocess.run(["git", *ident, "-C", str(pasta), "commit", "-q", "-m", "inicio"], check=True, capture_output=True)


# Hook que não existe ou que estoura (exceção Python, returncode != 0) NÃO é "passa".
# Até 19/09/2026 era: `roda()` lia stdout vazio e devolvia None, e um hook apagado ou
# quebrado passava por hook liberando de propósito. Cada ocorrência vai para QUEBRAS,
# que conta como falha no resumo, e o valor devolvido é a sentinela AUSENTE, que nunca
# bate com o esperado de caso nenhum.
QUEBRAS: list[str] = []
AUSENTE = "AUSENTE"


def _executa(script: str, payload: dict) -> str | None:
    """stdout do hook, ou None (e registro em QUEBRAS) quando o hook não existe/estoura."""
    caminho = HOOKS / script
    if not caminho.is_file():
        QUEBRAS.append(f"{script}: não existe em {HOOKS}")
        return None
    r = subprocess.run(
        ["python3", str(caminho)],
        input=json.dumps(payload), capture_output=True, text=True,
    )
    if r.returncode != 0:
        QUEBRAS.append(f"{script}: saiu com {r.returncode} — {r.stderr.strip()[-200:]}")
        return None
    return r.stdout.strip()


def roda(script: str, payload: dict) -> str | None:
    saida = _executa(script, payload)
    if saida is None:
        return AUSENTE
    if not saida:
        return None
    return json.loads(saida)["hookSpecificOutput"].get("permissionDecision")


def roda_contexto(script: str, payload: dict) -> str:
    """Para hook que injeta contexto em vez de decidir permissão."""
    saida = _executa(script, payload)
    if saida is None:
        return AUSENTE
    if not saida:
        return ""
    return json.loads(saida)["hookSpecificOutput"].get("additionalContext", "")


# Hooks de decisão ou de aviso: cada um tem de estar ligado em pelo menos um evento do
# settings.json. Hook escrito e não ligado é a trava que parece existir (memória
# gate-verde-sem-canario-nao-vale). O so-fable ficou exatamente assim de 18 a 19/09/2026.
HOOKS_QUE_TEM_DE_ESTAR_LIGADOS = [
    "protege-git", "protege-dados", "checklist-commit", "so-fable-na-formula",
    "protege-dependencias", "avisa-pkill", "portao-golden", "trava-ts", "trava-php",
    "forca-delegacao", "diario-de-sessoes", "roteia-consulta", "higiene",
]
# `memoria-somente` é hook DE AGENTE (docblock dele, :4-6): vive no frontmatter de cada
# `.claude/agents/*.md` que declara `memory:`, nunca no settings.json. A exigência é
# por agente: quem tem `memory:` tem de ter o hook, senão volta a poder editar código.
HOOK_DE_AGENTE_COM_MEMORIA = "memoria-somente.py"
HOOK_NO_SETTINGS = re.compile(r"\.claude/hooks/([\w-]+\.py)")
DECLARA_MEMORIA = re.compile(r"^memory:", re.M)


def hooks_citados(settings: dict) -> list[str]:
    """Nomes de arquivo `.py` citados em qualquer comando de hook do settings.json."""
    achados: list[str] = []

    def varre(no) -> None:
        if isinstance(no, dict):
            for v in no.values():
                varre(v)
        elif isinstance(no, list):
            for v in no:
                varre(v)
        elif isinstance(no, str):
            achados.extend(HOOK_NO_SETTINGS.findall(no))

    varre(settings.get("hooks", {}))
    return achados


def frontmatter_de(agente: Path) -> str:
    """Bloco entre os dois `---` iniciais do agente (onde ficam `memory:` e `hooks:`)."""
    texto = agente.read_text()
    if not texto.startswith("---"):
        return ""
    fim = texto.find("\n---", 3)
    return texto[3:fim] if fim != -1 else ""


# avisa-pkill: `pkill -f`/`pgrep -f` cujo padrão casa com a linha do próprio shell →
# aviso (additionalContext), nunca decisão. Colchete no padrão e `pkill` sem `-f` calam.
CASOS_PKILL = [
    ("pkill -f 'bun dev'", True),
    ("pgrep -f vite", True),
    ("pkill -9 -f php", True),
    ("cd x && pkill -f node", True),
    ("pkill -af 'vite'", True),                      # -f em cluster
    ("pkill --full 'bun dev'", True),
    ("pkill -u thygas -f node", True),               # valor de -u pulado, padrão é node
    ("pkill -f '(unbalanced'", True),                # regex inválida: erra para o aviso
    ("pkill -f '[b]un dev'", False),                 # colchete não casa consigo mesmo
    ("pgrep -af '[v]ite'", False),
    ("pkill bun", False),                            # sem -f compara só o nome do processo
    ("kill 1234", False),
    ("pgrep -x bun", False),
    ("echo pkill -f bun", False),                    # descrição, não execução
    ("git commit -m 'fix: pkill -f nunca'", False),
    ("ls -la", False),
]


def main() -> int:
    falhas = 0
    print("── protege-git ──")
    for cmd, esperado in CASOS_GIT:
        obtido = roda("protege-git.py", {"tool_input": {"command": cmd}})
        ok = obtido == esperado
        falhas += not ok
        print(f"  {'✓' if ok else '✗'} {cmd.replace(chr(10), '⏎')[:58]:60} {obtido or 'passa'}")

    # `ask` na main, com repo de verdade: a branch tem de ser lida no diretório em que o
    # comando termina (cwd do JSON + `cd` + `-C`), não no do processo do hook.
    print("── protege-git · ask na main (repo de verdade) ──")
    with tempfile.TemporaryDirectory() as tmp:
        repo = Path(tmp) / "repo"
        repo.mkdir()
        repo_temporario(repo, "main")
        casos_main = [
            ("commit com cwd na main", {"command": "git commit -m x", "cwd": str(repo)}, "ask"),
            ("cd <repo> && commit, cwd fora", {"command": f"cd {repo} && git commit -m x", "cwd": tmp}, "ask"),
            ("git -C <repo> commit, cwd fora", {"command": f"git -C {repo} commit -m x", "cwd": tmp}, "ask"),
            ("merge com cwd na main", {"command": "git merge feat/x", "cwd": str(repo)}, "ask"),
            ("commit com cwd fora de repo", {"command": "git commit -m x", "cwd": tmp}, None),
        ]

        def confere_main(rotulo: str, entrada: dict, esperado: str | None) -> int:
            obtido = roda("protege-git.py", {"tool_input": {"command": entrada["command"]}, "cwd": entrada["cwd"]})
            ok = obtido == esperado
            print(f"  {'✓' if ok else '✗'} {rotulo:60} {obtido or 'passa'}")
            return int(not ok)

        for rotulo, entrada, esperado in casos_main:
            falhas += confere_main(rotulo, entrada, esperado)
        # Só DEPOIS dos casos da main o repo troca de branch: mesmo repo, outra resposta.
        subprocess.run(["git", "-C", str(repo), "switch", "-q", "-c", "trabalho"], check=True, capture_output=True)
        falhas += confere_main("commit em branch de trabalho", {"command": "git commit -m x", "cwd": str(repo)}, None)

    print("── _comum · comando_git ──")
    comum = carrega("_comum.py")
    for seg, esperado in CASOS_GIT_PARSE:
        cg = comum.comando_git(seg)
        obtido = None if cg is None else (cg.dirs_C, cg.configs, cg.subcomando)
        ok = obtido == esperado
        falhas += not ok
        print(f"  {'✓' if ok else '✗'} {seg[:58]:60} {obtido}")

    print("── _comum · diretorio_final ──")
    for cmd, cwd, esperado in CASOS_DIRETORIO:
        obtido = comum.diretorio_final(cmd, cwd)
        ok = obtido == esperado
        falhas += not ok
        print(f"  {'✓' if ok else '✗'} {cmd[:58]:60} {obtido}")

    print("── protege-dados ──")
    for alvo, esperado in CASOS_DADOS:
        obtido = roda("protege-dados.py", {"tool_input": {"file_path": alvo}})
        ok = obtido == esperado
        falhas += not ok
        print(f"  {'✓' if ok else '✗'} {alvo.replace(f'{RAIZ}/', ''):60} {obtido or 'passa'}")

    print("── protege-dados via shell ──")
    for cmd, esperado in CASOS_SHELL:
        obtido = roda("protege-dados.py", {"tool_input": {"command": cmd}})
        ok = obtido == esperado
        falhas += not ok
        print(f"  {'✓' if ok else '✗'} {cmd[:58]:60} {obtido or 'passa'}")

    print("── protege-dependencias ──")
    for cmd, esperado in CASOS_DEPENDENCIA:
        obtido = roda("protege-dependencias.py", {"tool_input": {"command": cmd}})
        ok = obtido == esperado
        falhas += not ok
        print(f"  {'✓' if ok else '✗'} {cmd[:58]:60} {obtido or 'passa'}")

    print("── avisa-pkill ──")
    for cmd, esperado in CASOS_PKILL:
        ctx = roda_contexto("avisa-pkill.py", {"tool_input": {"command": cmd}})
        ok = ctx != AUSENTE and bool(ctx) == esperado
        falhas += not ok
        print(f"  {'✓' if ok else '✗'} {cmd[:58]:60} {ctx if ctx == AUSENTE else ('avisa' if ctx else 'silencio')}")
    # O hook nunca decide: mesmo no caso que avisa, permissionDecision é ausente.
    decisao = roda("avisa-pkill.py", {"tool_input": {"command": "pkill -f 'bun dev'"}})
    ok = decisao is None
    falhas += not ok
    print(f"  {'✓' if ok else '✗'} {'avisa mas nunca decide (sem permissionDecision)':60} {decisao or 'passa'}")

    print("── roteia-consulta ──")
    for prompt, esperado in CASOS_ROTA:
        ctx = roda_contexto("roteia-consulta.py", {"prompt": prompt})
        obtido = sorted(a for a in AGENTES if f"`{a}`" in ctx)
        ok = obtido == sorted(esperado)
        falhas += not ok
        print(f"  {'✓' if ok else '✗'} {prompt[:58]:60} {', '.join(obtido) or 'nao roteia'}")

    print("── memoria-somente ──")
    for alvo, esperado in CASOS_MEMORIA:
        obtido = roda("memoria-somente.py", {"tool_input": {"file_path": alvo}})
        ok = obtido == esperado
        falhas += not ok
        print(f"  {'✓' if ok else '✗'} {alvo.replace(f'{RAIZ}/', '')[:58]:60} {obtido or 'passa'}")

    print("── cobertura de rota por agente ──")
    for agente in AGENTES:
        coberto = any(agente in esperado for _, esperado in CASOS_ROTA)
        falhas += not coberto
        print(f"  {'✓' if coberto else '✗'} {agente:60} "
              f"{'tem rota' if coberto else 'SEM ROTA — nasce e nunca e chamado'}")

    print("── portao-golden ──")
    for alvo, esperado in CASOS_GOLDEN:
        ctx = roda_contexto("portao-golden.py", {"tool_input": {"file_path": alvo}})
        ok = bool(ctx) == esperado
        falhas += not ok
        curto = alvo.replace(f"{RAIZ}/", "")
        print(f"  {'✓' if ok else '✗'} {curto:60} {'avisa' if ctx else 'silencio'}")

    print("── so-fable-na-formula ──")
    with tempfile.TemporaryDirectory() as tmp:
        def transcript(nome: str, modelo: str) -> str:
            t = Path(tmp) / nome
            t.parent.mkdir(parents=True, exist_ok=True)
            t.write_text(json.dumps({"type": "assistant", "message": {"model": modelo}}) + "\n")
            return str(t)
        opus = transcript("opus.jsonl", "claude-opus-5")
        fable = transcript("fable.jsonl", "claude-fable-5-1")
        # subagente fable debaixo de sessão opus: vale o modelo do subagente
        transcript("opus/subagents/agent-abc.jsonl", "claude-fable-5-1")
        transcript("opus/subagents/agent-son.jsonl", "claude-sonnet-5")
        # subagente na primeira ação: transcript sem mensagem de assistente ainda
        for nome, meta in [("novofable", {"model": "fable"}), ("novoson", {"model": "sonnet"}), ("herda", {})]:
            base = Path(tmp) / "opus/subagents" / f"agent-{nome}"
            base.with_suffix(".jsonl").write_text(json.dumps({"type": "user"}) + "\n")
            base.with_suffix(".meta.json").write_text(json.dumps(meta))
        lucro = "frontend/packages/utils/src/lucro.ts"
        casos = [
            ("opus edita lucro.ts", {"transcript_path": opus, "tool_input": {"file_path": lucro}}, "deny"),
            ("fable edita lucro.ts", {"transcript_path": fable, "tool_input": {"file_path": lucro}}, None),
            ("opus edita golden", {"transcript_path": opus, "tool_input": {"file_path": "frontend/packages/utils/src/lucro.golden.spec.ts"}}, "deny"),
            ("opus edita regressao", {"transcript_path": opus, "tool_input": {"file_path": "frontend/packages/utils/src/diferenca.regressao.test.ts"}}, "deny"),
            ("opus edita teste comum", {"transcript_path": opus, "tool_input": {"file_path": "frontend/packages/utils/src/lucro.test.ts"}}, None),
            ("opus edita aggregator", {"transcript_path": opus, "tool_input": {"file_path": "frontend/apps/web/src/services/api/aggregator.service.ts"}}, "deny"),
            ("opus edita tela", {"transcript_path": opus, "tool_input": {"file_path": "frontend/apps/web/src/App.tsx"}}, None),
            ("sem transcript → falha fechada", {"tool_input": {"file_path": lucro}}, "deny"),
            ("subagente fable sob opus", {"transcript_path": opus, "agent_id": "abc", "tool_input": {"file_path": lucro}}, None),
            ("subagente sonnet sob opus", {"transcript_path": opus, "agent_id": "son", "tool_input": {"file_path": lucro}}, "deny"),
            ("subagente sem transcript sob fable", {"transcript_path": fable, "agent_id": "zzz", "tool_input": {"file_path": lucro}}, "deny"),
            ("1ª ação de subagente fable (só meta)", {"transcript_path": opus, "agent_id": "novofable", "tool_input": {"file_path": lucro}}, None),
            ("1ª ação de subagente sonnet (só meta)", {"transcript_path": opus, "agent_id": "novoson", "tool_input": {"file_path": lucro}}, "deny"),
            ("1ª ação de subagente que herda opus", {"transcript_path": opus, "agent_id": "herda", "tool_input": {"file_path": lucro}}, "deny"),
            ("opus: sed -i em lucro.ts", {"transcript_path": opus, "tool_input": {"command": f"sed -i 's/a/b/' {lucro}"}}, "deny"),
            ("opus: echo > lucro.ts", {"transcript_path": opus, "tool_input": {"command": f"echo x > {lucro}"}}, "deny"),
            ("opus: git checkout -- lucro.ts", {"transcript_path": opus, "tool_input": {"command": f"git checkout -- {lucro}"}}, "deny"),
            ("opus: cat lucro.ts", {"transcript_path": opus, "tool_input": {"command": f"cat {lucro}"}}, None),
            ("opus: sed -n lucro.ts", {"transcript_path": opus, "tool_input": {"command": f"sed -n 1,20p {lucro}"}}, None),
            ("opus: git diff lucro.ts", {"transcript_path": opus, "tool_input": {"command": f"git diff {lucro}"}}, None),
            ("opus: commit citando lucro.ts", {"transcript_path": opus, "tool_input": {"command": f"git commit -m 'mv {lucro}'"}}, None),
            # Backend (19/09): a mesma lista única cobre App\Agregacao e App\Fechamento\Domain.
            ("opus edita DadosDoPeriodo.php", {"transcript_path": opus, "tool_input": {"file_path": "backend/app/Agregacao/Application/DadosDoPeriodo.php"}}, "deny"),
            ("opus edita Periodo.php (cwd backend)", {"transcript_path": opus, "tool_input": {"file_path": "app/Agregacao/Application/Periodo.php"}}, "deny"),
            ("opus edita Resource da Agregacao", {"transcript_path": opus, "tool_input": {"file_path": "backend/app/Agregacao/Http/Resources/AgregadoResource.php"}}, "deny"),
            ("opus edita Fechamento.php", {"transcript_path": opus, "tool_input": {"file_path": "backend/app/Fechamento/Domain/Fechamento.php"}}, "deny"),
            ("opus edita Leitura.php (cwd backend)", {"transcript_path": opus, "tool_input": {"file_path": "app/Fechamento/Domain/Leitura.php"}}, "deny"),
            ("opus: sed -i em DadosDoPeriodo.php", {"transcript_path": opus, "tool_input": {"command": "sed -i s/a/b/ backend/app/Agregacao/Application/DadosDoPeriodo.php"}}, "deny"),
            ("fable edita DadosDoPeriodo.php", {"transcript_path": fable, "tool_input": {"file_path": "backend/app/Agregacao/Application/DadosDoPeriodo.php"}}, None),
            ("fable edita Leitura.php", {"transcript_path": fable, "tool_input": {"file_path": "backend/app/Fechamento/Domain/Leitura.php"}}, None),
            ("opus edita DashboardTest.php", {"transcript_path": opus, "tool_input": {"file_path": "backend/tests/Feature/Agregacao/DashboardTest.php"}}, None),
            ("opus edita Combustivel.php (Cadastro)", {"transcript_path": opus, "tool_input": {"file_path": "backend/app/Cadastro/Domain/Combustivel.php"}}, None),
            ("opus edita controller do Fechamento", {"transcript_path": opus, "tool_input": {"file_path": "backend/app/Fechamento/Http/Controllers/X.php"}}, None),
            ("opus: cat DadosDoPeriodo.php", {"transcript_path": opus, "tool_input": {"command": "cat backend/app/Agregacao/Application/DadosDoPeriodo.php"}}, None),
        ]
        for rotulo, payload, esperado in casos:
            obtido = roda("so-fable-na-formula.py", payload)
            ok = obtido == esperado
            falhas += not ok
            print(f"  {'✓' if ok else '✗'} {rotulo:60} {obtido or 'passa'}")

    # A regra "isto é fórmula" mora só em _comum.py. Cópia nova em outro hook é o
    # problema de 19/09 voltando (três cópias divergentes, nenhuma com o backend).
    print("── _comum · FORMULA única ──")
    marcadores = ("packages/utils/src", "aggregator\\.service", "app/Agregacao", "Fechamento/Domain")
    for hook in sorted(HOOKS.glob("*.py")):
        if hook.name in ("_comum.py", "testa-hooks.py"):
            continue
        texto = hook.read_text()
        copias = [m for m in marcadores if m in texto]
        ok = not copias
        falhas += not ok
        if copias or hook.name in ("checklist-commit.py", "portao-golden.py", "so-fable-na-formula.py"):
            print(f"  {'✓' if ok else '✗'} {hook.name:60} {'sem cópia' if ok else 'COPIA: ' + ', '.join(copias)}")

    print("── checklist-commit ──")
    pendencias = carrega("checklist-commit.py").pendencias
    for arquivos, esperado in CASOS_CHECKLIST:
        obtido = len(pendencias(arquivos))
        ok = obtido == esperado
        falhas += not ok
        rotulo = ", ".join(arquivos) or "(commit vazio)"
        print(f"  {'✓' if ok else '✗'} {rotulo[:58]:60} {obtido} pendencia(s)")

    # O hook inteiro, contra um repo de verdade: o que o `git add` do MESMO comando vai
    # pôr no índice tem de ser visto (furo do 0af5e41), e o repo avaliado é o do
    # diretório em que o comando termina, não o do processo.
    print("── checklist-commit (repo de verdade) ──")
    checklist = carrega("checklist-commit.py")
    with tempfile.TemporaryDirectory() as tmp:
        repo = Path(tmp) / "repo"
        repo.mkdir()
        repo_temporario(repo)
        (repo / "x.ts").write_text("export const x = 1;\n")
        (repo / "docs").mkdir()
        (repo / "docs/n.md").write_text("nota\n")
        (repo / "CHANGELOG.md").write_text("# Changelog\n\n- mudou\n")
        casos = [
            ("índice vazio, commit simples", "git commit -m x", str(repo), None),
            ("add x.ts && commit, sem CHANGELOG", "git add x.ts && git commit -m x", str(repo), "ask"),
            ("add x.ts CHANGELOG.md && commit", "git add x.ts CHANGELOG.md && git commit -m x", str(repo), None),
            ("add docs/n.md && commit (dispensa)", "git add docs/n.md && git commit -m x", str(repo), None),
            ("add $F && commit → não apurável", "git add $F && git commit -m x", str(repo), "ask"),
            ("add -p && commit → não apurável", "git add -p x.ts && git commit -m x", str(repo), "ask"),
            ("cd $D && commit → não apurável", "cd $D && git commit -m x", str(repo), "ask"),
            ("commit com cwd fora de repo → não apurável", "git commit -m x", tmp, "ask"),
        ]
        for rotulo, cmd, cwd, esperado in casos:
            obtido = roda("checklist-commit.py", {"tool_input": {"command": cmd}, "cwd": cwd})
            ok = obtido == esperado
            falhas += not ok
            print(f"  {'✓' if ok else '✗'} {rotulo:60} {obtido or 'passa'}")

        # Agora com x.ts JÁ no índice e o cwd em outro lugar: `cd` e `-C` apontam o repo.
        subprocess.run(["git", "-C", str(repo), "add", "x.ts"], check=True, capture_output=True)
        for rotulo, cmd, cwd, esperado in [
            ("cd <repo> && commit, x.ts no índice", f"cd {repo} && git commit -m x", tmp, "ask"),
            ("git -C <repo> commit, x.ts no índice", f"git -C {repo} commit -m x", tmp, "ask"),
            ("git -C <repo> commit -a x.ts+CHANGELOG", f"git -C {repo} commit -am x", tmp, None),
        ]:
            obtido = roda("checklist-commit.py", {"tool_input": {"command": cmd}, "cwd": cwd})
            ok = obtido == esperado
            falhas += not ok
            print(f"  {'✓' if ok else '✗'} {rotulo:60} {obtido or 'passa'}")

        # Caminho relativo ao TOPO mesmo com o add rodando de um subdiretório: é a forma
        # que `pendencias()` conhece (`^frontend/packages/utils/src/…`).
        fonte = repo / "frontend/packages/utils/src"
        fonte.mkdir(parents=True)
        (fonte / "lucro.ts").write_text("export const lucro = 1;\n")
        obtido = checklist.arquivos_do_commit("git add lucro.ts && git commit -m x", str(fonte))
        esperado = ["frontend/packages/utils/src/lucro.ts", "x.ts"]
        ok = obtido == esperado
        falhas += not ok
        print(f"  {'✓' if ok else '✗'} {'add em subdiretório → caminho relativo ao topo':60} {obtido}")

    print("── higiene · plugin fantasma ──")
    higiene = carrega("higiene.py")
    original = (RAIZ / "CLAUDE.md").read_text()
    try:
        for texto, esperado in CASOS_FANTASMA:
            (RAIZ / "CLAUDE.md").write_text(texto)
            obtido = higiene.plugins_citados_ausentes()
            ok = obtido == esperado
            falhas += not ok
            print(f"  {'✓' if ok else '✗'} {texto[:58]:60} {', '.join(obtido) or 'nenhum'}")
    finally:
        # Restaurar SEMPRE: o CLAUDE.md é a fonte de verdade do processo, e um
        # teste que morre no meio não pode deixá-lo truncado no disco.
        (RAIZ / "CLAUDE.md").write_text(original)

    # O caso que faltava. Os 7 sintéticos acima sempre passaram enquanto o
    # detector acusava o CLAUDE.md REAL em toda sessão, porque cada um
    # SOBRESCREVE o arquivo com texto de laboratório. Testar o artefato de
    # verdade é o que fecha a brecha: todo plugin citado nele tem de estar
    # instalado, e o que não estiver é falha aqui, não ruído no SessionStart.
    obtido = higiene.plugins_citados_ausentes()
    ok = obtido == []
    falhas += not ok
    print(f"  {'✓' if ok else '✗'} {'CLAUDE.md REAL não acusa fantasma':60} "
          f"{', '.join(obtido) or 'nenhum'}")

    print("── forca-delegacao ──")
    delegacao = carrega("forca-delegacao.py")
    with tempfile.TemporaryDirectory() as tmp:
        # Estado e teto de laboratório: o hook real usa /tmp e teto 15, e um
        # teste não pode depender de nenhum dos dois.
        delegacao.ESTADO = Path(tmp)
        delegacao.TETO = 3
        for tool, entrada, agente, esperado in CASOS_DELEGACAO:
            payload = {
                "tool_name": tool,
                "tool_input": entrada,
                "session_id": "sessao-de-teste",
            }
            if agente:
                payload["agent_id"] = agente
            obtido = bool(delegacao.decide(payload))
            ok = obtido == esperado
            falhas += not ok
            rotulo = f"{'[sub] ' if agente else ''}{tool} {list(entrada.values())[0]}"
            print(f"  {'✓' if ok else '✗'} {rotulo[:58]:60} "
                  f"{'NEGA' if obtido else 'passa'}")

    print("── forca-delegacao · pipe filtra, não lê ──")
    for cmd, esperado in CASOS_PIPE:
        obtido = delegacao.e_leitura("Bash", {"tool_input": {"command": cmd}})
        ok = obtido == esperado
        falhas += not ok
        print(f"  {'✓' if ok else '✗'} {cmd[:58]:60} "
              f"{'conta' if obtido else 'nao conta'}")

    # Sem session_id não há contador possível: tem de passar, nunca travar.
    sem_sessao = delegacao.decide({"tool_name": "Read", "tool_input": {"file_path": "a"}})
    ok = sem_sessao is None
    falhas += not ok
    print(f"  {'✓' if ok else '✗'} {'sem session_id nao trava':60} "
          f"{'NEGA' if sem_sessao else 'passa'}")

    print("── higiene · ativos críticos ──")
    # Cada caso monta um repo de mentira: (manifesto, arquivos no disco) -> quantos
    # problemas. O manifesto substituiu uma lista fixa que funcionava e mesmo assim
    # não pegou a perda de 16/08 — por isso os três modos de perda são testados
    # separados, e os negativos (arquivo ok) valem tanto quanto os positivos.
    CONTEUDO = b"conteudo do ativo critico"
    HASH_OK = hashlib.sha256(CONTEUDO).hexdigest()
    HASH_ERRADO = "0" * 64
    CASOS_ATIVOS = [
        ("presente, sem exigencia", [{"caminho": "a.bin"}], {"a.bin": CONTEUDO}, 0),
        ("sumiu", [{"caminho": "a.bin"}], {}, 1),
        ("caminho absoluto sumido", [{"caminho": "/nao/existe/x.bin"}], {}, 1),
        ("encolheu", [{"caminho": "a.bin", "bytes_minimos": 2000}], {"a.bin": CONTEUDO}, 1),
        ("tamanho ok", [{"caminho": "a.bin", "bytes_minimos": 5}], {"a.bin": CONTEUDO}, 0),
        ("hash bate", [{"caminho": "a.bin", "sha256": HASH_OK}], {"a.bin": CONTEUDO}, 0),
        ("hash mudou", [{"caminho": "a.bin", "sha256": HASH_ERRADO}], {"a.bin": CONTEUDO}, 1),
        # Sumiu vence encolheu e mudou: um aviso por ativo, nunca três pelo mesmo.
        ("sumiu nao duplica aviso",
         [{"caminho": "a.bin", "bytes_minimos": 9999, "sha256": HASH_ERRADO}], {}, 1),
        ("dois ativos, um quebrado",
         [{"caminho": "a.bin"}, {"caminho": "b.bin"}], {"a.bin": CONTEUDO}, 1),
    ]
    raiz_real = higiene.RAIZ
    try:
        for rotulo, ativos, arquivos, esperado in CASOS_ATIVOS:
            with tempfile.TemporaryDirectory() as tmp:
                falso = Path(tmp)
                higiene.RAIZ = falso
                (falso / ".claude").mkdir()
                (falso / ".claude/ativos-criticos.json").write_text(
                    json.dumps({"ativos": ativos})
                )
                for nome, dados in arquivos.items():
                    (falso / nome).write_bytes(dados)
                obtido = len(higiene.ativos_criticos())
                ok = obtido == esperado
                falhas += not ok
                print(f"  {'✓' if ok else '✗'} {rotulo:60} {obtido} problema(s)")

        # O manifesto é ele próprio um ativo: sem ele, nada está sendo conferido,
        # e o silêncio pareceria saúde.
        for rotulo, escreve in (("manifesto ausente", None),
                                ("manifesto ilegivel", "{ isto nao e json")):
            with tempfile.TemporaryDirectory() as tmp:
                falso = Path(tmp)
                higiene.RAIZ = falso
                if escreve is not None:
                    (falso / ".claude").mkdir()
                    (falso / ".claude/ativos-criticos.json").write_text(escreve)
                obtido = len(higiene.ativos_criticos())
                ok = obtido == 1
                falhas += not ok
                print(f"  {'✓' if ok else '✗'} {rotulo:60} {obtido} problema(s)")
    finally:
        higiene.RAIZ = raiz_real

    # E o manifesto REAL tem de estar íntegro — mesma lição do detector de plugin
    # fantasma, cujos 7 casos sintéticos passavam enquanto o artefato de verdade
    # acusava. Ativo quebrado aqui é falha da bateria, não ruído no SessionStart.
    reais = higiene.ativos_criticos()
    ok = reais == []
    falhas += not ok
    print(f"  {'✓' if ok else '✗'} {'manifesto REAL sem ativo quebrado':60} "
          f"{len(reais)} problema(s)")
    for p in reais:
        print(f"      → {p[:100]}")

    print("── higiene (fumaça) ──")
    r = subprocess.run(
        ["python3", str(HOOKS / "higiene.py")],
        input="{}", capture_output=True, text=True, timeout=60,
    )
    ok = r.returncode == 0 and (not r.stdout.strip() or "hookSpecificOutput" in r.stdout)
    falhas += not ok
    print(f"  {'✓' if ok else '✗'} roda sem estourar{'':43} "
          f"{'com aviso' if r.stdout.strip() else 'silencio'}")
    if r.stderr.strip():
        print(f"      stderr: {r.stderr.strip()[:80]}")

    print("── trava-ts (escopo) ──")
    trava = carrega("trava-ts.py")
    front = RAIZ / "frontend"
    for caminho, esperado in [
        (f"{front}/apps/web/src/App.tsx", "apps/web/src/App.tsx"),
        (f"{front}/packages/utils/src/fechamento.ts", "packages/utils/src/fechamento.ts"),
        (f"{front}/apps/web/src/vite-env.d.ts", None),
        (f"{front}/apps/web/src/__canarios__/x.fixture.ts", None),
        (f"{front}/scripts/reconsolidar-dia.ts", None),
        (f"{front}/eslint.config.mjs", None),
        (f"{RAIZ}/backend/app/Models/Posto.php", None),
    ]:
        obtido = trava.alvo(caminho)
        obtido = obtido[1] if obtido else None
        ok = obtido == esperado
        falhas += not ok
        print(f"  {'✓' if ok else '✗'} {caminho.removeprefix(str(RAIZ) + '/'):60} {obtido}")

    # Canário de verdade: arquivo novo com `any` TEM de voltar com exit 2, e arquivo
    # existente sem mudança TEM de passar (a dívida dele está congelada). Sem os dois
    # lados, "sempre 2" e "sempre 0" passariam por trava funcionando.
    print("── trava-ts (canário, roda o eslint de verdade) ──")
    if not (front / "node_modules/.bin/eslint").exists():
        falhas += 1
        print("  ✗ frontend/node_modules ausente — canário não roda (bun install em frontend/)")
    else:
        sujo = front / "apps/web/src/shared/lib/canario-trava-ts-temporario.ts"
        try:
            sujo.write_text("export const x = (v: any): any => v;\n")
            for rotulo, arquivo, codigo in [
                ("arquivo novo com any → exit 2", sujo, 2),
                ("arquivo existente, dívida congelada → exit 0", front / "apps/web/src/App.tsx", 0),
            ]:
                r = subprocess.run(
                    ["python3", str(HOOKS / "trava-ts.py")],
                    input=json.dumps({"tool_input": {"file_path": str(arquivo)}}),
                    capture_output=True, text=True, timeout=120,
                )
                ok = r.returncode == codigo
                falhas += not ok
                print(f"  {'✓' if ok else '✗'} {rotulo:60} exit {r.returncode}")
                if not ok:
                    print(f"      stderr: {r.stderr.strip()[:200]}")
        finally:
            sujo.unlink(missing_ok=True)

    print("── trava-php (escopo) ──")
    trava_php = carrega("trava-php.py")
    back = RAIZ / "backend"
    for caminho, esperado in [
        (f"{back}/app/Cadastro/Domain/Posto.php", "app/Cadastro/Domain/Posto.php"),
        (f"{back}/tests/Feature/SaudeTest.php", "tests/Feature/SaudeTest.php"),
        (f"{back}/config/app.php", None),
        (f"{back}/vendor/laravel/framework/src/x.php", None),
        (f"{back}/resources/views/welcome.blade.php", None),
        (f"{RAIZ}/frontend/apps/web/src/App.tsx", None),
    ]:
        obtido = trava_php.alvo(caminho)
        obtido = obtido[1] if obtido else None
        ok = obtido == esperado
        falhas += not ok
        print(f"  {'✓' if ok else '✗'} {caminho.removeprefix(str(RAIZ) + '/'):60} {obtido}")

    # PHPStan só no que o phpstan.neon cobre (issue #122 §2): o leitor do neon é puro e sem
    # PyYAML; `tests/Arch` é o excludePaths REAL do repo, e um caminho dentro dele tem de ficar
    # fora, um caminho de app/ dentro.
    print("── trava-php (escopo do PHPStan pelo neon) ──")
    for rotulo, neon, esperado in [
        ("lista simples", "parameters:\n  excludePaths:\n    - tests/Arch\n", ["tests/Arch"]),
        ("forma analyse:", "parameters:\n  excludePaths:\n    analyse:\n      - tests/Arch\n      - database/x\n", ["tests/Arch", "database/x"]),
        ("forma analyseAndScan:", "parameters:\n  excludePaths:\n    analyseAndScan:\n      - vendor\n", ["vendor"]),
        ("sufixo (?) cai", "parameters:\n  excludePaths:\n    - tests/*/Fixtures (?)\n", ["tests/*/Fixtures"]),
        ("dedent fecha o bloco", "parameters:\n  excludePaths:\n    - tests/Arch\n  ignoreErrors: []\n  paths:\n    - app\n", ["tests/Arch"]),
        ("sem excludePaths", "parameters:\n  level: 9\n  paths:\n    - app\n", []),
    ]:
        obtido = trava_php.excluidos_do_phpstan(neon)
        ok = obtido == esperado
        falhas += not ok
        print(f"  {'✓' if ok else '✗'} {rotulo:60} {obtido}")
    for relativo, esperado in [
        ("tests/Arch/ArquiteturaTest.php", False),   # excludePaths real do backend/phpstan.neon
        ("tests/Arch", False),
        ("tests/Feature/SaudeTest.php", True),
        ("tests/Architecture/X.php", True),          # prefixo parecido não é diretório excluído
        ("app/Cadastro/Domain/Posto.php", True),
    ]:
        obtido = trava_php.phpstan_se_aplica(back, relativo)
        ok = obtido == esperado
        falhas += not ok
        print(f"  {'✓' if ok else '✗'} {'phpstan_se_aplica ' + relativo:60} {obtido}")
    for saida, esperado in [
        ("[ERROR] No files found to analyse.", True),
        ('{"tool":"phpstan","raw":["Note: …","[ERROR] No files found to analyse."]}', True),
        ("Found 1 error", False),
        ("", False),
    ]:
        obtido = trava_php.nao_se_aplica(saida)
        ok = obtido == esperado
        falhas += not ok
        print(f"  {'✓' if ok else '✗'} {'nao_se_aplica ' + saida[:45]:60} {obtido}")
    nomes = [nome for nome, _ in trava_php.passos("tests/Arch/ArquiteturaTest.php", back)]
    ok = "PHPStan" not in nomes and "Pest Arch" in nomes
    falhas += not ok
    print(f"  {'✓' if ok else '✗'} {'passos(tests/Arch) sem PHPStan, com Pest Arch':60} {nomes}")
    nomes = [nome for nome, _ in trava_php.passos("app/Cadastro/Domain/Posto.php", back)]
    ok = nomes[:2] == ["PHPStan", "PHPMD"]
    falhas += not ok
    print(f"  {'✓' if ok else '✗'} {'passos(app/…) começa em PHPStan, PHPMD':60} {nomes}")

    # Canário de verdade, os dois lados: classe com dd() TEM de voltar exit 2 (e prova que o
    # Pest Arch está vivo), arquivo existente TEM de passar. E o tests/Arch, que o neon exclui,
    # TEM de passar sem o PHPStan reclamar "No files found" (antes: exit 2, issue #122 §2).
    print("── trava-php (canário, roda os gates de verdade) ──")
    if not (back / "vendor/bin/phpstan").exists():
        falhas += 1
        print("  ✗ backend/vendor ausente — canário não roda (composer install em backend/)")
    else:
        sujo = back / "app/Compartilhado/CanarioTravaPhp.php"
        try:
            sujo.write_text(
                "<?php\n\ndeclare(strict_types=1);\n\nnamespace App\\Compartilhado;\n\n"
                "final class CanarioTravaPhp\n{\n    public static function x(): void\n    {\n        dd(1);\n    }\n}\n"
            )
            # Em sequência, e o sujo apagado ANTES do caso limpo: o Pest Arch varre o app/
            # inteiro, então com o sujo ainda no disco o caso limpo reprovaria por ele.
            for rotulo, arquivo, codigo in [
                ("classe com dd() → exit 2", sujo, 2),
                ("arquivo existente limpo → exit 0", back / "app/Compartilhado/PostoAtual.php", 0),
                ("tests/Arch (fora do neon) → exit 0, sem PHPStan", back / "tests/Arch/ArquiteturaTest.php", 0),
            ]:
                if codigo == 0:
                    sujo.unlink(missing_ok=True)
                r = subprocess.run(
                    ["python3", str(HOOKS / "trava-php.py")],
                    input=json.dumps({"tool_input": {"file_path": str(arquivo)}}),
                    capture_output=True, text=True, timeout=180,
                )
                ok = r.returncode == codigo and (codigo == 0 or "Pest Arch" in r.stderr)
                ok = ok and ("PHPStan" not in r.stderr if "fora do neon" in rotulo else True)
                falhas += not ok
                print(f"  {'✓' if ok else '✗'} {rotulo:60} exit {r.returncode}")
                if not ok:
                    print(f"      stderr: {r.stderr.strip()[:300]}")
        finally:
            sujo.unlink(missing_ok=True)

    # Meta-canário de fiação: todo hook citado no settings.json existe no disco, e todo hook
    # de decisão/aviso do disco está ligado em algum evento. Hook escrito e não ligado
    # (so-fable, 18→19/09) e hook ligado e apagado (viraria "passa" silencioso) são os dois
    # modos de falha que este bloco fecha.
    print("── settings.json liga o que existe ──")
    settings_path = RAIZ / ".claude/settings.json"
    try:
        settings = json.loads(settings_path.read_text())
        ok = True
    except (OSError, json.JSONDecodeError) as erro:
        settings, ok = {}, False
        print(f"  ✗ settings.json ilegível: {erro}")
    falhas += not ok
    citados = hooks_citados(settings)
    ok = bool(citados)
    falhas += not ok
    print(f"  {'✓' if ok else '✗'} {'settings.json cita hooks em .claude/hooks/':60} {len(citados)}")
    for nome in sorted(set(citados)):
        existe = (HOOKS / nome).is_file()
        falhas += not existe
        print(f"  {'✓' if existe else '✗'} {'citado existe: ' + nome:60} {'ok' if existe else 'NÃO EXISTE'}")
    for nome in HOOKS_QUE_TEM_DE_ESTAR_LIGADOS:
        ligado = f"{nome}.py" in citados
        falhas += not ligado
        print(f"  {'✓' if ligado else '✗'} {'ligado: ' + nome:60} {'ok' if ligado else 'NÃO LIGADO'}")
    # Hook de agente: todo agente com `memory:` carrega o memoria-somente no frontmatter, e
    # todo hook que um frontmatter cita existe no disco.
    agentes = sorted((RAIZ / ".claude/agents").glob("*.md"))
    ok = bool(agentes)
    falhas += not ok
    print(f"  {'✓' if ok else '✗'} {'.claude/agents/*.md encontrados':60} {len(agentes)}")
    com_memoria = 0
    for agente in agentes:
        fm = frontmatter_de(agente)
        citados_no_agente = HOOK_NO_SETTINGS.findall(fm)
        for nome in sorted(set(citados_no_agente)):
            existe = (HOOKS / nome).is_file()
            falhas += not existe
            if not existe:
                print(f"  ✗ {'agente ' + agente.stem + ' cita ' + nome:60} NÃO EXISTE")
        if DECLARA_MEMORIA.search(fm):
            com_memoria += 1
            ligado = HOOK_DE_AGENTE_COM_MEMORIA in citados_no_agente
            falhas += not ligado
            print(f"  {'✓' if ligado else '✗'} {'memory: → memoria-somente no agente ' + agente.stem:60} {'ok' if ligado else 'NÃO LIGADO'}")
    ok = com_memoria > 0
    falhas += not ok
    print(f"  {'✓' if ok else '✗'} {'algum agente declara memory: (senão o bloco acima é vazio)':60} {com_memoria}")

    if QUEBRAS:
        print("── hooks que não existiam ou estouraram durante a bateria ──")
        for q in dict.fromkeys(QUEBRAS):
            print(f"  ✗ {q[:110]}")
        falhas += len(QUEBRAS)

    print(f"\n{'TODOS OS CASOS PASSARAM' if not falhas else f'{falhas} FALHA(S)'}")
    return 1 if falhas else 0


if __name__ == "__main__":
    raise SystemExit(main())
