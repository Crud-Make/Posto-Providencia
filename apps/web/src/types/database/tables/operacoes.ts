/**
 * Tabelas do Domínio: Operações Diárias
 * 
 * @remarks
 * Contém definições para Frentista, Leitura, Fechamento, Recebimento e Escala.
 */

import { DatabaseEnums } from '../enums'

export interface FrentistaTable {
  Row: {
    ativo: boolean
    cpf: string
    data_admissao: string
    id: number
    nome: string
    telefone: string | null
    user_id: string | null
    posto_id: number
  }
  Insert: {
    ativo?: boolean
    cpf: string
    data_admissao: string
    id?: number
    nome: string
    telefone?: string | null
    user_id?: string | null
    posto_id: number
  }
  Update: {
    ativo?: boolean
    cpf?: string
    data_admissao?: string
    id?: number
    nome?: string
    telefone?: string | null
    user_id?: string | null
    posto_id?: number
  }
  Relationships: [
    {
      foreignKeyName: "Frentista_posto_id_fkey"
      columns: ["posto_id"]
      isOneToOne: false
      referencedRelation: "Posto"
      referencedColumns: ["id"]
    }
  ]
}

export interface LeituraTable {
  Row: {
    bico_id: number
    combustivel_id: number
    createdAt: string
    data: string
    id: number
    leitura_final: number
    leitura_inicial: number
    litros_vendidos: number
    preco_litro: number
    turno_id: number | null
    usuario_id: number
    valor_total: number
    posto_id: number
  }
  Insert: {
    bico_id: number
    combustivel_id: number
    createdAt?: string
    data: string
    id?: number
    leitura_final: number
    leitura_inicial: number
    litros_vendidos: number
    preco_litro: number
    turno_id?: number | null
    usuario_id: number
    valor_total: number
    posto_id: number
  }
  Update: {
    bico_id?: number
    combustivel_id?: number
    createdAt?: string
    data?: string
    id?: number
    leitura_final?: number
    leitura_inicial?: number
    litros_vendidos?: number
    preco_litro?: number
    turno_id?: number | null
    usuario_id?: number
    valor_total?: number
    posto_id?: number
  }
  Relationships: [
    {
      foreignKeyName: "Leitura_bico_id_fkey"
      columns: ["bico_id"]
      isOneToOne: false
      referencedRelation: "Bico"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "Leitura_combustivel_id_fkey"
      columns: ["combustivel_id"]
      isOneToOne: false
      referencedRelation: "Combustivel"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "Leitura_turno_id_fkey"
      columns: ["turno_id"]
      isOneToOne: false
      referencedRelation: "Turno"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "Leitura_usuario_id_fkey"
      columns: ["usuario_id"]
      isOneToOne: false
      referencedRelation: "Usuario"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "Leitura_posto_id_fkey"
      columns: ["posto_id"]
      isOneToOne: false
      referencedRelation: "Posto"
      referencedColumns: ["id"]
    },
  ]
}

export interface FechamentoTable {
  Row: {
    createdAt: string
    data: string
    diferenca: number
    id: number
    observacoes: string | null
    status: DatabaseEnums["StatusFechamento"]
    total_recebido: number
    total_vendas: number
    turno_id: number | null
    updatedAt: string
    usuario_id: number
    posto_id: number
    lucro_bruto: number
    custo_combustiveis: number
    taxas_pagamento: number
    lucro_liquido: number
    margem_bruta_percentual: number
    margem_liquida_percentual: number
  }
  Insert: {
    createdAt?: string
    data: string
    diferenca: number
    id?: number
    observacoes?: string | null
    status?: DatabaseEnums["StatusFechamento"]
    total_recebido: number
    total_vendas: number
    turno_id?: number | null
    updatedAt?: string
    usuario_id: number
    posto_id: number
    lucro_bruto?: number
    custo_combustiveis?: number
    taxas_pagamento?: number
    lucro_liquido?: number
    margem_bruta_percentual?: number
    margem_liquida_percentual?: number
  }
  Update: {
    createdAt?: string
    data?: string
    diferenca?: number
    id?: number
    observacoes?: string | null
    status?: DatabaseEnums["StatusFechamento"]
    total_recebido?: number
    total_vendas?: number
    turno_id?: number | null
    updatedAt?: string
    usuario_id?: number
    posto_id?: number
    lucro_bruto?: number
    custo_combustiveis?: number
    taxas_pagamento?: number
    lucro_liquido?: number
    margem_bruta_percentual?: number
    margem_liquida_percentual?: number
  }
  Relationships: [
    {
      foreignKeyName: "Fechamento_turno_id_fkey"
      columns: ["turno_id"]
      isOneToOne: false
      referencedRelation: "Turno"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "Fechamento_usuario_id_fkey"
      columns: ["usuario_id"]
      isOneToOne: false
      referencedRelation: "Usuario"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "Fechamento_posto_id_fkey"
      columns: ["posto_id"]
      isOneToOne: false
      referencedRelation: "Posto"
      referencedColumns: ["id"]
    },
  ]
}

export interface FechamentoFrentistaTable {
  Row: {
    fechamento_id: number
    frentista_id: number
    id: number
    observacoes: string | null
    valor_cartao: number
    valor_cartao_debito: number
    valor_cartao_credito: number
    valor_conferido: number
    valor_dinheiro: number
    valor_moedas: number
    valor_nota: number
    valor_pix: number
    encerrante: number
    baratao: number
    diferenca_calculada: number
    posto_id: number
  }
  Insert: {
    fechamento_id: number
    frentista_id: number
    id?: number
    observacoes?: string | null
    valor_cartao?: number
    valor_cartao_debito?: number
    valor_cartao_credito?: number
    valor_conferido?: number
    valor_dinheiro?: number
    valor_moedas?: number
    valor_nota?: number
    valor_pix?: number
    encerrante?: number
    baratao?: number
    diferenca_calculada?: number
    posto_id: number
  }
  Update: {
    fechamento_id?: number
    frentista_id?: number
    id?: number
    observacoes?: string | null
    valor_cartao?: number
    valor_cartao_debito?: number
    valor_cartao_credito?: number
    valor_conferido?: number
    valor_dinheiro?: number
    valor_moedas?: number
    valor_nota?: number
    valor_pix?: number
    encerrante?: number
    baratao?: number
    diferenca_calculada?: number
    posto_id?: number
  }
  Relationships: [
    {
      foreignKeyName: "FechamentoFrentista_fechamento_id_fkey"
      columns: ["fechamento_id"]
      isOneToOne: false
      referencedRelation: "Fechamento"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "FechamentoFrentista_frentista_id_fkey"
      columns: ["frentista_id"]
      isOneToOne: false
      referencedRelation: "Frentista"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "FechamentoFrentista_posto_id_fkey"
      columns: ["posto_id"]
      isOneToOne: false
      referencedRelation: "Posto"
      referencedColumns: ["id"]
    },
  ]
}

export interface RecebimentoTable {
  Row: {
    fechamento_id: number
    forma_pagamento_id: number
    id: number
    maquininha_id: number | null
    valor: number
  }
  Insert: {
    fechamento_id: number
    forma_pagamento_id: number
    id?: number
    maquininha_id?: number | null
    valor: number
  }
  Update: {
    fechamento_id?: number
    forma_pagamento_id?: number
    id?: number
    maquininha_id?: number | null
    valor?: number
  }
  Relationships: [
    {
      foreignKeyName: "Recebimento_fechamento_id_fkey"
      columns: ["fechamento_id"]
      isOneToOne: false
      referencedRelation: "Fechamento"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "Recebimento_forma_pagamento_id_fkey"
      columns: ["forma_pagamento_id"]
      isOneToOne: false
      referencedRelation: "FormaPagamento"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "Recebimento_maquininha_id_fkey"
      columns: ["maquininha_id"]
      isOneToOne: false
      referencedRelation: "Maquininha"
      referencedColumns: ["id"]
    },
  ]
}

export interface EscalaTable {
  Row: {
    id: number
    frentista_id: number
    data: string
    tipo: 'FOLGA' | 'TRABALHO'
    turno_id: number | null
    observacao: string | null
    posto_id: number | null
    created_at: string
  }
  Insert: {
    id?: number
    frentista_id: number
    data: string
    tipo: 'FOLGA' | 'TRABALHO'
    turno_id?: number | null
    observacao?: string | null
    posto_id?: number | null
    created_at?: string
  }
  Update: {
    id?: number
    frentista_id?: number
    data?: string
    tipo?: 'FOLGA' | 'TRABALHO'
    turno_id?: number | null
    observacao?: string | null
    posto_id?: number | null
    created_at?: string
  }
  Relationships: [
    {
      foreignKeyName: "Escala_frentista_id_fkey"
      columns: ["frentista_id"]
      referencedRelation: "Frentista"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "Escala_turno_id_fkey"
      columns: ["turno_id"]
      referencedRelation: "Turno"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "Escala_posto_id_fkey"
      columns: ["posto_id"]
      referencedRelation: "Posto"
      referencedColumns: ["id"]
    }
  ]
}
