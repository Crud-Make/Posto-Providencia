import { Json } from '../base';

/**
 * Tabelas do Domínio: Clientes
 */
export interface ClienteTable {
  Row: {
    id: number
    nome: string
    documento: string | null
    telefone: string | null
    email: string | null
    endereco: string | null
    limite_credito: number
    saldo_devedor: number
    posto_id: number
    ativo: boolean
    bloqueado?: boolean
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: number
    nome: string
    documento?: string | null
    telefone?: string | null
    email?: string | null
    endereco?: string | null
    limite_credito?: number
    saldo_devedor?: number
    posto_id: number
    ativo?: boolean
    bloqueado?: boolean
    created_at?: string
    updated_at?: string
  }
  Update: {
    id?: number
    nome?: string
    documento?: string | null
    telefone?: string | null
    email?: string | null
    endereco?: string | null
    limite_credito?: number
    saldo_devedor?: number
    posto_id?: number
    ativo?: boolean
    bloqueado?: boolean
    created_at?: string
    updated_at?: string
  }
  Relationships: [
    {
      foreignKeyName: "Cliente_posto_id_fkey"
      columns: ["posto_id"]
      isOneToOne: false
      referencedRelation: "Posto"
      referencedColumns: ["id"]
    }
  ]
}

export interface NotaFrentistaTable {
  Row: {
    id: number
    cliente_id: number
    frentista_id: number
    fechamento_frentista_id: number | null
    valor: number
    descricao: string | null
    data: string
    data_pagamento: string | null
    status: 'pendente' | 'pago' | 'cancelado'
    forma_pagamento: string | null
    observacoes: string | null
    posto_id: number
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: number
    cliente_id: number
    frentista_id: number
    fechamento_frentista_id?: number | null
    valor: number
    descricao?: string | null
    data?: string
    data_pagamento?: string | null
    status?: 'pendente' | 'pago' | 'cancelado'
    forma_pagamento?: string | null
    observacoes?: string | null
    posto_id: number
    created_at?: string
    updated_at?: string
  }
  Update: {
    id?: number
    cliente_id?: number
    frentista_id?: number
    fechamento_frentista_id?: number | null
    valor?: number
    descricao?: string | null
    data?: string
    data_pagamento?: string | null
    status?: 'pendente' | 'pago' | 'cancelado'
    forma_pagamento?: string | null
    observacoes?: string | null
    posto_id?: number
    created_at?: string
    updated_at?: string
  }
  Relationships: [
    {
      foreignKeyName: "NotaFrentista_cliente_id_fkey"
      columns: ["cliente_id"]
      isOneToOne: false
      referencedRelation: "Cliente"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "NotaFrentista_frentista_id_fkey"
      columns: ["frentista_id"]
      isOneToOne: false
      referencedRelation: "Frentista"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "NotaFrentista_fechamento_frentista_id_fkey"
      columns: ["fechamento_frentista_id"]
      isOneToOne: false
      referencedRelation: "FechamentoFrentista"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "NotaFrentista_posto_id_fkey"
      columns: ["posto_id"]
      isOneToOne: false
      referencedRelation: "Posto"
      referencedColumns: ["id"]
    }
  ]
}
