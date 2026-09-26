/**
 * O tanque como o cadastro o entrega à tela — só o que a tela usa, igual nas duas fontes
 * (Supabase e API, `hooks/fonte-*.ts`). `preco_custo` é anulável no esquema.
 */
export interface TanqueDoCadastro {
  readonly id: number;
  readonly nome: string;
  readonly combustivel_id: number;
  readonly capacidade: number;
  readonly combustivel?: {
    readonly nome: string;
    readonly codigo: string;
    readonly preco_venda: number;
    readonly preco_custo: number | null;
  };
}

/**
 * Tanque como a tela o vê: `estoque_atual` DERIVADO (régua + compras − vendas),
 * nunca a coluna carimbada de `Tanque`. Ver `model/estoque-derivado.ts`.
 */
export type Tanque = TanqueDoCadastro & {
  estoque_atual: number;
  /** `false` quando o tanque nunca teve régua — o `estoque_atual` é 0 só para a UI não quebrar. */
  medido: boolean;
};

export interface TankHistoryEntry {
  id: number;
  data: string;
  volume_livro?: number;
  volume_fisico?: number;
}

export interface TankHistory {
  [key: number]: TankHistoryEntry[];
}

export interface MedicaoFormData {
  valor: string;
  observacao: string;
}
