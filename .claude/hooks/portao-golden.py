#!/usr/bin/env python3
"""Avisa, na hora da edição, que um arquivo de fórmula exige golden master.

Roda como hook PostToolUse em Write/Edit. O §6 do CLAUDE.md diz "toda fórmula
aplicada exige golden master antes de a tarefa ser considerada pronta" e o §0.6
repete "nenhuma fórmula muda sem golden master rodando, sem exceção". Até agora
isso era só instrução — e instrução depende de alguém lembrar no fim da tarefa,
que é exatamente quando o contexto já rolou pra longe.

O aviso sai **no momento da edição**, não no fim: é quando ainda é barato rodar
`bun run test:golden` e descobrir que a conta mudou.

**Erra para o lado do aviso a mais.** Qualquer fonte de `packages/utils/src`
dispara, mesmo `formatters.ts`, que é formatação e não cálculo. Aviso sobrando é
ruído de uma linha; aviso faltando é fórmula de dinheiro mudando calada — foi
assim que a dupla contagem de despesa passou. Mesma lógica do `_comum.segmentos`.

Nunca bloqueia: PostToolUse roda depois da escrita, então o papel aqui é lembrar,
não barrar. Quem barra na hora do commit é o `checklist-commit`.
"""
import json
import re
import sys

# Fonte de domínio compartilhado (o `packages/utils` do §1) e os sítios de fórmula
# que a skill de fechamento nomeia como tendo cálculo fora do módulo canônico.
FORMULA = re.compile(
    r"(^|/)packages/utils/src/(?!.*\.(test|spec)\.ts$)[\w.-]+\.ts$"
    r"|(^|/)apps/web/src/services/api/aggregator\.service\.ts$"
)

# Módulos com golden master próprio hoje. Serve para apontar o arquivo exato em vez
# de mandar rodar a suíte inteira às cegas.
GOLDENS = {
    "fechamento": "fechamento.golden.spec.ts",
    "lucro": "lucro.golden.spec.ts e lucro-real.golden.spec.ts",
    "encerrante-mensal": "encerrante-mensal.golden.spec.ts",
}

AVISO = (
    "[hook portao-golden] `{caminho}` está coberto pela regra do CLAUDE.md §0.6/§6: "
    "nenhuma fórmula muda sem golden master rodando.\n"
    "  → rode `bun run test:golden` antes de dar a tarefa por pronta.\n"
    "  → NUNCA `bun test` puro: ele varre o repo e tenta rodar os arquivos de Vitest, "
    "onde `vi` não existe. As falhas que saem daí não são bugs (§7).\n"
    "  → se o número mudar, isso é decisão do dono, não conserto silencioso (§7)."
)
COM_GOLDEN = "\n  → golden específico deste módulo: {arquivo}"


def caminho_de(entrada: dict) -> str:
    return str(entrada.get("tool_input", {}).get("file_path", ""))


def aviso_para(caminho: str) -> str | None:
    if not caminho or not FORMULA.search(caminho):
        return None
    texto = AVISO.format(caminho=caminho)
    modulo = caminho.rsplit("/", 1)[-1].removesuffix(".ts")
    if modulo in GOLDENS:
        texto += COM_GOLDEN.format(arquivo=GOLDENS[modulo])
    return texto


def main() -> None:
    try:
        entrada = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        return

    texto = aviso_para(caminho_de(entrada))
    if not texto:
        return

    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PostToolUse",
            "additionalContext": texto,
        }
    }))


if __name__ == "__main__":
    main()
