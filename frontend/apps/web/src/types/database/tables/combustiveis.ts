/**
 * Tabelas do Domínio: Combustíveis
 * 
 * @remarks
 * Contém definições para Combustivel, Bomba, Bico, Tanque, HistoricoTanque e Estoque.
 */

export interface CombustivelTable {
  Row: {
    ativo: boolean
    codigo: string
    cor: string | null
    id: number
    nome: string
    preco_custo: number
    preco_venda: number
    posto_id: number
  }
  Insert: {
    ativo?: boolean
    codigo: string
    cor?: string | null
    id?: number
    nome: string
    preco_custo?: number
    preco_venda?: number
    posto_id: number
  }
  Update: {
    ativo?: boolean
    codigo?: string
    cor?: string | null
    id?: number
    nome?: string
    preco_custo?: number
    preco_venda?: number
    posto_id?: number
  }
  Relationships: [
    {
      foreignKeyName: "Combustivel_posto_id_fkey"
      columns: ["posto_id"]
      isOneToOne: false
      referencedRelation: "Posto"
      referencedColumns: ["id"]
    }
  ]
}

export interface BombaTable {
  Row: {
    ativo: boolean
    id: number
    localizacao: string | null
    nome: string
    posto_id: number
  }
  Insert: {
    ativo?: boolean
    id?: number
    localizacao?: string | null
    nome: string
    posto_id: number
  }
  Update: {
    ativo?: boolean
    id?: number
    localizacao?: string | null
    nome?: string
    posto_id?: number
  }
  Relationships: [
    {
      foreignKeyName: "Bomba_posto_id_fkey"
      columns: ["posto_id"]
      isOneToOne: false
      referencedRelation: "Posto"
      referencedColumns: ["id"]
    }
  ]
}

export interface BicoTable {
  Row: {
    ativo: boolean
    bomba_id: number
    combustivel_id: number
    id: number
    numero: number
    posto_id: number
    tanque_id: number | null
  }
  Insert: {
    ativo?: boolean
    bomba_id: number
    combustivel_id: number
    id?: number
    numero: number
    posto_id: number
    tanque_id?: number | null
  }
  Update: {
    ativo?: boolean
    bomba_id?: number
    combustivel_id?: number
    id?: number
    numero?: number
    posto_id?: number
    tanque_id?: number | null
  }
  Relationships: [
    {
      foreignKeyName: "Bico_bomba_id_fkey"
      columns: ["bomba_id"]
      isOneToOne: false
      referencedRelation: "Bomba"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "Bico_combustivel_id_fkey"
      columns: ["combustivel_id"]
      isOneToOne: false
      referencedRelation: "Combustivel"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "Bico_posto_id_fkey"
      columns: ["posto_id"]
      isOneToOne: false
      referencedRelation: "Posto"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "Bico_tanque_id_fkey"
      columns: ["tanque_id"]
      isOneToOne: false
      referencedRelation: "Tanque"
      referencedColumns: ["id"]
    },
  ]
}

export interface TanqueTable {
  Row: {
    ativo: boolean
    capacidade: number
    combustivel_id: number
    created_at: string
    estoque_atual: number
    id: number
    nome: string
    posto_id: number
  }
  Insert: {
    ativo?: boolean
    capacidade?: number
    combustivel_id: number
    created_at?: string
    estoque_atual?: number
    id?: number
    nome: string
    posto_id: number
  }
  Update: {
    ativo?: boolean
    capacidade?: number
    combustivel_id?: number
    created_at?: string
    estoque_atual?: number
    id?: number
    nome?: string
    posto_id?: number
  }
  Relationships: [
    {
      foreignKeyName: "Tanque_combustivel_id_fkey"
      columns: ["combustivel_id"]
      isOneToOne: false
      referencedRelation: "Combustivel"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "Tanque_posto_id_fkey"
      columns: ["posto_id"]
      isOneToOne: false
      referencedRelation: "Posto"
      referencedColumns: ["id"]
    }
  ]
}

export interface HistoricoTanqueTable {
  Row: {
    id: number
    tanque_id: number
    data: string
    volume_livro: number | null
    volume_fisico: number | null
    created_at: string
  }
  Insert: {
    id?: number
    tanque_id: number
    data: string
    volume_livro?: number | null
    volume_fisico?: number | null
    created_at?: string
  }
  Update: {
    id?: number
    tanque_id?: number
    data?: string
    volume_livro?: number | null
    volume_fisico?: number | null
    created_at?: string
  }
  Relationships: [
    {
      foreignKeyName: "HistoricoTanque_tanque_id_fkey"
      columns: ["tanque_id"]
      isOneToOne: false
      referencedRelation: "Tanque"
      referencedColumns: ["id"]
    }
  ]
}

export interface EstoqueTable {
  Row: {
    capacidade_tanque: number
    combustivel_id: number
    custo_medio: number
    id: number
    quantidade_atual: number
    ultima_atualizacao: string
    posto_id: number
  }
  Insert: {
    capacidade_tanque: number
    combustivel_id: number
    custo_medio: number
    id?: number
    quantidade_atual: number
    ultima_atualizacao?: string
    posto_id: number
  }
  Update: {
    capacidade_tanque?: number
    combustivel_id?: number
    custo_medio?: number
    id?: number
    quantidade_atual?: number
    ultima_atualizacao?: string
    posto_id?: number
  }
  Relationships: [
    {
      foreignKeyName: "Estoque_combustivel_id_fkey"
      columns: ["combustivel_id"]
      isOneToOne: true
      referencedRelation: "Combustivel"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "Estoque_posto_id_fkey"
      columns: ["posto_id"]
      isOneToOne: false
      referencedRelation: "Posto"
      referencedColumns: ["id"]
    },
  ]
}
