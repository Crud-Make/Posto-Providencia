import React, { useMemo, useState } from 'react';
import { formatBR, formatCurrency } from '@posto/utils';
import { usePlanilhaDoBanco } from '../model/use-planilha-do-banco';
import { ESTILOS_PLANILHA } from './estilos';
import { Sinteses } from './sinteses';
import { TabelaVenda } from './tabela-venda';
import { TabelaCompra } from './tabela-compra';
import { TabelaEstoque } from './tabela-estoque';
import { corDoSinal } from './sinal';
import { textoDoCampo } from '../model/campo-numerico';

interface PlanilhaDoMesProps {
    readonly postoId: number | null;
    /** Mês a exibir, ISO local `aaaa-mm`. */
    readonly mesIso: string;
    /** Mês por extenso, para o cabeçalho. */
    readonly mesReferencia: string;
    /**
     * Seletor de mês, renderizado no meio do cabeçalho.
     *
     * @remarks Entra como nó, e não como `aoMudarMes`, porque quem é dono do
     *          período é a página — o `PeriodoContext` é compartilhado com as
     *          outras telas de análise, e o widget só empresta o lugar. Assim a
     *          direção do FSD continua de cima para baixo.
     */
    readonly seletorDeMes?: React.ReactNode;
}

/** Uma pendência do mês: rótulo curto na tela, motivo inteiro no `title`. */
interface Alerta {
    readonly rotulo: string;
    readonly detalhe: string;
    /** `true` pinta de vermelho — reservado ao que invalida um número. */
    readonly grave?: boolean;
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
    seletorDeMes,
}) => {
    const {
        produtos,
        bicos,
        apurado,
        procedencia,
        produtosSemAbertura,
        carregando,
        erro,
        temPendencia,
        salvando,
        despesaTexto,
        editarMedicao,
        editarDespesa,
        editarCustoPorLitro,
        editarCompra,
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

    /**
     * O texto do campo `Custo do LT` enquanto ele está sendo digitado.
     *
     * @remarks Precisa existir separado do valor apurado porque o campo é uma
     *          **vista** da despesa, não um dado próprio: sem ele, digitar
     *          "0," viraria 0 na conversão, voltaria como "0" e comeria o que a
     *          pessoa acabou de teclar. `null` = mostrar o valor calculado.
     */
    const [custoDigitado, setCustoDigitado] = useState<string | null>(null);

    const { venda, compra, estoque, custoPorLitro, margemBruta, lucroLiquido, lucroPorLitro } =
        apurado;

    /**
     * Quatro casas FIXAS: o custo do litro é multiplicado pelos litros do mês
     * inteiro, então a fração de centavo não é enfeite. Em janeiro, 0,4730 ×
     * 46.843 L reproduz a despesa de R$ 22.158,46; 0,47 daria R$ 142,25 a menos.
     */
    const custoTexto = custoDigitado ?? textoDoCampo(custoPorLitro, 4, 4);


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
            cor: corDoSinal(margemBruta),
        },
        {
            rotulo: 'Despesas do mês',
            valor: formatCurrency(apurado.despesasDoMes),
            // Quatro casas, e não `formatCurrency`: com duas, este KPI dizia
            // "R$ 0,47" enquanto o campo do custo mostrava 0,4730 — o mesmo
            // número aparecendo diferente em dois lugares da mesma tela.
            nota: `R$ ${formatBR(custoPorLitro, 4)} por litro`,
        },
        {
            rotulo: 'Lucro líquido',
            valor: `${formatCurrency(lucroLiquido)}${venda.apurado ? '' : ' *'}`,
            nota: 'margem bruta − despesas',
            cor: corDoSinal(lucroLiquido),
        },
        {
            rotulo: 'Margem média',
            valor: `${formatBR(venda.totais.margem, 2)}%`,
            nota: `${lucroPorLitro === null ? '—' : formatCurrency(lucroPorLitro)} por litro`,
            cor: corDoSinal(venda.totais.margem),
        },
        {
            rotulo: 'Perca e sobra',
            valor: apurado.percaTotal === null ? '—' : `${formatBR(apurado.percaTotal, 0)} L`,
            nota:
                apurado.produtosComEstoqueImpossivel.length > 0
                    ? 'falta compra lançada'
                    : apurado.percaTotal === null
                      ? 'tanque não medido'
                      : `${apurado.percaPercentual === null ? '—' : `${formatBR(apurado.percaPercentual, 2)}%`} do volume vendido`,
            cor: corDoSinal(apurado.percaTotal),
        },
    ];

    /** Nome do produto a partir da chave que o cálculo usa. */
    const nomeDoProduto = (chave: string) =>
        produtos.find((p) => String(p.id) === chave)?.nome ?? chave;

    /**
     * O que o mês tem de incompleto, em uma etiqueta cada.
     *
     * @remarks Rótulo curto na tela, motivo inteiro no `title`. O que **não**
     *          pode acontecer é o aviso sumir: cada um destes marca um número
     *          que está menor, maior ou ausente por falta de lançamento, e um
     *          mês incompleto com cara de mês fechado é o erro mais caro que
     *          esta tela pode cometer.
     */
    const alertas: readonly Alerta[] = ([
        procedencia.leituras === 0 && {
            rotulo: 'sem leitura',
            detalhe:
                `Nenhuma leitura lançada em ${mesReferencia}. Sem o encerrante diário não há litro ` +
                'vendido, e sem litro vendido não há rateio de despesa nem lucro a apurar. O ' +
                'lançamento entra pelo Fechamento de Caixa.',
        },
        procedencia.leituras > 0 &&
            procedencia.despesas === 0 && {
                rotulo: 'sem despesa',
                detalhe:
                    'Nenhuma despesa lançada neste mês. O custo do litro fica em zero e o lucro ' +
                    'exibido é bruto — está maior do que a realidade.',
            },
        !venda.apurado &&
            procedencia.leituras > 0 && {
                rotulo: 'sem compra',
                detalhe:
                    'Há produto vendido sem compra lançada no mês. Sem custo não há lucro a ' +
                    'apurar: esses bicos aparecem como “—” e o lucro total (marcado com *) soma só ' +
                    'o que deu para apurar. O preço de custo do cadastro NÃO é usado como ' +
                    'substituto — ele guarda só o valor de hoje.',
            },
        apurado.produtosComEstoqueImpossivel.length > 0 && {
            rotulo: 'estoque teórico negativo',
            grave: true,
            detalhe:
                'Estoque teórico negativo em ' +
                apurado.produtosComEstoqueImpossivel.map(nomeDoProduto).join(', ') +
                '. Isso é impossível: ninguém vende mais do que tinha somado ao que comprou. O que ' +
                'falta é entrada — compra não lançada no mês, ou compra que este acesso não pode ' +
                'ler (a RLS não abre a tabela de Compras para esta conta). A perda fica como “—” até a ' +
                'compra aparecer; exibi-la agora anunciaria uma sobra enorme.',
        },
        produtosSemAbertura.length > 0 && {
            rotulo: 'sem medição de abertura',
            detalhe:
                `Sem medição de abertura para ${produtosSemAbertura.join(', ')}. Sem ela o estoque ` +
                'teórico partiria do zero e acusaria uma perda que nunca existiu — a perda desses ' +
                'produtos fica como “—” até a abertura ser preenchida.',
        },
    ] as (Alerta | false)[]).filter((a): a is Alerta => a !== false);

    const gravar = async () => {
        // Solta o texto em edição: o campo volta a espelhar o valor apurado, que
        // é o que o banco passou a ter.
        setCustoDigitado(null);
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
                {/* No meio, entre o título e a procedência: o seletor tinha uma
                    faixa só para ele acima da planilha, que custava 62px de
                    altura e empurrava o título para 82px abaixo do topo — numa
                    página que é toda tabela. */}
                {seletorDeMes && <div className="pm-topo__seletor">{seletorDeMes}</div>}
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

            {/* Uma tira de etiquetas, não quatro parágrafos: o texto longo
                empurrava as tabelas para fora da tela, e tabela é o que esta
                página existe para mostrar. A explicação inteira mora no `title`
                de cada etiqueta, e o motivo continua marcado onde ele importa —
                o `—` na célula, o `sem compra` ao lado da perda, o `*` no lucro
                que só somou o que deu para apurar. */}
            {alertas.length > 0 && (
                <div className="pm__faixa pm-alertas">
                    {alertas.map((a) => (
                        <span
                            key={a.rotulo}
                            className={`pm-alerta${a.grave ? ' pm-alerta--grave' : ''}`}
                            title={a.detalhe}
                        >
                            {a.rotulo}
                        </span>
                    ))}
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

            </section>

            {/* ── Compra e, abaixo dela, o custo do litro ─────────────────── */}
            <div className="pm__faixa pm-dupla">
                <section className="pm-secao">
                    <div className="pm-secao__faixa pm-secao__faixa--compra">
                        <h2>Compra</h2>
                        <span className="pm-secao__formula pm__mono">
                            valor p/ venda = média + custo do LT · vem da tela de Compras
                        </span>
                    </div>

                    <TabelaCompra
                        produtos={produtos}
                        compra={compra}
                        editarCompra={(id, campo, valor) => {
                            setResultado(null);
                            editarCompra(id, campo, valor);
                        }}
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
                            <div className="pm-custo__caixa">
                                <span className="pm-custo__moeda pm__mono">R$</span>
                                <input
                                    className="pm-custo__campo"
                                    type="text"
                                    inputMode="decimal"
                                    aria-label="Total de despesa do mês"
                                    value={despesaTexto}
                                    onChange={(e) => {
                                        setResultado(null);
                                        setCustoDigitado(null);
                                        editarDespesa(e.target.value);
                                    }}
                                />
                            </div>
                            <div className="pm-custo__nota">
                                {procedencia.despesas} lançamento
                                {procedencia.despesas === 1 ? '' : 's'} na tela de Despesas
                            </div>
                        </div>

                        <div className="pm-custo__bloco">
                            <div className="pm-custo__rotulo">Custo do LT</div>
                            <div className="pm-custo__caixa">
                                <span className="pm-custo__moeda pm__mono">R$</span>
                                <input
                                    className="pm-custo__campo"
                                    type="text"
                                    inputMode="decimal"
                                    aria-label="Custo operacional por litro"
                                    disabled={venda.totais.litros <= 0}
                                    value={custoTexto}
                                    onChange={(e) => {
                                        setResultado(null);
                                        setCustoDigitado(e.target.value);
                                        editarCustoPorLitro(e.target.value);
                                    }}
                                />
                            </div>
                            {/* Não é um número solto: digitar aqui grava a despesa
                                equivalente, e é isso que mantém de pé o §6 —
                                custo do litro é despesa ÷ litros, sempre. */}
                            <div className="pm-custo__nota">
                                {venda.totais.litros <= 0
                                    ? 'sem litro vendido no mês — não há como converter'
                                    : `despesas ÷ ${formatBR(venda.totais.litros, 0)} L vendidos · digitar aqui move a despesa`}
                            </div>
                        </div>

                        <div className="pm-custo__bloco">
                            <div className="pm-custo__rotulo">Lucro líquido do mês</div>
                            <div
                                className="pm-custo__valor pm__mono"
                                style={{ color: corDoSinal(lucroLiquido) }}
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
                                setCustoDigitado(null);
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
