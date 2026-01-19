/**
 * Tabelas do Domínio: Compras e Fornecedores
 */
export interface CompraTable {
  Row: {
    arquivo_nf: string | null
    combustivel_id: number
    createdAt: string
    custo_por_litro: number
    data: string
    fornecedor_id: number
    id: number
    numero_nf: string | null
    observacoes: string | null
    quantidade_litros: number
    valor_total: number
    posto_id: number
  }
  Insert: {
    arquivo_nf?: string | null
    combustivel_id: number
    createdAt?: string
    custo_por_litro: number
    data: string
    fornecedor_id: number
    id?: number
    numero_nf?: string | null
    observacoes?: string | null
    quantidade_litros: number
    valor_total: number
    posto_id: number
  }
  Update: {
    arquivo_nf?: string | null
    combustivel_id?: number
    createdAt?: string
    custo_por_litro?: number
    data?: string
    fornecedor_id?: number
    id?: number
    numero_nf?: string | null
    observacoes?: string | null
    quantidade_litros?: number
    valor_total?: number
    posto_id?: number
  }
  Relationships: [
    {
      foreignKeyName: "Compra_combustivel_id_fkey"
      columns: ["combustivel_id"]
      isOneToOne: false
      referencedRelation: "Combustivel"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "Compra_fornecedor_id_fkey"
      columns: ["fornecedor_id"]
      isOneToOne: false
      referencedRelation: "Fornecedor"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "Compra_posto_id_fkey"
      columns: ["posto_id"]
      isOneToOne: false
      referencedRelation: "Posto"
      referencedColumns: ["id"]
    },
  ]
}

export interface FornecedorTable {
  Row: {
    ativo: boolean
    cnpj: string
    contato: string | null
    id: number
    nome: string
    posto_id: number
  }
  Insert: {
    ativo?: boolean
    cnpj: string
    contato?: string | null
    id?: number
    nome: string
    posto_id: number
  }
  Update: {
    ativo?: boolean
    cnpj?: string
    contato?: string | null
    id?: number
    nome?: string
    posto_id?: number
  }
  Relationships: [
    {
      foreignKeyName: "Fornecedor_posto_id_fkey"
      columns: ["posto_id"]
      isOneToOne: false
      referencedRelation: "Posto"
      referencedColumns: ["id"]
    }
  ]
}
