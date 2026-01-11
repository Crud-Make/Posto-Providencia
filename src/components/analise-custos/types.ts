export interface ProfitabilityItem {
    id: string | number;
    combustivelId: number;
    nome: string;
    codigo: string;
    cor: string;
    precoVenda: number;
    custoMedio: number;
    despOperacional: number;
    custoTotalL: number;
    volumeVendido: number;
    receitaBruta: number;
    lucroTotal: number;
    margemBrutaL: number;
    margemLiquidaL: number;
}

export type Margins = Record<number, number>;
