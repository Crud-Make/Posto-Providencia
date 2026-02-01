/**
 * Tabelas do Domínio: Financeiro
 * 
 * @remarks
 * Contém definições para Empréstimo, Parcela, Dívida e Despesa.
 */

import { DatabaseEnums } from '../enums'

export interface EmprestimoTable {
  Row: {
    ativo: boolean
    created_at: string
    credor: string
    data_emprestimo: string
    data_primeiro_vencimento: string
    id: number
    observacoes: string | null
    periodicidade: DatabaseEnums["periodicity_type"]
    quantidade_parcelas: number
    taxa_juros: number | null
    valor_parcela: number
    valor_total: number
    posto_id: number
  }
  Insert: {
    ativo?: boolean
    created_at?: string
    credor: string
    data_emprestimo?: string
    data_primeiro_vencimento: string
    id?: number
    observacoes?: string | null
    periodicidade?: DatabaseEnums["periodicity_type"]
    quantidade_parcelas: number
    taxa_juros?: number | null
    valor_parcela: number
    valor_total: number
    posto_id: number
  }
  Update: {
    ativo?: boolean
    created_at?: string
    credor?: string
    data_emprestimo?: string
    data_primeiro_vencimento?: string
    id?: number
    observacoes?: string | null
    periodicidade?: DatabaseEnums["periodicity_type"]
    quantidade_parcelas?: number
    taxa_juros?: number | null
    valor_parcela?: number
    valor_total?: number
    posto_id?: number
  }
  Relationships: [
    {
      foreignKeyName: "Emprestimo_posto_id_fkey"
      columns: ["posto_id"]
      isOneToOne: false
      referencedRelation: "Posto"
      referencedColumns: ["id"]
    }
  ]
}

export interface ParcelaTable {
  Row: {
    created_at: string
    data_pagamento: string | null
    data_vencimento: string
    emprestimo_id: number
    id: number
    juros_multa: number | null
    numero_parcela: number
    status: DatabaseEnums["installment_status"]
    valor: number
  }
  Insert: {
    created_at?: string
    data_pagamento?: string | null
    data_vencimento: string
    emprestimo_id: number
    id?: number
    juros_multa?: number | null
    numero_parcela: number
    status?: DatabaseEnums["installment_status"]
    valor: number
  }
  Update: {
    created_at?: string
    data_pagamento?: string | null
    data_vencimento?: string
    emprestimo_id?: number
    id?: number
    juros_multa?: number | null
    numero_parcela?: number
    status?: DatabaseEnums["installment_status"]
    valor?: number
  }
  Relationships: [
    {
      foreignKeyName: "Parcela_emprestimo_id_fkey"
      columns: ["emprestimo_id"]
      isOneToOne: false
      referencedRelation: "Emprestimo"
      referencedColumns: ["id"]
    },
  ]
}

export interface DividaTable {
  Row: {
    id: number
    descricao: string
    valor: number
    data_vencimento: string
    status: 'pendente' | 'pago'
    created_at: string
    posto_id: number
  }
  Insert: {
    id?: number
    descricao: string
    valor: number
    data_vencimento: string
    status?: 'pendente' | 'pago'
    created_at?: string
    posto_id: number
  }
  Update: {
    id?: number
    descricao?: string
    valor?: number
    data_vencimento?: string
    status?: 'pendente' | 'pago'
    created_at?: string
    posto_id?: number
  }
  Relationships: [
    {
      foreignKeyName: "Divida_posto_id_fkey"
      columns: ["posto_id"]
      isOneToOne: false
      referencedRelation: "Posto"
      referencedColumns: ["id"]
    }
  ]
}

export interface CategoriaFinanceiraTable {
  Row: {
    id: number
    nome: string
    tipo: 'receita' | 'despesa' | 'ambos'
    icone: string | null
    cor: string | null
    posto_id: number | null
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: number
    nome: string
    tipo: 'receita' | 'despesa' | 'ambos'
    icone?: string | null
    cor?: string | null
    posto_id?: number | null
    created_at?: string
    updated_at?: string
  }
  Update: {
    id?: number
    nome?: string
    tipo?: 'receita' | 'despesa' | 'ambos'
    icone?: string | null
    cor?: string | null
    posto_id?: number | null
    created_at?: string
    updated_at?: string
  }
  Relationships: [
    {
      foreignKeyName: "CategoriaFinanceira_posto_id_fkey"
      columns: ["posto_id"]
      isOneToOne: false
      referencedRelation: "Posto"
      referencedColumns: ["id"]
    }
  ]
}

export interface ReceitaTable {
  Row: {
    id: number
    descricao: string
    valor: number
    data: string
    categoria_id: number | null
    posto_id: number | null
    status: string | null
    observacoes: string | null
    usuario_id: number | null
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: number
    descricao: string
    valor: number
    data?: string
    categoria_id?: number | null
    posto_id?: number | null
    status?: string | null
    observacoes?: string | null
    usuario_id?: number | null
    created_at?: string
    updated_at?: string
  }
  Update: {
    id?: number
    descricao?: string
    valor?: number
    data?: string
    categoria_id?: number | null
    posto_id?: number | null
    status?: string | null
    observacoes?: string | null
    usuario_id?: number | null
    created_at?: string
    updated_at?: string
  }
  Relationships: [
    {
      foreignKeyName: "Receita_categoria_id_fkey"
      columns: ["categoria_id"]
      isOneToOne: false
      referencedRelation: "CategoriaFinanceira"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "Receita_posto_id_fkey"
      columns: ["posto_id"]
      isOneToOne: false
      referencedRelation: "Posto"
      referencedColumns: ["id"]
    }
  ]
}

export interface DespesaTable {
  Row: {
    id: number
    descricao: string
    categoria: string | null
    valor: number
    data: string
    status: 'pendente' | 'pago'
    created_at: string
    posto_id: number
    data_pagamento: string | null
    observacoes: string | null
    categoria_id: number | null
  }
  Insert: {
    id?: number
    descricao: string
    categoria?: string | null
    valor: number
    data: string
    status?: 'pendente' | 'pago'
    created_at?: string
    posto_id: number
    data_pagamento?: string | null
    observacoes?: string | null
    categoria_id?: number | null
  }
  Update: {
    id?: number
    descricao?: string
    categoria?: string | null
    valor?: number
    data?: string
    status?: 'pendente' | 'pago'
    created_at?: string
    posto_id?: number
    data_pagamento?: string | null
    observacoes?: string | null
    categoria_id?: number | null
  }
  Relationships: [
    {
      foreignKeyName: "Despesa_posto_id_fkey"
      columns: ["posto_id"]
      isOneToOne: false
      referencedRelation: "Posto"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "Despesa_categoria_id_fkey"
      columns: ["categoria_id"]
      isOneToOne: false
      referencedRelation: "CategoriaFinanceira"
      referencedColumns: ["id"]
    }
  ]
}
