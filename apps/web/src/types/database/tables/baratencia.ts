import { Json } from '../base';

/**
 * Tabelas do Domínio: Baratência (Fidelidade)
 */

export interface ClienteBaratenciaTable {
  Row: {
    id: number
    user_id: string | null
    nome: string
    cpf: string
    telefone: string | null
    data_nascimento: string | null
    ativo: boolean
    created_at: string
    updated_at: string
    posto_id: number | null
  }
  Insert: {
    id?: number
    user_id?: string | null
    nome: string
    cpf: string
    telefone?: string | null
    data_nascimento?: string | null
    ativo?: boolean
    created_at?: string
    updated_at?: string
    posto_id?: number | null
  }
  Update: {
    id?: number
    user_id?: string | null
    nome?: string
    cpf?: string
    telefone?: string | null
    data_nascimento?: string | null
    ativo?: boolean
    created_at?: string
    updated_at?: string
    posto_id?: number | null
  }
  Relationships: [
    {
      foreignKeyName: "ClienteBaratencia_posto_id_fkey"
      columns: ["posto_id"]
      referencedRelation: "Posto"
      referencedColumns: ["id"]
    }
  ]
}

export interface CarteiraBaratenciaTable {
  Row: {
    id: number
    cliente_id: number
    saldo_brl: number
    saldo_litros_gc: number
    saldo_litros_ga: number
    saldo_litros_et: number
    saldo_litros_s10: number
    saldo_litros_diesel: number
    ultima_atualizacao: string
  }
  Insert: {
    id?: number
    cliente_id: number
    saldo_brl?: number
    saldo_litros_gc?: number
    saldo_litros_ga?: number
    saldo_litros_et?: number
    saldo_litros_s10?: number
    saldo_litros_diesel?: number
    ultima_atualizacao?: string
  }
  Update: {
    id?: number
    cliente_id?: number
    saldo_brl?: number
    saldo_litros_gc?: number
    saldo_litros_ga?: number
    saldo_litros_et?: number
    saldo_litros_s10?: number
    saldo_litros_diesel?: number
    ultima_atualizacao?: string
  }
  Relationships: [
    {
      foreignKeyName: "CarteiraBaratencia_cliente_id_fkey"
      columns: ["cliente_id"]
      referencedRelation: "ClienteBaratencia"
      referencedColumns: ["id"]
    }
  ]
}

export interface TransacaoBaratenciaTable {
  Row: {
    id: number
    carteira_id: number
    tipo: 'DEPOSITO' | 'CONVERSAO' | 'RESGATE' | 'ESTORNO'
    valor_brl: number | null
    quantidade_litros: number | null
    combustivel_codigo: string | null
    preco_na_hora: number | null
    status: 'PENDENTE' | 'COMPLETO' | 'CANCELADO'
    metadata: Json | null
    created_at: string
    posto_id: number | null
  }
  Insert: {
    id?: number
    carteira_id: number
    tipo: 'DEPOSITO' | 'CONVERSAO' | 'RESGATE' | 'ESTORNO'
    valor_brl?: number | null
    quantidade_litros?: number | null
    combustivel_codigo?: string | null
    preco_na_hora?: number | null
    status?: 'PENDENTE' | 'COMPLETO' | 'CANCELADO'
    metadata?: Json | null
    created_at?: string
    posto_id?: number | null
  }
  Update: {
    id?: number
    carteira_id?: number
    tipo?: 'DEPOSITO' | 'CONVERSAO' | 'RESGATE' | 'ESTORNO'
    valor_brl?: number | null
    quantidade_litros?: number | null
    combustivel_codigo?: string | null
    preco_na_hora?: number | null
    status?: 'PENDENTE' | 'COMPLETO' | 'CANCELADO'
    metadata?: Json | null
    created_at?: string
    posto_id?: number | null
  }
  Relationships: [
    {
      foreignKeyName: "TransacaoBaratencia_carteira_id_fkey"
      columns: ["carteira_id"]
      referencedRelation: "CarteiraBaratencia"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "TransacaoBaratencia_posto_id_fkey"
      columns: ["posto_id"]
      referencedRelation: "Posto"
      referencedColumns: ["id"]
    }
  ]
}

export interface TokenAbastecimentoTable {
  Row: {
    id: number
    cliente_id: number
    posto_id: number | null
    combustivel_id: number
    quantidade_litros: number
    token_pin: string
    data_expiracao: string
    status: 'PENDENTE' | 'USADO' | 'EXPIRADO' | 'CANCELADO'
    frentista_id_resgatou: number | null
    data_resgate: string | null
    created_at: string
  }
  Insert: {
    id?: number
    cliente_id: number
    posto_id?: number | null
    combustivel_id: number
    quantidade_litros: number
    token_pin: string
    data_expiracao: string
    status?: 'PENDENTE' | 'USADO' | 'EXPIRADO' | 'CANCELADO'
    frentista_id_resgatou?: number | null
    data_resgate?: string | null
    created_at?: string
  }
  Update: {
    id?: number
    cliente_id?: number
    posto_id?: number | null
    combustivel_id?: number
    quantidade_litros?: number
    token_pin?: string
    data_expiracao?: string
    status?: 'PENDENTE' | 'USADO' | 'EXPIRADO' | 'CANCELADO'
    frentista_id_resgatou?: number | null
    data_resgate?: string | null
    created_at?: string
  }
  Relationships: [
    {
      foreignKeyName: "TokenAbastecimento_cliente_id_fkey"
      columns: ["cliente_id"]
      referencedRelation: "ClienteBaratencia"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "TokenAbastecimento_combustivel_id_fkey"
      columns: ["combustivel_id"]
      referencedRelation: "Combustivel"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "TokenAbastecimento_posto_id_fkey"
      columns: ["posto_id"]
      referencedRelation: "Posto"
      referencedColumns: ["id"]
    }
  ]
}

export interface PromocaoBaratenciaTable {
  Row: {
    id: string
    titulo: string
    descricao: string | null
    tipo: 'BONUS_DEPOSITO' | 'BONUS_CONVERSAO' | 'PRECO_TRAVADO'
    valor_minimo: number
    bonus_porcentagem: number
    combustivel_codigo: string | null
    data_inicio: string
    data_fim: string | null
    ativo: boolean
    posto_id: number | null
    created_at: string
  }
  Insert: {
    id?: string
    titulo: string
    descricao?: string | null
    tipo: 'BONUS_DEPOSITO' | 'BONUS_CONVERSAO' | 'PRECO_TRAVADO'
    valor_minimo?: number
    bonus_porcentagem?: number
    combustivel_codigo?: string | null
    data_inicio?: string
    data_fim?: string | null
    ativo?: boolean
    posto_id?: number | null
    created_at?: string
  }
  Update: {
    id?: string
    titulo?: string
    descricao?: string | null
    tipo?: 'BONUS_DEPOSITO' | 'BONUS_CONVERSAO' | 'PRECO_TRAVADO'
    valor_minimo?: number
    bonus_porcentagem?: number
    combustivel_codigo?: string | null
    data_inicio?: string
    data_fim?: string | null
    ativo?: boolean
    posto_id?: number | null
    created_at?: string
  }
  Relationships: [
    {
      foreignKeyName: "PromocaoBaratencia_posto_id_fkey"
      columns: ["posto_id"]
      referencedRelation: "Posto"
      referencedColumns: ["id"]
    }
  ]
}
