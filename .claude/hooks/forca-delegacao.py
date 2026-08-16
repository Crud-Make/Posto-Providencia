#!/usr/bin/env python3
"""Teto de leituras na thread principal — obriga a delegar a varredura.

Roda como hook PreToolUse em `Read|Grep|Glob|Bash`, declarado em
`.claude/settings.json`.

Existe porque o `roteia-consulta` resolveu metade do problema. Ele encaminha
**pergunta** ("onde fica X", "quanto deu Y") para os seis agentes de consulta.
Só que a sessão não incha respondendo pergunta: incha **implementando** — ler
vinte arquivos para entender um fluxo, rodar teste, ler o erro, editar, repetir.
Nada disso casa com uma rota, então cai inteiro na thread principal, que é onde
o contexto estourou em 16/08/2026 e originou este hook.

O §13 do CLAUDE.md já dizia quando delegar ("só quando ele lê muito e devolve
pouco"). Este arquivo é a mesma frase, medida: passando de `TETO` leituras numa
thread, a próxima é negada e a varredura tem de ir para um agente.

**Nega uma vez e zera o contador, em vez de virar parede.** Depois de delegar, a
thread principal ainda precisa ler os poucos arquivos que o agente apontou —
bloquear para sempre transformaria a trava em impedimento. O efeito desejado é
ritmo, não muro: a cada `TETO` leituras, uma parada obrigatória para decidir se
aquilo ainda é trabalho de thread principal.

**Subagente nunca é barrado.** É o ponto que decide se o hook ajuda ou sabota: os
hooks de `settings.json` disparam dentro dos subagentes também, então contar as
leituras do `code-explorer` no mesmo balde bloquearia exatamente quem foi
chamado para ler muito. O que separa os dois é o campo `agent_id`, presente só
quando o hook dispara dentro de um subagente (documentado em
code.claude.com/docs/en/hooks). Cada subagente tem o próprio orçamento, e é isso
que torna a delegação um ganho real de contexto, não um remendo.

Calibragem: `POSTO_TETO_LEITURAS=25` no ambiente. O teto default é conservador de
propósito — teto alto demais nunca dispara, e hook que nunca dispara é hook que
não existe.
"""
import json
import os
import re
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _comum import primeiros_de_pipeline  # noqa: E402  (precisa do sys.path acima)

TETO = int(os.environ.get("POSTO_TETO_LEITURAS", "15"))

# Leitura por shell conta igual. É a mesma porta dos fundos que o `protege-dados`
# teve de cobrir: negar `Read` e deixar `cat` passar só ensina a usar `cat`.
#
# Mas só a PRIMEIRA etapa de cada pipeline é olhada. O `grep` de
# `git diff | grep '^@@'` não abre arquivo nenhum — filtra a saída do `git diff`,
# que já entrou no contexto e já foi contada. Contá-lo de novo era o falso
# positivo visto em 16/08/2026, no primeiro dia deste hook. Ver
# `primeiros_de_pipeline` no `_comum`.
LEITURA_SHELL = re.compile(
    r"^(cat|head|tail|less|more|grep|rg|ag|find|fd|awk|sed|jq|wc|nl|bat)\b"
)

ESTADO = Path(os.environ.get("XDG_RUNTIME_DIR", "/tmp")) / "posto-forca-delegacao"
VALIDADE = 24 * 3600  # arquivo de sessão mais velho que isto é lixo

MOTIVO = (
    "Bloqueado pelo hook forca-delegacao: {n} leituras já nesta thread "
    "principal (teto {teto}).\n\n"
    "Isto não é erro seu — é a parada obrigatória do CLAUDE.md §13. Varredura "
    "larga é trabalho de subagente, que **lê muito e devolve pouco**; feita "
    "aqui, ela empurra o contexto inteiro para dentro da thread e é o que faz a "
    "sessão inchar.\n\n"
    "Delegue e volte com a conclusão, não com os arquivos:\n"
    "  • mapear código, achar padrão parecido, traçar um fluxo → `code-explorer` "
    "(ou `Explore`)\n"
    "  • onde fica / quem usa / raio de impacto → `grafo`\n"
    "  • valor real do posto, fórmula da planilha → `planilha`\n"
    "  • git: quem mexeu, quando entrou, dá pra recuperar → `historico`\n"
    "  • RLS, esquema, conformidade → `rls` / `schema` / `conformidade`\n"
    "  • feature nova inteira → `/feature-dev`, que já orquestra as fases\n\n"
    "O contador foi zerado: as leituras pontuais que o agente apontar passam "
    "normalmente. Se esta leitura específica é mesmo de thread principal, "
    "repita a chamada."
)


def caminho_da_sessao(sessao: str) -> Path:
    """Um arquivo por sessão. `sessao` é UUID do harness, mas nunca confie: um
    caminho vindo de fora que carregue `/` ou `..` escreveria fora do diretório."""
    return ESTADO / f"{re.sub(r'[^A-Za-z0-9_-]', '', sessao)[:64]}.txt"


def limpa_velhos() -> None:
    """Sessão morta deixa arquivo para trás; ninguém avisa o hook que acabou."""
    limite = time.time() - VALIDADE
    for antigo in ESTADO.glob("*.txt"):
        try:
            if antigo.stat().st_mtime < limite:
                antigo.unlink()
        except OSError:
            pass


def conta(arquivo: Path) -> int:
    """Incrementa e devolve o total. Estado corrompido reinicia do zero — perder
    a contagem custa um bloqueio a menos, nunca um bloqueio errado."""
    try:
        atual = int(arquivo.read_text().strip())
    except (OSError, ValueError):
        atual = 0
    novo = atual + 1
    arquivo.write_text(str(novo))
    return novo


def e_leitura(tool: str, entrada: dict) -> bool:
    if tool in ("Read", "Grep", "Glob"):
        return True
    if tool != "Bash":
        return False
    cmd = str(entrada.get("tool_input", {}).get("command", ""))
    return any(LEITURA_SHELL.match(s) for s in primeiros_de_pipeline(cmd))


def nega(motivo: str) -> None:
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": motivo,
        }
    }))


def decide(entrada: dict) -> str | None:
    """Devolve o motivo da negativa, ou None para deixar passar."""
    # Subagente tem orçamento próprio: `agent_id` só existe dentro de um.
    if entrada.get("agent_id"):
        return None

    if not e_leitura(str(entrada.get("tool_name", "")), entrada):
        return None

    sessao = str(entrada.get("session_id", ""))
    if not sessao:
        return None  # sem sessão não há contador; não é motivo para travar

    ESTADO.mkdir(parents=True, exist_ok=True)
    limpa_velhos()

    arquivo = caminho_da_sessao(sessao)
    n = conta(arquivo)
    if n < TETO:
        return None

    arquivo.write_text("0")  # nega uma vez e devolve orçamento cheio
    return MOTIVO.format(n=n, teto=TETO)


def main() -> None:
    try:
        entrada = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        return

    try:
        motivo = decide(entrada)
    except OSError:
        return  # disco cheio ou /tmp sem permissão não pode parar o trabalho

    if motivo:
        nega(motivo)


if __name__ == "__main__":
    main()
