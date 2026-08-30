#!/usr/bin/env python3
"""Estágio 2 do ETL: mapeia o staging cru do estágio 1 para as tabelas do sistema.

    python3 scripts/etl-estagio2-carga.py --staging DIR --saida DIR

**Este estágio interpreta; o estágio 1 não.** É aqui que rótulo de planilha vira
nome de tabela, que coluna manuscrita vira coluna de banco e que a lacuna de
leitura vira `validacao_mensal`. O estágio 1 continua sendo a cópia fiel, e a
regra da skill `etl-planilha-posto-providencia` é que os dois nunca se misturem.

**O que ele NÃO faz: escrever em `docs/data/`.** A saída é um diretório de
staging. Promover para `docs/data/` é ato do dono — e é ato do dono por desenho,
não por limitação: a baseline nasce marcada como não-validada (vem da export de
07/08, não da de 26/07 contra a qual janeiro foi conferido linha a linha), e
quem decide que ela vale é uma pessoa olhando os números. O hook `protege-dados`
nega a promoção vinda de agente, o que torna essa garantia estrutural.

**A armadilha do rótulo de bico.** O mesmo bico aparece como `DS:.10,Bico 04`
nos blocos de dia e `Ds:.500,Bico 04` na aba de resumo. Não é ruído: o golden do
custo histórico chaveia `BICO_COMBUSTIVEL` pelo rótulo do bloco de dia, e o
fixture do lucro casa produto com `startsWith('Ds')`, que a maiúscula de `DS:`
não satisfaz. Cada tabela carrega o rótulo da SUA aba, verbatim. Uniformizar
aqui quebraria os dois de lados opostos.

**A linha de total fica dentro de `despesa_categoria_mensal`, de propósito.**
É fiel à planilha, que realmente tem essa linha no meio das categorias, e o
golden trava que somar a coluna crua devolve exatamente o dobro. Quem soma
despesa passa por `somarDespesas`, no domínio. Ver `packages/utils/src/despesa.ts`.

**A despesa vem do BANCO, não da planilha.** A matriz `Despeza, 2026.` da
planilha soma R$ 140.456,27 nos 7 meses; a tabela `Despesa` do app soma
R$ 195.230,40 nos mesmos meses. A diferença de R$ 54.774,13 são gastos reais que
a planilha não registra — Embasa, Net, Luz, extintor, conserto de bomba. Pelo §6
("toda despesa entra no rateio"), é a lista do banco que manda no custo por
litro. `scripts/etl-despesa-banco.py` a exporta para o staging; aqui ela vira
`despesa_lancada`. A da planilha continua carregada, como `despesa_categoria_mensal`,
porque é ela que reproduz o lucro que a planilha exibe.

Entre 31/07 e 12/08 essa lista se chamou `despesa_trimestral` e era descrita como
uma segunda aba da planilha. Nunca foi — não existe apuração trimestral, e o nome
errado quase custou a remoção de um golden master correto.

Idempotente: recria as tabelas a cada execução.
"""
from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from pathlib import Path

ANO = 2026

# Guardas de dinheiro do `confere()`. Mudam SÓ com planilha nova, no mesmo commit,
# depois de olhar mês a mês o que mudou — o valor velho fica no comentário de lá.
DESPESA_PLANILHA_ESPERADA = 161283.22      # jan–ago, planilha de 30/08/2026
DESPESA_LANCADA_ATE_MES = 8                # até onde a tabela `Despesa` do app foi carregada
DESPESA_LANCADA_ESPERADA = 210746.40       # jan–ago na tabela `Despesa` do Supabase
DESPESA_LANCADA_CONFERIDA_EM = "30/08/2026"

# Forma de pagamento na planilha -> coluna de `jan_frentista`. As chaves são lidas
# do cabeçalho de cada bloco pelo estágio 1 e variam entre meses (o mês 07 traz uma
# `Venda Concentrador` a mais); só o mês 01 alimenta esta tabela.
FORMA_COLUNA = {
    "Pix": "pix",
    "Cartao Credito": "credito",
    "Cartao Debito": "debito",
    "Moeda": "moeda",
    "Notas": "notas",
    "Baratao": "baratao",
    "Dinheiro": "dinheiro",
}

# As 7 formas que compõem o `conferido` (skill fechamento-posto-providencia:
# `conferido = pix + credito + debito + moeda + notas + baratao + dinheiro`).
#
# Só estas entram em `venda_frentista_diaria`. O bloco de caixa do mês 07 traz
# uma linha `Venda Concentrador` junto das formas, e ela NÃO é forma de
# pagamento: é o encerrante atribuído ao frentista, que tem casa própria em
# `frentista_dia_total.venda_concentrador`. Carregá-la como forma faria o
# `carga-historico-fechamento.py` abortar ("forma de pagamento desconhecida") —
# e, se não abortasse, contaria a venda duas vezes dentro do conferido.
#
# Rótulo fora desta lista não é descartado em silêncio: vai para o relatório.
FORMAS_DE_PAGAMENTO = frozenset(FORMA_COLUNA)

ESQUEMA = """
DROP TABLE IF EXISTS encerrante_diario;
CREATE TABLE encerrante_diario (
    ano INTEGER NOT NULL, mes INTEGER NOT NULL, dia INTEGER NOT NULL,
    bico TEXT NOT NULL,
    inicial REAL, fechamento REAL, litros REAL, valor_lt REAL, venda_bico REAL,
    dado_incompleto INTEGER NOT NULL DEFAULT 0
);
DROP TABLE IF EXISTS resumo_mensal_bico;
CREATE TABLE resumo_mensal_bico (
    ano INTEGER NOT NULL, mes INTEGER NOT NULL, bico TEXT NOT NULL,
    inicial REAL, fechamento REAL, litros REAL, valor_lt REAL,
    venda REAL, lucro_bico REAL
);
DROP TABLE IF EXISTS validacao_mensal;
CREATE TABLE validacao_mensal (
    ano INTEGER NOT NULL, mes INTEGER NOT NULL, bico TEXT NOT NULL,
    litros_em_lacuna REAL NOT NULL DEFAULT 0
);
DROP TABLE IF EXISTS compra_mensal;
CREATE TABLE compra_mensal (
    ano INTEGER NOT NULL, mes INTEGER NOT NULL, produto TEXT NOT NULL,
    compra_lt REAL, compra_rs REAL, media_lt REAL, valor_venda REAL
);
DROP TABLE IF EXISTS estoque_mensal;
CREATE TABLE estoque_mensal (
    ano INTEGER NOT NULL, mes INTEGER NOT NULL, produto TEXT NOT NULL,
    ano_passado REAL, compra_e_estoque REAL, estoque_hoje REAL,
    perca_sobra REAL, estoque_tanque REAL
);
DROP TABLE IF EXISTS despesa_categoria_mensal;
CREATE TABLE despesa_categoria_mensal (
    ano INTEGER NOT NULL, mes INTEGER NOT NULL, categoria TEXT, valor REAL
);
DROP TABLE IF EXISTS despesa_mensal;
CREATE TABLE despesa_mensal (
    ano INTEGER NOT NULL, mes INTEGER NOT NULL, valor REAL
);
DROP TABLE IF EXISTS venda_frentista_diaria;
CREATE TABLE venda_frentista_diaria (
    ano INTEGER NOT NULL, mes INTEGER NOT NULL, dia INTEGER NOT NULL,
    frentista TEXT NOT NULL, forma TEXT NOT NULL, valor REAL
);
DROP TABLE IF EXISTS frentista_dia_total;
CREATE TABLE frentista_dia_total (
    ano INTEGER NOT NULL, mes INTEGER NOT NULL, dia INTEGER NOT NULL,
    frentista TEXT NOT NULL,
    venda_frentistas REAL, venda_concentrador REAL, falta REAL
);
DROP TABLE IF EXISTS fechamento_diario;
CREATE TABLE fechamento_diario (
    ano INTEGER NOT NULL, mes INTEGER NOT NULL, dia INTEGER NOT NULL,
    venda_concentrador_total REAL, caixa_venda_concentrador REAL,
    caixa_venda_frentista REAL, dado_incompleto INTEGER NOT NULL DEFAULT 0
);
DROP TABLE IF EXISTS despesa_trimestral;
DROP TABLE IF EXISTS despesa_lancada;
CREATE TABLE despesa_lancada (
    ano INTEGER NOT NULL, mes INTEGER NOT NULL, data TEXT,
    descricao TEXT, categoria TEXT, valor REAL, status TEXT
);
"""

ESQUEMA_JANEIRO = """
DROP TABLE IF EXISTS jan_frentista;
CREATE TABLE jan_frentista (
    dia INTEGER NOT NULL, frentista TEXT NOT NULL,
    pix REAL NOT NULL DEFAULT 0, credito REAL NOT NULL DEFAULT 0,
    debito REAL NOT NULL DEFAULT 0, moeda REAL NOT NULL DEFAULT 0,
    notas REAL NOT NULL DEFAULT 0, baratao REAL NOT NULL DEFAULT 0,
    dinheiro REAL NOT NULL DEFAULT 0, total REAL NOT NULL DEFAULT 0
);
DROP TABLE IF EXISTS jan_encerrante;
CREATE TABLE jan_encerrante (
    dia INTEGER NOT NULL, bico TEXT NOT NULL,
    inicial REAL, fechamento REAL, litros REAL, valor_lt REAL, venda_bico REAL
);
"""


def num(valor: object) -> float | None:
    """Célula de erro (`#DIV/0!`) e texto viram ausência, nunca zero."""
    if isinstance(valor, bool) or valor is None:
        return None
    if isinstance(valor, (int, float)):
        return float(valor)
    return None


def carrega_meses(staging: Path) -> dict[int, dict]:
    return {
        m["mes"]: json.loads((staging / m["arquivo"]).read_text())
        for m in json.loads((staging / "manifesto.json").read_text())["meses"]
    }


def lacunas_por_bico(mes: dict) -> dict[str, float]:
    """Litros que saíram sem fechamento, por bico — RESÍDUO do mês.

    A definição é a de `encerrante-mensal.ts`, não uma minha:

        litrosEmLacuna = (fechamento_do_mês − inicial_do_mês) − litros lançados

    Somar as janelas de dias incompletos parece equivalente e não é: em fevereiro
    o bico 03 diverge em 3 mL, e a tolerância do golden é 2 mL. A conta corre em
    **mililitro inteiro** pelo mesmo motivo que o módulo de domínio faz isso —
    `1861248.783 − 1845214.492` em float devolve `16034.290999999968`, e esse
    ruído contamina toda soma daí pra frente.

    Quem manda na definição é o golden master; o ETL se ajusta a ele.
    """
    def ml(litros: float) -> int:
        return round(litros * 1000)

    inicio: dict[str, int] = {}
    fim: dict[str, int] = {}
    lancados: dict[str, int] = {}

    for dia in sorted(mes["dias"], key=lambda d: d["dia"]):
        for bico in dia["bicos"]:
            produto = bico["produto"]
            ini, fec = bico.get("inicial"), bico.get("fechamento")
            if ini is not None and produto not in inicio:
                inicio[produto] = ml(ini)
            if fec is not None:
                fim[produto] = ml(fec)
            if ini is not None and fec is not None:
                lancados[produto] = lancados.get(produto, 0) + (ml(fec) - ml(ini))

    fora: dict[str, float] = {}
    for produto, ini_ml in inicio.items():
        if produto not in fim:
            continue
        fora[produto] = (fim[produto] - ini_ml - lancados.get(produto, 0)) / 1000
    return fora


def carrega_principal(con: sqlite3.Connection, meses: dict[int, dict], resumo: dict,
                      staging: Path) -> dict:
    con.executescript(ESQUEMA)
    contagem: dict[str, int] = {}

    # ── encerrante_diario — rótulo do BLOCO DE DIA (o que BICO_COMBUSTIVEL espera)
    linhas = []
    for mes, dados in sorted(meses.items()):
        for dia in dados["dias"]:
            incompleto = 1 if dia["dado_incompleto"] else 0
            for b in dia["bicos"]:
                litros = num(b.get("litros_planilha")) if b.get("litros_confiavel") else None
                linhas.append((
                    ANO, mes, dia["dia"], b["produto"],
                    num(b.get("inicial")), num(b.get("fechamento")),
                    litros, num(b.get("valor_lt")), num(b.get("venda_bico")),
                    incompleto,
                ))
    con.executemany(
        "INSERT INTO encerrante_diario (ano,mes,dia,bico,inicial,fechamento,litros,"
        "valor_lt,venda_bico,dado_incompleto) VALUES (?,?,?,?,?,?,?,?,?,?)", linhas)
    contagem["encerrante_diario"] = len(linhas)

    por_mes = {m["mes"]: m for m in resumo.get("meses", [])}

    # ── resumo_mensal_bico — rótulo da ABA DE RESUMO (o que o fixture do lucro casa)
    linhas = []
    for mes, bloco in sorted(por_mes.items()):
        for item in bloco.get("venda", {}).get("itens", []):
            v = item["valores"]
            linhas.append((
                ANO, mes, item["rotulo"],
                num(v.get("Inicial")), num(v.get("Fechamento")), num(v.get("Litros")),
                num(v.get("Valor LT R$")), num(v.get("Valor por bico")),
                num(v.get("Lucro,bico, R$.")),
            ))
    con.executemany(
        "INSERT INTO resumo_mensal_bico (ano,mes,bico,inicial,fechamento,litros,"
        "valor_lt,venda,lucro_bico) VALUES (?,?,?,?,?,?,?,?,?)", linhas)
    contagem["resumo_mensal_bico"] = len(linhas)

    # ── validacao_mensal — uma linha por bico do resumo, zero quando não há lacuna
    linhas = []
    for mes, dados in sorted(meses.items()):
        lacuna = lacunas_por_bico(dados)
        rotulos_dia = []
        for dia in dados["dias"]:
            for b in dia["bicos"]:
                if b["produto"] not in rotulos_dia:
                    rotulos_dia.append(b["produto"])
        for rotulo in rotulos_dia:
            linhas.append((ANO, mes, rotulo, lacuna.get(rotulo, 0.0)))
    con.executemany(
        "INSERT INTO validacao_mensal (ano,mes,bico,litros_em_lacuna) VALUES (?,?,?,?)",
        linhas)
    contagem["validacao_mensal"] = len(linhas)

    # ── compra_mensal e estoque_mensal
    linhas_c, linhas_e = [], []
    for mes, bloco in sorted(por_mes.items()):
        for item in bloco.get("compra", {}).get("itens", []):
            v = item["valores"]
            linhas_c.append((
                ANO, mes, item["rotulo"],
                num(v.get("Compra, LT.")), num(v.get("Compra, R$.")),
                num(v.get("Media LT R$.")), num(v.get("Valor pra Venda.")),
            ))
        for item in bloco.get("estoque", {}).get("itens", []):
            v = item["valores"]
            linhas_e.append((
                ANO, mes, item["rotulo"],
                # O rótulo desta coluna oscila entre `Ano passado.` e
                # `Estoque ano passado.` conforme o mês; a planilha é manuscrita.
                num(v.get("Ano passado.", v.get("Estoque ano passado."))),
                num(v.get("Compra e Estoque.")), num(v.get("Estoque Hoje")),
                num(v.get("Perca e Sobra")), num(v.get("Estoque Tanque.")),
            ))
    con.executemany(
        "INSERT INTO compra_mensal (ano,mes,produto,compra_lt,compra_rs,media_lt,"
        "valor_venda) VALUES (?,?,?,?,?,?,?)", linhas_c)
    con.executemany(
        "INSERT INTO estoque_mensal (ano,mes,produto,ano_passado,compra_e_estoque,"
        "estoque_hoje,perca_sobra,estoque_tanque) VALUES (?,?,?,?,?,?,?,?)", linhas_e)
    contagem["compra_mensal"] = len(linhas_c)
    contagem["estoque_mensal"] = len(linhas_e)

    # ── despesa: matriz categoria × mês vira formato longo, COM a linha de total
    despesa = resumo.get("despesa", {})
    colunas_mes = {}
    for cat in despesa.get("categorias", []):
        for titulo in cat["valores"]:
            t = titulo.strip().lower()
            if t.startswith("mês") or t.startswith("mes"):
                digitos = "".join(c for c in t if c.isdigit())
                if digitos:
                    colunas_mes[titulo] = int(digitos)
        break

    linhas_d, linhas_m = [], []
    total_valores = (despesa.get("total") or {}).get("valores", {})
    for titulo, mes in sorted(colunas_mes.items(), key=lambda kv: kv[1]):
        for cat in despesa.get("categorias", []):
            linhas_d.append((ANO, mes, cat["rotulo"], num(cat["valores"].get(titulo))))
        # A linha de total entra como se fosse categoria — fiel à planilha.
        total = num(total_valores.get(titulo))
        linhas_d.append((ANO, mes, "Total.", total))
        linhas_m.append((ANO, mes, total))
    con.executemany(
        "INSERT INTO despesa_categoria_mensal (ano,mes,categoria,valor) VALUES (?,?,?,?)",
        linhas_d)
    con.executemany(
        "INSERT INTO despesa_mensal (ano,mes,valor) VALUES (?,?,?)", linhas_m)
    contagem["despesa_categoria_mensal"] = len(linhas_d)
    contagem["despesa_mensal"] = len(linhas_m)
    # ── o trio do fechamento, consumido por `carga-historico-fechamento.py`
    #
    # `venda_concentrador_total` é o ROLLUP dos encerrantes (soma dos bicos do
    # dia) e `caixa_venda_concentrador` é o total escrito no bloco de caixa. Os
    # dois existem porque DIVERGEM em janeiro, e o carregador usa o rollup de
    # propósito — é o mesmo número que já está na tabela `Leitura` em produção.
    # Colapsar os dois num só apagaria a divergência que alguém precisa ver.
    linhas_vf, linhas_ft, linhas_fd = [], [], []
    formas_ignoradas: dict[str, int] = {}
    for mes, dados in sorted(meses.items()):
        for dia in dados["dias"]:
            d = dia["dia"]
            totais = dia.get("totais", {})
            vend_f = totais.get("venda_frentistas", {})
            vend_c = totais.get("venda_concentrador", {})
            falta = totais.get("falta", {})

            for forma, por_frentista in dia["venda_frentista"].items():
                if forma not in FORMAS_DE_PAGAMENTO:
                    formas_ignoradas[forma] = formas_ignoradas.get(forma, 0) + 1
                    continue
                for frentista, valor in (por_frentista or {}).items():
                    linhas_vf.append((ANO, mes, d, frentista, forma, num(valor)))

            for frentista in dia["frentistas"]:
                linhas_ft.append((
                    ANO, mes, d, frentista,
                    num(vend_f.get(frentista)), num(vend_c.get(frentista)),
                    num(falta.get(frentista)),
                ))

            soma = lambda m: (  # noqa: E731 — só agrega o que existe; None ≠ 0
                sum(v for v in m.values() if isinstance(v, (int, float)))
                if m else None)
            linhas_fd.append((
                ANO, mes, d,
                sum(num(b.get("venda_bico")) or 0.0 for b in dia["bicos"]),
                soma(vend_c), soma(vend_f),
                1 if dia["dado_incompleto"] else 0,
            ))

    con.executemany(
        "INSERT INTO venda_frentista_diaria (ano,mes,dia,frentista,forma,valor) "
        "VALUES (?,?,?,?,?,?)", linhas_vf)
    con.executemany(
        "INSERT INTO frentista_dia_total (ano,mes,dia,frentista,venda_frentistas,"
        "venda_concentrador,falta) VALUES (?,?,?,?,?,?,?)", linhas_ft)
    con.executemany(
        "INSERT INTO fechamento_diario (ano,mes,dia,venda_concentrador_total,"
        "caixa_venda_concentrador,caixa_venda_frentista,dado_incompleto) "
        "VALUES (?,?,?,?,?,?,?)", linhas_fd)
    contagem["venda_frentista_diaria"] = len(linhas_vf)
    contagem["frentista_dia_total"] = len(linhas_ft)
    contagem["fechamento_diario"] = len(linhas_fd)
    if formas_ignoradas:
        contagem["__formas_ignoradas__"] = formas_ignoradas

    # ── despesa_lancada — vem do BANCO, não da planilha (ver etl-despesa-banco.py)
    arquivo = staging / "despesa_lancada.json"
    if arquivo.is_file():
        banco = json.loads(arquivo.read_text())
        con.executemany(
            "INSERT INTO despesa_lancada (ano,mes,data,descricao,categoria,valor,"
            "status) VALUES (?,?,?,?,?,?,?)",
            [(l["ano"], l["mes"], l.get("data"), l.get("descricao"),
              l.get("categoria"), num(l.get("valor")), l.get("status"))
             for l in banco["linhas"]])
        contagem["despesa_lancada"] = len(banco["linhas"])
    else:
        # Ausência importa: sem o export do banco, o custo por litro sairia da
        # lista PARCIAL da planilha, contra o §6. `confere()` reprova por isso.
        contagem["despesa_lancada"] = 0

    con.commit()
    return contagem


def carrega_janeiro(con: sqlite3.Connection, mes01: dict) -> dict:
    con.executescript(ESQUEMA_JANEIRO)
    contagem: dict[str, int] = {}

    linhas = []
    for dia in mes01["dias"]:
        totais = dia.get("totais", {}).get("venda_frentistas", {})
        for frentista in dia["frentistas"]:
            valores = {col: 0.0 for col in FORMA_COLUNA.values()}
            for forma, coluna in FORMA_COLUNA.items():
                v = num((dia["venda_frentista"].get(forma) or {}).get(frentista))
                valores[coluna] = v if v is not None else 0.0
            total = num(totais.get(frentista))
            linhas.append((
                dia["dia"], frentista,
                valores["pix"], valores["credito"], valores["debito"],
                valores["moeda"], valores["notas"], valores["baratao"],
                valores["dinheiro"],
                total if total is not None else 0.0,
            ))
    con.executemany(
        "INSERT INTO jan_frentista (dia,frentista,pix,credito,debito,moeda,notas,"
        "baratao,dinheiro,total) VALUES (?,?,?,?,?,?,?,?,?,?)", linhas)
    contagem["jan_frentista"] = len(linhas)

    linhas = []
    for dia in mes01["dias"]:
        for b in dia["bicos"]:
            litros = num(b.get("litros_planilha")) if b.get("litros_confiavel") else None
            linhas.append((
                dia["dia"], b["produto"], num(b.get("inicial")),
                num(b.get("fechamento")), litros, num(b.get("valor_lt")),
                num(b.get("venda_bico")),
            ))
    con.executemany(
        "INSERT INTO jan_encerrante (dia,bico,inicial,fechamento,litros,valor_lt,"
        "venda_bico) VALUES (?,?,?,?,?,?,?)", linhas)
    contagem["jan_encerrante"] = len(linhas)

    con.commit()
    return contagem


def monta_fixture(resumo: dict) -> dict:
    """Fixture do mês 01 para `lucro.golden.spec.ts`.

    Usa os rótulos da ABA DE RESUMO: o `custoDoBico` do golden casa produto por
    `startsWith('Ds')`, e o `DS:` maiúsculo do bloco de dia não satisfaz isso.
    """
    bloco = next(m for m in resumo["meses"] if m["mes"] == 1)

    compra = [
        {
            "produto": item["rotulo"],
            "compra_lt": num(item["valores"].get("Compra, LT.")),
            "compra_rs": num(item["valores"].get("Compra, R$.")),
            "media_lt_rs": num(item["valores"].get("Media LT R$.")),
            "valor_venda_rs": num(item["valores"].get("Valor pra Venda.")),
        }
        for item in bloco["compra"]["itens"]
    ]

    por_produto = [
        {
            "produto": item["rotulo"],
            "litros": num(item["valores"].get("Litros")),
            "valor_lt_rs": num(item["valores"].get("Valor LT R$")),
            "venda_bico_rs": num(item["valores"].get("Valor por bico")),
            "lucro_bico_rs": num(item["valores"].get("Lucro,bico, R$.")),
        }
        for item in bloco["venda"]["itens"]
    ]

    tot = bloco["venda"]["total"]["valores"]
    litros = num(tot.get("Litros"))

    despesa = resumo.get("despesa", {})
    coluna_mes01 = next(
        (t for t in (despesa.get("total") or {}).get("valores", {})
         if t.strip().lower().replace(" ", "").startswith("mês01")
         or t.strip().lower().replace(" ", "").startswith("mes01")),
        None,
    )
    despesas_total = num((despesa.get("total") or {}).get("valores", {}).get(coluna_mes01))

    return {
        "origem": "estágio 2 do ETL a partir de Posto,Jorro, 2026.xlsx",
        "mes_01_compra_custo_estoque": compra,
        "mes_01_por_produto": por_produto,
        "mes_01_total": {
            "litros_vendidos": litros,
            "venda_total_rs": num(tot.get("Valor por bico")),
            "lucro_total_rs": num(tot.get("Lucro,bico, R$.")),
        },
        "mes_01_despesas_total_rs": despesas_total,
        "mes_01_despesa_operacional_por_litro_rs": (
            despesas_total / litros if despesas_total and litros else None
        ),
    }


def confere(con: sqlite3.Connection, meses: dict[int, dict]) -> list[str]:
    """Reconciliações que precisam passar antes de a carga valer alguma coisa."""
    problemas: list[str] = []
    cur = con.cursor()

    cru = cur.execute(
        "SELECT COALESCE(SUM(valor),0) FROM despesa_categoria_mensal WHERE ano=?",
        (ANO,)).fetchone()[0]
    limpo = cur.execute(
        "SELECT COALESCE(SUM(valor),0) FROM despesa_categoria_mensal "
        "WHERE ano=? AND TRIM(LOWER(COALESCE(categoria,''))) NOT IN ('total','total.','__total__')",
        (ANO,)).fetchone()[0]
    # Total fixo DE PROPÓSITO: planilha nova tem de estourar aqui para alguém
    # olhar o que mudou antes de promover. Foi o que aconteceu em 30/08/2026 —
    # a planilha de agosto trouxe julho REESCRITO (13.961,00 → 19.271,95: Frete
    # 3.840 → 4.200, mais taxa de cartão 1.902, CSLL 1.490,72 e IRPJ 1.238,23)
    # e agosto novo com 15.516,00. Histórico do número, para o próximo que vier:
    #   140.456,27  jan–jul, planilha de 07/08 (sha abecc283…)
    #   161.283,22  jan–ago, planilha de 30/08 (sha 3357eed9…)
    if abs(limpo - DESPESA_PLANILHA_ESPERADA) > 0.05:
        problemas.append(
            f"despesa limpa {limpo:,.2f} ≠ {DESPESA_PLANILHA_ESPERADA:,.2f} esperado — "
            f"planilha nova? confira mês a mês e atualize a constante no mesmo commit")
    if abs(cru - limpo * 2) > 0.05:
        problemas.append(f"despesa crua {cru:,.2f} não é o dobro de {limpo:,.2f}")

    # A despesa do BANCO é a que manda no custo por litro (§6). Sem ela, a carga
    # está incompleta de um jeito que não aparece em nenhum outro número.
    lancada = cur.execute(
        "SELECT COALESCE(SUM(valor),0) FROM despesa_lancada "
        "WHERE ano=? AND mes BETWEEN 1 AND ?", (ANO, DESPESA_LANCADA_ATE_MES)).fetchone()[0]
    if not lancada:
        problemas.append(
            "despesa_lancada vazia — rode `scripts/etl-despesa-banco.py --saida <staging>` "
            "antes: sem ela o custo por litro sai da lista PARCIAL da planilha")
    elif abs(lancada - DESPESA_LANCADA_ESPERADA) > 0.05:
        problemas.append(
            f"despesa lançada {lancada:,.2f} ≠ {DESPESA_LANCADA_ESPERADA:,.2f} "
            f"(banco conferido em {DESPESA_LANCADA_CONFERIDA_EM})")

    # A regra canônica do conferido (skill fechamento-posto-providencia):
    # `conferido = pix + credito + debito + moeda + notas + baratao + dinheiro`.
    # A linha "Venda Frentistas" da planilha É essa soma, então as duas têm de
    # bater por (dia, frentista). Divergir aqui significa que uma forma ficou de
    # fora da carga — exatamente o defeito que a consolidação de 02/08 corrigiu
    # no produto, e que o ETL não pode reintroduzir pela porta dos fundos.
    divergentes = cur.execute("""
        SELECT t.mes, t.dia, t.frentista, t.venda_frentistas,
               COALESCE(SUM(v.valor), 0) AS somado
          FROM frentista_dia_total t
          LEFT JOIN venda_frentista_diaria v
                 ON v.ano=t.ano AND v.mes=t.mes AND v.dia=t.dia
                AND v.frentista=t.frentista
         WHERE t.ano=? AND t.venda_frentistas IS NOT NULL
         GROUP BY t.mes, t.dia, t.frentista, t.venda_frentistas
        HAVING ABS(t.venda_frentistas - COALESCE(SUM(v.valor), 0)) > 0.005
    """, (ANO,)).fetchall()
    if divergentes:
        amostra = "; ".join(
            f"{m:02d}/{d:02d} {f}: bloco {vf:,.2f} × formas {s:,.2f}"
            for m, d, f, vf, s in divergentes[:3])
        problemas.append(
            f"{len(divergentes)} linha(s) em que a soma das 7 formas não "
            f"reproduz a 'Venda Frentistas' da planilha — {amostra}")

    for mes, dados in sorted(meses.items()):
        ref = dados["conciliacao"].get("litros_referencia")
        resumo_lt = cur.execute(
            "SELECT COALESCE(SUM(litros),0) FROM resumo_mensal_bico WHERE ano=? AND mes=?",
            (ANO, mes)).fetchone()[0]
        if ref is not None and abs(resumo_lt - ref) > 0.005:
            problemas.append(
                f"mês {mes}: resumo_mensal_bico soma {resumo_lt:,.3f} ≠ referência {ref:,.3f}")

        # Mês em curso (`confere_parcial`, estágio 1): o resumo parou num dia e o
        # diário seguiu. O diário só é comparável com a referência ATÉ esse dia;
        # depois dele a planilha ainda não apurou nada para comparar.
        ate_dia = dados["conciliacao"].get("referencia_ate_dia", 31)
        diario = cur.execute(
            "SELECT COALESCE(SUM(litros),0) FROM encerrante_diario "
            "WHERE ano=? AND mes=? AND dado_incompleto=0 AND dia<=?",
            (ANO, mes, ate_dia)).fetchone()[0]
        lacuna = cur.execute(
            "SELECT COALESCE(SUM(litros_em_lacuna),0) FROM validacao_mensal "
            "WHERE ano=? AND mes=?", (ANO, mes)).fetchone()[0]
        if ref is not None and abs(diario + lacuna - ref) > 0.01:
            problemas.append(
                f"mês {mes}: diário {diario:,.3f} + lacuna {lacuna:,.3f} "
                f"= {diario + lacuna:,.3f} ≠ referência {ref:,.3f}")

    return problemas


def main() -> int:
    p = argparse.ArgumentParser(description="Estágio 2 do ETL — carga validada")
    p.add_argument("--staging", required=True, type=Path)
    p.add_argument("--saida", required=True, type=Path)
    args = p.parse_args()

    if not (args.staging / "manifesto.json").is_file():
        print(f"staging do estágio 1 não encontrado em {args.staging}", file=sys.stderr)
        return 1

    args.saida.mkdir(parents=True, exist_ok=True)
    meses = carrega_meses(args.staging)
    resumo = json.loads((args.staging / "resumo.json").read_text())

    alvo = args.saida / "posto_jorro_2026.sqlite"
    alvo.unlink(missing_ok=True)
    con = sqlite3.connect(alvo)
    contagem = carrega_principal(con, meses, resumo, args.staging)

    alvo_jan = args.saida / "janeiro_referencia.sqlite"
    alvo_jan.unlink(missing_ok=True)
    con_jan = sqlite3.connect(alvo_jan)
    contagem |= carrega_janeiro(con_jan, meses[1])

    (args.saida / "fixture_lucro_custo_mes01.json").write_text(
        json.dumps(monta_fixture(resumo), ensure_ascii=False, indent=2))

    ignoradas = contagem.pop("__formas_ignoradas__", None)
    print(f"{'tabela':<28} linhas")
    for nome, n in contagem.items():
        marca = "  ← do banco, não da planilha" if nome == "despesa_lancada" else ""
        print(f"  {nome:<26} {n:>6}{marca}")

    if ignoradas:
        # Rótulo que não é forma de pagamento não entra no conferido — mas some
        # do relatório nunca. Ver FORMAS_DE_PAGAMENTO.
        print("\nrótulos fora das 7 formas de pagamento, mantidos fora do "
              "`venda_frentista_diaria`:")
        for rotulo, n in sorted(ignoradas.items()):
            print(f"  {rotulo!r} em {n} dia(s)")

    problemas = confere(con, meses)
    con.close()
    con_jan.close()

    print(f"\ncarga em {args.saida}")
    if problemas:
        print("\n⚠️  reconciliação FALHOU — não promova:")
        for x in problemas:
            print(f"  - {x}")
        return 2
    print(f"\nreconciliação: despesa limpa em {DESPESA_PLANILHA_ESPERADA:,.2f} (crua = dobro), "
          "e cada mês fecha diário + lacuna contra a referência da planilha.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
