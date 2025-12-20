export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    public: {
        Tables: {
            Bico: {
                Row: {
                    ativo: boolean
                    bomba_id: number
                    combustivel_id: number
                    id: number
                    numero: number
                }
                Insert: {
                    ativo?: boolean
                    bomba_id: number
                    combustivel_id: number
                    id?: number
                    numero: number
                }
                Update: {
                    ativo?: boolean
                    bomba_id?: number
                    combustivel_id?: number
                    id?: number
                    numero?: number
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
                ]
            }
            Bomba: {
                Row: {
                    ativo: boolean
                    id: number
                    localizacao: string | null
                    nome: string
                }
                Insert: {
                    ativo?: boolean
                    id?: number
                    localizacao?: string | null
                    nome: string
                }
                Update: {
                    ativo?: boolean
                    id?: number
                    localizacao?: string | null
                    nome?: string
                }
                Relationships: []
            }
            Combustivel: {
                Row: {
                    ativo: boolean
                    codigo: string
                    cor: string | null
                    id: number
                    nome: string
                    preco_venda: number
                }
                Insert: {
                    ativo?: boolean
                    codigo: string
                    cor?: string | null
                    id?: number
                    nome: string
                    preco_venda: number
                }
                Update: {
                    ativo?: boolean
                    codigo?: string
                    cor?: string | null
                    id?: number
                    nome?: string
                    preco_venda?: number
                }
                Relationships: []
            }
            Compra: {
                Row: {
                    combustivel_id: number
                    created_at: string
                    custo_por_litro: number
                    data: string
                    fornecedor_id: number
                    id: number
                    numero_nf: string | null
                    observacoes: string | null
                    quantidade_litros: number
                    valor_total: number
                }
                Insert: {
                    combustivel_id: number
                    created_at?: string
                    custo_por_litro: number
                    data: string
                    fornecedor_id: number
                    id?: number
                    numero_nf?: string | null
                    observacoes?: string | null
                    quantidade_litros: number
                    valor_total: number
                }
                Update: {
                    combustivel_id?: number
                    created_at?: string
                    custo_por_litro?: number
                    data?: string
                    fornecedor_id?: number
                    id?: number
                    numero_nf?: string | null
                    observacoes?: string | null
                    quantidade_litros?: number
                    valor_total?: number
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
                ]
            }
            Estoque: {
                Row: {
                    capacidade_tanque: number
                    combustivel_id: number
                    custo_medio: number
                    id: number
                    quantidade_atual: number
                    ultima_atualizacao: string
                }
                Insert: {
                    capacidade_tanque: number
                    combustivel_id: number
                    custo_medio: number
                    id?: number
                    quantidade_atual?: number
                    ultima_atualizacao?: string
                }
                Update: {
                    capacidade_tanque?: number
                    combustivel_id?: number
                    custo_medio?: number
                    id?: number
                    quantidade_atual?: number
                    ultima_atualizacao?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "Estoque_combustivel_id_fkey"
                        columns: ["combustivel_id"]
                        isOneToOne: true
                        referencedRelation: "Combustivel"
                        referencedColumns: ["id"]
                    },
                ]
            }
            Fechamento: {
                Row: {
                    created_at: string
                    data: string
                    diferenca: number | null
                    id: number
                    observacoes: string | null
                    status: Database["public"]["Enums"]["StatusFechamento"]
                    total_recebido: number | null
                    total_vendas: number | null
                    updated_at: string
                    usuario_id: number
                    turno_id: number | null
                }
                Insert: {
                    created_at?: string
                    data: string
                    diferenca?: number | null
                    id?: number
                    observacoes?: string | null
                    status?: Database["public"]["Enums"]["StatusFechamento"]
                    total_recebido?: number | null
                    total_vendas?: number | null
                    updated_at?: string
                    usuario_id: number
                    turno_id?: number | null
                }
                Update: {
                    created_at?: string
                    data?: string
                    diferenca?: number | null
                    id?: number
                    observacoes?: string | null
                    status?: Database["public"]["Enums"]["StatusFechamento"]
                    total_recebido?: number | null
                    total_vendas?: number | null
                    updated_at?: string
                    usuario_id?: number
                    turno_id?: number | null
                }
                Relationships: [
                    {
                        foreignKeyName: "Fechamento_usuario_id_fkey"
                        columns: ["usuario_id"]
                        isOneToOne: false
                        referencedRelation: "Usuario"
                        referencedColumns: ["id"]
                    },
                ]
            }
            FechamentoFrentista: {
                Row: {
                    diferenca: number | null
                    fechamento_id: number
                    frentista_id: number
                    id: number
                    observacoes: string | null
                    total: number | null
                    valor_cartao: number
                    valor_conferido: number
                    valor_dinheiro: number
                    valor_nota: number
                    valor_pix: number
                }
                Insert: {
                    diferenca?: number | null
                    fechamento_id: number
                    frentista_id: number
                    id?: number
                    observacoes?: string | null
                    total?: number | null
                    valor_cartao?: number
                    valor_conferido?: number
                    valor_dinheiro?: number
                    valor_nota?: number
                    valor_pix?: number
                }
                Update: {
                    diferenca?: number | null
                    fechamento_id?: number
                    frentista_id?: number
                    id?: number
                    observacoes?: string | null
                    total?: number | null
                    valor_cartao?: number
                    valor_conferido?: number
                    valor_dinheiro?: number
                    valor_nota?: number
                    valor_pix?: number
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
                ]
            }
            FormaPagamento: {
                Row: {
                    ativo: boolean
                    id: number
                    nome: string
                    taxa: number | null
                    tipo: string
                }
                Insert: {
                    ativo?: boolean
                    id?: number
                    nome: string
                    taxa?: number | null
                    tipo: string
                }
                Update: {
                    ativo?: boolean
                    id?: number
                    nome?: string
                    taxa?: number | null
                    tipo?: string
                }
                Relationships: []
            }
            Fornecedor: {
                Row: {
                    ativo: boolean
                    cnpj: string
                    contato: string | null
                    id: number
                    nome: string
                }
                Insert: {
                    ativo?: boolean
                    cnpj: string
                    contato?: string | null
                    id?: number
                    nome: string
                }
                Update: {
                    ativo?: boolean
                    cnpj?: string
                    contato?: string | null
                    id?: number
                    nome?: string
                }
                Relationships: []
            }
            Frentista: {
                Row: {
                    ativo: boolean
                    cpf: string
                    data_admissao: string
                    id: number
                    nome: string
                    telefone: string | null
                }
                Insert: {
                    ativo?: boolean
                    cpf: string
                    data_admissao: string
                    id?: number
                    nome: string
                    telefone?: string | null
                }
                Update: {
                    ativo?: boolean
                    cpf?: string
                    data_admissao?: string
                    id?: number
                    nome?: string
                    telefone?: string | null
                }
                Relationships: []
            }
            Leitura: {
                Row: {
                    bico_id: number
                    created_at: string
                    data: string
                    id: number
                    leitura_final: number
                    leitura_inicial: number
                    litros_vendidos: number | null
                    preco_litro: number
                    usuario_id: number
                    valor_venda: number | null
                }
                Insert: {
                    bico_id: number
                    created_at?: string
                    data: string
                    id?: number
                    leitura_final: number
                    leitura_inicial: number
                    litros_vendidos?: number | null
                    preco_litro: number
                    usuario_id: number
                    valor_venda?: number | null
                }
                Update: {
                    bico_id?: number
                    created_at?: string
                    data?: string
                    id?: number
                    leitura_final?: number
                    leitura_inicial?: number
                    litros_vendidos?: number | null
                    preco_litro?: number
                    usuario_id?: number
                    valor_venda?: number | null
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
                        foreignKeyName: "Leitura_usuario_id_fkey"
                        columns: ["usuario_id"]
                        isOneToOne: false
                        referencedRelation: "Usuario"
                        referencedColumns: ["id"]
                    },
                ]
            }
            Maquininha: {
                Row: {
                    ativo: boolean
                    id: number
                    nome: string
                    operadora: string | null
                    taxa: number | null
                }
                Insert: {
                    ativo?: boolean
                    id?: number
                    nome: string
                    operadora?: string | null
                    taxa?: number | null
                }
                Update: {
                    ativo?: boolean
                    id?: number
                    nome?: string
                    operadora?: string | null
                    taxa?: number | null
                }
                Relationships: []
            }
            Recebimento: {
                Row: {
                    fechamento_id: number
                    forma_pagamento_id: number
                    id: number
                    maquininha_id: number | null
                    observacoes: string | null
                    valor: number
                }
                Insert: {
                    fechamento_id: number
                    forma_pagamento_id: number
                    id?: number
                    maquininha_id?: number | null
                    observacoes?: string | null
                    valor: number
                }
                Update: {
                    fechamento_id?: number
                    forma_pagamento_id?: number
                    id?: number
                    maquininha_id?: number | null
                    observacoes?: string | null
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
            Turno: {
                Row: {
                    ativo: boolean
                    horario_fim: string
                    horario_inicio: string
                    id: number
                    nome: string
                }
                Insert: {
                    ativo?: boolean
                    horario_fim: string
                    horario_inicio: string
                    id?: number
                    nome: string
                }
                Update: {
                    ativo?: boolean
                    horario_fim?: string
                    horario_inicio?: string
                    id?: number
                    nome?: string
                }
                Relationships: []
            }
            Emprestimo: {
                Row: {
                    ativo: boolean
                    created_at: string
                    credor: string
                    data_emprestimo: string
                    data_primeiro_vencimento: string
                    id: number
                    observacoes: string | null
                    periodicidade: Database["public"]["Enums"]["periodicity_type"]
                    quantidade_parcelas: number
                    taxa_juros: number | null
                    valor_parcela: number
                    valor_total: number
                }
                Insert: {
                    ativo?: boolean
                    created_at?: string
                    credor: string
                    data_emprestimo?: string
                    data_primeiro_vencimento: string
                    id?: number
                    observacoes?: string | null
                    periodicidade?: Database["public"]["Enums"]["periodicity_type"]
                    quantidade_parcelas: number
                    taxa_juros?: number | null
                    valor_parcela: number
                    valor_total: number
                }
                Update: {
                    ativo?: boolean
                    created_at?: string
                    credor?: string
                    data_emprestimo?: string
                    data_primeiro_vencimento?: string
                    id?: number
                    observacoes?: string | null
                    periodicidade?: Database["public"]["Enums"]["periodicity_type"]
                    quantidade_parcelas?: number
                    taxa_juros?: number | null
                    valor_parcela?: number
                    valor_total?: number
                }
                Relationships: []
            }
            Parcela: {
                Row: {
                    created_at: string
                    data_pagamento: string | null
                    data_vencimento: string
                    emprestimo_id: number
                    id: number
                    juros_multa: number | null
                    numero_parcela: number
                    status: Database["public"]["Enums"]["installment_status"]
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
                    status?: Database["public"]["Enums"]["installment_status"]
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
                    status?: Database["public"]["Enums"]["installment_status"]
                    valor?: number
                }
                Relationships: [
                    {
                        foreignKeyName: "Parcela_emprestimo_id_fkey"
                        columns: ["emprestimo_id"]
                        isOneToOne: false
                        referencedRelation: "Emprestimo"
                        referencedColumns: ["id"]
                    }
                ]
            }
            Usuario: {
                Row: {
                    ativo: boolean
                    createdAt: string
                    email: string
                    id: number
                    nome: string
                    role: Database["public"]["Enums"]["Role"]
                    senha: string
                    updatedAt: string
                }
                Insert: {
                    ativo?: boolean
                    createdAt?: string
                    email: string
                    id?: number
                    nome: string
                    role?: Database["public"]["Enums"]["Role"]
                    senha: string
                    updatedAt?: string
                }
                Update: {
                    ativo?: boolean
                    createdAt?: string
                    email?: string
                    id?: number
                    nome?: string
                    role?: Database["public"]["Enums"]["Role"]
                    senha?: string
                    updatedAt?: string
                }
                Relationships: []
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            Role: "ADMIN" | "GERENTE" | "OPERADOR" | "FRENTISTA"
            StatusFechamento: "RASCUNHO" | "FECHADO"
            periodicity_type: "mensal" | "quinzenal" | "semanal" | "diario"
            installment_status: "pendente" | "pago" | "atrasado"
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}

// Helper types for easier usage
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]

// Convenient aliases
export type Bico = Tables<'Bico'>
export type Bomba = Tables<'Bomba'>
export type Combustivel = Tables<'Combustivel'>
export type Compra = Tables<'Compra'>
export type Estoque = Tables<'Estoque'>
export type Fechamento = Tables<'Fechamento'>
export type FechamentoFrentista = Tables<'FechamentoFrentista'>
export type Emprestimo = Tables<'Emprestimo'>
export type Parcela = Tables<'Parcela'>
export type FormaPagamento = Tables<'FormaPagamento'>
export type Fornecedor = Tables<'Fornecedor'>
export type Frentista = Tables<'Frentista'>
export type Leitura = Tables<'Leitura'>
export type Maquininha = Tables<'Maquininha'>
export type Recebimento = Tables<'Recebimento'>
export type Turno = Tables<'Turno'>
export type Usuario = Tables<'Usuario'>

export type Role = Enums<'Role'>
export type StatusFechamento = Enums<'StatusFechamento'>
