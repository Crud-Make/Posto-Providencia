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


# Separadores que iniciam um comando NOVO. O `|` fica de fora de propósito: ele
# encadeia etapas do mesmo comando, e quem vem depois dele lê a saída de quem veio
# antes, não o disco. Ver `primeiros_de_pipeline`.
SEPARADOR_DE_COMANDO = re.compile(r"(?:\|\||&&|[;\n])")


def primeiros_de_pipeline(cmd: str) -> list[str]:
    """Só a PRIMEIRA etapa de cada pipeline — a única que pode ler do disco.

    Existe para o `forca-delegacao`, que conta leitura. `segmentos()` quebra em
    `|` também, e por isso o `grep` de `git diff | grep '^@@'` era contado como
    leitura de arquivo — falso positivo real, visto em 16/08/2026. Aquele `grep`
    não abre nada: ele filtra a saída do `git diff`, que já entrou no contexto e
    já foi contada uma vez.

    A regra que isto modela: **depois de um `|` o comando filtra, antes dele ele
    busca.** `cat arquivo | head` conta uma vez (pelo `cat`), não duas.

    Limite consciente: `algo | xargs cat` lê arquivo e não é contado. Fica de
    fora porque o preço do erro aqui é uma barra a menos numa trava de ritmo, e
    porque cobrir `xargs` exigiria interpretar o comando de dentro do comando.
    """
    partes = []
    for comando in SEPARADOR_DE_COMANDO.split(sem_mensagem(cmd)):
        primeiro = comando.split("|")[0]
        limpo = PREFIXO_INOCUO.sub("", primeiro).strip()
        if limpo:
            partes.append(limpo)
    return partes


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
