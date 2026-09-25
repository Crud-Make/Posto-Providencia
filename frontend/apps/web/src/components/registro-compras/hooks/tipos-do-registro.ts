/**
 * Tipos do Registro de Compras — o estado da tela e a ENTRADA que as duas fontes (Supabase e API
 * Laravel) entregam para {@link montarRegistroDoMes}. Moram aqui para que as fontes, o montador e o
 * hook não se importem em círculo.
 */

/**
 * Combustível com estado híbrido (string para inputs, número para o que vem do banco).
 */
export type CombustivelHibrido = {
    id: number;
    nome: string;
    codigo: string;
    // ── VENDA — lida do mês, somente leitura ──────────────────────────────
    /** Base do salto por produto — `'0'` quando há venda no mês, `''` sem venda. Encerrante real é por bico ({@link VendaBicoMes}). */
    inicial: string;
    /** Litros vendidos do produto no mês (Σ dos bicos), como texto — `fechamento − inicial` dá os litros. */
    fechamento: string;
    /** Faturamento real do mês (Σ `Leitura.valor_total`), em reais. */
    venda_mes_rs: number;
    /**
     * Preço de bomba DO MÊS, em R$/L: bruto ÷ litros das leituras do produto.
     * Cai para o `preco_venda` do cadastro só quando o mês não tem leitura —
     * aplicar o preço de hoje a um mês passado é o bug do "preço único".
     */
    preco_venda_atual: string;
    // ── COMPRA — a do dia é digitada; a do mês vem do banco ───────────────
    compra_lt: string;
    compra_rs: string;
    /** Litros já comprados no mês, antes desta tela. */
    compra_mes_lt: number;
    /** Reais já pagos no mês, antes desta tela. */
    compra_mes_rs: number;
    // ── ESTOQUE ───────────────────────────────────────────────────────────
    /** Última régua ANTES do mês (`Ano passado.` da planilha), em litros. */
    estoque_anterior: string;
    /** Régua do fim do mês — digitada (planilha `H24` literal). */
    estoque_tanque: string;
    tanque_id?: number;
    /** `false` quando não há régua anterior ao mês: o `estoque_anterior` é 0 por falta de dado. */
    tem_regua_anterior: boolean;
};

/**
 * Venda do mês de UM bico — a linha 5–10 do resumo da planilha.
 *
 * @remarks A planilha mostra bico a bico, e o dono confere o encerrante de
 *          cada um (o `1.716.778,963` do B01). Somar os três bicos de Comum
 *          num número só esconde exatamente o que ele procura.
 */
export interface VendaBicoMes {
    readonly bicoId: number;
    readonly numero: number;
    readonly produtoId: number;
    readonly produtoNome: string;
    readonly inicial: number | null;
    readonly fechamento: number | null;
    readonly litros: number;
    /** Faturamento real do mês nesse bico (Σ `valor_total`). */
    readonly bruto: number;
    /** `bruto ÷ litros` — o preço de bomba praticado no mês. `null` sem venda. */
    readonly precoMedio: number | null;
}

/** Campos que o gerente digita — os únicos que sobrevivem a um recarregamento. */
export const CAMPOS_DIGITADOS = ['compra_lt', 'compra_rs', 'estoque_tanque'] as const;
export type CampoDigitado = (typeof CAMPOS_DIGITADOS)[number];

export interface LeituraRow {
    data: string;
    bico_id: number;
    leitura_inicial: number | string | null;
    leitura_final: number | string | null;
    valor_total: number | string | null;
    bico: { id: number; numero: number; combustivel_id: number } | null;
}
export interface CompraRow { combustivel_id: number | null; quantidade_litros: number | string; valor_total: number | string }
export interface ReguaRow { tanque_id: number; data: string; volume_fisico: number | string | null }

/** Combustível ATIVO do cadastro, na ordem de exibição (`combustivelService.ORDEM_COMBUSTIVEIS`). */
export interface CombustivelDoRegistro {
    readonly id: number;
    readonly nome: string;
    readonly codigo: string;
    readonly preco_venda: number;
}

/** Tanque ATIVO do posto, na ordem do nome — o primeiro do combustível é o da tela. */
export interface TanqueDoRegistro {
    readonly id: number;
    readonly combustivel_id: number;
}

/**
 * O que a tela lê do mês, igual nas duas fontes:
 * - `leituras`: `Leitura` do período com o bico (`!inner`: sem bico, a linha não vem);
 * - `compras`: `Compra` do período;
 * - `reguas`: `HistoricoTanque` com régua medida ANTES do mês, da mais nova para a mais velha.
 */
export interface EntradaDoRegistro {
    readonly combustiveis: readonly CombustivelDoRegistro[];
    readonly tanques: readonly TanqueDoRegistro[];
    readonly leituras: readonly LeituraRow[];
    readonly compras: readonly CompraRow[];
    readonly reguas: readonly ReguaRow[];
}
