#!/usr/bin/env python3
"""Utilitário comum dos hooks de PreToolUse.

Existe por um bug que apareceu duas vezes: hook que inspeciona comando de shell e
casa com texto que apenas *descreve* o comando proibido — bloqueou a mensagem do
próprio commit que o documentava, nas duas.

A primeira tentativa de correção (remover tudo entre aspas) cegou o hook justamente
onde o perigo mora dentro das aspas: `sqlite3 base "DELETE FROM x"` e
`python3 -c "open(caminho,'w')"`. Aspa não distingue descrição de execução.

O que distingue é **posição**: comando que executa *inicia um segmento* do shell.
Em `echo "rm docs/data/x"` o segmento começa em `echo`; em `rm docs/data/x`, em
`rm`. Daí `segmentos()` + verificação de início.
"""
import re

HEREDOC = re.compile(r"<<-?\s*['\"]?(\w+)['\"]?")
# Valor de -m/--message/-F: é texto de mensagem, nunca comando a executar.
MENSAGEM = re.compile(r"(?:-m|--message|-F)[=\s]+('[^']*'|\"[^\"]*\"|-)")
SEPARADOR = re.compile(r"(?:\|\||&&|[;|\n])")
# Prefixos que não mudam qual é o comando de fato: `cd x && `, `VAR=1 `, `sudo `.
PREFIXO_INOCUO = re.compile(r"^\s*(?:\w+=\S*\s+|sudo\s+|command\s+|time\s+)*")


def sem_mensagem(cmd: str) -> str:
    """Remove corpo de heredoc e valor de -m/-F — texto, não comando."""
    m = HEREDOC.search(cmd)
    if m:
        fim = re.search(rf"^{re.escape(m.group(1))}$", cmd[m.end():], re.M)
        corte = m.end() + (fim.end() if fim else len(cmd))
        cmd = cmd[: m.start()] + cmd[corte:]
    return MENSAGEM.sub("", cmd)


def segmentos(cmd: str) -> list[str]:
    """Quebra em segmentos de shell, já sem mensagem, e tira prefixo inócuo.

    Limite consciente: separador dentro de aspas é tratado como separador, então
    uma string com `;` gera segmentos a mais. Isso só pode causar barra a mais em
    caso raro, nunca a menos — o lado seguro do erro para uma trava.
    """
    return [
        PREFIXO_INOCUO.sub("", s).strip()
        for s in SEPARADOR.split(sem_mensagem(cmd))
        if s.strip()
    ]
