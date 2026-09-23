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


# CA-2: controller não fala com Domain. Canário da trava que nasceu em 21/09/2026 —
# a regra existia desde 17/09 num COMENTÁRIO do deptrac.yaml, que nada lê.
# Os três primeiros PRECISAM negar; os quatro últimos precisam passar, porque tipar
# model num Resource é o uso legítimo que abriu a aresta Http → Domain no PR #111.
CASOS_CONTROLLER = [
    ("backend/app/Fechamento/Http/Controllers/FechamentoController.php",
     "<?php\nuse App\\Fechamento\\Domain\\Fechamento;", "content", "deny"),
    ("backend/app/Cadastro/Http/Controllers/CatalogoController.php",
     "return \\App\\Cadastro\\Domain\\Bico::all();", "new_string", "deny"),
    # zona cinzenta, negada de propósito: regra de arquitetura não ganha exceção (dono, 18/09).
    ("backend/app/Fechamento/Http/Controllers/X.php",
     "use App\\Fechamento\\Domain\\Enums\\StatusFechamento;", "new_string", "deny"),
    ("backend/app/Fechamento/Http/Resources/FechamentoResource.php",
     "use App\\Fechamento\\Domain\\Fechamento;", "content", None),
    ("backend/app/Fechamento/Http/Requests/DiaRequest.php",
     "use App\\Fechamento\\Domain\\Fechamento;", "content", None),
    ("backend/app/Fechamento/Http/Controllers/FechamentoController.php",
     "use App\\Fechamento\\Application\\FechamentoDoDia;", "content", None),
    ("frontend/apps/web/src/App.tsx", "App\\Fechamento\\Domain\\X", "content", None),
    # buracos B1/B4, fechados em 21/09 depois do plano da CA-2:
    # controller do LEGADO (sem segmento de modulo no caminho)
    ("backend/app/Http/Controllers/Controller.php",
     "use App\\Fechamento\\Domain\\Fechamento;", "content", "deny"),
    # App\Models do template
    ("backend/app/Cadastro/Http/Controllers/CatalogoController.php",
     "use App\\Models\\User;", "new_string", "deny"),
    # Posto e `final class Posto extends Model`, mas mora em Compartilhado e escapava
    ("backend/app/Fechamento/Http/Controllers/FechamentoController.php",
     "use App\\Compartilhado\\Posto;", "new_string", "deny"),
    # middleware continua podendo: DefinePostoAtual.php:7 importa Posto de proposito
    ("backend/app/Cadastro/Http/Middleware/DefinePostoAtual.php",
     "use App\\Compartilhado\\Posto;", "content", None),
]


# DOM-3: dinheiro quantizado por `emCentavos`. Canário da trava de 21/09/2026.
# Os 5 sítios à mão medidos em 17/09 continuam no código; a trava barra a SEXTA cópia.
CASOS_CENTAVOS = [
    ("frontend/apps/web/src/utils/fechamentoMeios.ts",
     "totais[balde] = Math.round(totais[balde] * 100) / 100;", "new_string", "deny"),
    # quebrado em duas linhas: a forma real de use-planilha-do-banco.ts:817
    ("frontend/packages/utils/src/despesa-fixa.ts",
     "const d = Math.round(\n  (alvo - itemizado) * 100\n) / 100;", "content", "deny"),
    # o arquivo que DEFINE emCentavos pode escrever a expressao: e a copia legitima
    ("frontend/packages/utils/src/lucro.ts",
     "export const emCentavos = (reais: number): number => Math.round(reais * 100) / 100;", "content", None),
    # golden monta o numero esperado a mao de proposito
    ("frontend/packages/utils/src/lucro.golden.spec.ts",
     "expect(x).toBe(Math.round(y * 100) / 100);", "content", None),
    ("frontend/apps/web/src/utils/fechamentoMeios.ts",
     "const valor = emCentavos(bruto);", "new_string", None),
    # nao e dinheiro nem e o par *100 / 100
    ("frontend/apps/web/src/utils/fechamentoMeios.ts",
     "const pct = Math.round(taxa * 100);", "new_string", None),
    ("backend/app/Fechamento/Http/Controllers/X.php",
     "Math.round(x * 100) / 100", "content", None),
]


# Cobertura da FORMULA do so-fable-na-formula: quais caminhos contam como regra de
# dinheiro. Estendida em 21/09/2026, depois que o plano da #103 P8 mediu que o
# painel (`calculators.ts`) e o encerrante do dono (`api-core/encerrante.ts`)
# estavam FORA da trava de modelo — qualquer modelo podia reescrever a fórmula ali.
CASOS_FORMULA_COBERTURA = [
    ("frontend/apps/web/src/utils/calculators.ts", True),
    ("frontend/apps/web/src/utils/venda-do-dia.ts", True),
    ("frontend/apps/web/src/utils/calculators.golden.spec.ts", True),
    ("frontend/apps/web/src/utils/venda-do-dia.golden.spec.ts", True),
    ("frontend/packages/api-core/src/encerrante.ts", True),
    ("frontend/packages/utils/src/leitura.ts", True),
    # teste comum pode mudar a vontade; golden e que nao
    ("frontend/apps/web/src/utils/calculators.test.ts", False),
    ("frontend/apps/web/src/utils/venda-do-dia.test.ts", False),
    # fora da formula: hook de tela e helper de meios de pagamento
    ("frontend/apps/web/src/utils/fechamentoMeios.ts", False),
    ("frontend/apps/web/src/components/fechamento-diario/hooks/useFechamento.ts", False),
]


def roda(script: str, payload: dict) -> str | None:
    r = subprocess.run(
        ["python3", str(HOOKS / script)],
        input=json.dumps(payload), capture_output=True, text=True,
    )
    saida = r.stdout.strip()
    if not saida:
        return None
    return json.loads(saida)["hookSpecificOutput"]["permissionDecision"]


def roda_contexto(script: str, payload: dict) -> str:
    """Para hook que injeta contexto em vez de decidir permissão."""
    r = subprocess.run(
        ["python3", str(HOOKS / script)],
        input=json.dumps(payload), capture_output=True, text=True,
    )
    saida = r.stdout.strip()
    if not saida:
        return ""
    return json.loads(saida)["hookSpecificOutput"]["additionalContext"]


def main() -> int:
    falhas = 0
    print("── protege-git ──")
    for cmd, esperado in CASOS_GIT:
        obtido = roda("protege-git.py", {"tool_input": {"command": cmd}})
        ok = obtido == esperado
        falhas += not ok
        print(f"  {'✓' if ok else '✗'} {cmd.replace(chr(10), '⏎')[:58]:60} {obtido or 'passa'}")

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
    import tempfile
    with tempfile.TemporaryDirectory() as tmp:
        def transcript(nome: str, modelo: str) -> str:
            t = Path(tmp) / nome
            t.parent.mkdir(parents=True, exist_ok=True)
            t.write_text(json.dumps({"type": "assistant", "message": {"model": modelo}}) + "\n")
            return str(t)
        opus = transcript("opus.jsonl", "claude-opus-5")
        fable = transcript("fable.jsonl", "claude-fable-5-1")
        opus55 = transcript("opus55.jsonl", "claude-opus-5-5")
        # subagente fable debaixo de sessão opus: vale o modelo do subagente
        transcript("opus/subagents/agent-abc.jsonl", "claude-fable-5-1")
        transcript("opus/subagents/agent-son.jsonl", "claude-sonnet-5")
        # subagente na primeira ação: transcript sem mensagem de assistente ainda
        for nome, meta in [("novofable", {"model": "fable"}), ("novoson", {"model": "sonnet"}), ("herda", {}),
                           ("novoopus", {"model": "opus"})]:
            base = Path(tmp) / "opus/subagents" / f"agent-{nome}"
            base.with_suffix(".jsonl").write_text(json.dumps({"type": "user"}) + "\n")
            base.with_suffix(".meta.json").write_text(json.dumps(meta))
        lucro = "frontend/packages/utils/src/lucro.ts"
        casos = [
            ("opus edita lucro.ts", {"transcript_path": opus, "tool_input": {"file_path": lucro}}, "deny"),
            ("fable edita lucro.ts", {"transcript_path": fable, "tool_input": {"file_path": lucro}}, None),
            # [22/09] o dono trocou o titular para o Opus 5.5; o Opus 5 segue barrado (caso acima)
            ("opus 5.5 edita lucro.ts", {"transcript_path": opus55, "tool_input": {"file_path": lucro}}, None),
            ("opus 5.5 edita golden", {"transcript_path": opus55, "tool_input": {"file_path": "frontend/packages/utils/src/lucro.golden.spec.ts"}}, None),
            ("1ª ação de subagente opus (só meta)", {"transcript_path": opus, "agent_id": "novoopus", "tool_input": {"file_path": lucro}}, None),
            ("sessão opus 5.5: subagente sonnet segue barrado", {"transcript_path": opus55, "agent_id": "son", "tool_input": {"file_path": lucro}}, "deny"),
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
        ]
        for rotulo, payload, esperado in casos:
            obtido = roda("so-fable-na-formula.py", payload)
            ok = obtido == esperado
            falhas += not ok
            print(f"  {'✓' if ok else '✗'} {rotulo:60} {obtido or 'passa'}")

    print("── controller-nao-fala-com-domain (CA-2) ──")
    for caminho, texto, chave, esperado in CASOS_CONTROLLER:
        obtido = roda("controller-nao-fala-com-domain.py",
                      {"tool_input": {"file_path": f"{RAIZ}/{caminho}", chave: texto}})
        ok = obtido == esperado
        falhas += not ok
        print(f"  {'✓' if ok else '✗'} {caminho.split('/Http/')[-1][:58]:60} {obtido or 'passa'}")

    print("── dinheiro-quantiza-por-emcentavos (DOM-3) ──")
    for caminho, texto, chave, esperado in CASOS_CENTAVOS:
        obtido = roda("dinheiro-quantiza-por-emcentavos.py",
                      {"tool_input": {"file_path": f"{RAIZ}/{caminho}", chave: texto}})
        ok = obtido == esperado
        falhas += not ok
        print(f"  {'✓' if ok else '✗'} {caminho.split('/src/')[-1][:58]:60} {obtido or 'passa'}")

    print("── so-fable-na-formula · cobertura da FORMULA ──")
    _fable = carrega("so-fable-na-formula.py")
    for caminho, esperado in CASOS_FORMULA_COBERTURA:
        obtido = _fable.e_regra_de_calculo(caminho)
        ok = obtido == esperado
        falhas += not ok
        print(f"  {'✓' if ok else '✗'} {caminho.split('/src/')[-1][:58]:60} "
              f"{'protegido' if obtido else 'livre'}")

    print("── checklist-commit ──")
    pendencias = carrega("checklist-commit.py").pendencias
    for arquivos, esperado in CASOS_CHECKLIST:
        obtido = len(pendencias(arquivos))
        ok = obtido == esperado
        falhas += not ok
        rotulo = ", ".join(arquivos) or "(commit vazio)"
        print(f"  {'✓' if ok else '✗'} {rotulo[:58]:60} {obtido} pendencia(s)")

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

    # Canário de verdade, os dois lados: classe com dd() TEM de voltar exit 2 (e prova que o
    # Pest Arch está vivo), arquivo existente TEM de passar.
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
            ]:
                if codigo == 0:
                    sujo.unlink(missing_ok=True)
                r = subprocess.run(
                    ["python3", str(HOOKS / "trava-php.py")],
                    input=json.dumps({"tool_input": {"file_path": str(arquivo)}}),
                    capture_output=True, text=True, timeout=180,
                )
                ok = r.returncode == codigo and (codigo == 0 or "Pest Arch" in r.stderr)
                falhas += not ok
                print(f"  {'✓' if ok else '✗'} {rotulo:60} exit {r.returncode}")
                if not ok:
                    print(f"      stderr: {r.stderr.strip()[:300]}")
        finally:
            sujo.unlink(missing_ok=True)

    print(f"\n{'TODOS OS CASOS PASSARAM' if not falhas else f'{falhas} FALHA(S)'}")
    return 1 if falhas else 0


if __name__ == "__main__":
    raise SystemExit(main())
