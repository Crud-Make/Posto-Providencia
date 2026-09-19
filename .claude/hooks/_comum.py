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
import os
import re
import shlex
from dataclasses import dataclass, field

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


# ── fórmula de dinheiro: uma lista só ────────────────────────────────────────
#
# Até 19/09/2026 três hooks (checklist-commit, portao-golden, so-fable-na-formula)
# tinham cada um a sua cópia da regra "isto é fórmula", e as três divergiam (âncora,
# exclusão de teste, e nenhuma cobria o backend). Esta é a única; quem precisa dela
# importa daqui. O canário de unicidade em testa-hooks.py acusa cópia nova.
#
# Frontend: o `packages/utils` (domínio compartilhado do §1) e o `aggregator.service.ts`,
# que a skill de fechamento nomeia como cálculo fora do módulo canônico.
# Backend: `App\Agregacao` inteiro (DadosDoPeriodo soma dinheiro em SQL, Periodo fixa a
# janela do custeio, DTOs/Resources carregam o decimal que o painel consome) e
# `App\Fechamento\Domain` inteiro (os models não fazem conta, mas fixam a precisão do
# dinheiro nos casts decimal:2/decimal:3, e Value Object de dinheiro novo nasce ali).
# Erra para o lado de proteger mais, como o portao-golden sempre defendeu.
# Fora, por decisão pendente do dono: `App\Cadastro\Domain` (preço e taxa cadastrados)
# e os testes PHP com literais decimais (não há equivalente de golden.spec em PHP).
FORMULA = re.compile(
    r"(^|/)packages/utils/src/[\w./-]+\.ts$"
    r"|(^|/)apps/web/src/services/api/aggregator\.service\.ts$"
    r"|(^|/)app/Agregacao/[\w/-]+\.php$"
    r"|(^|/)app/Fechamento/Domain/[\w/-]+\.php$"
)
# Teste comum de utils pode mudar à vontade; golden e regressão de dinheiro não.
TESTE_LIVRE = re.compile(r"\.(test|spec)\.ts$")
TESTE_DE_REGRA = re.compile(r"\.(golden\.spec|regressao\.test)\.ts$")


def e_formula(caminho: str, com_testes_de_regra: bool) -> bool:
    """O caminho é regra de cálculo de dinheiro?

    `com_testes_de_regra=True` (so-fable) inclui golden e regressão: mudar o número
    esperado É mudar a regra. `False` (checklist, portao-golden) trata todo teste como
    livre — quem tem de rodar o golden é quem mexe na fonte.
    """
    caminho = caminho.strip("'\"")
    if not FORMULA.search(caminho):
        return False
    if TESTE_LIVRE.search(caminho):
        return com_testes_de_regra and bool(TESTE_DE_REGRA.search(caminho))
    return True


# ── git: opções globais × subcomando ─────────────────────────────────────────
#
# Os hooks de git ancoravam em `^git\s+(push|commit|merge)`. Bastava uma opção
# GLOBAL entre o `git` e o verbo — `git -C ../outra push --force`, `git -c
# core.hooksPath=/dev/null commit` — e nada casava. Foi por aí que, em 18/09/2026,
# um subagente desligou os hooks de git (core.hooksPath=/dev/null) sem que trava
# nenhuma visse. Aqui o segmento é desmontado de verdade: o que vem antes do
# subcomando é opção global (e é lido), o que vem depois é argumento dele.


@dataclass
class ComandoGit:
    dirs_C: list[str] = field(default_factory=list)
    configs: dict[str, str] = field(default_factory=dict)  # chave em minúsculas
    config_env: list[str] = field(default_factory=list)     # chaves de --config-env, em minúsculas
    subcomando: str = ""
    args: list[str] = field(default_factory=list)


# Opções globais do git que consomem um valor (separado ou colado com `=`).
_GLOBAIS_COM_VALOR = {
    "-C", "-c", "--config-env", "--git-dir", "--work-tree", "--namespace",
    "--super-prefix", "--attr-source", "--list-cmds",
}


def tokens_de(seg: str) -> list[str]:
    """shlex quando dá; split cru quando a aspa não fecha (barra a mais, nunca a menos)."""
    try:
        return shlex.split(seg)
    except ValueError:
        return seg.split()


def comando_git(seg: str) -> ComandoGit | None:
    """Desmonta um segmento `git …`; None quando o segmento não começa por `git`.

    Só as opções ANTES do subcomando são globais: em `git commit -c HEAD` o `-c` é
    reuso de mensagem e fica em `args`. `git --version` devolve subcomando vazio.
    """
    tokens = tokens_de(PREFIXO_INOCUO.sub("", seg))
    if not tokens or tokens[0] != "git":
        return None
    cg = ComandoGit()
    i = 1
    while i < len(tokens):
        t = tokens[i]
        if not t.startswith("-"):
            cg.subcomando = t
            cg.args = tokens[i + 1:]
            return cg
        if len(t) > 2 and t[1] in "Cc" and t[1] != "-":
            nome, valor = t[:2], t[2:]                      # -Cdir, -ck=v colados
        else:
            nome, sep, valor = t.partition("=")
            if not sep and nome in _GLOBAIS_COM_VALOR:
                i += 1
                valor = tokens[i] if i < len(tokens) else ""
        if nome == "-C":
            cg.dirs_C.append(valor)
        elif nome == "-c":
            chave, _, v = valor.partition("=")
            cg.configs[chave.lower()] = v
        elif nome == "--config-env":
            cg.config_env.append(valor.partition("=")[0].lower())
        i += 1
    return cg


# ── shell: em que diretório o comando termina ────────────────────────────────

# `$VAR`, `$(…)` e crase só se resolvem executando; o hook não executa.
_INTERPOLA = re.compile(r"[$`]")


def _entra_em(base: str, alvo: str) -> str | None:
    if alvo == "-" or _INTERPOLA.search(alvo):
        return None
    return os.path.normpath(os.path.join(base, os.path.expanduser(alvo)))


def diretorios(cmd: str, cwd: str) -> list[str | None]:
    """Diretório em vigor para CADA segmento de `segmentos(cmd)`, aplicando os `cd`.

    A partir de um `cd` que não se resolve sem executar (`cd -`, `cd $D`, `cd $(…)`)
    todos os seguintes são None. Quem chama trata None como "não sei" — e um hook que
    não sabe pergunta, não libera.
    """
    atual: str | None = cwd or os.getcwd()
    saida: list[str | None] = []
    for seg in segmentos(cmd):
        saida.append(atual)
        tokens = tokens_de(seg)
        if atual is None or not tokens or tokens[0] not in ("cd", "pushd"):
            continue
        args = [t for t in tokens[1:] if t == "-" or not t.startswith("-")]
        if tokens[1:2] == ["--"]:
            args = tokens[2:]
        atual = os.path.expanduser("~") if not args else _entra_em(atual, args[0])
    saida.append(atual)  # diretório em que o comando TERMINA
    return saida


def diretorio_final(cmd: str, cwd: str) -> str | None:
    """Diretório em que o comando termina: `cwd` mais cada `cd X` na ordem (ou None)."""
    return diretorios(cmd, cwd)[-1]


def com_dirs_C(base: str, dirs: list[str]) -> str | None:
    """Aplica os `-C <dir>` de um `git` em sequência (cada um relativo ao anterior)."""
    atual: str | None = base
    for d in dirs:
        if atual is None:
            return None
        atual = _entra_em(atual, d)
    return atual
