import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    encerranteMensal,
    planilhaMensal,
    serieVendaDiaria,
    serieEntregas,
    serieNivelEstoque,
    somarDias,
    deIsoLocal,
    type LeituraDiariaBico,
    type PlanilhaMensal,
    type VendaDoDia,
    type EntregaDoDia,
    type SerieVenda,
    type SerieEstoque,
    type PontoEntrega,
} from '@posto/utils';
import { supabase } from '@/services/supabase';
import { tanqueService } from '@/services/api';
import { isSuccess } from '@/types/ui/response-types';
import { numeroDoCampo, textoDoCampo } from './campo-numerico';
import { intervaloDoMes, hojeIso, type Periodo } from '@/utils/periodo';
import { PALETA } from './estado-planilha';

/** Um produto da planilha, montado a partir do cadastro e do movimento do mês. */
export interface ProdutoDoBanco {
    /** `Combustivel.id`. */
    readonly id: number;
    readonly nome: string;
    readonly cor: string;
    /** Tanque que guarda este produto. `null` quando não há tanque cadastrado. */
    readonly tanqueId: number | null;
    /**
     * Litros que o tanque comporta cheio.
     *
     * @remarks `null` quando não há tanque, ou quando a capacidade cadastrada é
     *          zero — sem denominador não há "quanto do tanque isso enche", e o
     *          medidor da tela precisa sumir em vez de mostrar barra cheia.
     */
    readonly capacidadeTanque: number | null;
    /** Compra do mês como texto de campo — o que está digitado, com vírgula e tudo. */
    readonly compraLitrosTexto: string;
    readonly compraValorTexto: string;
    /** Preço médio ponderado praticado no mês (R$/L). `null` sem venda. */
    readonly preco: number | null;
    readonly compraLitros: number;
    readonly compraValor: number;
    /** Medição de abertura, como texto — é campo digitável. */
    readonly estoqueAnterior: string;
    /** Medição de fechamento, como texto — é campo digitável. */
    readonly estoqueTanque: string;
}

/** Um bico da planilha, com o encerrante do mês já apurado. */
export interface BicoDoBanco {
    /** `Bico.id`. */
    readonly id: number;
    readonly nome: string;
    readonly produtoId: number;
    readonly inicial: number | null;
    readonly fechamento: number | null;
    /** Faturamento real do bico no mês — a soma do que entrou dia a dia. */
    readonly vendaBruta: number;
}

/** Séries reais dos três gráficos. */
export interface SeriesReais {
    readonly venda: SerieVenda;
    readonly entregas: readonly PontoEntrega[];
    readonly estoque: SerieEstoque;
    readonly diasNoMes: number;
}

/** De onde veio cada bloco — a tela precisa dizer isso quando vier vazio. */
export interface Procedencia {
    readonly leituras: number;
    readonly compras: number;
    readonly despesas: number;
    readonly medicoes: number;
}

interface RetornoHook {
    readonly produtos: readonly ProdutoDoBanco[];
    readonly bicos: readonly BicoDoBanco[];
    readonly apurado: PlanilhaMensal;
    readonly series: SeriesReais;
    readonly procedencia: Procedencia;
    /** Produtos sem medição de abertura — para eles não há perda apurável. */
    readonly produtosSemAbertura: readonly string[];
    readonly periodo: Periodo;
    /** Data em que a medição de abertura é gravada — o dia anterior ao período. */
    readonly dataAbertura: string;
    readonly carregando: boolean;
    readonly erro: string | null;
    /** `true` quando há medição digitada e ainda não gravada. */
    readonly temPendencia: boolean;
    readonly salvando: boolean;
    readonly editarMedicao: (
        produtoId: number,
        campo: 'estoqueAnterior' | 'estoqueTanque',
        valor: string
    ) => void;
    /** @returns Mensagem de erro, ou `null` em caso de sucesso. */
    /** Total de despesa do mês, como texto de campo. */
    readonly despesaTexto: string;
    readonly editarDespesa: (valor: string) => void;
    /**
     * Custo por litro digitado — gravado como a despesa equivalente.
     *
     * @remarks Ver `editarCustoPorLitro` no hook: o §6 não admite custo fixo, e
     *          este campo é a mesma conta lida ao contrário.
     */
    readonly editarCustoPorLitro: (valor: string) => void;
    readonly editarCompra: (produtoId: number, campo: 'litros' | 'valor', valor: string) => void;
    readonly salvarMedicoes: () => Promise<string | null>;
    readonly descartarMedicoes: () => void;
    readonly recarregar: () => Promise<void>;
}

interface BicoRow {
    id: number;
    numero: number;
    combustivel_id: number | null;
}
interface CombustivelRow {
    id: number;
    nome: string;
    cor: string | null;
    codigo: string;
}
interface LeituraRow {
    data: string;
    bico_id: number;
    leitura_inicial: number | string | null;
    leitura_final: number | string | null;
    valor_total: number | string | null;
}
interface CompraRow {
    id: number;
    observacoes: string | null;
    data: string;
    combustivel_id: number | null;
    quantidade_litros: number | string | null;
    valor_total: number | string | null;
}
interface TanqueRow {
    id: number;
    combustivel_id: number | null;
    /** Litros que o tanque comporta cheio — a régua do medidor da tela. */
    capacidade: number | string | null;
}
/**
 * Rótulo que marca a linha criada pela digitação nesta tela.
 *
 * @remarks É por ele que a gravação **atualiza** o ajuste anterior em vez de
 *          empilhar um novo a cada clique — sem isso, digitar três vezes o mesmo
 *          total somaria três ajustes e o mês triplicaria em silêncio.
 *
 *          Também é o que separa, na tela de Despesas e na de Compras, o que foi
 *          lançado nota a nota do que foi acertado pelo total da planilha.
 */
const MARCA_AJUSTE = 'Ajuste da planilha';

interface DespesaRow {
    id: number;
    valor: number | string | null;
    descricao: string | null;
}
interface MedicaoRow {
    tanque_id: number;
    data: string;
    volume_fisico: number | string | null;
}

const num = (v: number | string | null | undefined): number => Number(v ?? 0);

/** Diferença pequena demais para virar lançamento — centavo de arredondamento. */
const IRRELEVANTE = 0.005;

/**
 * Põe a despesa do mês no total digitado, sem apagar o que foi lançado item a item.
 *
 * @param diferenca Quanto falta somar para chegar ao total digitado. Negativo
 *                  quando o dono declara MENOS do que já está lançado — o que é
 *                  informação, não erro: significa que algum item lançado não
 *                  pertence ao mês, e a linha de ajuste registra isso à vista.
 * @returns Mensagem de erro, ou `null` se deu certo.
 */
async function gravarAjusteDespesa(args: {
    postoId: number;
    data: string;
    diferenca: number;
    linhaAtual: { id: number; valor: number } | null;
}): Promise<string | null> {
    const { postoId, data, diferenca, linhaAtual } = args;

    // Zerou: o ajuste deixou de existir e a linha tem de sair. Deixá-la com
    // valor 0 sujaria a tela de Despesas com um lançamento que não é nada.
    if (Math.abs(diferenca) < IRRELEVANTE) {
        if (!linhaAtual) return null;
        const { error } = await supabase.from('Despesa').delete().eq('id', linhaAtual.id);
        return error ? `Falha ao remover o ajuste de despesa: ${error.message}` : null;
    }

    if (linhaAtual) {
        const { error } = await supabase
            .from('Despesa')
            .update({ valor: diferenca, data })
            .eq('id', linhaAtual.id);
        return error ? `Falha ao gravar a despesa do mês: ${error.message}` : null;
    }

    const { error } = await supabase.from('Despesa').insert({
        descricao: MARCA_AJUSTE,
        categoria: MARCA_AJUSTE,
        valor: diferenca,
        data,
        status: 'pago',
        posto_id: postoId,
    });
    return error ? `Falha ao gravar a despesa do mês: ${error.message}` : null;
}

/** O mesmo da despesa, para a compra de um produto no mês. */
async function gravarAjusteCompra(args: {
    postoId: number;
    combustivelId: number;
    data: string;
    litros: number;
    valor: number;
    linhaAtual: { id: number } | undefined;
}): Promise<string | null> {
    const { postoId, combustivelId, data, litros, valor, linhaAtual } = args;

    if (Math.abs(litros) < IRRELEVANTE && Math.abs(valor) < IRRELEVANTE) {
        if (!linhaAtual) return null;
        const { error } = await supabase.from('Compra').delete().eq('id', linhaAtual.id);
        return error ? `Falha ao remover o ajuste de compra: ${error.message}` : null;
    }

    // `custo_por_litro` é NOT NULL no banco e tem de bater com valor ÷ litros:
    // gravar um custo que não fecha com as duas outras colunas é semear
    // divergência dentro da própria linha.
    const custoPorLitro = Math.abs(litros) < IRRELEVANTE ? 0 : valor / litros;

    if (linhaAtual) {
        const { error } = await supabase
            .from('Compra')
            .update({ quantidade_litros: litros, valor_total: valor, custo_por_litro: custoPorLitro, data })
            .eq('id', linhaAtual.id);
        return error ? `Falha ao gravar a compra do mês: ${error.message}` : null;
    }

    // `fornecedor_id` é NOT NULL: um total digitado não sabe de quem veio, então
    // herda o fornecedor já cadastrado. Sem nenhum, a gravação para e diz o que
    // falta — inventar fornecedor daqui criaria cadastro pelas costas do dono.
    const { data: fornecedores, error: erroFornecedor } = await supabase
        .from('Fornecedor')
        .select('id')
        .limit(1);
    if (erroFornecedor) return `Falha ao ler o fornecedor: ${erroFornecedor.message}`;
    const fornecedorId = fornecedores?.[0]?.id;
    if (fornecedorId === undefined) {
        return 'Nenhum fornecedor cadastrado — a compra precisa de um para ser gravada. Cadastre em Compras e tente de novo.';
    }

    const { error } = await supabase.from('Compra').insert({
        data,
        combustivel_id: combustivelId,
        fornecedor_id: fornecedorId,
        quantidade_litros: litros,
        valor_total: valor,
        custo_por_litro: custoPorLitro,
        observacoes: MARCA_AJUSTE,
        posto_id: postoId,
    });
    return error ? `Falha ao gravar a compra do mês: ${error.message}` : null;
}


/**
 * Dia do mês a partir do timestamp do banco, **sem** passar por fuso.
 *
 * @remarks `new Date(iso).getDate()` converte de UTC para o horário local e joga
 *          cada leitura um dia para trás — o posto está em GMT-3 e o banco grava
 *          meia-noite UTC. Recortar a string é o que mantém 01/01 sendo 01/01.
 */
const diaDoIso = (iso: string): number => Number(iso.slice(8, 10));

/** Rótulo do bico como o dono lê: `Bico 01`. */
const rotuloBico = (numero: number): string => `Bico ${String(numero).padStart(2, '0')}`;

/**
 * Dia anterior a uma data ISO local, sem passar por fuso.
 *
 * @remarks Mesma armadilha do {@link diaDoIso}: `new Date(iso)` interpreta a
 *          string como UTC e, no GMT-3 do posto, devolve o dia errado.
 */
function diaAnterior(iso: string): string {
    return somarDias(deIsoLocal(iso), -1);
}

/** Quantos dias tem o mês `aaaa-mm`. */
function diasDoMes(mesIso: string): number {
    const [ano, mes] = mesIso.split('-').map(Number);
    return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

/**
 * Traduz a recusa da RLS para uma frase que o dono entenda.
 *
 * @remarks Sem login o painel acessa o banco como visitante, e a policy recusa a
 *          escrita. O Postgres devolve "new row violates row-level security
 *          policy", que não diz nada a quem está tentando gravar uma medição —
 *          e faz o sistema parecer quebrado quando é permissão.
 */
function mensagemDeErro(erro: string): string {
    return /row-level security|42501|violates row-level/i.test(erro)
        ? 'O painel não tem permissão para gravar esta medição (você está em modo visitante). ' +
              'Entre com seu login e tente de novo.'
        : erro;
}

/**
 * A planilha do mês, ligada ao banco.
 *
 * @remarks **O que é leitura e o que é escrita, e por quê:**
 *
 *          Só as duas medições de tanque são graváveis daqui, porque só elas têm
 *          mapeamento inequívoco — uma linha de `HistoricoTanque` por tanque e
 *          data, que é exatamente o que a régua produz.
 *
 *          As demais colunas são derivadas e ficam somente leitura de propósito:
 *          `Inicial`/`Fechamento` vêm da `Leitura` diária, e reescrevê-las daqui
 *          alteraria dia já fechado; `Compra` e `Despesa` são por nota, e um
 *          total mensal digitado não sabe a qual nota pertence. Cada uma tem sua
 *          tela, e é lá que o lançamento nasce.
 *
 *          O cálculo inteiro vem de `planilhaMensal` (`@posto/utils`) — este hook
 *          busca, mapeia e monta a entrada, e não faz conta nenhuma.
 */
export function usePlanilhaDoBanco(postoId: number | null, mesIso: string): RetornoHook {
    const [produtos, setProdutos] = useState<readonly ProdutoDoBanco[]>([]);
    const [bicos, setBicos] = useState<readonly BicoDoBanco[]>([]);
    const [vendasDiarias, setVendasDiarias] = useState<readonly VendaDoDia[]>([]);
    const [entregasDiarias, setEntregasDiarias] = useState<readonly EntregaDoDia[]>([]);
    const [despesasDoMes, setDespesasDoMes] = useState(0);
    /**
     * A linha de ajuste da despesa do mês, quando existe.
     *
     * @remarks Digitar o total do mês **não apaga os lançamentos itemizados** —
     *          isso jogaria fora fornecedor, data e categoria de cada despesa
     *          real. Em vez disso, uma única linha `Ajuste da planilha` guarda a
     *          diferença entre o que foi lançado item a item e o total que o dono
     *          digitou. O rastro fica inteiro e a diferença fica explícita.
     */
    const [ajusteDespesa, setAjusteDespesa] = useState<{ id: number; valor: number } | null>(null);
    /** Mesma ideia da despesa, uma linha de ajuste por produto. */
    const [ajusteCompra, setAjusteCompra] = useState<
        Readonly<Record<number, { id: number; litros: number; valor: number }>>
    >({});
    const [procedencia, setProcedencia] = useState<Procedencia>({
        leituras: 0,
        compras: 0,
        despesas: 0,
        medicoes: 0,
    });
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState<string | null>(null);
    const [salvando, setSalvando] = useState(false);

    /** Medições digitadas e ainda não gravadas, sobrepostas ao que veio do banco. */
    const [rascunho, setRascunho] = useState<
        Readonly<Record<number, { estoqueAnterior?: string; estoqueTanque?: string }>>
    >({});
    /** Total de despesa do mês digitado à mão, ainda não gravado. */
    const [rascunhoDespesa, setRascunhoDespesa] = useState<string | null>(null);
    /** Compra do mês digitada à mão, por produto, ainda não gravada. */
    const [rascunhoCompra, setRascunhoCompra] = useState<
        Readonly<Record<number, { litros?: string; valor?: string }>>
    >({});

    const periodo = useMemo(() => intervaloDoMes(mesIso, hojeIso()), [mesIso]);
    const dataAbertura = useMemo(() => diaAnterior(periodo.inicio), [periodo.inicio]);
    const diasNoMes = useMemo(() => diasDoMes(mesIso), [mesIso]);

    const carregar = useCallback(async () => {
        if (!postoId) {
            setProdutos([]);
            setBicos([]);
            setCarregando(false);
            return;
        }

        setCarregando(true);
        setErro(null);

        try {
            const [bicosRes, combustiveisRes, leiturasRes, comprasRes, despesasRes, tanquesRes] =
                await Promise.all([
                    supabase
                        .from('Bico')
                        .select('id, numero, combustivel_id')
                        .eq('posto_id', postoId)
                        .eq('ativo', true)
                        .order('numero'),
                    supabase
                        .from('Combustivel')
                        .select('id, nome, cor, codigo')
                        .eq('posto_id', postoId)
                        .eq('ativo', true),
                    supabase
                        .from('Leitura')
                        .select('data, bico_id, leitura_inicial, leitura_final, valor_total')
                        .eq('posto_id', postoId)
                        .gte('data', periodo.inicio)
                        .lte('data', periodo.fim),
                    supabase
                        .from('Compra')
                        .select('id, data, combustivel_id, quantidade_litros, valor_total, observacoes')
                        .eq('posto_id', postoId)
                        .gte('data', periodo.inicio)
                        .lte('data', periodo.fim),
                    supabase
                        .from('Despesa')
                        .select('id, valor, descricao')
                        .eq('posto_id', postoId)
                        .gte('data', periodo.inicio)
                        .lte('data', periodo.fim),
                    supabase
                        .from('Tanque')
                        .select('id, combustivel_id, capacidade')
                        .eq('posto_id', postoId),
                ]);

            const bicosRows = (bicosRes.data ?? []) as BicoRow[];
            const combustiveis = (combustiveisRes.data ?? []) as CombustivelRow[];
            const leituras = (leiturasRes.data ?? []) as LeituraRow[];
            const compras = (comprasRes.data ?? []) as CompraRow[];
            const despesas = (despesasRes.data ?? []) as DespesaRow[];
            const tanques = (tanquesRes.data ?? []) as TanqueRow[];

            // ── Medições de tanque ────────────────────────────────────────────
            // Tudo até o fim do período: a abertura é a última medição ANTERIOR
            // ao início, e o fechamento a última dentro dele.
            const medicoes =
                tanques.length > 0
                    ? (
                          (
                              await supabase
                                  .from('HistoricoTanque')
                                  .select('tanque_id, data, volume_fisico')
                                  .in('tanque_id', tanques.map((t) => t.id))
                                  .lte('data', periodo.fim)
                                  .order('data', { ascending: true })
                          ).data ?? []
                      ) as MedicaoRow[]
                    : [];

            const tanqueDoProduto = new Map<number, number>();
            for (const t of tanques) {
                if (t.combustivel_id !== null && !tanqueDoProduto.has(t.combustivel_id)) {
                    tanqueDoProduto.set(t.combustivel_id, t.id);
                }
            }
            const produtoDoTanque = new Map(
                tanques.filter((t) => t.combustivel_id !== null).map((t) => [t.id, t.combustivel_id as number])
            );
            // Capacidade do tanque que atende o produto — denominador do medidor.
            // `0` e `null` viram `null`: dividir por zero daria barra infinita.
            const capacidadeDoProduto = new Map<number, number>();
            for (const t of tanques) {
                if (t.combustivel_id === null || t.capacidade === null) continue;
                const litros = num(t.capacidade);
                if (litros > 0 && !capacidadeDoProduto.has(t.combustivel_id)) {
                    capacidadeDoProduto.set(t.combustivel_id, litros);
                }
            }

            const aberturaPorProduto = new Map<number, number>();
            const fechamentoPorProduto = new Map<number, number>();
            for (const m of medicoes) {
                const produtoId = produtoDoTanque.get(m.tanque_id);
                if (produtoId === undefined || m.volume_fisico === null) continue;
                // Vêm em ordem crescente: a última de cada faixa sobrescreve e vale.
                if (m.data < periodo.inicio) aberturaPorProduto.set(produtoId, num(m.volume_fisico));
                else fechamentoPorProduto.set(produtoId, num(m.volume_fisico));
            }

            // ── Encerrante do mês por bico ────────────────────────────────────
            const diarias: LeituraDiariaBico[] = leituras.map((l) => ({
                dia: diaDoIso(l.data),
                bico: String(l.bico_id),
                inicial: l.leitura_inicial === null ? null : num(l.leitura_inicial),
                fechamento: l.leitura_final === null ? null : num(l.leitura_final),
                valorDia: l.valor_total === null ? null : num(l.valor_total),
            }));

            const mensal = encerranteMensal(diarias);
            const porBico = new Map(mensal.bicos.map((b) => [b.bico, b]));

            // ── Compra do mês por produto ─────────────────────────────────────
            const compraPorProduto = new Map<number, { litros: number; valor: number }>();
            for (const c of compras) {
                if (c.combustivel_id === null) continue;
                const atual = compraPorProduto.get(c.combustivel_id) ?? { litros: 0, valor: 0 };
                compraPorProduto.set(c.combustivel_id, {
                    litros: atual.litros + num(c.quantidade_litros),
                    valor: atual.valor + num(c.valor_total),
                });
            }

            // A linha de ajuste de cada produto, para poder atualizá-la em vez de
            // empilhar um ajuste novo a cada gravação.
            const ajustes: Record<number, { id: number; litros: number; valor: number }> = {};
            for (const c of compras) {
                if (c.combustivel_id === null || c.observacoes !== MARCA_AJUSTE) continue;
                ajustes[c.combustivel_id] = {
                    id: c.id,
                    litros: num(c.quantidade_litros),
                    valor: num(c.valor_total),
                };
            }
            setAjusteCompra(ajustes);

            const linhaAjusteDespesa = despesas.find((d) => d.descricao === MARCA_AJUSTE);
            setAjusteDespesa(
                linhaAjusteDespesa
                    ? { id: linhaAjusteDespesa.id, valor: num(linhaAjusteDespesa.valor) }
                    : null
            );

            // Litro em milésimo: a régua do tanque é lida em L, mas a medição
            // vem do banco com a precisão que o ETL gravou.
            const emTexto = (v: number | undefined): string =>
                v === undefined ? '' : textoDoCampo(v, 3);

            setProdutos(
                combustiveis.map((c, i) => {
                    const compra = compraPorProduto.get(c.id);
                    return {
                        id: c.id,
                        nome: c.nome,
                        cor: c.cor ?? PALETA[i % PALETA.length],
                        tanqueId: tanqueDoProduto.get(c.id) ?? null,
                        capacidadeTanque: capacidadeDoProduto.get(c.id) ?? null,
                        // Preenchido depois, a partir do agregado por produto.
                        preco: null,
                        compraLitros: compra?.litros ?? 0,
                        compraValor: compra?.valor ?? 0,
                        // Sobrescritos pelo rascunho em `produtosComRascunho`.
                        compraLitrosTexto: '',
                        compraValorTexto: '',
                        estoqueAnterior: emTexto(aberturaPorProduto.get(c.id)),
                        estoqueTanque: emTexto(fechamentoPorProduto.get(c.id)),
                    };
                })
            );

            setBicos(
                bicosRows
                    .filter((b) => b.combustivel_id !== null)
                    .map((b) => {
                        const acumulado = porBico.get(String(b.id));
                        return {
                            id: b.id,
                            nome: rotuloBico(b.numero),
                            produtoId: b.combustivel_id as number,
                            inicial: acumulado?.inicial ?? null,
                            fechamento: acumulado?.fechamento ?? null,
                            vendaBruta: acumulado?.bruto ?? 0,
                        };
                    })
            );

            // ── Séries dos gráficos, agora de dado real ───────────────────────
            setVendasDiarias(
                diarias
                    .filter((d) => d.inicial !== null && d.fechamento !== null)
                    .map((d) => ({
                        dia: d.dia,
                        litros: Math.max(0, (d.fechamento as number) - (d.inicial as number)),
                    }))
            );
            setEntregasDiarias(
                compras.map((c) => ({
                    dia: diaDoIso(c.data),
                    litros: num(c.quantidade_litros),
                    valor: num(c.valor_total),
                }))
            );

            setDespesasDoMes(despesas.reduce((acc, d) => acc + num(d.valor), 0));
            setProcedencia({
                leituras: leituras.length,
                compras: compras.length,
                despesas: despesas.length,
                medicoes: medicoes.length,
            });
            setRascunho({});
            setRascunhoDespesa(null);
            setRascunhoCompra({});
        } catch (e) {
            console.error('Erro ao carregar a planilha do mês:', e);
            setErro('Falha ao carregar a planilha do mês.');
        } finally {
            setCarregando(false);
        }
    }, [postoId, periodo.inicio, periodo.fim]);

    useEffect(() => {
        carregar();
    }, [carregar]);

    /** O que o produto mostra hoje: o rascunho quando existe, senão o banco. */
    const produtosComRascunho = useMemo(
        (): readonly ProdutoDoBanco[] =>
            produtos.map((p) => {
                const compraDigitada = rascunhoCompra[p.id];
                return {
                    ...p,
                    estoqueAnterior: rascunho[p.id]?.estoqueAnterior ?? p.estoqueAnterior,
                    estoqueTanque: rascunho[p.id]?.estoqueTanque ?? p.estoqueTanque,
                    compraLitros: numeroDoCampo(compraDigitada?.litros) ?? p.compraLitros,
                    compraValor: numeroDoCampo(compraDigitada?.valor) ?? p.compraValor,
                    // Litro em milésimo, dinheiro em centavo. Enquanto há
                    // rascunho vale o texto cru: reformatar a cada tecla comeria
                    // a vírgula que a pessoa acabou de digitar.
                    compraLitrosTexto: compraDigitada?.litros ?? textoDoCampo(p.compraLitros, 3),
                    compraValorTexto: compraDigitada?.valor ?? textoDoCampo(p.compraValor, 2),
                };
            }),
        [produtos, rascunho, rascunhoCompra]
    );

    /** Despesa que a tela está usando: o digitado quando há, senão o banco. */
    const despesaEfetiva = useMemo(
        () => numeroDoCampo(rascunhoDespesa ?? undefined) ?? despesasDoMes,
        [rascunhoDespesa, despesasDoMes]
    );

    const apurado = useMemo(() => {
        const litrosDoProduto = new Map<number, number>();
        for (const b of bicos) {
            if (b.inicial === null || b.fechamento === null) continue;
            litrosDoProduto.set(
                b.produtoId,
                (litrosDoProduto.get(b.produtoId) ?? 0) + (b.fechamento - b.inicial)
            );
        }
        const vendaDoProduto = new Map<number, number>();
        for (const b of bicos) {
            vendaDoProduto.set(b.produtoId, (vendaDoProduto.get(b.produtoId) ?? 0) + b.vendaBruta);
        }

        return planilhaMensal({
            bicos: bicos.map((b) => ({
                bico: b.nome,
                produto: String(b.produtoId),
                inicial: b.inicial ?? 0,
                fechamento: b.fechamento ?? 0,
                vendaBruta: b.vendaBruta,
            })),
            produtos: produtosComRascunho.map((p) => {
                const litros = litrosDoProduto.get(p.id) ?? 0;
                const venda = vendaDoProduto.get(p.id) ?? 0;
                const abertura = numeroDoCampo(p.estoqueAnterior);
                const medido = numeroDoCampo(p.estoqueTanque);

                return {
                    produto: String(p.id),
                    // Preço médio ponderado real do mês. Não é o `preco_venda` do
                    // cadastro: aquele guarda só o preço de hoje, e aplicá-lo a um
                    // mês passado é o bug do "preço único" que já inflou a venda
                    // histórica em 8–11%.
                    preco: litros > 0 ? venda / litros : 0,
                    compraLitros: p.compraLitros,
                    compraValor: p.compraValor,
                    estoqueAnterior: abertura ?? 0,
                    // Sem medição de abertura o estoque teórico partiria de zero e
                    // acusaria uma perda inteira que nunca existiu. Nesse caso a
                    // perda não é apurável, mesmo com o tanque medido no fim.
                    estoqueTanque: abertura === null ? null : medido,
                };
            }),
            despesasDoMes: despesaEfetiva,
        });
    }, [bicos, produtosComRascunho, despesaEfetiva]);

    const series = useMemo((): SeriesReais => {
        const estoqueInicial = produtosComRascunho.reduce(
            (acc, p) => acc + (numeroDoCampo(p.estoqueAnterior) ?? 0),
            0
        );

        return {
            venda: serieVendaDiaria(vendasDiarias, diasNoMes),
            entregas: serieEntregas(entregasDiarias),
            estoque: serieNivelEstoque(estoqueInicial, vendasDiarias, entregasDiarias, diasNoMes),
            diasNoMes,
        };
    }, [vendasDiarias, entregasDiarias, produtosComRascunho, diasNoMes]);

    const editarMedicao = useCallback(
        (produtoId: number, campo: 'estoqueAnterior' | 'estoqueTanque', valor: string) => {
            setRascunho((r) => ({ ...r, [produtoId]: { ...r[produtoId], [campo]: valor } }));
        },
        []
    );

    const editarDespesa = useCallback((valor: string) => setRascunhoDespesa(valor), []);

    const editarCompra = useCallback(
        (produtoId: number, campo: 'litros' | 'valor', valor: string) => {
            setRascunhoCompra((r) => ({ ...r, [produtoId]: { ...r[produtoId], [campo]: valor } }));
        },
        []
    );

    /**
     * Digitar o custo do litro é digitar a despesa, lida ao contrário.
     *
     * @remarks O §6 do CLAUDE.md diz que o custo operacional por litro é
     *          `despesas do mês ÷ litros vendidos` e **nunca** um valor fixo.
     *          Guardar aqui o número digitado quebraria isso — o custo deixaria
     *          de ser a conta e passaria a ser uma opinião, e ele é a origem do
     *          piso de venda e do lucro de todo produto.
     *
     *          Então o campo existe e a fórmula fica de pé: o que se grava é a
     *          **despesa equivalente** (`custo × litros vendidos`). Os dois
     *          campos passam a ser duas vistas do mesmo número, e mexer num move
     *          o outro — que é exatamente o que o dono espera de uma planilha.
     *
     *          Sem litro vendido no mês não há conversão possível: `0 × custo` é
     *          zero para qualquer custo digitado. Nesse caso o campo se recusa.
     */
    const editarCustoPorLitro = useCallback(
        (valor: string) => {
            const litros = apurado.venda.totais.litros;
            if (litros <= 0) return;
            const custo = numeroDoCampo(valor);
            setRascunhoDespesa(custo === null ? '' : textoDoCampo(custo * litros, 2));
        },
        [apurado.venda.totais.litros]
    );

    const descartarMedicoes = useCallback(() => {
        setRascunho({});
        setRascunhoDespesa(null);
        setRascunhoCompra({});
    }, []);

    /**
     * Grava as medições digitadas.
     *
     * @remarks A abertura vai na data **anterior** ao início do período, e o
     *          fechamento na data de fim. É o que faz o `Estoque anterior` de
     *          fevereiro ser o mesmo número que o `Estoque tanque` de janeiro —
     *          gravar a abertura dentro do próprio mês criaria dois estoques
     *          iniciais discordantes para o mesmo dia.
     */
    const salvarMedicoes = useCallback(async (): Promise<string | null> => {
        const pendentes = Object.entries(rascunho);
        const pendentesCompra = Object.entries(rascunhoCompra);
        const temDespesa = rascunhoDespesa !== null;
        if (pendentes.length === 0 && pendentesCompra.length === 0 && !temDespesa) return null;

        const semTanque = produtos.filter(
            (p) => rascunho[p.id] !== undefined && p.tanqueId === null
        );
        if (semTanque.length > 0) {
            return `Sem tanque cadastrado para ${semTanque
                .map((p) => p.nome)
                .join(', ')} — a medição precisa de um tanque para ser gravada.`;
        }

        setSalvando(true);
        try {
            for (const [id, campos] of pendentes) {
                const produto = produtos.find((p) => p.id === Number(id));
                if (!produto || produto.tanqueId === null) continue;

                for (const [campo, valor] of Object.entries(campos)) {
                    if (valor === undefined) continue;
                    // Mesmo parser do resto da tela: aqui havia uma terceira
                    // cópia que não sabia ler "1.234,56" colado de planilha.
                    const volume = numeroDoCampo(String(valor));
                    if (volume === null || volume < 0) {
                        return `Medição inválida em ${produto.nome}: "${valor}".`;
                    }

                    const resposta = await tanqueService.saveHistory({
                        tanque_id: produto.tanqueId,
                        data: campo === 'estoqueAnterior' ? dataAbertura : periodo.fim.slice(0, 10),
                        volume_fisico: volume,
                    });

                    if (!isSuccess(resposta)) return mensagemDeErro(resposta.error);
                }
            }

            const ultimoDia = periodo.fim.slice(0, 10);

            // ── Despesa do mês ────────────────────────────────────────────────
            if (temDespesa) {
                const alvo = numeroDoCampo(rascunhoDespesa ?? undefined);
                if (alvo === null || alvo < 0) {
                    return `Despesa do mês inválida: "${rascunhoDespesa}".`;
                }
                // O que já está lançado item a item, sem contar o ajuste anterior —
                // senão o ajuste entraria na própria base que ele corrige.
                const itemizado = despesasDoMes - (ajusteDespesa?.valor ?? 0);
                const diferenca = Math.round((alvo - itemizado) * 100) / 100;
                const erroDespesa = await gravarAjusteDespesa({
                    postoId: postoId as number,
                    data: ultimoDia,
                    diferenca,
                    linhaAtual: ajusteDespesa,
                });
                if (erroDespesa) return erroDespesa;
            }

            // ── Compra do mês, por produto ────────────────────────────────────
            for (const [id, campos] of pendentesCompra) {
                const produtoId = Number(id);
                const produto = produtos.find((p) => p.id === produtoId);
                if (!produto) continue;

                const litrosAlvo = numeroDoCampo(campos.litros) ?? produto.compraLitros;
                const valorAlvo = numeroDoCampo(campos.valor) ?? produto.compraValor;
                if (litrosAlvo < 0 || valorAlvo < 0) {
                    return `Compra inválida em ${produto.nome}: litro e valor não podem ser negativos.`;
                }

                const anterior = ajusteCompra[produtoId];
                const litrosItemizados = produto.compraLitros - (anterior?.litros ?? 0);
                const valorItemizado = produto.compraValor - (anterior?.valor ?? 0);
                const erroCompra = await gravarAjusteCompra({
                    postoId: postoId as number,
                    combustivelId: produtoId,
                    data: ultimoDia,
                    litros: Math.round((litrosAlvo - litrosItemizados) * 1000) / 1000,
                    valor: Math.round((valorAlvo - valorItemizado) * 100) / 100,
                    linhaAtual: anterior,
                });
                if (erroCompra) return erroCompra;
            }

            await carregar();
            return null;
        } finally {
            setSalvando(false);
        }
    }, [
        rascunho,
        rascunhoCompra,
        rascunhoDespesa,
        produtos,
        despesasDoMes,
        ajusteDespesa,
        ajusteCompra,
        postoId,
        dataAbertura,
        periodo.fim,
        carregar,
    ]);

    return {
        produtos: produtosComRascunho,
        bicos,
        apurado,
        series,
        procedencia,
        produtosSemAbertura: produtosComRascunho
            .filter((p) => numeroDoCampo(p.estoqueAnterior) === null)
            .map((p) => p.nome),
        periodo,
        dataAbertura,
        carregando,
        erro,
        temPendencia:
            Object.keys(rascunho).length > 0 ||
            Object.keys(rascunhoCompra).length > 0 ||
            rascunhoDespesa !== null,
        salvando,
        despesaTexto: rascunhoDespesa ?? textoDoCampo(despesasDoMes, 2),
        editarMedicao,
        editarDespesa,
        editarCustoPorLitro,
        editarCompra,
        salvarMedicoes,
        descartarMedicoes,
        recarregar: carregar,
    };
}
