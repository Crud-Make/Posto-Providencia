#!/usr/bin/env python3
"""Dinheiro é quantizado por `emCentavos`, nunca por arredondamento à mão — regra DOM-3.

Roda como hook PreToolUse em Write|Edit. Nega texto novo que contenha
`Math.round(<algo> * 100) / 100` em arquivo de fonte do frontend.

**Por que existe.** `docs/arquitetura/regras.md`, linha DOM-3: ❌ SEM TRAVA — a
expressão está reescrita à mão em 5 lugares, enquanto a função canônica
`emCentavos` mora em `packages/utils/src/lucro.ts:27` e é exatamente isso. Cinco
cópias de uma regra de dinheiro são cinco lugares para ela divergir, e divergência
de centavo no posto aparece como diferença de caixa que ninguém consegue explicar.

**Por que hook, e não ESLint.** O `trava-ts.py` já roda lint type-aware por edição,
mas `no-restricted-syntax` pega a FORMA do nó, e esta regra é sobre o SIGNIFICADO
da expressão (quantizar dinheiro) — que só se reconhece pelo par `*100 … /100`.
Além disso o hook nega ANTES da escrita; o lint avisa depois.

**O que NÃO é negado, de propósito:**
  • o arquivo que DEFINE `emCentavos` — senão a trava proibiria a própria função;
  • teste (`.test.ts` / `.spec.ts`): um golden pode precisar montar o número
    esperado à mão, e é justamente isso que prova que a função faz o que diz.

**Falha aberta.** Entrada ilegível deixa passar: o custo do erro deste lado é uma
cópia a mais, que o `conformidade` ainda acha; travar toda escrita de TS por um
JSON malformado pararia a sessão.
"""
import json
import re
import sys

FONTE = re.compile(r"(^|/)frontend/(apps|packages)/[\w-]+/src/.*\.(ts|tsx)$")
TESTE = re.compile(r"\.(test|spec)\.(ts|tsx)$|\.golden\.spec\.ts$")

# `Math.round(x * 100) / 100`, inclusive quebrado em várias linhas (caso real em
# use-planilha-do-banco.ts:817). O limite de 200 caracteres evita casar um
# `* 100` de um lado do arquivo com um `/ 100` do outro.
A_MAO = re.compile(r"Math\.round\((?:.|\n){0,200}?\*\s*100\s*\)\s*/\s*100")

# Quem define a função canônica pode escrevê-la: é a única cópia legítima.
DEFINICAO = re.compile(r"export\s+const\s+emCentavos\b")

MOTIVO = (
    "[hook dinheiro-quantiza-por-emcentavos] NEGADO em {caminho}.\n"
    "O trecho quantiza dinheiro à mão: `{achado}`.\n\n"
    "A regra DOM-3 (docs/arquitetura/regras.md) diz que saída de fórmula é "
    "quantizada por **`emCentavos`**, que já existe e é exatamente esta expressão "
    "(`frontend/packages/utils/src/lucro.ts:27`).\n\n"
    "  import {{ emCentavos }} from '@posto/utils';\n"
    "  const valor = emCentavos(bruto);\n\n"
    "Isto não é preferência de estilo: cada cópia é um lugar a mais para a regra do "
    "centavo divergir, e divergência de centavo chega ao dono como diferença de "
    "caixa sem explicação. Em 20/09 mediu-se que `emCentavos` podia sumir inteiro e "
    "11 de 13 goldens seguiam verdes — ou seja, o teste não te salva aqui.\n"
    "Se o número NÃO é dinheiro (litro, percentual, índice), escreva o cálculo sem o "
    "par `*100 … /100` ou use a função de arredondamento do domínio certo."
)


def conteudo_novo(dados: dict) -> str:
    """Só o texto que vai ser gravado — `content` no Write, `new_string` no Edit.

    Nunca o arquivo do disco: barrar edição de linha inocente em arquivo que já
    tem a cópia faria o hook ser desligado. Quem ESCREVE a expressão é quem apanha.
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
    caminho = str(dados.get("file_path") or "").replace("\\", "/")
    if not FONTE.search(caminho) or TESTE.search(caminho):
        return

    texto = conteudo_novo(dados)
    if DEFINICAO.search(texto):
        return
    achado = A_MAO.search(texto)
    if achado is None:
        return

    trecho = " ".join(achado.group(0).split())
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": MOTIVO.format(
                caminho=caminho.split("/frontend/")[-1],
                achado=trecho[:90],
            ),
        }
    }))


if __name__ == "__main__":
    main()
