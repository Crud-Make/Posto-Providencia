#!/usr/bin/env python3
"""Estágio 1 do ETL: extração crua e fiel da planilha do posto para JSON.

    python3 scripts/etl-estagio1-staging.py --xlsx CAMINHO.xlsx --saida DIR

Uso e limites, na ordem em que importam:

**Isto não interpreta nada.** Não calcula litros, não converte para centavos, não
mapeia para nome de tabela do sistema. Copia o que está na célula, incluindo o
vazio — em branco vira `null`, nunca `0`, nunca omissão. Interpretar é trabalho
do estágio 2, e misturar os dois foi o que a skill `etl-planilha-posto-providencia`
proíbe em primeiro lugar.

**Por que mora em `scripts/` e não em `docs/data/`.** Os estágios 1 e 2 antigos
moravam dentro de `docs/data/`, que é gitignored. Em 29/07 o commit `d4491b2`
desversionou `docs/` prometendo "continua em disco"; em 07/08 não continuava, e
como o código estava junto do dado, os dois estágios se perderam com ele. Código
fica versionado. Dado fica fora. Nunca mais juntos.

**As 3 guardas da skill, que vieram de bug real:**

1. Fim de bloco vem do rótulo SEGUINTE, nunca de deslocamento fixo. Dia sem dado
   faz busca de janela fixa vazar para o bloco vizinho e ler o dia errado.
2. Nada é subtraído aqui. Quando falta um lado do encerrante, a planilha trata o
   ausente como zero e produz absurdo (−3,4 milhões de litros num dia real, sem
   erro nenhum). Este estágio só marca `dado_incompleto` e diz qual campo faltou.
3. Slot de dia além do calendário real do mês é ignorado, mesmo parecendo ter
   dado — em fevereiro real o slot do dia 31 guardava o mês inteiro consolidado.

Também exclui o bloco de consolidação (`Caixa Dia NN a NN`), que não é um dia, e
lê o nome de cada frentista do cabeçalho DAQUELE bloco: a lista muda de mês para
mês, e fixar por posição de coluna é como se lê o frentista errado.

Idempotente: rodar de novo sobre a mesma planilha reescreve a mesma saída.
"""
from __future__ import annotations

import argparse
import calendar
import hashlib
import json
import re
import sys
import unicodedata
import zipfile
from pathlib import Path

ANO = 2026

# Rótulos literais da planilha. Nunca traduzir: são a chave de busca.
ROTULO_DIA = re.compile(r"caixa\s*dia\s*(\d+)\s+posto", re.I)
ROTULO_CONSOLIDADO = re.compile(r"caixa\s*dia\s*\d+\s*a\s*\d+", re.I)
ABA_MES = re.compile(r"^(?:mes)[,.\s]*0?(\d+)", re.I)
SECAO_MES_CONCILIACAO = re.compile(r"posto\s+jorro,\s*m[êe]s\s*0?(\d+)\.", re.I)


def normaliza(texto: str) -> str:
    """Minúsculas, sem acento e sem pontuação de borda — os rótulos da planilha
    são manuscritos e oscilam entre `Total.`, `Total` e `Total e Media ->`."""
    sem_acento = unicodedata.normalize("NFD", str(texto).strip().lower())
    limpo = "".join(c for c in sem_acento if unicodedata.category(c) != "Mn")
    return limpo.strip(" .:->")


class Planilha:
    """Leitor de xlsx pela stdlib. `openpyxl` não está instalado e instalar
    dependência é decisão do dono (CLAUDE.md §0.2); um xlsx é zip de XML."""

    NS_T = re.compile(r"<t[^>]*>([^<]*)</t>")
    NS_SI = re.compile(r"<si>(.*?)</si>", re.S)
    # A alternativa `/>` é obrigatória: célula vazia vem auto-fechada
    # (`<c r="C2" s="1047"/>`) e sem ela o `.*?</c>` avança até o próximo `</c>`,
    # engolindo as células reais seguintes. Esse bug escondeu 30 dos 31 blocos de
    # dia numa primeira leitura desta mesma planilha, em silêncio.
    CELULA = re.compile(r'<c r="([A-Z]+\d+)"([^>/]*)(?:/>|>(.*?)</c>)', re.S)

    def __init__(self, caminho: Path):
        self.caminho = caminho
        self.zip = zipfile.ZipFile(caminho)
        self.strings = self._strings()

    def _strings(self) -> list[str]:
        if "xl/sharedStrings.xml" not in self.zip.namelist():
            return []
        xml = self.zip.read("xl/sharedStrings.xml").decode("utf-8", "replace")
        return ["".join(self.NS_T.findall(si)) for si in self.NS_SI.findall(xml)]

    def abas(self) -> list[tuple[str, str]]:
        wb = self.zip.read("xl/workbook.xml").decode("utf-8", "replace")
        rels = self.zip.read("xl/_rels/workbook.xml.rels").decode("utf-8", "replace")
        mapa = dict(re.findall(r'Id="(rId\d+)"[^>]*Target="([^"]+)"', rels))
        saida = []
        for nome, rid in re.findall(r'<sheet name="([^"]+)"[^>]*r:id="(rId\d+)"', wb):
            alvo = mapa.get(rid, "")
            if alvo.startswith("worksheets/"):
                saida.append((nome, "xl/" + alvo))
        return saida

    def grade(self, caminho: str) -> dict[int, dict[str, object]]:
        """linha -> {coluna: valor}. Número vira float, texto vira str, vazio
        simplesmente não aparece — ausência é informação e não vira zero."""
        xml = self.zip.read(caminho).decode("utf-8", "replace")
        fora: dict[int, dict[str, object]] = {}
        for m in self.CELULA.finditer(xml):
            coord, attrs, corpo = m.group(1), m.group(2), m.group(3) or ""
            valor = self._valor(attrs, corpo)
            if valor is None:
                continue
            col = re.sub(r"\d+", "", coord)
            fora.setdefault(int(re.sub(r"[A-Z]+", "", coord)), {})[col] = valor
        return fora

    def _valor(self, attrs: str, corpo: str) -> object:
        v = re.search(r"<v>([^<]*)</v>", corpo)
        if 't="s"' in attrs and v:
            i = int(v.group(1))
            return self.strings[i] if i < len(self.strings) else ""
        if 't="inlineStr"' in attrs:
            t = self.NS_T.search(corpo)
            return t.group(1) if t else None
        if 't="e"' in attrs:                       # #DIV/0!, #REF! etc.
            return {"__erro__": v.group(1) if v else "?"}
        if v is None or v.group(1) == "":
            return None
        try:
            return float(v.group(1))
        except ValueError:
            return v.group(1)


def mapa_colunas(linha_cab: dict) -> dict[str, str]:
    """rótulo normalizado -> coluna, com a PRIMEIRA ocorrência vencendo.

    Não é detalhe de estilo. O cabeçalho do bloco de dia tem **duas** colunas
    chamadas `Litros`: a primeira (F) é por bico, a segunda (I) é por produto
    agregado — e a célula do bico 05 nessa segunda guarda o total do dia inteiro.
    Um dict comprehension deixa a última vencer, e a soma sai exatamente 2× a
    real: 93.686,124 contra os 46.843,062 que a aba de conciliação declara.
    Dobro exato é o disfarce perfeito, porque parece um total plausível.
    """
    fora: dict[str, str] = {}
    for col, valor in linha_cab.items():
        if isinstance(valor, str) and valor.strip():
            fora.setdefault(normaliza(valor), col)
    return fora


def num(valor: object) -> float | None:
    """Só devolve número quando a célula É número. Texto e erro viram None em vez
    de virarem zero — zero fabricado é como o bug 2 entra no agregado."""
    return valor if isinstance(valor, float) else None


def _procura(grade, linha_ini, linha_fim, teste, coluna: str | None) -> int | None:
    """Primeira linha do intervalo que satisfaz `teste`.

    `coluna` restringe a busca a uma única coluna, e passar isso importa: no mês
    03 a seção de pagamentos migrou para as colunas K–N, e o rótulo `Total` dela
    em K10 fazia a tabela de bicos parecer terminar uma linha antes do fim. O
    bico 06 sumia inteiro dos meses 03 a 07 — sem erro, sem aviso, só um total
    menor que o real. Ancorar na coluna onde moram os rótulos da tabela é o que
    imuniza contra o layout mudar de mês para mês.
    """
    for n in range(linha_ini, linha_fim):
        linha = grade.get(n, {})
        valores = [linha.get(coluna)] if coluna else list(linha.values())
        for valor in valores:
            if isinstance(valor, str) and teste(normaliza(valor)):
                return n
    return None


def acha_rotulo(grade, linha_ini, linha_fim, alvo: str, coluna=None) -> int | None:
    return _procura(grade, linha_ini, linha_fim, lambda t: t == alvo, coluna)


def acha_prefixo(grade, linha_ini, linha_fim, prefixo: str, coluna=None) -> int | None:
    return _procura(grade, linha_ini, linha_fim, lambda t: t.startswith(prefixo), coluna)


def extrai_dia(grade, dia: int, ini: int, fim: int) -> dict:
    """Um bloco `Caixa Dia NN`. `fim` é o rótulo seguinte — nunca ultrapassar."""
    reg: dict = {
        "dia": dia, "linha_inicio": ini, "linha_fim": fim - 1,
        "bicos": [], "pagamento_concentrador": [], "frentistas": [],
        "venda_frentista": {}, "totais": {},
        "dado_incompleto": False, "motivos": [], "avisos": [],
    }

    # ── Encerrantes por bico ───────────────────────────────────────────────
    cab = acha_rotulo(grade, ini, fim, "produtos")
    # Coluna onde moram os rótulos da tabela. Todo marco do bloco é procurado
    # nela, nunca na linha inteira — ver `_procura`.
    col_rotulo = next((c for c, v in grade.get(cab, {}).items()
                       if isinstance(v, str) and normaliza(v) == "produtos"),
                      None) if cab else None
    tot_bico = (acha_rotulo(grade, cab + 1, fim, "total", col_rotulo)
                if cab and col_rotulo else None)
    if cab is None or tot_bico is None:
        reg["avisos"].append("bloco sem cabeçalho 'Produtos' ou sem linha 'Total'")
    else:
        colunas = mapa_colunas(grade.get(cab, {}))
        for n in range(cab + 1, tot_bico):
            linha = grade.get(n, {})
            produto = next((v for v in linha.values()
                            if isinstance(v, str) and v.strip()), None)
            if not produto:
                continue
            def celula(nome):
                col = colunas.get(nome)
                return num(linha.get(col)) if col else None
            inicial, fechamento = celula("inicial"), celula("fechamento")
            faltando = [k for k, v in (("inicial", inicial),
                                       ("fechamento", fechamento)) if v is None]
            bico = {
                "produto": produto,
                "inicial": inicial,
                "fechamento": fechamento,
                # Copiado da planilha, NUNCA recalculado. Guarda 2 da skill.
                "litros_planilha": celula("litros"),
                "valor_lt": celula("valor lt $"),
                "venda_bico": celula("venda  bico r$"),
                # Guarda 2: faltando um lado do encerrante, a planilha subtrai
                # tratando o ausente como zero e devolve absurdo sem erro nenhum
                # (−3,4 milhões de litros num dia real). O número fica registrado
                # para auditoria, mas não é confiável e não entra em soma.
                "litros_confiavel": not faltando,
            }
            if faltando:
                reg["dado_incompleto"] = True
                reg["motivos"].append(
                    f"bico {produto!r} sem {' e sem '.join(faltando)}"
                    f" — litros da planilha ({bico['litros_planilha']}) descartado")
            reg["bicos"].append(bico)

    # ── Formas de pagamento do concentrador ────────────────────────────────
    ini_pag = acha_prefixo(grade, (tot_bico or ini) + 1, fim, "inter pog")
    if ini_pag is None:
        # Do mês 03 em diante essa seção migra para as colunas K–N e perde o
        # cabeçalho `Inter pog`. Registrar em vez de devolver lista vazia calada:
        # ausência silenciosa é como o estágio 2 carregaria pagamento zerado.
        reg["avisos"].append(
            "seção de pagamento do concentrador não localizada pelo cabeçalho "
            "'Inter pog' — layout provavelmente mudou neste mês")
    if ini_pag:
        colunas = mapa_colunas(grade.get(ini_pag, {}))
        fim_pag = acha_rotulo(grade, ini_pag + 1, fim, "total") or fim
        for n in range(ini_pag + 1, fim_pag):
            linha = grade.get(n, {})
            forma = next((v for v in linha.values()
                          if isinstance(v, str) and v.strip()), None)
            if not forma:
                continue
            reg["pagamento_concentrador"].append({
                "forma": forma,
                **{k: num(linha.get(colunas[k])) for k in ("inter pog", "bin", "total")
                   if k in colunas},
            })

    # ── Venda por frentista ────────────────────────────────────────────────
    sec = acha_rotulo(grade, ini, fim, "venda frentista", col_rotulo)
    if sec is None:
        reg["avisos"].append("bloco sem seção 'Venda Frentista'")
        return reg

    # Nomes vêm do cabeçalho DESTE bloco. Guarda da skill: a lista muda por mês.
    cab_nomes = sec + 1
    ignorar = {"caixa", "%", "posto - p - jorro"}
    nomes = {c: v for c, v in grade.get(cab_nomes, {}).items()
             if isinstance(v, str) and v.strip() and normaliza(v) not in ignorar}
    reg["frentistas"] = [v.strip() for v in nomes.values()]

    fim_formas = acha_prefixo(grade, cab_nomes + 1, fim, "venda frentistas",
                              col_rotulo) or fim
    for n in range(cab_nomes + 1, fim_formas):
        linha = grade.get(n, {})
        forma = next((v for v in linha.values()
                      if isinstance(v, str) and v.strip()), None)
        if not forma:
            continue
        reg["venda_frentista"][forma] = {
            nome.strip(): num(linha.get(col)) for col, nome in nomes.items()
        }

    for chave, prefixo in (("venda_frentistas", "venda frentistas"),
                           ("venda_concentrador", "venda concentrador"),
                           ("falta", "falta")):
        n = acha_prefixo(grade, fim_formas, fim, prefixo, col_rotulo)
        if n is None:
            reg["avisos"].append(f"bloco sem linha {prefixo!r}")
            continue
        reg["totais"][chave] = {
            nome.strip(): num(grade.get(n, {}).get(col)) for col, nome in nomes.items()
        }
    return reg


def extrai_mes(pl: Planilha, nome_aba: str, caminho: str, mes: int) -> dict:
    grade = pl.grade(caminho)
    ultima = max(grade) if grade else 0
    dias_reais = calendar.monthrange(ANO, mes)[1]

    marcos: list[tuple[int, int | None]] = []
    for n, linha in grade.items():
        for valor in linha.values():
            if not isinstance(valor, str):
                continue
            if ROTULO_CONSOLIDADO.search(valor):     # não é dia — guarda da skill
                marcos.append((n, None))
            elif (m := ROTULO_DIA.search(valor)):
                marcos.append((n, int(m.group(1))))
    marcos.sort()
    fronteiras = [n for n, _ in marcos] + [ultima + 1]

    dias, ignorados = [], []
    for i, (linha_ini, dia) in enumerate(marcos):
        if dia is None:
            continue
        if dia > dias_reais:                          # guarda 3 da skill
            ignorados.append(dia)
            continue
        dias.append(extrai_dia(grade, dia, linha_ini, fronteiras[i + 1]))

    return {
        "mes": mes, "aba": nome_aba, "dias_no_calendario": dias_reais,
        "dias_extraidos": len(dias),
        "slots_fora_do_calendario_ignorados": sorted(ignorados),
        "dias": dias,
    }


def totais_conciliacao(pl: Planilha) -> dict[int, dict]:
    """Totais independentes da aba `POSTO JORRO 2026`, por mês.

    É contra isto que cada mês tem de fechar antes de valer. A linha de total
    fica algumas linhas abaixo do rótulo da seção; procuramos pelo rótulo
    `Total e Media ->` em vez de contar linhas, porque contar linha é
    exatamente o erro que a guarda 1 da skill proíbe.
    """
    alvo = next((c for n, c in pl.abas() if "POSTO JORRO" in n.upper()), None)
    if not alvo:
        return {}
    grade = pl.grade(alvo)
    ultima = max(grade) if grade else 0

    secoes: list[tuple[int, int]] = []
    for n, linha in grade.items():
        for valor in linha.values():
            if isinstance(valor, str) and (m := SECAO_MES_CONCILIACAO.search(valor)):
                secoes.append((n, int(m.group(1))))
    secoes.sort()
    limites = [n for n, _ in secoes] + [ultima + 1]

    fora: dict[int, dict] = {}
    for i, (ini, mes) in enumerate(secoes):
        fim = limites[i + 1]
        cab = acha_rotulo(grade, ini, fim, "produtos")
        tot = acha_prefixo(grade, ini, fim, "total e media")
        if cab is None or tot is None:
            continue
        colunas = mapa_colunas(grade.get(cab, {}))
        linha = grade.get(tot, {})
        fora[mes] = {
            "linha": tot,
            "litros": num(linha.get(colunas.get("litros"))),
            "valor_por_bico": num(linha.get(colunas.get("valor por bico"))),
        }
    return fora


def _bloco_tabular(grade, cab: int, fim: int) -> list[dict]:
    """Linhas de um bloco `Produtos | ...` até o rótulo de total ou o fim.

    Devolve o rótulo da primeira coluna e um dicionário `cabeçalho -> valor` com
    o texto do cabeçalho **verbatim**. Não renomeia nada: batizar coluna é
    interpretação, e interpretação é estágio 2. O que se perde aqui não volta.
    """
    colunas = {c: str(v).strip() for c, v in grade.get(cab, {}).items()
               if isinstance(v, str) and str(v).strip()}
    primeira = min(colunas) if colunas else "C"

    linhas = []
    for n in range(cab + 1, fim):
        celulas = grade.get(n, {})
        if not celulas:
            continue
        rotulo = celulas.get(primeira)
        if not isinstance(rotulo, str) or not rotulo.strip():
            continue
        norm = normaliza(rotulo)
        if norm.startswith("total") or norm.startswith("%"):
            break
        linhas.append({
            "rotulo": rotulo.strip(),
            "linha": n,
            "valores": {titulo: celulas.get(col)
                        for col, titulo in colunas.items() if col != primeira},
        })
    return linhas


def _linha_total(grade, cab: int, fim: int) -> dict | None:
    """A linha `Total...` do bloco, com os mesmos cabeçalhos verbatim."""
    tot = acha_prefixo(grade, cab + 1, fim, "total")
    if tot is None:
        return None
    colunas = {c: str(v).strip() for c, v in grade.get(cab, {}).items()
               if isinstance(v, str) and str(v).strip()}
    primeira = min(colunas) if colunas else "C"
    celulas = grade.get(tot, {})
    return {
        "linha": tot,
        "valores": {titulo: celulas.get(col)
                    for col, titulo in colunas.items() if col != primeira},
    }


def extrai_resumo(pl: Planilha) -> dict:
    """Aba `POSTO JORRO 2026` crua: venda, compra e estoque por mês, a matriz de
    despesa por categoria e o histórico ano a ano.

    Estes blocos ficaram de fora da primeira versão do estágio 1, que só lia os
    blocos de dia — e é por isso que 4 dos 5 golden masters não tinham fonte.
    A `despesa_trimestral` NÃO está aqui nem em nenhuma outra aba: ela vem de
    fonte externa, e nenhuma extração desta planilha a produz.

    Cada bloco é delimitado pelo rótulo SEGUINTE, nunca por deslocamento fixo
    (guarda 1 da skill). Os rótulos de bico divergem entre esta aba e os blocos
    de dia (`Ds:.500,Bico 04` contra `DS:.10,Bico 04`); os dois ficam crus e o
    casamento é decisão do estágio 2.
    """
    alvo = next((c for n, c in pl.abas() if "POSTO JORRO" in n.upper()), None)
    if not alvo:
        return {}
    grade = pl.grade(alvo)
    ultima = max(grade) if grade else 0

    # Fronteira de seção é TODA linha com rótulo na coluna B, não só a de mês.
    # Usar o rótulo de mês seguinte como limite faz a seção do mês 07 (L188) ir
    # até o próximo mês (L426) e engolir o bloco anual, a matriz de despesa e o
    # histórico — guarda 1 da skill, com outra roupa: o fim vem do rótulo
    # SEGUINTE, e o seguinte aqui é `Posto Jorro, Ano 26.` na L221.
    cabecas: list[tuple[int, str]] = sorted(
        (n, linha["B"].strip()) for n, linha in grade.items()
        if isinstance(linha.get("B"), str) and linha["B"].strip()
    )
    limites_todos = [n for n, _ in cabecas] + [ultima + 1]

    secoes: list[tuple[int, int, int]] = []      # (linha_ini, linha_fim, mes)
    ignoradas: list[dict] = []
    for i, (ini, rotulo) in enumerate(cabecas):
        fim = limites_todos[i + 1]
        m = SECAO_MES_CONCILIACAO.search(rotulo)
        mes = int(m.group(1)) if m else None
        if mes is not None and 1 <= mes <= 12:
            secoes.append((ini, fim, mes))
            continue
        # `Posto Jorro, mês 0.` é bloco de RASCUNHO: repete inicial/fechamento/
        # litros de janeiro com lucro/litro inflado (1,1135 contra 0,6618) e
        # `Desp,Mês.` chapado em 1.000,00. Carregá-lo como mês injeta um janeiro
        # fantasma. `Posto Jorro, Ano 26.` é a consolidação do ano, não um mês.
        ignoradas.append({
            "linha": ini, "rotulo": rotulo,
            "motivo": ("mês fora de 1–12 (bloco de rascunho)" if mes is not None
                       else "não é seção de mês"),
        })

    meses: list[dict] = []
    for ini, fim, mes in secoes:
        # Marcadores do bloco dentro da seção; o fim de cada um é o início do próximo.
        marcas: list[tuple[int, str]] = []
        for n in range(ini, fim):
            for valor in grade.get(n, {}).values():
                if isinstance(valor, str) and normaliza(valor) in ("venda", "compra", "estoque"):
                    marcas.append((n, normaliza(valor)))
                    break
        marcas.sort()
        bordas = [n for n, _ in marcas] + [fim]

        bloco: dict[str, object] = {"mes": mes, "linha_secao": ini}
        for j, (marca_lin, nome) in enumerate(marcas):
            borda = bordas[j + 1]
            cab = acha_rotulo(grade, marca_lin, borda, "produtos")
            if cab is None:
                continue
            bloco[nome] = {
                "linha_cabecalho": cab,
                "itens": _bloco_tabular(grade, cab, borda),
                "total": _linha_total(grade, cab, borda),
            }
        meses.append(bloco)

    return {
        "aba": alvo,
        "meses": meses,
        "secoes_ignoradas": ignoradas,
        "despesa": _matriz_despesa(grade, ultima),
        "custo_historico": _custo_historico(grade, ultima),
    }


def _matriz_despesa(grade, ultima: int) -> dict:
    """Matriz `categoria × mês` da seção `Despeza, 2026.` (categorias na coluna C,
    meses nas colunas seguintes, total por categoria na última).

    O rótulo do painel é abreviado — `Desp,Mês.` —, e procurar a palavra
    "despesa" inteira é o que já fez esta matriz "não existir" numa varredura.
    Aqui a âncora é a seção, não a palavra.
    """
    ini = None
    for n, linha in grade.items():
        for valor in linha.values():
            if isinstance(valor, str) and normaliza(valor).startswith("despeza, 2026"):
                ini = n
                break
        if ini is not None:
            break
    if ini is None:
        return {}

    cab = acha_rotulo(grade, ini, ultima + 1, "mes")
    if cab is None:
        return {}
    return {
        "linha_secao": ini,
        "linha_cabecalho": cab,
        "categorias": _bloco_tabular(grade, cab, ultima + 1),
        "total": _linha_total(grade, cab, ultima + 1),
    }


def _custo_historico(grade, ultima: int) -> dict:
    """Bloco ano a ano (2017 em diante) da seção de histórico."""
    ini = None
    for n, linha in grade.items():
        for valor in linha.values():
            if isinstance(valor, str) and normaliza(valor).startswith("posto providencia"):
                ini = n
                break
        if ini is not None:
            break
    if ini is None:
        return {}

    cab = acha_rotulo(grade, ini, ultima + 1, "anos")
    if cab is None:
        return {}
    return {
        "linha_secao": ini,
        "linha_cabecalho": cab,
        "anos": _bloco_tabular(grade, cab, ultima + 1),
    }


def janelas_sem_leitura(mes: dict) -> list[dict]:
    """Sequências de dias incompletos que, juntas, formam UM período de leitura.

    Caso real do mês 02: entre 09 e 15/02 ninguém anotou encerrante intermediário.
    O dia 09 tem `inicial` e não tem `fechamento`; 10 a 14 não têm nada; o 15 tem
    `fechamento`. Os litros correram de verdade — 9.134,560 L —, só não têm um dia
    a que pertencer. A planilha declara o total do mês certo porque o calcula de
    ponta a ponta, então a soma dia a dia sempre vai ficar devendo essa janela.

    Isto é diagnóstico do relatório, não dado de staging: a subtração fica aqui e
    NUNCA volta para dentro de `bicos`. Atribuir esses litros a um dia qualquer
    seria inventar leitura que ninguém fez.
    """
    corridas, atual = [], []
    for dia in sorted(mes["dias"], key=lambda d: d["dia"]):
        if dia["dado_incompleto"]:
            atual.append(dia)
        elif atual:
            corridas.append(atual)
            atual = []
    if atual:
        corridas.append(atual)

    fora = []
    for corrida in corridas:
        por_produto: dict[str, dict] = {}
        for dia in corrida:
            for bico in dia["bicos"]:
                alvo = por_produto.setdefault(bico["produto"], {})
                if bico["inicial"] is not None and "inicial" not in alvo:
                    alvo["inicial"] = bico["inicial"]
                if bico["fechamento"] is not None:
                    alvo["fechamento"] = bico["fechamento"]   # o último vence
        litros = sum(v["fechamento"] - v["inicial"] for v in por_produto.values()
                     if "inicial" in v and "fechamento" in v)
        fora.append({
            "dias": [d["dia"] for d in corrida],
            "litros_nao_atribuiveis_a_um_dia": round(litros, 3),
        })
    return fora


def concilia(mes: dict, referencia: dict | None) -> dict:
    """Soma os litros que a planilha declarou por bico/dia e compara com o total
    independente. Note que somamos `litros_planilha`, nunca uma subtração nossa."""
    soma = 0.0
    dias_incompletos = 0
    bicos_descartados = 0
    for dia in mes["dias"]:
        if dia["dado_incompleto"]:
            dias_incompletos += 1
        for bico in dia["bicos"]:
            if not bico["litros_confiavel"]:
                bicos_descartados += 1
                continue
            if bico["litros_planilha"] is not None:
                soma += bico["litros_planilha"]
    janelas = janelas_sem_leitura(mes)
    em_janela = sum(j["litros_nao_atribuiveis_a_um_dia"] for j in janelas)
    fora = {
        "litros_somados_dos_dias": round(soma, 3),
        # Mês em curso tem bloco de dia criado e vazio: separar "extraído" de
        # "preenchido" evita ler o mês 07 como se tivesse 31 dias de operação.
        "dias_com_dados": sum(1 for d in mes["dias"] if d["bicos"]),
        "dias_incompletos": dias_incompletos,
        "bicos_com_litros_descartados": bicos_descartados,
        "janelas_sem_leitura": janelas,
        "litros_em_janela_sem_leitura": round(em_janela, 3),
    }
    if not referencia or referencia.get("litros") is None:
        fora["status"] = "sem_referencia"
        return fora
    ref = referencia["litros"]
    delta = soma - ref
    ajustado = delta + em_janela
    fora |= {
        "litros_referencia": round(ref, 3),
        "delta": round(delta, 3),
        "delta_ajustado": round(ajustado, 3),
        "delta_pct": round(delta / ref * 100, 4) if ref else None,
    }
    # 0,5 L num mês de ~46 mil é ruído de float; acima disso é achado.
    if abs(delta) < 0.5:
        fora["status"] = "confere"
    elif abs(ajustado) < 0.5:
        # Fecha assim que se conta a janela sem leitura: a extração está certa,
        # o que falta é leitura que ninguém fez. Estado diferente de DIVERGE —
        # o estágio 2 pode carregar o mês, desde que trate a janela como período.
        fora["status"] = "confere_com_janela"
    else:
        fora["status"] = "DIVERGE"
    return fora


def main() -> int:
    p = argparse.ArgumentParser(description="Estágio 1 do ETL — staging cru")
    p.add_argument("--xlsx", required=True, type=Path)
    p.add_argument("--saida", required=True, type=Path)
    args = p.parse_args()

    if not args.xlsx.is_file():
        print(f"planilha não encontrada: {args.xlsx}", file=sys.stderr)
        return 1

    pl = Planilha(args.xlsx)
    digest = hashlib.sha256(args.xlsx.read_bytes()).hexdigest()
    args.saida.mkdir(parents=True, exist_ok=True)

    referencias = totais_conciliacao(pl)
    manifesto = {
        "origem": args.xlsx.name,
        "sha256": digest,
        "abas": [n for n, _ in pl.abas()],
        "meses": [],
    }

    print(f"planilha: {args.xlsx.name}")
    print(f"sha256:   {digest}\n")
    print(f"{'mês':>4} {'dias':>5} {'c/dados':>8} {'incomp.':>8} "
          f"{'litros somados':>16} {'litros referência':>18} {'delta':>12}  status")

    divergentes = []
    for nome, caminho in pl.abas():
        m = ABA_MES.match(nome)
        if not m:
            continue
        mes = int(m.group(1))
        dados = extrai_mes(pl, nome, caminho, mes)
        dados["conciliacao"] = concilia(dados, referencias.get(mes))
        c = dados["conciliacao"]

        destino = args.saida / f"mes_{mes:02d}.json"
        destino.write_text(json.dumps(dados, ensure_ascii=False, indent=2))
        manifesto["meses"].append({
            "mes": mes, "arquivo": destino.name,
            "dias_extraidos": dados["dias_extraidos"],
            "conciliacao": c,
        })
        if c["status"] == "DIVERGE":
            divergentes.append(mes)
        print(f"{mes:>4} {dados['dias_extraidos']:>5} {c['dias_com_dados']:>8} "
              f"{c['dias_incompletos']:>8} {c['litros_somados_dos_dias']:>16,.3f} "
              f"{c.get('litros_referencia', float('nan')):>18,.3f} "
              f"{c.get('delta', float('nan')):>12,.3f}  {c['status']}")
        for j in (x for x in c["janelas_sem_leitura"]
                  if x["litros_nao_atribuiveis_a_um_dia"]):
            dias_j = j["dias"]
            print(f"       └─ dias {dias_j[0]}–{dias_j[-1]} sem leitura intermediária: "
                  f"{j['litros_nao_atribuiveis_a_um_dia']:,.3f} L reais, sem dia a que "
                  f"pertencer")

    resumo = extrai_resumo(pl)
    (args.saida / "resumo.json").write_text(
        json.dumps(resumo, ensure_ascii=False, indent=2))
    manifesto["resumo"] = {
        "arquivo": "resumo.json",
        "meses_com_blocos": [m["mes"] for m in resumo.get("meses", [])],
        "categorias_de_despesa": len(resumo.get("despesa", {}).get("categorias", [])),
        "anos_de_historico": len(resumo.get("custo_historico", {}).get("anos", [])),
    }
    print(f"\nresumo: {len(resumo.get('meses', []))} meses com blocos de venda/compra/"
          f"estoque, {manifesto['resumo']['categorias_de_despesa']} categorias de "
          f"despesa, {manifesto['resumo']['anos_de_historico']} anos de histórico")

    (args.saida / "manifesto.json").write_text(
        json.dumps(manifesto, ensure_ascii=False, indent=2))
    print(f"\nstaging em {args.saida}")

    if divergentes:
        # A skill manda parar no mês que não fecha, não seguir assumindo que é só ele.
        print(f"\n⚠️  meses que NÃO conciliam: {divergentes}. O estágio 2 não deve "
              f"carregar nenhum deles antes de a origem da diferença ser explicada.")
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
