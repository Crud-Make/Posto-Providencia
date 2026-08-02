#!/usr/bin/env python3
"""Encaminha a pergunta para o agente certo, antes de ela chegar no modelo.

Roda como hook UserPromptSubmit. Existe por uma assimetria que só ficou clara em
02/08: **skill se oferece, agente não**.

Uma skill carrega sozinha porque o harness casa a frase do dono com o campo
`description` dela. Um agente não tem esse mecanismo — alguém precisa chamá-lo
pelo nome. Resultado prático: o agente `grafo` ficou instalado e reconstruindo o
índice a cada commit desde 29/07 **sem nunca ter sido usado uma vez**, enquanto
as mesmas perguntas eram respondidas com grep no contexto da sessão — o gasto que
o §13 do CLAUDE.md tenta justamente evitar.

Instrução no CLAUDE.md não resolveu porque depende de o modelo lembrar no momento
certo. Isto aqui não depende: o encaminhamento entra no contexto junto da pergunta.

**Casamento forte, de propósito.** Só dispara em frase inequívoca de localização,
de conferência de valor ou de exposição do banco. Termo solto do domínio
("conferido", "diferença") NÃO dispara: a skill de fechamento já carrega sozinha
nesses casos, e injetar aqui seria pagar token por lembrete duplicado.
"""
import json
import re
import sys
import unicodedata

# Cada agente ganha os gatilhos que só ele responde bem. As frases vieram das
# descrições em .claude/agents/*.md — se um agente mudar de escopo, mude aqui.
ROTAS: list[tuple[str, str, re.Pattern[str]]] = [
    (
        "grafo",
        "localizacao de codigo e raio de impacto",
        re.compile(
            r"onde (fica|esta|estao|mora|vive)\b"
            r"|onde e (que )?(fica|esta|usa)\b"
            r"|quem (usa|chama|importa|consome|depende)\b"
            r"|o que (quebra|para de funcionar|arrebenta) se\b"
            r"|raio de impacto"
            r"|quais arquivos (usam|chamam|importam|consomem)"
            r"|de onde vem (esse|essa|o|a) (import|chamada|funcao)"
        ),
    ),
    (
        "planilha",
        "valor real do posto, com procedencia",
        re.compile(
            r"quanto (deu|foi|vendeu|faturou|gastou|rendeu)\b"
            r"|bate com (o real|a planilha|o dado real)"
            r"|confere com a planilha"
            r"|qual (e )?a formula da planilha"
            r"|(o )?valor real (de|do|da)\b"
            r"|a planilha (diz|mostra|calcula) (quanto|o que)"
        ),
    ),
    (
        "rls",
        "exposicao do banco e politicas",
        re.compile(
            r"(essa|esta|a) tabela (\w+ )?(esta|ta) protegida"
            r"|o que (um |o )?anonimo (consegue|pode|alcanca)"
            r"|quais tabelas (o |um )?anonimo"
            r"|(a )?rls (dessa|desta|da|de) \w+"
            r"|policy (dessa|desta|da|de) \w+"
            r"|esta (tabela |view )?exposta"
        ),
    ),
]

MOLDE = (
    "[hook roteia-consulta] Esta pergunta é de {assunto}. Use o agente `{agente}` "
    "(Agent tool, subagent_type=\"{agente}\") em vez de grep/leitura direta: ele lê "
    "muito e devolve pouco, que é o critério do CLAUDE.md §13. Vale a regra do §12 — "
    "o que ele devolver é hipótese até o grep confirmar."
)


def normaliza(texto: str) -> str:
    """Minúsculas e sem acento — o dono escreve 'está' e 'esta' na mesma frase."""
    sem_acento = unicodedata.normalize("NFD", texto.lower())
    return "".join(c for c in sem_acento if unicodedata.category(c) != "Mn")


def rotas_de(prompt: str) -> list[tuple[str, str]]:
    alvo = normaliza(prompt)
    return [(nome, assunto) for nome, assunto, padrao in ROTAS if padrao.search(alvo)]


def main() -> None:
    try:
        entrada = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        return

    prompt = str(entrada.get("prompt", ""))
    if not prompt:
        return

    achadas = rotas_de(prompt)
    if not achadas:
        return

    contexto = "\n".join(
        MOLDE.format(agente=nome, assunto=assunto) for nome, assunto in achadas
    )
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "UserPromptSubmit",
            "additionalContext": contexto,
        }
    }))


if __name__ == "__main__":
    main()
