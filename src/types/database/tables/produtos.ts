/**
 * Tabelas do Domínio: Produtos e Estoque
 */
export interface ProdutoTable {
  Row: {
    ativo: boolean | null
    categoria: string
    codigo_barras: string | null
    created_at: string | null
    descricao: string | null
    estoque_atual: number
    estoque_minimo: number
    id: number
    nome: string
    preco_custo: number
    preco_venda: number
    unidade_medida: string
    updated_at: string | null
    posto_id: number
  }
  Insert: {
    ativo?: boolean | null
    categoria: string
    codigo_barras?: string | null
    created_at?: string | null
    descricao?: string | null
    estoque_atual?: number
    estoque_minimo?: number
    id?: number
    nome: string
    preco_custo?: number
    preco_venda?: number
    unidade_medida?: string
    updated_at?: string | null
    posto_id: number
  }
  Update: {
    ativo?: boolean | null
    categoria?: string
    codigo_barras?: string | null
    created_at?: string | null
    descricao?: string | null
    estoque_atual?: number
    estoque_minimo?: number
    id?: number
    nome?: string
    preco_custo?: number
    preco_venda?: number
    unidade_medida?: string
    updated_at?: string | null
    posto_id?: number
  }
  Relationships: [
    {
      foreignKeyName: "Produto_posto_id_fkey"
      columns: ["posto_id"]
      isOneToOne: false
      referencedRelation: "Posto"
      referencedColumns: ["id"]
    }
  ]
}

export interface VendaProdutoTable {
  Row: {
    id: number
    frentista_id: number
    produto_id: number
    quantidade: number
    valor_unitario: number
    valor_total: number
    data: string
    fechamento_frentista_id: number | null
    created_at: string
  }
  Insert: {
    id?: number
    frentista_id: number
    produto_id: number
    quantidade?: number
    valor_unitario: number
    valor_total: number
    data?: string
    fechamento_frentista_id?: number | null
    created_at?: string
  }
  Update: {
    id?: number
    frentista_id?: number
    produto_id?: number
    quantidade?: number
    valor_unitario?: number
    valor_total?: number
    data?: string
    fechamento_frentista_id?: number | null
    created_at?: string
  }
  Relationships: [
    {
      foreignKeyName: "VendaProduto_frentista_id_fkey"
      columns: ["frentista_id"]
      referencedRelation: "Frentista"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "VendaProduto_produto_id_fkey"
      columns: ["produto_id"]
      referencedRelation: "Produto"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "VendaProduto_fechamento_frentista_id_fkey"
      columns: ["fechamento_frentista_id"]
      referencedRelation: "FechamentoFrentista"
      referencedColumns: ["id"]
    }
  ]
}

export interface MovimentacaoEstoqueTable {
  Row: {
    created_at: string | null
    data: string | null
    id: number
    observacao: string | null
    produto_id: number | null
    quantidade: number
    responsavel: string | null
    tipo: string
    posto_id: number
  }
  Insert: {
    created_at?: string | null
    data?: string | null
    id?: number
    observacao?: string | null
    produto_id?: number | null
    quantidade: number
    responsavel?: string | null
    tipo: string
    posto_id: number
  }
  Update: {
    created_at?: string | null
    data?: string | null
    id?: number
    observacao?: string | null
    produto_id?: number | null
    quantidade?: number
    responsavel?: string | null
    tipo?: string
    posto_id?: number
  }
  Relationships: [
    {
      foreignKeyName: "MovimentacaoEstoque_produto_id_fkey"
      columns: ["produto_id"]
      isOneToOne: false
      referencedRelation: "Produto"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "MovimentacaoEstoque_posto_id_fkey"
      columns: ["posto_id"]
      isOneToOne: false
      referencedRelation: "Posto"
      referencedColumns: ["id"]
    },
  ]
}
