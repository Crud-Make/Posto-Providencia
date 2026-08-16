import React, { useMemo, useState } from 'react';
import { formatBR, formatCurrency } from '@posto/utils';
import { usePlanilhaDoBanco } from '../model/use-planilha-do-banco';
import {
    geometriaVenda,
    geometriaEstoque,
    geometriaEntregas,
} from '../model/geometria-series';
import { ESTILOS_PLANILHA } from './estilos';
import { Sinteses } from './sinteses';
import { TabelaVenda } from './tabela-venda';
import { TabelaCompra } from './tabela-compra';
import { TabelaEstoque } from './tabela-estoque';
import { GraficoAcumulado } from './grafico-acumulado';
import { GraficoEntregas } from './grafico-entregas';

interface PlanilhaDoMesProps {
    readonly postoId: number | null;
    /** Mês a exibir, ISO local `aaaa-mm`. */
    readonly mesIso: string;
    /** Mês por extenso, para o cabeçalho. */
    readonly mesReferencia: string;
}

interface Kpi {
    readonly rotulo: string;
    readonly valor: string;
    readonly nota: string;
    readonly cor?: string;
}

/**
 * A aba de resumo da planilha do posto, dentro do sistema: `Venda`, `Compra` e
 * `Estoque` na mesma ordem, com os mesmos nomes de coluna que o dono lê há anos.
 *
 * @remarks Componente de apresentação — **não calcula nada**. Toda a conta vem
 *          de `planilhaMensal` (`@posto/utils`), que compõe os módulos travados
 *          por golden master. Componente que calcula dinheiro está errado por
 *          definição (CLAUDE.md §3).
 *
 *          **O que se edita aqui e o que não:** só as duas medições de tanque,
 *          porque só elas têm mapeamento inequívoco com o banco — uma linha de
 *          `HistoricoTanque` por tanque e data, que é o que a régua produz. As
 *          outras colunas são derivadas da `Leitura`, da `Compra` e da `Despesa`,
 *          e cada uma tem sua tela de lançamento. Reescrevê-las daqui mexeria em
 *          dia já fechado ou apagaria o rastro de uma nota.
 */
export const PlanilhaDoMes: React.FC<PlanilhaDoMesProps> = ({
    postoId,
    mesIso,
    mesReferencia,
}) => {
    const {
        produtos,
        bicos,
        apurado,
        series,
        procedencia,
        produtosSemAbertura,
        carregando,
        erro,
        temPendencia,
        salvando,
        editarMedicao,
        salvarMedicoes,
        descartarMedicoes,
    } = usePlanilhaDoBanco(postoId, mesIso);

    /**
     * Resultado da última tentativa de gravar.
     *
     * @remarks Guarda se **falhou**, e não só o texto: a recusa da RLS deixa a
     *          medição pendente, e o rodapé mostrava o aviso de pendência por
     *          cima do motivo — a pessoa clicava, nada acontecia e a tela não
     *          dizia por quê. Falha silenciosa em tela de dinheiro é como o
     *          "sucesso com zeros" do reset do painel nasceu.
     */
    const [resultado, setResultado] = useState<{ texto: string; falhou: boolean } | null>(null);

    const { venda, compra, estoque, custoPorLitro, margemBruta, lucroLiquido, lucroPorLitro } =
        apurado;

    // Sem o React Compiler neste app, a geometria dos três gráficos seria
    // recalculada a cada tecla digitada numa medição.
    const geoVenda = useMemo(() => geometriaVenda(series.venda), [series.venda]);
    const geoEstoque = useMemo(() => geometriaEstoque(series.estoque), [series.estoque]);
    const geoEntregas = useMemo(() => geometriaEntregas(series.entregas), [series.entregas]);

    const kpis: readonly Kpi[] = [
        {
            rotulo: 'Faturamento',
            valor: formatCurrency(venda.totais.venda),
            nota: `${formatBR(venda.totais.litros, 0)} litros vendidos`,
        },
        {
            rotulo: 'Margem bruta',
            valor: formatCurrency(margemBruta),
            nota: 'venda − custo de compra',
        },
        {
            rotulo: 'Despesas do mês',
            valor: formatCurrency(apurado.despesasDoMes),
            nota: `${formatCurrency(custoPorLitro)} por litro`,
        },
        {
            rotulo: 'Lucro líquido',
            valor: `${formatCurrency(lucroLiquido)}${venda.apurado ? '' : ' *'}`,
            nota: 'margem bruta − despesas',
            cor: lucroLiquido < 0 ? 'var(--neg)' : 'var(--pos)',
        },
        {
            rotulo: 'Margem média',
            valor: `${formatBR(venda.totais.margem, 2)}%`,
            nota: `${lucroPorLitro === null ? '—' : formatCurrency(lucroPorLitro)} por litro`,
        },
        {
            rotulo: 'Perca e sobra',
            valor:
                estoque.totais.estoqueMedido === null
                    ? '—'
                    : `${formatBR(apurado.percaTotal, 0)} L`,
            nota:
                estoque.totais.estoqueMedido === null
                    ? 'tanque não medido'
                    : `${apurado.percaPercentual === null ? '—' : `${formatBR(apurado.percaPercentual, 2)}%`} do volume vendido`,
            cor: apurado.percaTotal < 0 ? 'var(--neg)' : 'var(--pos)',
        },
    ];

    const gravar = async () => {
        const falha = await salvarMedicoes();
        setResultado(
            falha === null
                ? { texto: 'Medições gravadas.', falhou: false }
                : { texto: falha, falhou: true }
        );
    };

    if (carregando) {
        return (
            <div className="pm">
                <style>{ESTILOS_PLANILHA}</style>
                <p className="pm__faixa pm-carregando">Apurando a planilha de {mesReferencia}…</p>
            </div>
        );
    }

    if (erro) {
        return (
            <div className="pm">
                <style>{ESTILOS_PLANILHA}</style>
                <div className="pm__faixa pm-aviso pm-aviso--erro">{erro}</div>
            </div>
        );
    }

    return (
        <div className="pm">
            <style>{ESTILOS_PLANILHA}</style>

            {/* ── Cabeçalho ───────────────────────────────────────────────── */}
            <div className="pm__faixa pm-topo">
                <div>
                    <div className="pm-topo__etiqueta">Controle de combustíveis</div>
                    <div className="pm-topo__titulo">Fechamento de pista</div>
                </div>
                <div className="pm-topo__lado pm__mono">
                    <div>
                        Referência: <strong>{mesReferencia}</strong>
                    </div>
                    <div>
                        {procedencia.leituras} leituras · {procedencia.compras} compras ·{' '}
                        {procedencia.despesas} despesas
                    </div>
                </div>
            </div>

            {/* Mês sem lançamento nenhum não é mês sem movimento — é mês que
                ninguém lançou. A tela precisa dizer qual dos dois é. */}
            {procedencia.leituras === 0 && (
                <div className="pm__faixa pm-aviso">
                    <span>
                        <strong>Nenhuma leitura lançada em {mesReferencia}.</strong> Sem o encerrante
                        diário não há litro vendido, e sem litro vendido não há rateio de despesa nem
                        lucro a apurar. O lançamento entra pelo <strong>Fechamento de Caixa</strong>.
                    </span>
                </div>
            )}

            {procedencia.leituras > 0 && procedencia.despesas === 0 && (
                <div className="pm__faixa pm-aviso">
                    <span>
                        <strong>Nenhuma despesa lançada neste mês.</strong> O custo do litro fica em
                        zero e o lucro abaixo é <strong>bruto</strong> — está maior do que a
                        realidade.
                    </span>
                </div>
            )}

            {!venda.apurado && procedencia.leituras > 0 && (
                <div className="pm__faixa pm-aviso">
                    <span>
                        <strong>Há produto vendido sem compra lançada no mês.</strong> Sem custo não
                        há lucro a apurar: esses bicos aparecem como “—” e o lucro total (marcado com
                        *) soma só o que deu para apurar. O preço de custo do cadastro{' '}
                        <strong>não</strong> é usado como substituto — ele guarda só o valor de hoje.
                    </span>
                </div>
            )}

            {produtosSemAbertura.length > 0 && (
                <div className="pm__faixa pm-aviso">
                    <span>
                        <strong>Sem medição de abertura para {produtosSemAbertura.join(', ')}.</strong>{' '}
                        Sem ela o estoque teórico partiria do zero e acusaria uma perda que nunca
                        existiu — a perda desses produtos fica como “—” até a abertura ser preenchida.
                    </span>
                </div>
            )}

            {/* ── KPIs ────────────────────────────────────────────────────── */}
            <div className="pm__faixa pm-kpis">
                {kpis.map((k) => (
                    <div key={k.rotulo} className="pm-kpi">
                        <div className="pm-kpi__rotulo">{k.rotulo}</div>
                        <div className="pm-kpi__valor pm__mono" style={{ color: k.cor }}>
                            {k.valor}
                        </div>
                        <div className="pm-kpi__nota">{k.nota}</div>
                    </div>
                ))}
            </div>

            <Sinteses produtos={produtos} bicos={bicos} apurado={apurado} />

            {/* ── Venda ───────────────────────────────────────────────────── */}
            <section className="pm__faixa pm-secao">
                <div className="pm-secao__faixa pm-secao__faixa--venda">
                    <h2>Venda</h2>
                    <span className="pm-secao__formula pm__mono">
                        encerrantes por bico · litros = fechamento − inicial · vem do Fechamento de
                        Caixa
                    </span>
                </div>

                <TabelaVenda
                    bicos={bicos}
                    produtos={produtos}
                    venda={venda}
                    lucroPorLitro={lucroPorLitro}
                />

                <GraficoAcumulado
                    titulo="Venda diária"
                    geometria={geoVenda}
                    cor="var(--venda-barra)"
                    legendaBarra="litros/dia"
                    legendaLinha="acumulado do mês"
                    resumo={`média ${formatBR(series.venda.mediaDiaria, 0)} L em ${series.venda.diasComVenda} dias lançados`}
                    picoRotulo={`${formatBR(series.venda.pico, 0)} L/dia`}
                    tooltipBarra={(l, dia) => `Dia ${dia}: ${formatBR(l, 0)} L`}
                    vazio={
                        series.venda.diasComVenda === 0
                            ? 'Nenhum dia com leitura lançada neste mês.'
                            : undefined
                    }
                />
            </section>

            {/* ── Compra + o custo do litro ───────────────────────────────── */}
            <div className="pm__faixa pm-dupla">
                <section className="pm-secao">
                    <div className="pm-secao__faixa pm-secao__faixa--compra">
                        <h2>Compra</h2>
                        <span className="pm-secao__formula pm__mono">
                            valor p/ venda = média + custo do LT · vem da tela de Compras
                        </span>
                    </div>

                    <TabelaCompra produtos={produtos} compra={compra} />

                    <GraficoEntregas
                        geometria={geoEntregas}
                        precoMedio={compra.totais.mediaLitro}
                    />
                </section>

                {/* O bloco lateral da planilha. É a origem da corrente inteira:
                    daqui sai o piso de venda de cada produto e, por consequência,
                    todo o lucro. Mexeu na despesa, mexeu no lucro do posto. */}
                <section className="pm-secao">
                    <div className="pm-secao__faixa pm-secao__faixa--custo">
                        <h2>Compra e custo</h2>
                    </div>
                    <div className="pm-custo__corpo">
                        <div>
                            <div className="pm-custo__rotulo">Despesas do mês</div>
                            <div className="pm-custo__valor pm__mono">
                                {formatCurrency(apurado.despesasDoMes)}
                            </div>
                            <div className="pm-custo__nota">
                                {procedencia.despesas} lançamento
                                {procedencia.despesas === 1 ? '' : 's'} na tela de Despesas
                            </div>
                        </div>

                        <div className="pm-custo__bloco">
                            <div className="pm-custo__rotulo">Custo do LT</div>
                            <div className="pm-custo__valor pm__mono">
                                {formatCurrency(custoPorLitro)}
                            </div>
                            <div className="pm-custo__nota">
                                despesas ÷ {formatBR(venda.totais.litros, 0)} L vendidos
                            </div>
                        </div>

                        <div className="pm-custo__bloco">
                            <div className="pm-custo__rotulo">Lucro líquido do mês</div>
                            <div
                                className="pm-custo__valor pm__mono"
                                style={{ color: lucroLiquido < 0 ? 'var(--neg)' : 'var(--pos)' }}
                            >
                                {formatCurrency(lucroLiquido)}
                            </div>
                            <div className="pm-custo__nota">
                                margem bruta {formatCurrency(margemBruta)} − despesas
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            {/* ── Estoque ─────────────────────────────────────────────────── */}
            <section className="pm__faixa pm-secao">
                <div className="pm-secao__faixa pm-secao__faixa--estoque">
                    <h2>Estoque</h2>
                    <span className="pm-secao__formula pm__mono">
                        perca e sobra = medição do tanque − estoque teórico · a régua se digita aqui
                    </span>
                </div>

                <TabelaEstoque
                    produtos={produtos}
                    estoque={estoque}
                    percas={apurado.percas}
                    percaTotal={apurado.percaTotal}
                    percaPercentual={apurado.percaPercentual}
                    editarMedicao={(id, campo, valor) => {
                        setResultado(null);
                        editarMedicao(id, campo, valor);
                    }}
                />

                <GraficoAcumulado
                    titulo="Nível de estoque no mês"
                    geometria={geoEstoque}
                    cor="var(--estoque-barra)"
                    corArea="var(--estoque-barra)"
                    legendaBarra="saída diária (venda)"
                    legendaLinha="estoque total, L"
                    resumo={`nível final ${formatBR(series.estoque.nivelFinal, 0)} L`}
                    picoRotulo={`${formatBR(series.estoque.pico, 0)} L`}
                    tooltipBarra={(l, dia) => `Dia ${dia}: venda ${formatBR(l, 0)} L`}
                    vazio={
                        series.venda.diasComVenda === 0 && series.entregas.length === 0
                            ? 'Sem venda nem compra lançada neste mês.'
                            : undefined
                    }
                />
            </section>

            {/* ── Rodapé: gravar a régua ──────────────────────────────────── */}
            <div className="pm__faixa pm-rodape pm__mono">
                {/* A falha vem PRIMEIRO. Ela sobrevive à pendência justamente
                    porque a recusa deixa a medição pendente: mostrar "ainda não
                    gravada" por cima do motivo esconderia a única frase que
                    explica o que houve. */}
                <span className={resultado?.falhou ? 'pm-rodape__erro' : undefined}>
                    {resultado?.falhou
                        ? resultado.texto
                        : temPendencia
                          ? 'Medição digitada e ainda não gravada.'
                          : (resultado?.texto ??
                            'Fórmulas: litros = fechamento − inicial · valor p/ venda = média LT + custo do LT · lucro LT = preço − valor p/ venda')}
                </span>
                <span style={{ display: 'flex', gap: 10 }}>
                    {temPendencia && (
                        <button
                            type="button"
                            className="pm-rodape__botao pm-rodape__botao--fantasma"
                            onClick={() => {
                                setResultado(null);
                                descartarMedicoes();
                            }}
                            disabled={salvando}
                        >
                            Descartar
                        </button>
                    )}
                    <button
                        type="button"
                        className="pm-rodape__botao"
                        onClick={gravar}
                        disabled={!temPendencia || salvando}
                    >
                        {salvando ? 'Gravando…' : 'Gravar medições'}
                    </button>
                </span>
            </div>
        </div>
    );
};
