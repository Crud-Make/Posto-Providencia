/**
 * A aba de resumo da planilha inteira, apurada de uma vez — `Venda`, `Compra` e
 * `Estoque` mais os agregados que o cabeçalho da tela exibe.
 *
 * @remarks
 * Módulo puro, sem I/O. **Não introduz fórmula nova**: é a composição dos três
 * módulos que já existem e já estão travados por golden master —
 * `resumo-produto`, `resumo-compra` e `resumo-estoque` —, mais o rateio de
 * `lucro.despesaOperacionalPorLitro`. Existe porque a tela precisa dos três
 * blocos **coerentes entre si**: os três dependem do mesmo `custo do litro`, e
 * calcular esse rateio em dois lugares é exatamente como duas telas passam a
 * divergir.
 *
 * A corrente, na ordem em que a planilha a monta:
 *
 *     litros           = fechamento − inicial                    (por bico)
 *     custo_do_litro   = despesas_do_mês ÷ litros_vendidos
 *     média_lt         = compra_R$ ÷ compra_LT                   (por produto)
 *     valor_pra_venda  = média_lt + custo_do_litro
 *     lucro_lt         = preço − valor_pra_venda
 *     estoque_teórico  = estoque_anterior + compra_LT − vendido
 *     perca_e_sobra    = estoque_tanque − estoque_teórico
 *
 * Os três agregados que este módulo acrescenta são somas e divisões dos números
 * acima, e existem porque o cabeçalho da tela pergunta coisas que nenhum dos três
 * blocos responde sozinho: {@link PlanilhaMensal.margemBruta} (o lucro **antes**
 * da despesa, para dar a ver o quanto a despesa come),
 * {@link PlanilhaMensal.lucroPorLitro} e {@link PlanilhaMensal.percaPercentual}.
 *
 * @module @posto/utils/planilha-mensal
 */

import { despesaOperacionalPorLitro, emCentavos } from './lucro';
import { resumoPorProduto, type EntradaBicoMes, type ResumoProdutos } from './resumo-produto';
import { resumoCompra, type ResumoCompra } from './resumo-compra';
import { resumoEstoque, type ResumoEstoque } from './resumo-estoque';

/** Um bico da planilha, com o encerrante do período. */
export interface EntradaBicoPlanilha {
    /** Rótulo do bico como a planilha o lista (`G.C. Bico 01`). */
    readonly bico: string;
    /** Produto que o bico vende — é o que agrupa as linhas. */
    readonly produto: string;
    /** Encerrante no início do período. */
    readonly inicial: number;
    /** Encerrante no fim do período. */
    readonly fechamento: number;
    /**
     * Faturamento real do bico no período, em reais, quando ele é conhecido.
     *
     * @remarks Existe por causa de uma divergência que **não se conserta, se
     *          declara**. A planilha calcula a venda do mês como `litros × UM
     *          preço só`, digitado à mão; o banco tem o dinheiro que entrou dia a
     *          dia, com o preço que mudou no meio do mês (em março um bico teve 9
     *          preços distintos). Em janeiro/2026 isso é R$ 290.062,92 (real) contra
     *          R$ 292.400,60 (planilha), com litros idênticos ao mililitro.
     *
     *          Quando vem preenchido, é ele que vale: manda o dinheiro que
     *          entrou. Vazio — a tela digitada à mão —, cai no modelo da
     *          planilha, `litros × preço`.
     */
    readonly vendaBruta?: number;
}

/** Um produto da planilha: preço praticado, compra do mês e estoque. */
export interface EntradaProdutoPlanilha {
    readonly produto: string;
    /** Preço de venda praticado na bomba (R$/L). */
    readonly preco: number;
    /** Litros comprados no período. */
    readonly compraLitros: number;
    /** Valor pago pela compra do período, em reais. */
    readonly compraValor: number;
    /** Estoque com que o período começou, em litros. */
    readonly estoqueAnterior: number;
    /**
     * Medição física do tanque ao fim do período, em litros.
     *
     * @remarks `null` quando **ninguém mediu** — e aí não há perda a apurar.
     *          Zero é uma medição: quer dizer tanque vazio. Confundir os dois
     *          transforma tanque não conferido em tanque conferido e certo, que é
     *          a pior saída possível para o número que acusa combustível
     *          faltando.
     */
    readonly estoqueTanque: number | null;
}

export interface EntradaPlanilhaMensal {
    readonly bicos: readonly EntradaBicoPlanilha[];
    readonly produtos: readonly EntradaProdutoPlanilha[];
    /** Despesa total do período, em reais — o `Desp, Mês.` da planilha. */
    readonly despesasDoMes: number;
}

/** Perda apurada de um produto, com o sinal preservado. */
export interface PercaProduto {
    readonly produto: string;
    /**
     * Negativo = PERDA (falta no tanque). Positivo = SOBRA. `null` quando não é
     * apurável — ver {@link impossivel} e o `estoqueMedido` ausente.
     */
    readonly litros: number | null;
    /**
     * `perca ÷ litros vendidos × 100`, **com sinal**.
     *
     * @remarks `resumo-estoque` devolve a magnitude, porque lá a pergunta é "de
     *          que tamanho foi". Aqui a pergunta é "para que lado foi", e uma
     *          perda exibida como percentual positivo lê-se como sobra.
     */
    readonly percentual: number | null;
    /**
     * `true` quando o estoque teórico deu **negativo**.
     *
     * @remarks É um impossível físico, não um resultado: ninguém vende mais do
     *          que tinha somado ao que comprou. Quando aparece, o que falta é
     *          entrada — compra não lançada, ou compra que o papel em uso não
     *          tem permissão de ler (a `Compra` não abre para visitante, e volta
     *          vazia sem erro nenhum).
     *
     *          A perda vem `null` nesses casos porque a conta, ainda que
     *          aritmeticamente válida, mediria a lacuna do cadastro e não o
     *          tanque — e sairia como uma SOBRA enorme, que é a leitura mais
     *          tranquilizadora possível para o número que existe justamente
     *          para acusar combustível faltando.
     */
    readonly impossivel: boolean;
}

export interface PlanilhaMensal {
    /** Bloco `Venda` — por bico e por produto, na ordem de {@link EntradaPlanilhaMensal.bicos}. */
    readonly venda: ResumoProdutos;
    /** Bloco `Compra e Custo.` — média por litro e piso de venda. */
    readonly compra: ResumoCompra;
    /** Bloco `Estoque` — teórico contra medido. */
    readonly estoque: ResumoEstoque;
    /** Despesa do período usada nas contas, em reais — devolvida para a tela não reler a entrada. */
    readonly despesasDoMes: number;
    /** `despesas_do_mês ÷ litros_vendidos` (R$/L) — o `Custo do LT R$` da planilha. */
    readonly custoPorLitro: number;
    /**
     * Lucro **antes** da despesa rateada: `Σ litros × (preço − média de compra)`.
     *
     * @remarks Não é o lucro do posto — é o que a venda gera antes de pagar a
     *          operação. Fica ao lado do lucro líquido justamente para a
     *          diferença entre os dois ser a conta da despesa, visível.
     */
    readonly margemBruta: number;
    /** Lucro líquido do período, em reais. É `venda.totais.lucro`. */
    readonly lucroLiquido: number;
    /** `lucro_líquido ÷ litros_vendidos` (R$/L). `null` sem venda. */
    readonly lucroPorLitro: number | null;
    /** Perda por produto, com sinal. */
    readonly percas: readonly PercaProduto[];
    /**
     * Soma das perdas, em litros. Negativo = PERDA.
     *
     * @remarks `null` quando **algum** produto não é apurável — total de perda
     *          pela metade parece completo e não é.
     */
    readonly percaTotal: number | null;
    /** `perca_total ÷ litros_vendidos × 100`, com sinal. `null` sem venda. */
    readonly percaPercentual: number | null;
    /**
     * Produtos cujo estoque teórico deu negativo — ver {@link PercaProduto.impossivel}.
     *
     * @remarks Existe para a tela poder dizer **quais** e **por quê**, em vez de
     *          só trocar o número por um travessão.
     */
    readonly produtosComEstoqueImpossivel: readonly string[];
}

/** Litros somados em mililitro inteiro — encerrante tem 3 casas exatas. */
const somaLitros = (valores: readonly number[]): number =>
    valores.reduce((acc, v) => acc + Math.round(v * 1000), 0) / 1000;

/**
 * Apura os três blocos da planilha a partir do que se digita nela.
 *
 * @remarks A ordem importa e é a da própria planilha: os litros vendidos saem
 *          primeiro, porque **eles são o denominador do rateio da despesa** — e
 *          o rateio, uma vez calculado, é o mesmo número entregue aos três
 *          blocos. Recalculá-lo por bloco é como o piso de venda de um produto
 *          passa a discordar do lucro do mesmo produto.
 *
 *          Litro comprado **não** serve de denominador: os dois quase nunca são
 *          iguais no mês, e trocar um pelo outro move o piso de venda de todo
 *          produto em silêncio.
 */
export function planilhaMensal(entrada: EntradaPlanilhaMensal): PlanilhaMensal {
    const porProduto = new Map(entrada.produtos.map((p) => [p.produto, p]));

    // ── Litros por bico: o salto do encerrante ────────────────────────────────
    //
    // `Math.max(0, …)` pela mesma razão do módulo canônico `leitura.ts`, que
    // esta branch introduziu: bomba não anda para trás, e litro negativo não
    // fica onde nasce. Ele desce para `litrosVendidos`, que é o DENOMINADOR do
    // custo operacional por litro — então um encerrante invertido num bico
    // encolhe os litros do mês, sobe o custo por litro de TODO produto, e
    // inverte PERDA em SOBRA no bloco de estoque. Nada na saída sinalizava.
    const litrosDoBico = entrada.bicos.map((b) =>
        arredondarLitros(Math.max(0, b.fechamento - b.inicial))
    );
    const litrosVendidos = somaLitros(litrosDoBico);

    // ── O rateio, calculado UMA vez e distribuído aos três blocos ─────────────
    const custoPorLitro = despesaOperacionalPorLitro(entrada.despesasDoMes, litrosVendidos);
    const temDespesa = entrada.despesasDoMes > 0;

    const mediaDeCompra = (produto: string): number | null => {
        const p = porProduto.get(produto);
        return p && p.compraLitros > 0 ? p.compraValor / p.compraLitros : null;
    };

    // ── Bloco 1: venda ────────────────────────────────────────────────────────
    // O preço aqui é o praticado na bomba, digitado — é assim que a planilha
    // trabalha. Não confundir com o preço médio ponderado que o painel apura da
    // venda dia a dia: são números diferentes, e a divergência entre eles está
    // documentada em `resumo-produto`.
    const entradasVenda: EntradaBicoMes[] = entrada.bicos.map((b, i) => {
        const preco = porProduto.get(b.produto)?.preco ?? 0;
        const litros = litrosDoBico[i];

        return {
            bico: b.bico,
            produto: b.produto,
            inicial: b.inicial,
            fechamento: b.fechamento,
            litros,
            venda: emCentavos(b.vendaBruta ?? litros * preco),
            precoMedio: preco > 0 ? preco : null,
            custoMedio: mediaDeCompra(b.produto),
        };
    });

    const venda = resumoPorProduto(entradasVenda, custoPorLitro, temDespesa);

    // ── Bloco 2: compra ───────────────────────────────────────────────────────
    const compra = resumoCompra(
        entrada.produtos.map((p) => ({
            produto: p.produto,
            litros: p.compraLitros,
            valor: p.compraValor,
        })),
        custoPorLitro,
        temDespesa
    );

    // ── Bloco 3: estoque ──────────────────────────────────────────────────────
    const vendidoDoProduto = new Map(venda.produtos.map((p) => [p.produto, p.litros]));

    const estoque = resumoEstoque(
        entrada.produtos.map((p) => ({
            produto: p.produto,
            estoqueAnterior: p.estoqueAnterior,
            litrosComprados: p.compraLitros,
            litrosVendidos: vendidoDoProduto.get(p.produto) ?? 0,
            estoqueMedido: p.estoqueTanque,

        }))
    );

    // ── Agregados do cabeçalho ────────────────────────────────────────────────
    // Margem bruta soma só o que é apurável: bico sem custo de compra entraria
    // como se o combustível tivesse saído de graça, e a margem apareceria maior
    // do que qualquer venda real conseguiria produzir.
    const margemBruta = emCentavos(
        entrada.bicos.reduce((acc, b, i) => {
            const preco = porProduto.get(b.produto)?.preco ?? 0;
            const media = mediaDeCompra(b.produto);
            return media === null ? acc : acc + litrosDoBico[i] * (preco - media);
        }, 0)
    );

    const percas: PercaProduto[] = estoque.produtos.map((p) => {
        const impossivel = p.estoqueTeorico < 0;

        // ENCERRANTE NÃO LANÇADO NÃO É COMBUSTÍVEL SUMIDO.
        //
        // Tanque medido + zero litro vendido dá `estoqueTeorico = anterior +
        // comprado`, e a diferença contra a régua sai fortemente negativa: a
        // tela acusaria uma PERDA do tamanho do mês inteiro. Mas o que faltou
        // não foi combustível, foi o lançamento do encerrante — e este é o
        // estado NORMAL de um mês em reconstrução, não a exceção.
        //
        // O módulo já protegia o caso espelho (`impossivel`, estoque teórico
        // negativo) e deixava passar justamente o que produz o número
        // alarmante. Acusar furto de combustível por falta de digitação é o
        // erro mais caro que esta tela pode cometer.
        //
        // Zero litro com estoque parado (`percaOuSobra === 0`) não entra aqui:
        // aquilo é um mês legítimo sem venda, e é apurável.
        const semLeituraLancada =
            p.litrosVendidos === 0 && p.percaOuSobra !== null && p.percaOuSobra !== 0;

        const apuravel = p.percaOuSobra !== null && !impossivel && !semLeituraLancada;

        return {
            produto: p.produto,
            litros: apuravel ? (p.percaOuSobra as number) : null,
            percentual:
                apuravel && p.litrosVendidos > 0
                    ? ((p.percaOuSobra as number) / p.litrosVendidos) * 100
                    : null,
            impossivel,
        };
    });

    // O total só vale quando TODO produto é apurável. Somar os que deram e
    // ignorar os que não deram produziria um total parcial com cara de
    // completo — e um total de perda pela metade é pior que total nenhum.
    const todosApuraveis = percas.length > 0 && percas.every((p) => p.litros !== null);
    const percaTotal = todosApuraveis ? (estoque.totais.percaOuSobra ?? null) : null;

    return {
        venda,
        compra,
        estoque,
        despesasDoMes: emCentavos(entrada.despesasDoMes),
        custoPorLitro,
        margemBruta,
        lucroLiquido: venda.totais.lucro,
        lucroPorLitro: litrosVendidos > 0 ? venda.totais.lucro / litrosVendidos : null,
        percas,
        percaTotal,
        percaPercentual:
            percaTotal !== null && litrosVendidos > 0
                ? (percaTotal / litrosVendidos) * 100
                : null,
        produtosComEstoqueImpossivel: percas.filter((p) => p.impossivel).map((p) => p.produto),
    };
}

/**
 * Litro arredondado ao mililitro.
 *
 * @remarks `1739504.522 − 1716778.963` em float devolve `22725.558999999998`, e
 *          esse ruído desce inteiro para o estoque teórico — que é o número que
 *          acusa combustível faltando.
 */
function arredondarLitros(litros: number): number {
    return Math.round(litros * 1000) / 1000;
}
