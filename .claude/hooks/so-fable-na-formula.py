#!/usr/bin/env python3
"""Só o Opus 5.5 (ou o Fable 5) edita regra de cálculo de dinheiro.

Roda como hook PreToolUse em Write|Edit|NotebookEdit|Bash. Decisão do dono em
18/09/2026: "quando formos mexer na regra de cálculos, só iremos usar o Fable 5".
Em 22/09/2026 o dono trocou o titular: "iremos usar esse novo opus ao invés do
fable, gasta menos e é melhor". O Opus 5.5 entra; o Opus 5 e anteriores seguem
barrados. O Fable continua aceito — a decisão troca quem faz, não rebaixa a trava.
O nome do arquivo fica, para não quebrar o settings.json nem os canários.

Os arquivos cobertos são os mesmos que o `portao-golden` já considera fórmula
(fonte de `packages/utils/src` e o `aggregator.service.ts`), mais os golden
master e as suítes de regressão de dinheiro, porque mudar o número esperado de um
golden É mudar a regra de cálculo.

**Como o hook sabe o modelo:** o harness não manda o modelo no JSON do hook, mas
grava `message.model` em cada mensagem do assistente no transcript. O hook lê a
última mensagem de assistente do transcript de quem está chamando a ferramenta —
o do subagente, quando `agent_id` vem na entrada, ou o da sessão principal.

**Falha fechada.** Se o modelo não puder ser lido, nega. Uma regra de dinheiro
editada por modelo desconhecido é exatamente o que a trava existe para impedir;
o custo do erro para o outro lado é pedir ao dono para trocar de modelo.
"""
import json
import re
import shlex
import sys
from pathlib import Path

from _comum import segmentos

FORMULA = re.compile(
    r"(^|/)packages/utils/src/[\w./-]+\.ts$"
    r"|(^|/)apps/web/src/services/api/aggregator\.service\.ts$"
    # [21/09] Buraco achado pelo plano da #103 P8: o painel tem a SUA somadora de
    # dinheiro (`calcularTotais`) e o encerrante do dono tem a TERCEIRA, e nenhuma
    # das duas estava coberta — qualquer modelo podia reescrever a fórmula por ali.
    # `venda-do-dia` entra junto porque nasce nesta fatia como a somadora nova.
    r"|(^|/)apps/web/src/utils/(calculators|venda-do-dia)[\w.-]*\.tsx?$"
    r"|(^|/)packages/api-core/src/encerrante[\w.-]*\.ts$"
    # [22/09] Buraco achado pelo plano do FSD do pwa-frentista: o payload do envio
    # (valor_conferido, diferenca_calculada, os 7 valor_* em centavos) é montado no
    # App.tsx e vai para features/enviar-fechamento/model; o Histórico decide o sinal
    # da diferença e o Vendas soma valor_total. Nada disso estava na trava.
    r"|(^|/)apps/pwa-frentista/src/App\.tsx$"
    r"|(^|/)apps/pwa-frentista/src/features/enviar-fechamento/model/[\w./-]+\.tsx?$"
    r"|(^|/)apps/pwa-frentista/src/screens/(Historico|Vendas)Screen\.tsx$"
    r"|(^|/)apps/pwa-frentista/src/pages/(historico|vendas)/[\w./-]+\.tsx?$"
)
# Teste comum de utils pode mudar à vontade; golden e regressão de dinheiro não.
TESTE_LIVRE = re.compile(r"\.(test|spec)\.tsx?$")
TESTE_DE_REGRA = re.compile(r"\.(golden\.spec|regressao\.test)\.ts$")

# Id completo no transcript; alias no meta de subagente. `claude-opus-5-5` casa o
# 5.5 e NÃO o `claude-opus-5` puro. O alias `opus` resolve para o Opus mais novo
# (5.5 desde 22/09); se um dia apontar para outro, revisar aqui.
MODELO_PERMITIDO = re.compile(r"^(claude-opus-5-5|claude-fable-5|opus$|fable$)")

# Comandos de shell que escrevem no arquivo que recebem como argumento.
ESCREVE = re.compile(
    r"^(sed\s+(-\w*i|--in-place)|perl\s+-\w*i|tee\b|cp\b|mv\b|rm\b|truncate\b|patch\b"
    r"|git\s+(checkout|restore|apply|stash\s+pop)\b|python3?\b|node\b|bun\b|dd\b|install\b)"
)
REDIRECAO = re.compile(r">>?\s*(\S+)")

MOTIVO = (
    "Bloqueado pelo hook so-fable-na-formula: `{caminho}` é regra de cálculo de "
    "dinheiro, e só o Opus 5.5 (ou o Fable 5) mexe nela — decisão do dono, 22/09/2026.\n"
    "Modelo que tentou: {modelo}.\n"
    "  → na sessão principal: `/model` → Opus 5.5 e repita.\n"
    "  → em subagente/workflow: passe `model: 'opus'` no Agent/agent().\n"
    "  → continua valendo: golden master rodando (`bun run test:golden`) e skill "
    "`fechamento-posto-providencia`."
)


def e_regra_de_calculo(caminho: str) -> bool:
    caminho = caminho.strip("'\"")
    if not FORMULA.search(caminho):
        return False
    return not TESTE_LIVRE.search(caminho) or bool(TESTE_DE_REGRA.search(caminho))


def alvos_no_shell(cmd: str) -> list[str]:
    alvos = []
    for seg in segmentos(cmd):
        try:
            tokens = shlex.split(seg)
        except ValueError:
            tokens = seg.split()
        escreve = bool(ESCREVE.match(seg))
        redirecionados = {t.strip("'\"") for t in REDIRECAO.findall(seg)}
        for t in tokens:
            if e_regra_de_calculo(t) and (escreve or t in redirecionados):
                alvos.append(t)
        for t in redirecionados:
            if e_regra_de_calculo(t) and t not in alvos:
                alvos.append(t)
    return alvos


def ultimo_modelo(transcript: Path) -> str | None:
    try:
        with transcript.open("rb") as f:
            f.seek(0, 2)
            tamanho = f.tell()
            f.seek(max(0, tamanho - 4_000_000))
            linhas = f.read().decode("utf-8", "replace").splitlines()
    except OSError:
        return None
    for linha in reversed(linhas):
        try:
            j = json.loads(linha)
        except ValueError:
            continue
        if j.get("type") == "assistant":
            modelo = (j.get("message") or {}).get("model")
            if modelo and modelo != "<synthetic>":
                return modelo
    return None


def modelo_de(entrada: dict) -> str | None:
    """Modelo de quem chama a ferramenta.

    Ordem: 1) última mensagem de assistente no transcript de quem chama;
    2) para subagente cuja PRIMEIRA ação é esta, o transcript ainda não tem
    mensagem de assistente (o harness grava depois do PreToolUse — visto no
    canário de 18/09), então vale o `model` do `agent-<id>.meta.json`, que o
    harness só preenche quando o modelo foi pedido explicitamente;
    3) sem `model` no meta, o subagente herdou o modelo da sessão principal.
    """
    principal = entrada.get("transcript_path")
    if not principal:
        return None
    agente = entrada.get("agent_id")
    if not agente:
        return ultimo_modelo(Path(principal))
    base = Path(principal).with_suffix("")  # <sessão>.jsonl → <sessão>/
    achados = sorted(base.glob(f"subagents/**/agent-{agente}.jsonl"))
    if not achados:
        return None  # subagente sem transcript: não herdar o modelo do pai às cegas
    modelo = ultimo_modelo(achados[0])
    if modelo:
        return modelo
    try:
        meta = json.loads(achados[0].with_suffix(".meta.json").read_text())
    except (OSError, ValueError):
        meta = {}
    if meta.get("model"):
        return str(meta["model"])
    return ultimo_modelo(Path(principal))


def nega(caminho: str, modelo: str) -> None:
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": MOTIVO.format(caminho=caminho, modelo=modelo),
        }
    }))


def main() -> None:
    try:
        entrada = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        return

    dados = entrada.get("tool_input", {}) or {}
    if "command" in dados:
        alvos = alvos_no_shell(str(dados["command"]))
    else:
        caminho = str(dados.get("file_path") or dados.get("notebook_path") or "")
        alvos = [caminho] if e_regra_de_calculo(caminho) else []
    if not alvos:
        return

    modelo = modelo_de(entrada)
    if modelo and MODELO_PERMITIDO.match(modelo):
        return
    nega(alvos[0], modelo or "desconhecido (transcript ilegível — trava falha fechada)")


if __name__ == "__main__":
    main()
