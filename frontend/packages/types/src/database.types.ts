export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    // Allows to automatically instantiate createClient with right options
    // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
    __InternalSupabase: {
        PostgrestVersion: "13.0.5"
    }
    public: {
        Tables: {
            Bico: {
                Row: {
                    ativo: boolean
                    bomba_id: number
                    combustivel_id: number
                    id: number
                    numero: number
                    posto_id: number | null
                    tanque_id: number | null
                }
                Insert: {
                    ativo?: boolean
                    bomba_id: number
                    combustivel_id: number
                    id?: number
                    numero: number
                    posto_id?: number | null
                    tanque_id?: number | null
                }
                Update: {
                    ativo?: boolean
                    bomba_id?: number
                    combustivel_id?: number
                    id?: number
                    numero?: number
                    posto_id?: number | null
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
            Bomba: {
                Row: {
                    ativo: boolean
                    id: number
                    nome: string
                    posto_id: number | null
                }
                Insert: {
                    ativo?: boolean
                    id?: number
                    nome: string
                    posto_id?: number | null
                }
                Update: {
                    ativo?: boolean
                    id?: number
                    nome?: string
                    posto_id?: number | null
                }
                Relationships: [
                    {
                        foreignKeyName: "Bomba_posto_id_fkey"
                        columns: ["posto_id"]
                        isOneToOne: false
                        referencedRelation: "Posto"
                        referencedColumns: ["id"]
                    },
                ]
            }
            Combustivel: {
                Row: {
                    ativo: boolean
                    codigo: string | null
                    cor: string | null
                    id: number
                    nome: string
                    posto_id: number | null
                    preco_venda: number
                }
                Insert: {
                    ativo?: boolean
                    codigo?: string | null
                    cor?: string | null
                    id?: number
                    nome: string
                    posto_id?: number | null
                    preco_venda: number
                }
                Update: {
                    ativo?: boolean
                    codigo?: string | null
                    cor?: string | null
                    id?: number
                    nome?: string
                    posto_id?: number | null
                    preco_venda?: number
                }
                Relationships: [
                    {
                        foreignKeyName: "Combustivel_posto_id_fkey"
                        columns: ["posto_id"]
                        isOneToOne: false
                        referencedRelation: "Posto"
                        referencedColumns: ["id"]
                    },
                ]
            }
            Compra: {
                Row: {
                    combustivel_id: number
                    created_at: string
                    data: string
                    id: number
                    nota_fiscal: string | null
                    posto_id: number | null
                    quantidade: number
                    valor_total: number
                    valor_unitario: number
                }
                Insert: {
                    combustivel_id: number
                    created_at?: string
                    data?: string
                    id?: number
                    nota_fiscal?: string | null
                    posto_id?: number | null
                    quantidade: number
                    valor_total: number
                    valor_unitario: number
                }
                Update: {
                    combustivel_id?: number
                    created_at?: string
                    data?: string
                    id?: number
                    nota_fiscal?: string | null
                    posto_id?: number | null
                    quantidade?: number
                    valor_total?: number
                    valor_unitario?: number
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
                        foreignKeyName: "Compra_posto_id_fkey"
                        columns: ["posto_id"]
                        isOneToOne: false
                        referencedRelation: "Posto"
                        referencedColumns: ["id"]
                    },
                ]
            }
            Configuracao: {
                Row: {
                    chave: string
                    id: number
                    posto_id: number | null
                    valor: string | null
                }
                Insert: {
                    chave: string
                    id?: number
                    posto_id?: number | null
                    valor?: string | null
                }
                Update: {
                    chave?: string
                    id?: number
                    posto_id?: number | null
                    valor?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "Configuracao_posto_id_fkey"
                        columns: ["posto_id"]
                        isOneToOne: false
                        referencedRelation: "Posto"
                        referencedColumns: ["id"]
                    },
                ]
            }
            Divida: {
                Row: {
                    ativo: boolean
                    created_at: string
                    credor: string
                    data_vencimento: string
                    id: number
                    observacoes: string | null
                    posto_id: number | null
                    valor: number
                }
                Insert: {
                    ativo?: boolean
                    created_at?: string
                    credor: string
                    data_vencimento: string
                    id?: number
                    observacoes?: string | null
                    posto_id?: number | null
                    valor: number
                }
                Update: {
                    ativo?: boolean
                    created_at?: string
                    credor?: string
                    data_vencimento?: string
                    id?: number
                    observacoes?: string | null
                    posto_id?: number | null
                    valor?: number
                }
                Relationships: [
                    {
                        foreignKeyName: "Divida_posto_id_fkey"
                        columns: ["posto_id"]
                        isOneToOne: false
                        referencedRelation: "Posto"
                        referencedColumns: ["id"]
                    },
                ]
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
                    posto_id: number | null
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
                    periodicidade: Database["public"]["Enums"]["periodicity_type"]
                    posto_id?: number | null
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
                    posto_id?: number | null
                    quantidade_parcelas?: number
                    taxa_juros?: number | null
                    valor_parcela?: number
                    valor_total?: number
                }
                Relationships: [
                    {
                        foreignKeyName: "Emprestimo_posto_id_fkey"
                        columns: ["posto_id"]
                        isOneToOne: false
                        referencedRelation: "Posto"
                        referencedColumns: ["id"]
                    },
                ]
            }
            Estoque: {
                Row: {
                    combustivel_id: number
                    id: number
                    posto_id: number | null
                    quantidade_atual: number
                    quantidade_minima: number | null
                    tanque_id: number | null
                }
                Insert: {
                    combustivel_id: number
                    id?: number
                    posto_id?: number | null
                    quantidade_atual?: number
                    quantidade_minima?: number | null
                    tanque_id?: number | null
                }
                Update: {
                    combustivel_id?: number
                    id?: number
                    posto_id?: number | null
                    quantidade_atual?: number
                    quantidade_minima?: number | null
                    tanque_id?: number | null
                }
                Relationships: [
                    {
                        foreignKeyName: "Estoque_combustivel_id_fkey"
                        columns: ["combustivel_id"]
                        isOneToOne: false
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
                    {
                        foreignKeyName: "Estoque_tanque_id_fkey"
                        columns: ["tanque_id"]
                        isOneToOne: false
                        referencedRelation: "Tanque"
                        referencedColumns: ["id"]
                    },
                ]
            }
            Fechamento: {
                Row: {
                    data: string
                    diferenca: number | null
                    id: number
                    observacoes: string | null
                    posto_id: number | null
                    status: Database["public"]["Enums"]["StatusFechamento"]
                    total_recebido: number | null
                    total_vendas: number | null
                    turno_id: number | null
                    usuario_id: number
                }
                Insert: {
                    data?: string
                    diferenca?: number | null
                    id?: number
                    observacoes?: string | null
                    posto_id?: number | null
                    status?: Database["public"]["Enums"]["StatusFechamento"]
                    total_recebido?: number | null
                    total_vendas?: number | null
                    turno_id?: number | null
                    usuario_id: number
                }
                Update: {
                    data?: string
                    diferenca?: number | null
                    id?: number
                    observacoes?: string | null
                    posto_id?: number | null
                    status?: Database["public"]["Enums"]["StatusFechamento"]
                    total_recebido?: number | null
                    total_vendas?: number | null
                    turno_id?: number | null
                    usuario_id?: number
                }
                Relationships: [
                    {
                        foreignKeyName: "Fechamento_posto_id_fkey"
                        columns: ["posto_id"]
                        isOneToOne: false
                        referencedRelation: "Posto"
                        referencedColumns: ["id"]
                    },
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
                ]
            }
            FechamentoFrentista: {
                Row: {
                    baratao: number | null
                    diferenca_calculada: number | null
                    encerrante: number | null
                    fechamento_id: number
                    frentista_id: number
                    id: number
                    observacoes: string | null
                    posto_id: number | null
                    valor_cartao_credito: number
                    valor_cartao_debito: number
                    valor_dinheiro: number
                    valor_moedas: number
                    valor_nota: number
                    valor_pix: number
                }
                Insert: {
                    baratao?: number | null
                    diferenca_calculada?: number | null
                    encerrante?: number | null
                    fechamento_id: number
                    frentista_id: number
                    id?: number
                    observacoes?: string | null
                    posto_id?: number | null
                    valor_cartao_credito?: number
                    valor_cartao_debito?: number
                    valor_dinheiro?: number
                    valor_moedas?: number
                    valor_nota?: number
                    valor_pix?: number
                }
                Update: {
                    baratao?: number | null
                    diferenca_calculada?: number | null
                    encerrante?: number | null
                    fechamento_id?: number
                    frentista_id?: number
                    id?: number
                    observacoes?: string | null
                    posto_id?: number | null
                    valor_cartao_credito?: number
                    valor_cartao_debito?: number
                    valor_dinheiro?: number
                    valor_moedas?: number
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
                    {
                        foreignKeyName: "FechamentoFrentista_posto_id_fkey"
                        columns: ["posto_id"]
                        isOneToOne: false
                        referencedRelation: "Posto"
                        referencedColumns: ["id"]
                    },
                ]
            }
            FormaPagamento: {
                Row: {
                    ativo: boolean
                    id: number
                    nome: string
                    posto_id: number | null
                    taxa: number | null
                    tipo: string
                }
                Insert: {
                    ativo?: boolean
                    id?: number
                    nome: string
                    posto_id?: number | null
                    taxa?: number | null
                    tipo: string
                }
                Update: {
                    ativo?: boolean
                    id?: number
                    nome?: string
                    posto_id?: number | null
                    taxa?: number | null
                    tipo?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "FormaPagamento_posto_id_fkey"
                        columns: ["posto_id"]
                        isOneToOne: false
                        referencedRelation: "Posto"
                        referencedColumns: ["id"]
                    },
                ]
            }
            Fornecedor: {
                Row: {
                    ativo: boolean
                    id: number
                    nome: string
                    posto_id: number | null
                }
                Insert: {
                    ativo?: boolean
                    id?: number
                    nome: string
                    posto_id?: number | null
                }
                Update: {
                    ativo?: boolean
                    id?: number
                    nome?: string
                    posto_id?: number | null
                }
                Relationships: [
                    {
                        foreignKeyName: "Fornecedor_posto_id_fkey"
                        columns: ["posto_id"]
                        isOneToOne: false
                        referencedRelation: "Posto"
                        referencedColumns: ["id"]
                    },
                ]
            }
            Frentista: {
                Row: {
                    ativo: boolean
                    cpf: string | null
                    data_admissao: string | null
                    id: number
                    nome: string
                    posto_id: number | null
                    telefone: string | null
                    turno_id: number | null
                    user_id: string | null
                }
                Insert: {
                    ativo?: boolean
                    cpf?: string | null
                    data_admissao?: string | null
                    id?: number
                    nome: string
                    posto_id?: number | null
                    telefone?: string | null
                    turno_id?: number | null
                    user_id?: string | null
                }
                Update: {
                    ativo?: boolean
                    cpf?: string | null
                    data_admissao?: string | null
                    id?: number
                    nome?: string
                    posto_id?: number | null
                    telefone?: string | null
                    turno_id?: number | null
                    user_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "Frentista_posto_id_fkey"
                        columns: ["posto_id"]
                        isOneToOne: false
                        referencedRelation: "Posto"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "Frentista_turno_id_fkey"
                        columns: ["turno_id"]
                        isOneToOne: false
                        referencedRelation: "Turno"
                        referencedColumns: ["id"]
                    },
                ]
            }
            Leitura: {
                Row: {
                    bico_id: number
                    created_at: string
                    data: string
                    id: number
                    leitura: number
                    posto_id: number | null
                    usuario_id: number
                }
                Insert: {
                    bico_id: number
                    created_at?: string
                    data?: string
                    id?: number
                    leitura: number
                    posto_id?: number | null
                    usuario_id: number
                }
                Update: {
                    bico_id?: number
                    created_at?: string
                    data?: string
                    id?: number
                    leitura?: number
                    posto_id?: number | null
                    usuario_id?: number
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
                        foreignKeyName: "Leitura_posto_id_fkey"
                        columns: ["posto_id"]
                        isOneToOne: false
                        referencedRelation: "Posto"
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
                    posto_id: number | null
                }
                Insert: {
                    ativo?: boolean
                    id?: number
                    nome: string
                    posto_id?: number | null
                }
                Update: {
                    ativo?: boolean
                    id?: number
                    nome?: string
                    posto_id?: number | null
                }
                Relationships: [
                    {
                        foreignKeyName: "Maquininha_posto_id_fkey"
                        columns: ["posto_id"]
                        isOneToOne: false
                        referencedRelation: "Posto"
                        referencedColumns: ["id"]
                    },
                ]
            }
            MovimentacaoEstoque: {
                Row: {
                    created_at: string
                    id: number
                    observacao: string | null
                    posto_id: number | null
                    produto_id: number | null
                    quantidade: number
                    tanque_id: number | null
                    tipo: string
                    usuario_id: number | null
                }
                Insert: {
                    created_at?: string
                    id?: number
                    observacao?: string | null
                    posto_id?: number | null
                    produto_id?: number | null
                    quantidade: number
                    tanque_id?: number | null
                    tipo: string
                    usuario_id?: number | null
                }
                Update: {
                    created_at?: string
                    id?: number
                    observacao?: string | null
                    posto_id?: number | null
                    produto_id?: number | null
                    quantidade?: number
                    tanque_id?: number | null
                    tipo?: string
                    usuario_id?: number | null
                }
                Relationships: [
                    {
                        foreignKeyName: "MovimentacaoEstoque_posto_id_fkey"
                        columns: ["posto_id"]
                        isOneToOne: false
                        referencedRelation: "Posto"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "MovimentacaoEstoque_produto_id_fkey"
                        columns: ["produto_id"]
                        isOneToOne: false
                        referencedRelation: "Produto"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "MovimentacaoEstoque_tanque_id_fkey"
                        columns: ["tanque_id"]
                        isOneToOne: false
                        referencedRelation: "Tanque"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "MovimentacaoEstoque_usuario_id_fkey"
                        columns: ["usuario_id"]
                        isOneToOne: false
                        referencedRelation: "Usuario"
                        referencedColumns: ["id"]
                    },
                ]
            }
            NotaFrentista: {
                Row: {
                    cliente_id: number
                    created_at: string
                    data: string
                    data_pagamento: string | null
                    descricao: string | null
                    fechamento_frentista_id: number | null
                    frentista_id: number
                    id: number
                    posto_id: number | null
                    status: string
                    updated_at: string
                    valor: number
                }
                Insert: {
                    cliente_id: number
                    created_at?: string
                    data?: string
                    data_pagamento?: string | null
                    descricao?: string | null
                    fechamento_frentista_id?: number | null
                    frentista_id: number
                    id?: number
                    posto_id?: number | null
                    status?: string
                    updated_at?: string
                    valor: number
                }
                Update: {
                    cliente_id?: number
                    created_at?: string
                    data?: string
                    data_pagamento?: string | null
                    descricao?: string | null
                    fechamento_frentista_id?: number | null
                    frentista_id?: number
                    id?: number
                    posto_id?: number | null
                    status?: string
                    updated_at?: string
                    valor?: number
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
                        foreignKeyName: "NotaFrentista_fechamento_frentista_id_fkey"
                        columns: ["fechamento_frentista_id"]
                        isOneToOne: false
                        referencedRelation: "FechamentoFrentista"
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
                        foreignKeyName: "NotaFrentista_posto_id_fkey"
                        columns: ["posto_id"]
                        isOneToOne: false
                        referencedRelation: "Posto"
                        referencedColumns: ["id"]
                    },
                ]
            }
            Notificacao: {
                Row: {
                    created_at: string
                    id: number
                    lida: boolean
                    mensagem: string
                    posto_id: number | null
                    titulo: string
                    usuario_id: number
                }
                Insert: {
                    created_at?: string
                    id?: number
                    lida?: boolean
                    mensagem: string
                    posto_id?: number | null
                    titulo: string
                    usuario_id: number
                }
                Update: {
                    created_at?: string
                    id?: number
                    lida?: boolean
                    mensagem?: string
                    posto_id?: number | null
                    titulo?: string
                    usuario_id?: number
                }
                Relationships: [
                    {
                        foreignKeyName: "Notificacao_posto_id_fkey"
                        columns: ["posto_id"]
                        isOneToOne: false
                        referencedRelation: "Posto"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "Notificacao_usuario_id_fkey"
                        columns: ["usuario_id"]
                        isOneToOne: false
                        referencedRelation: "Usuario"
                        referencedColumns: ["id"]
                    },
                ]
            }
            Parcela: {
                Row: {
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
                    },
                ]
            }
            Posto: {
                Row: {
                    ativo: boolean
                    cidade: string | null
                    cnpj: string | null
                    email: string | null
                    endereco: string | null
                    estado: string | null
                    id: number
                    nome: string
                    telefone: string | null
                }
                Insert: {
                    ativo?: boolean
                    cidade?: string | null
                    cnpj?: string | null
                    email?: string | null
                    endereco?: string | null
                    estado?: string | null
                    id?: number
                    nome: string
                    telefone?: string | null
                }
                Update: {
                    ativo?: boolean
                    cidade?: string | null
                    cnpj?: string | null
                    email?: string | null
                    endereco?: string | null
                    estado?: string | null
                    id?: number
                    nome?: string
                    telefone?: string | null
                }
                Relationships: []
            }
            Produto: {
                Row: {
                    ativo: boolean
                    categoria: string
                    id: number
                    nome: string
                    posto_id: number | null
                    preco_venda: number
                }
                Insert: {
                    ativo?: boolean
                    categoria: string
                    id?: number
                    nome: string
                    posto_id?: number | null
                    preco_venda: number
                }
                Update: {
                    ativo?: boolean
                    categoria?: string
                    id?: number
                    nome?: string
                    posto_id?: number | null
                    preco_venda?: number
                }
                Relationships: [
                    {
                        foreignKeyName: "Produto_posto_id_fkey"
                        columns: ["posto_id"]
                        isOneToOne: false
                        referencedRelation: "Posto"
                        referencedColumns: ["id"]
                    },
                ]
            }
            PushToken: {
                Row: {
                    created_at: string
                    id: number
                    token: string
                    usuario_id: number
                }
                Insert: {
                    created_at?: string
                    id?: number
                    token: string
                    usuario_id: number
                }
                Update: {
                    created_at?: string
                    id?: number
                    token?: string
                    usuario_id?: number
                }
                Relationships: [
                    {
                        foreignKeyName: "PushToken_usuario_id_fkey"
                        columns: ["usuario_id"]
                        isOneToOne: false
                        referencedRelation: "Usuario"
                        referencedColumns: ["id"]
                    },
                ]
            }
            Recebimento: {
                Row: {
                    created_at: string
                    data: string
                    id: number
                    observacao: string | null
                    posto_id: number | null
                    usuario_id: number
                    valor: number
                }
                Insert: {
                    created_at?: string
                    data?: string
                    id?: number
                    observacao?: string | null
                    posto_id?: number | null
                    usuario_id: number
                    valor: number
                }
                Update: {
                    created_at?: string
                    data?: string
                    id?: number
                    observacao?: string | null
                    posto_id?: number | null
                    usuario_id?: number
                    valor?: number
                }
                Relationships: [
                    {
                        foreignKeyName: "Recebimento_posto_id_fkey"
                        columns: ["posto_id"]
                        isOneToOne: false
                        referencedRelation: "Posto"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "Recebimento_usuario_id_fkey"
                        columns: ["usuario_id"]
                        isOneToOne: false
                        referencedRelation: "Usuario"
                        referencedColumns: ["id"]
                    },
                ]
            }
            Tanque: {
                Row: {
                    ativo: boolean
                    capacidade: number
                    combustivel_id: number
                    id: number
                    nome: string
                    posto_id: number | null
                }
                Insert: {
                    ativo?: boolean
                    capacidade: number
                    combustivel_id: number
                    id?: number
                    nome: string
                    posto_id?: number | null
                }
                Update: {
                    ativo?: boolean
                    capacidade?: number
                    combustivel_id?: number
                    id?: number
                    nome?: string
                    posto_id?: number | null
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
                    posto_id: number | null
                }
                Insert: {
                    ativo?: boolean
                    horario_fim: string
                    horario_inicio: string
                    id?: number
                    nome: string
                    posto_id?: number | null
                }
                Update: {
                    ativo?: boolean
                    horario_fim?: string
                    horario_inicio?: string
                    id?: number
                    nome?: string
                    posto_id?: number | null
                }
                Relationships: [
                    {
                        foreignKeyName: "Turno_posto_id_fkey"
                        columns: ["posto_id"]
                        isOneToOne: false
                        referencedRelation: "Posto"
                        referencedColumns: ["id"]
                    },
                ]
            }
            Usuario: {
                Row: {
                    ativo: boolean
                    created_at: string
                    email: string
                    id: number
                    nome: string
                    posto_id: number | null
                    role: Database["public"]["Enums"]["Role"]
                }
                Insert: {
                    ativo?: boolean
                    created_at?: string
                    email: string
                    id?: number
                    nome: string
                    posto_id?: number | null
                    role: Database["public"]["Enums"]["Role"]
                }
                Update: {
                    ativo?: boolean
                    created_at?: string
                    email?: string
                    id?: number
                    nome?: string
                    posto_id?: number | null
                    role?: Database["public"]["Enums"]["Role"]
                }
                Relationships: [
                    {
                        foreignKeyName: "Usuario_posto_id_fkey"
                        columns: ["posto_id"]
                        isOneToOne: false
                        referencedRelation: "Posto"
                        referencedColumns: ["id"]
                    },
                ]
            }
            UsuarioPosto: {
                Row: {
                    posto_id: number
                    usuario_id: number
                }
                Insert: {
                    posto_id: number
                    usuario_id: number
                }
                Update: {
                    posto_id?: number
                    usuario_id?: number
                }
                Relationships: [
                    {
                        foreignKeyName: "UsuarioPosto_posto_id_fkey"
                        columns: ["posto_id"]
                        isOneToOne: false
                        referencedRelation: "Posto"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "UsuarioPosto_usuario_id_fkey"
                        columns: ["usuario_id"]
                        isOneToOne: false
                        referencedRelation: "Usuario"
                        referencedColumns: ["id"]
                    },
                ]
            }
            VendaProduto: {
                Row: {
                    data: string
                    fechamento_frentista_id: number | null
                    frentista_id: number
                    id: number
                    posto_id: number | null
                    produto_id: number
                    quantidade: number
                    valor_total: number
                    valor_unitario: number
                }
                Insert: {
                    data?: string
                    fechamento_frentista_id?: number | null
                    frentista_id: number
                    id?: number
                    posto_id?: number | null
                    produto_id: number
                    quantidade: number
                    valor_total: number
                    valor_unitario: number
                }
                Update: {
                    data?: string
                    fechamento_frentista_id?: number | null
                    frentista_id?: number
                    id?: number
                    posto_id?: number | null
                    produto_id?: number
                    quantidade?: number
                    valor_total?: number
                    valor_unitario?: number
                }
                Relationships: [
                    {
                        foreignKeyName: "VendaProduto_fechamento_frentista_id_fkey"
                        columns: ["fechamento_frentista_id"]
                        isOneToOne: false
                        referencedRelation: "FechamentoFrentista"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "VendaProduto_frentista_id_fkey"
                        columns: ["frentista_id"]
                        isOneToOne: false
                        referencedRelation: "Frentista"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "VendaProduto_posto_id_fkey"
                        columns: ["posto_id"]
                        isOneToOne: false
                        referencedRelation: "Posto"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "VendaProduto_produto_id_fkey"
                        columns: ["produto_id"]
                        isOneToOne: false
                        referencedRelation: "Produto"
                        referencedColumns: ["id"]
                    },
                ]
            }
            Cliente: {
                Row: {
                    ativo: boolean
                    bloqueado: boolean | null
                    created_at: string
                    documento: string | null
                    email: string | null
                    endereco: string | null
                    id: number
                    limite_credito: number | null
                    nome: string
                    posto_id: number | null
                    saldo_devedor: number | null
                    telefone: string | null
                    updated_at: string
                }
                Insert: {
                    ativo?: boolean
                    bloqueado?: boolean | null
                    created_at?: string
                    documento?: string | null
                    email?: string | null
                    endereco?: string | null
                    id?: number
                    limite_credito?: number | null
                    nome: string
                    posto_id?: number | null
                    saldo_devedor?: number | null
                    telefone?: string | null
                    updated_at?: string
                }
                Update: {
                    ativo?: boolean
                    bloqueado?: boolean | null
                    created_at?: string
                    documento?: string | null
                    email?: string | null
                    endereco?: string | null
                    id?: number
                    limite_credito?: number | null
                    nome?: string
                    posto_id?: number | null
                    saldo_devedor?: number | null
                    telefone?: string | null
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "Cliente_posto_id_fkey"
                        columns: ["posto_id"]
                        isOneToOne: false
                        referencedRelation: "Posto"
                        referencedColumns: ["id"]
                    },
                ]
            }
            ClienteBaratencia: {
                Row: {
                    ativo: boolean
                    created_at: string
                    email: string | null
                    id: number
                    nome: string
                    posto_id: number | null
                    telefone: string | null
                }
                Insert: {
                    ativo?: boolean
                    created_at?: string
                    email?: string | null
                    id?: number
                    nome: string
                    posto_id?: number | null
                    telefone?: string | null
                }
                Update: {
                    ativo?: boolean
                    created_at?: string
                    email?: string | null
                    id?: number
                    nome?: string
                    posto_id?: number | null
                    telefone?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "ClienteBaratencia_posto_id_fkey"
                        columns: ["posto_id"]
                        isOneToOne: false
                        referencedRelation: "Posto"
                        referencedColumns: ["id"]
                    },
                ]
            }
            CarteiraBaratencia: {
                Row: {
                    cliente_baratencia_id: number
                    created_at: string
                    id: number
                    posto_id: number | null
                    saldo: number
                    updated_at: string
                }
                Insert: {
                    cliente_baratencia_id: number
                    created_at?: string
                    id?: number
                    posto_id?: number | null
                    saldo?: number
                    updated_at?: string
                }
                Update: {
                    cliente_baratencia_id?: number
                    created_at?: string
                    id?: number
                    posto_id?: number | null
                    saldo?: number
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "CarteiraBaratencia_cliente_baratencia_id_fkey"
                        columns: ["cliente_baratencia_id"]
                        isOneToOne: false
                        referencedRelation: "ClienteBaratencia"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "CarteiraBaratencia_posto_id_fkey"
                        columns: ["posto_id"]
                        isOneToOne: false
                        referencedRelation: "Posto"
                        referencedColumns: ["id"]
                    },
                ]
            }
            TransacaoBaratencia: {
                Row: {
                    carteira_baratencia_id: number
                    created_at: string
                    descricao: string | null
                    id: number
                    posto_id: number | null
                    tipo: Database["public"]["Enums"]["TipoTransacaoBaratencia"]
                    usuario_id: number | null
                    valor: number
                }
                Insert: {
                    carteira_baratencia_id: number
                    created_at?: string
                    descricao?: string | null
                    id?: number
                    posto_id?: number | null
                    tipo: Database["public"]["Enums"]["TipoTransacaoBaratencia"]
                    usuario_id?: number | null
                    valor: number
                }
                Update: {
                    carteira_baratencia_id?: number
                    created_at?: string
                    descricao?: string | null
                    id?: number
                    posto_id?: number | null
                    tipo?: Database["public"]["Enums"]["TipoTransacaoBaratencia"]
                    usuario_id?: number | null
                    valor?: number
                }
                Relationships: [
                    {
                        foreignKeyName: "TransacaoBaratencia_carteira_baratencia_id_fkey"
                        columns: ["carteira_baratencia_id"]
                        isOneToOne: false
                        referencedRelation: "CarteiraBaratencia"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "TransacaoBaratencia_posto_id_fkey"
                        columns: ["posto_id"]
                        isOneToOne: false
                        referencedRelation: "Posto"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "TransacaoBaratencia_usuario_id_fkey"
                        columns: ["usuario_id"]
                        isOneToOne: false
                        referencedRelation: "Usuario"
                        referencedColumns: ["id"]
                    },
                ]
            }
            TokenAbastecimento: {
                Row: {
                    cliente_baratencia_id: number
                    created_at: string
                    expira_em: string
                    id: number
                    posto_id: number | null
                    resgatado: boolean
                    token: string
                    valor: number
                }
                Insert: {
                    cliente_baratencia_id: number
                    created_at?: string
                    expira_em: string
                    id?: number
                    posto_id?: number | null
                    resgatado?: boolean
                    token: string
                    valor: number
                }
                Update: {
                    cliente_baratencia_id?: number
                    created_at?: string
                    expira_em?: string
                    id?: number
                    posto_id?: number | null
                    resgatado?: boolean
                    token?: string
                    valor?: number
                }
                Relationships: [
                    {
                        foreignKeyName: "TokenAbastecimento_cliente_baratencia_id_fkey"
                        columns: ["cliente_baratencia_id"]
                        isOneToOne: false
                        referencedRelation: "ClienteBaratencia"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "TokenAbastecimento_posto_id_fkey"
                        columns: ["posto_id"]
                        isOneToOne: false
                        referencedRelation: "Posto"
                        referencedColumns: ["id"]
                    },
                ]
            }
            PromocaoBaratencia: {
                Row: {
                    ativa: boolean
                    created_at: string
                    data_fim: string | null
                    data_inicio: string | null
                    descricao: string | null
                    id: number
                    nome: string
                    posto_id: number | null
                    regras: Json | null
                    tipo: string
                }
                Insert: {
                    ativa?: boolean
                    created_at?: string
                    data_fim?: string | null
                    data_inicio?: string | null
                    descricao?: string | null
                    id?: number
                    nome: string
                    posto_id?: number | null
                    regras?: Json | null
                    tipo: string
                }
                Update: {
                    ativa?: boolean
                    created_at?: string
                    data_fim?: string | null
                    data_inicio?: string | null
                    descricao?: string | null
                    id?: number
                    nome?: string
                    posto_id?: number | null
                    regras?: Json | null
                    tipo?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "PromocaoBaratencia_posto_id_fkey"
                        columns: ["posto_id"]
                        isOneToOne: false
                        referencedRelation: "Posto"
                        referencedColumns: ["id"]
                    },
                ]
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            installment_status: "pendente" | "pago" | "atrasado"
            periodicity_type: "mensal" | "quinzenal" | "semanal" | "diario"
            Role: "ADMIN" | "GERENTE" | "OPERADOR" | "FRENTISTA"
            StatusFechamento: "RASCUNHO" | "FECHADO" | "ABERTO"
            TipoTransacaoBaratencia: "DEPOSITO" | "CONVERSAO" | "RESGATE" | "ESTORNO"
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}

type PublicSchema = Database["public"]

export type Tables<
    TableName extends keyof (PublicSchema["Tables"] & PublicSchema["Views"])
> = (PublicSchema["Tables"] & PublicSchema["Views"])[TableName] extends {
    Row: infer R
} ? R : never

export type TablesInsert<
    TableName extends keyof PublicSchema["Tables"]
> = PublicSchema["Tables"][TableName] extends {
    Insert: infer I
} ? I : never

export type TablesUpdate<
    TableName extends keyof PublicSchema["Tables"]
> = PublicSchema["Tables"][TableName] extends {
    Update: infer U
} ? U : never

export type Enums<
    EnumName extends keyof PublicSchema["Enums"]
> = PublicSchema["Enums"][EnumName]

export type CompositeTypes<
    CompositeTypeName extends keyof PublicSchema["CompositeTypes"]
> = PublicSchema["CompositeTypes"][CompositeTypeName]
