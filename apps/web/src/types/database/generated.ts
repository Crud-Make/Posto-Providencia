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
          localizacao: string | null
          nome: string
          posto_id: number | null
        }
        Insert: {
          ativo?: boolean
          id?: number
          localizacao?: string | null
          nome: string
          posto_id?: number | null
        }
        Update: {
          ativo?: boolean
          id?: number
          localizacao?: string | null
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
      CarteiraBaratencia: {
        Row: {
          cliente_id: number | null
          id: number
          saldo_brl: number | null
          saldo_litros_diesel: number | null
          saldo_litros_et: number | null
          saldo_litros_ga: number | null
          saldo_litros_gc: number | null
          saldo_litros_s10: number | null
          ultima_atualizacao: string | null
        }
        Insert: {
          cliente_id?: number | null
          id?: number
          saldo_brl?: number | null
          saldo_litros_diesel?: number | null
          saldo_litros_et?: number | null
          saldo_litros_ga?: number | null
          saldo_litros_gc?: number | null
          saldo_litros_s10?: number | null
          ultima_atualizacao?: string | null
        }
        Update: {
          cliente_id?: number | null
          id?: number
          saldo_brl?: number | null
          saldo_litros_diesel?: number | null
          saldo_litros_et?: number | null
          saldo_litros_ga?: number | null
          saldo_litros_gc?: number | null
          saldo_litros_s10?: number | null
          ultima_atualizacao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "CarteiraBaratencia_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: true
            referencedRelation: "ClienteBaratencia"
            referencedColumns: ["id"]
          },
        ]
      }
      Cliente: {
        Row: {
          ativo: boolean | null
          bloqueado: boolean | null
          created_at: string | null
          documento: string | null
          email: string | null
          endereco: string | null
          id: number
          limite_credito: number | null
          nome: string
          posto_id: number
          saldo_devedor: number | null
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          bloqueado?: boolean | null
          created_at?: string | null
          documento?: string | null
          email?: string | null
          endereco?: string | null
          id?: number
          limite_credito?: number | null
          nome: string
          posto_id: number
          saldo_devedor?: number | null
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          bloqueado?: boolean | null
          created_at?: string | null
          documento?: string | null
          email?: string | null
          endereco?: string | null
          id?: number
          limite_credito?: number | null
          nome?: string
          posto_id?: number
          saldo_devedor?: number | null
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ClienteBaratencia: {
        Row: {
          ativo: boolean | null
          cpf: string
          created_at: string | null
          data_nascimento: string | null
          id: number
          nome: string
          telefone: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          cpf: string
          created_at?: string | null
          data_nascimento?: string | null
          id?: number
          nome: string
          telefone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          cpf?: string
          created_at?: string | null
          data_nascimento?: string | null
          id?: number
          nome?: string
          telefone?: string | null
          updated_at?: string | null
          user_id?: string | null
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
          posto_id: number | null
          preco_custo: number | null
          preco_venda: number
        }
        Insert: {
          ativo?: boolean
          codigo: string
          cor?: string | null
          id?: number
          nome: string
          posto_id?: number | null
          preco_custo?: number | null
          preco_venda?: number
        }
        Update: {
          ativo?: boolean
          codigo?: string
          cor?: string | null
          id?: number
          nome?: string
          posto_id?: number | null
          preco_custo?: number | null
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
          arquivo_nf: string | null
          combustivel_id: number
          createdAt: string
          custo_por_litro: number
          data: string
          fornecedor_id: number
          id: number
          numero_nf: string | null
          observacoes: string | null
          posto_id: number | null
          quantidade_litros: number
          valor_total: number
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
          posto_id?: number | null
          quantidade_litros: number
          valor_total: number
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
          posto_id?: number | null
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
          categoria: string
          chave: string
          descricao: string | null
          id: number
          posto_id: number | null
          tipo: string
          updated_at: string
          valor: string
        }
        Insert: {
          categoria?: string
          chave: string
          descricao?: string | null
          id?: number
          posto_id?: number | null
          tipo?: string
          updated_at?: string
          valor: string
        }
        Update: {
          categoria?: string
          chave?: string
          descricao?: string | null
          id?: number
          posto_id?: number | null
          tipo?: string
          updated_at?: string
          valor?: string
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
      Despesa: {
        Row: {
          categoria: string | null
          created_at: string | null
          data: string
          data_pagamento: string | null
          descricao: string
          id: number
          observacoes: string | null
          posto_id: number | null
          status: string | null
          valor: number
        }
        Insert: {
          categoria?: string | null
          created_at?: string | null
          data: string
          data_pagamento?: string | null
          descricao: string
          id?: number
          observacoes?: string | null
          posto_id?: number | null
          status?: string | null
          valor: number
        }
        Update: {
          categoria?: string | null
          created_at?: string | null
          data?: string
          data_pagamento?: string | null
          descricao?: string
          id?: number
          observacoes?: string | null
          posto_id?: number | null
          status?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "Despesa_posto_id_fkey"
            columns: ["posto_id"]
            isOneToOne: false
            referencedRelation: "Posto"
            referencedColumns: ["id"]
          },
        ]
      }
      Divida: {
        Row: {
          created_at: string
          data_vencimento: string
          descricao: string
          id: number
          posto_id: number | null
          status: string
          valor: number
        }
        Insert: {
          created_at?: string
          data_vencimento: string
          descricao: string
          id?: never
          posto_id?: number | null
          status?: string
          valor: number
        }
        Update: {
          created_at?: string
          data_vencimento?: string
          descricao?: string
          id?: never
          posto_id?: number | null
          status?: string
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
          periodicidade?: Database["public"]["Enums"]["periodicity_type"]
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
      Escala: {
        Row: {
          created_at: string
          data: string
          frentista_id: number
          id: number
          observacao: string | null
          posto_id: number | null
          tipo: string
          turno_id: number | null
        }
        Insert: {
          created_at?: string
          data: string
          frentista_id: number
          id?: number
          observacao?: string | null
          posto_id?: number | null
          tipo: string
          turno_id?: number | null
        }
        Update: {
          created_at?: string
          data?: string
          frentista_id?: number
          id?: number
          observacao?: string | null
          posto_id?: number | null
          tipo?: string
          turno_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "Escala_frentista_id_fkey"
            columns: ["frentista_id"]
            isOneToOne: false
            referencedRelation: "Frentista"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Escala_posto_id_fkey"
            columns: ["posto_id"]
            isOneToOne: false
            referencedRelation: "Posto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Escala_turno_id_fkey"
            columns: ["turno_id"]
            isOneToOne: false
            referencedRelation: "Turno"
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
          posto_id: number | null
          quantidade_atual: number
          ultima_atualizacao: string
        }
        Insert: {
          capacidade_tanque: number
          combustivel_id: number
          custo_medio: number
          id?: number
          posto_id?: number | null
          quantidade_atual: number
          ultima_atualizacao?: string
        }
        Update: {
          capacidade_tanque?: number
          combustivel_id?: number
          custo_medio?: number
          id?: number
          posto_id?: number | null
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
          {
            foreignKeyName: "Estoque_posto_id_fkey"
            columns: ["posto_id"]
            isOneToOne: false
            referencedRelation: "Posto"
            referencedColumns: ["id"]
          },
        ]
      }
      Fechamento: {
        Row: {
          createdAt: string
          custo_combustiveis: number | null
          data: string
          diferenca: number
          id: number
          lucro_bruto: number | null
          lucro_liquido: number | null
          margem_bruta_percentual: number | null
          margem_liquida_percentual: number | null
          observacoes: string | null
          posto_id: number | null
          status: Database["public"]["Enums"]["StatusFechamento"]
          taxas_pagamento: number | null
          total_recebido: number
          total_vendas: number
          turno_id: number | null
          updatedAt: string
          usuario_id: number
        }
        Insert: {
          createdAt?: string
          custo_combustiveis?: number | null
          data: string
          diferenca: number
          id?: number
          lucro_bruto?: number | null
          lucro_liquido?: number | null
          margem_bruta_percentual?: number | null
          margem_liquida_percentual?: number | null
          observacoes?: string | null
          posto_id?: number | null
          status?: Database["public"]["Enums"]["StatusFechamento"]
          taxas_pagamento?: number | null
          total_recebido: number
          total_vendas: number
          turno_id?: number | null
          updatedAt?: string
          usuario_id: number
        }
        Update: {
          createdAt?: string
          custo_combustiveis?: number | null
          data?: string
          diferenca?: number
          id?: number
          lucro_bruto?: number | null
          lucro_liquido?: number | null
          margem_bruta_percentual?: number | null
          margem_liquida_percentual?: number | null
          observacoes?: string | null
          posto_id?: number | null
          status?: Database["public"]["Enums"]["StatusFechamento"]
          taxas_pagamento?: number | null
          total_recebido?: number
          total_vendas?: number
          turno_id?: number | null
          updatedAt?: string
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
          baratencia: number | null
          data_hora_envio: string | null
          diferenca_calculada: number | null
          encerrante: number | null
          fechamento_id: number
          frentista_id: number
          id: number
          observacoes: string | null
          posto_id: number | null
          valor_cartao: number
          valor_cartao_credito: number | null
          valor_cartao_debito: number | null
          valor_conferido: number
          valor_dinheiro: number
          valor_moedas: number
          valor_nota: number
          valor_pix: number
        }
        Insert: {
          baratao?: number | null
          baratencia?: number | null
          data_hora_envio?: string | null
          diferenca_calculada?: number | null
          encerrante?: number | null
          fechamento_id: number
          frentista_id: number
          id?: number
          observacoes?: string | null
          posto_id?: number | null
          valor_cartao?: number
          valor_cartao_credito?: number | null
          valor_cartao_debito?: number | null
          valor_conferido?: number
          valor_dinheiro?: number
          valor_moedas?: number
          valor_nota?: number
          valor_pix?: number
        }
        Update: {
          baratao?: number | null
          baratencia?: number | null
          data_hora_envio?: string | null
          diferenca_calculada?: number | null
          encerrante?: number | null
          fechamento_id?: number
          frentista_id?: number
          id?: number
          observacoes?: string | null
          posto_id?: number | null
          valor_cartao?: number
          valor_cartao_credito?: number | null
          valor_cartao_debito?: number | null
          valor_conferido?: number
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
          cnpj: string
          contato: string | null
          id: number
          nome: string
          posto_id: number | null
        }
        Insert: {
          ativo?: boolean
          cnpj: string
          contato?: string | null
          id?: number
          nome: string
          posto_id?: number | null
        }
        Update: {
          ativo?: boolean
          cnpj?: string
          contato?: string | null
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
          cpf: string
          data_admissao: string
          id: number
          nome: string
          posto_id: number | null
          telefone: string | null
          turno_id: number | null
          user_id: string | null
        }
        Insert: {
          ativo?: boolean
          cpf: string
          data_admissao: string
          id?: number
          nome: string
          posto_id?: number | null
          telefone?: string | null
          turno_id?: number | null
          user_id?: string | null
        }
        Update: {
          ativo?: boolean
          cpf?: string
          data_admissao?: string
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
      HistoricoTanque: {
        Row: {
          created_at: string | null
          data: string
          id: number
          tanque_id: number | null
          volume_fisico: number | null
          volume_livro: number | null
        }
        Insert: {
          created_at?: string | null
          data: string
          id?: number
          tanque_id?: number | null
          volume_fisico?: number | null
          volume_livro?: number | null
        }
        Update: {
          created_at?: string | null
          data?: string
          id?: number
          tanque_id?: number | null
          volume_fisico?: number | null
          volume_livro?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "HistoricoTanque_tanque_id_fkey"
            columns: ["tanque_id"]
            isOneToOne: false
            referencedRelation: "Tanque"
            referencedColumns: ["id"]
          },
        ]
      }
      Leitura: {
        Row: {
          bico_id: number
          combustivel_id: number
          createdAt: string
          data: string
          id: number
          leitura_final: number
          leitura_inicial: number
          litros_vendidos: number
          posto_id: number | null
          preco_litro: number
          turno_id: number | null
          usuario_id: number
          valor_total: number
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
          posto_id?: number | null
          preco_litro: number
          turno_id?: number | null
          usuario_id: number
          valor_total: number
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
          posto_id?: number | null
          preco_litro?: number
          turno_id?: number | null
          usuario_id?: number
          valor_total?: number
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
            foreignKeyName: "Leitura_posto_id_fkey"
            columns: ["posto_id"]
            isOneToOne: false
            referencedRelation: "Posto"
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
        ]
      }
      Maquininha: {
        Row: {
          ativo: boolean
          id: number
          nome: string
          operadora: string | null
          posto_id: number | null
          taxa: number | null
        }
        Insert: {
          ativo?: boolean
          id?: number
          nome: string
          operadora?: string | null
          posto_id?: number | null
          taxa?: number | null
        }
        Update: {
          ativo?: boolean
          id?: number
          nome?: string
          operadora?: string | null
          posto_id?: number | null
          taxa?: number | null
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
          created_at: string | null
          data: string | null
          id: number
          observacao: string | null
          posto_id: number | null
          produto_id: number | null
          quantidade: number
          responsavel: string | null
          tipo: string
        }
        Insert: {
          created_at?: string | null
          data?: string | null
          id?: number
          observacao?: string | null
          posto_id?: number | null
          produto_id?: number | null
          quantidade: number
          responsavel?: string | null
          tipo: string
        }
        Update: {
          created_at?: string | null
          data?: string | null
          id?: number
          observacao?: string | null
          posto_id?: number | null
          produto_id?: number | null
          quantidade?: number
          responsavel?: string | null
          tipo?: string
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
        ]
      }
      NotaFrentista: {
        Row: {
          cliente_id: number | null
          created_at: string | null
          data: string
          data_pagamento: string | null
          descricao: string | null
          fechamento_frentista_id: number | null
          forma_pagamento: string | null
          frentista_id: number
          id: number
          observacoes: string | null
          posto_id: number
          status: string | null
          updated_at: string | null
          valor: number
        }
        Insert: {
          cliente_id?: number | null
          created_at?: string | null
          data?: string
          data_pagamento?: string | null
          descricao?: string | null
          fechamento_frentista_id?: number | null
          forma_pagamento?: string | null
          frentista_id: number
          id?: number
          observacoes?: string | null
          posto_id: number
          status?: string | null
          updated_at?: string | null
          valor: number
        }
        Update: {
          cliente_id?: number | null
          created_at?: string | null
          data?: string
          data_pagamento?: string | null
          descricao?: string | null
          fechamento_frentista_id?: number | null
          forma_pagamento?: string | null
          frentista_id?: number
          id?: number
          observacoes?: string | null
          posto_id?: number
          status?: string | null
          updated_at?: string | null
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
            foreignKeyName: "NotaFrentista_frentista_id_fkey"
            columns: ["frentista_id"]
            isOneToOne: false
            referencedRelation: "Frentista"
            referencedColumns: ["id"]
          },
        ]
      }
      Notificacao: {
        Row: {
          created_at: string | null
          data_envio: string | null
          enviada: boolean | null
          fechamento_frentista_id: number | null
          frentista_id: number
          id: number
          lida: boolean | null
          mensagem: string
          posto_id: number | null
          tipo: string | null
          titulo: string
          valor_falta: number | null
        }
        Insert: {
          created_at?: string | null
          data_envio?: string | null
          enviada?: boolean | null
          fechamento_frentista_id?: number | null
          frentista_id: number
          id?: number
          lida?: boolean | null
          mensagem: string
          posto_id?: number | null
          tipo?: string | null
          titulo: string
          valor_falta?: number | null
        }
        Update: {
          created_at?: string | null
          data_envio?: string | null
          enviada?: boolean | null
          fechamento_frentista_id?: number | null
          frentista_id?: number
          id?: number
          lida?: boolean | null
          mensagem?: string
          posto_id?: number | null
          tipo?: string | null
          titulo?: string
          valor_falta?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "Notificacao_fechamento_frentista_id_fkey"
            columns: ["fechamento_frentista_id"]
            isOneToOne: false
            referencedRelation: "FechamentoFrentista"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Notificacao_frentista_id_fkey"
            columns: ["frentista_id"]
            isOneToOne: false
            referencedRelation: "Frentista"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Notificacao_posto_id_fkey"
            columns: ["posto_id"]
            isOneToOne: false
            referencedRelation: "Posto"
            referencedColumns: ["id"]
          },
        ]
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
          },
        ]
      }
      Posto: {
        Row: {
          ativo: boolean | null
          cidade: string | null
          cnpj: string | null
          created_at: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          id: number
          nome: string
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: number
          nome: string
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: number
          nome?: string
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      Produto: {
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
          posto_id: number | null
          preco_custo: number
          preco_venda: number
          unidade_medida: string
          updated_at: string | null
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
          posto_id?: number | null
          preco_custo?: number
          preco_venda?: number
          unidade_medida?: string
          updated_at?: string | null
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
          posto_id?: number | null
          preco_custo?: number
          preco_venda?: number
          unidade_medida?: string
          updated_at?: string | null
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
      PromocaoBaratencia: {
        Row: {
          ativo: boolean | null
          bonus_porcentagem: number | null
          combustivel_codigo: string | null
          created_at: string | null
          data_fim: string | null
          data_inicio: string | null
          descricao: string | null
          id: number
          posto_id: number | null
          tipo: string
          titulo: string
          valor_minimo: number | null
        }
        Insert: {
          ativo?: boolean | null
          bonus_porcentagem?: number | null
          combustivel_codigo?: string | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          id?: number
          posto_id?: number | null
          tipo: string
          titulo: string
          valor_minimo?: number | null
        }
        Update: {
          ativo?: boolean | null
          bonus_porcentagem?: number | null
          combustivel_codigo?: string | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          id?: number
          posto_id?: number | null
          tipo?: string
          titulo?: string
          valor_minimo?: number | null
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
      PushToken: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          device_info: string | null
          expo_push_token: string
          frentista_id: number | null
          id: number
          updated_at: string | null
          usuario_id: number
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          device_info?: string | null
          expo_push_token: string
          frentista_id?: number | null
          id?: number
          updated_at?: string | null
          usuario_id: number
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          device_info?: string | null
          expo_push_token?: string
          frentista_id?: number | null
          id?: number
          updated_at?: string | null
          usuario_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "PushToken_frentista_id_fkey"
            columns: ["frentista_id"]
            isOneToOne: false
            referencedRelation: "Frentista"
            referencedColumns: ["id"]
          },
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
      Tanque: {
        Row: {
          ativo: boolean | null
          capacidade: number
          combustivel_id: number
          created_at: string
          estoque_atual: number
          id: number
          nome: string
          posto_id: number
        }
        Insert: {
          ativo?: boolean | null
          capacidade?: number
          combustivel_id: number
          created_at?: string
          estoque_atual?: number
          id?: number
          nome: string
          posto_id: number
        }
        Update: {
          ativo?: boolean | null
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
          },
        ]
      }
      TokenAbastecimento: {
        Row: {
          cliente_id: number | null
          combustivel_id: number | null
          created_at: string | null
          data_expiracao: string
          data_resgate: string | null
          frentista_id_resgatou: number | null
          id: number
          posto_id: number | null
          quantidade_litros: number
          status: string | null
          token_pin: string
        }
        Insert: {
          cliente_id?: number | null
          combustivel_id?: number | null
          created_at?: string | null
          data_expiracao: string
          data_resgate?: string | null
          frentista_id_resgatou?: number | null
          id?: number
          posto_id?: number | null
          quantidade_litros: number
          status?: string | null
          token_pin: string
        }
        Update: {
          cliente_id?: number | null
          combustivel_id?: number | null
          created_at?: string | null
          data_expiracao?: string
          data_resgate?: string | null
          frentista_id_resgatou?: number | null
          id?: number
          posto_id?: number | null
          quantidade_litros?: number
          status?: string | null
          token_pin?: string
        }
        Relationships: [
          {
            foreignKeyName: "TokenAbastecimento_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "ClienteBaratencia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "TokenAbastecimento_combustivel_id_fkey"
            columns: ["combustivel_id"]
            isOneToOne: false
            referencedRelation: "Combustivel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "TokenAbastecimento_frentista_id_resgatou_fkey"
            columns: ["frentista_id_resgatou"]
            isOneToOne: false
            referencedRelation: "Frentista"
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
      TransacaoBaratencia: {
        Row: {
          carteira_id: number | null
          combustivel_codigo: string | null
          created_at: string | null
          id: number
          metadata: Json | null
          preco_na_hora: number | null
          quantidade_litros: number | null
          status: string | null
          tipo: Database["public"]["Enums"]["TipoTransacaoBaratencia"]
          valor_brl: number | null
        }
        Insert: {
          carteira_id?: number | null
          combustivel_codigo?: string | null
          created_at?: string | null
          id?: number
          metadata?: Json | null
          preco_na_hora?: number | null
          quantidade_litros?: number | null
          status?: string | null
          tipo: Database["public"]["Enums"]["TipoTransacaoBaratencia"]
          valor_brl?: number | null
        }
        Update: {
          carteira_id?: number | null
          combustivel_codigo?: string | null
          created_at?: string | null
          id?: number
          metadata?: Json | null
          preco_na_hora?: number | null
          quantidade_litros?: number | null
          status?: string | null
          tipo?: Database["public"]["Enums"]["TipoTransacaoBaratencia"]
          valor_brl?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "TransacaoBaratencia_carteira_id_fkey"
            columns: ["carteira_id"]
            isOneToOne: false
            referencedRelation: "CarteiraBaratencia"
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
          createdAt: string
          email: string
          id: number
          nome: string
          role: Database["public"]["Enums"]["Role"]
          senha: string | null
          updatedAt: string
        }
        Insert: {
          ativo?: boolean
          createdAt?: string
          email: string
          id?: number
          nome: string
          role?: Database["public"]["Enums"]["Role"]
          senha?: string | null
          updatedAt?: string
        }
        Update: {
          ativo?: boolean
          createdAt?: string
          email?: string
          id?: number
          nome?: string
          role?: Database["public"]["Enums"]["Role"]
          senha?: string | null
          updatedAt?: string
        }
        Relationships: []
      }
      UsuarioPosto: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          id: number
          posto_id: number
          role: string | null
          usuario_id: number
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          id?: number
          posto_id: number
          role?: string | null
          usuario_id: number
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          id?: number
          posto_id?: number
          role?: string | null
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
          created_at: string
          data: string
          fechamento_frentista_id: number | null
          frentista_id: number
          id: number
          produto_id: number
          quantidade: number
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          created_at?: string
          data?: string
          fechamento_frentista_id?: number | null
          frentista_id: number
          id?: number
          produto_id: number
          quantidade?: number
          valor_total: number
          valor_unitario: number
        }
        Update: {
          created_at?: string
          data?: string
          fechamento_frentista_id?: number | null
          frentista_id?: number
          id?: number
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
            foreignKeyName: "VendaProduto_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "Produto"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      vw_lucro_periodo: {
        Row: {
          custo_combustiveis: number | null
          data: string | null
          faltas: number | null
          lucro_bruto: number | null
          lucro_liquido: number | null
          margem_bruta_percentual: number | null
          margem_liquida_percentual: number | null
          posto_id: number | null
          receita_bruta: number | null
          taxas_pagamento: number | null
        }
        Insert: {
          custo_combustiveis?: number | null
          data?: never
          faltas?: never
          lucro_bruto?: number | null
          lucro_liquido?: number | null
          margem_bruta_percentual?: number | null
          margem_liquida_percentual?: number | null
          posto_id?: number | null
          receita_bruta?: number | null
          taxas_pagamento?: number | null
        }
        Update: {
          custo_combustiveis?: number | null
          data?: never
          faltas?: never
          lucro_bruto?: number | null
          lucro_liquido?: number | null
          margem_bruta_percentual?: number | null
          margem_liquida_percentual?: number | null
          posto_id?: number | null
          receita_bruta?: number | null
          taxas_pagamento?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "Fechamento_posto_id_fkey"
            columns: ["posto_id"]
            isOneToOne: false
            referencedRelation: "Posto"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      abrir_caixa: {
        Args: { p_frentista_id: number; p_posto_id: number; p_turno_id: number }
        Returns: Json
      }
      calcular_juros_divida: {
        Args: { p_divida_id: string; p_meses?: number }
        Returns: number
      }
      calcular_lucro_fechamento: {
        Args: { p_fechamento_id: number }
        Returns: {
          custo_total: number
          faltas: number
          faturamento: number
          lucro_bruto: number
          lucro_liquido: number
          margem_bruta_pct: number
          margem_liquida_pct: number
          taxas: number
        }[]
      }
      calcular_vendas_por_fechamento: {
        Args: { p_data_fim: string; p_data_inicio: string; p_posto_id: number }
        Returns: {
          combustivel_id: number
          combustivel_nome: string
          dias_com_venda: number
          faturamento_total: number
          lucro_bruto: number
          preco_medio: number
          volume_vendido: number
        }[]
      }
      get_dashboard_proprietario: {
        Args: { p_data_fim: string; p_data_inicio: string; p_posto_id: number }
        Returns: {
          custo_taxas: number
          lucro_bruto: number
          lucro_liquido: number
          total_vendas: number
          volume_total: number
        }[]
      }
      get_encerrantes_mensal: {
        Args: { p_ano: number; p_mes: number; p_posto_id: number }
        Returns: {
          bico_nome: string
          combustivel_nome: string
          diferenca: number
          leitura_final: number
          leitura_inicial: number
          vendas_registradas: number
        }[]
      }
      get_fechamento_mensal:
        | {
            Args: { p_ano: number; p_mes: number; p_posto_id: number }
            Returns: {
              custo_taxas: number
              dia: string
              faturamento_bruto: number
              lucro_bruto: number
              lucro_liquido: number
              status: string
              vol_aditivada: number
              vol_diesel: number
              vol_etanol: number
              vol_gasolina: number
              volume_total: number
            }[]
          }
        | {
            Args: { p_ano: number; p_mes: number; p_posto_id: number }
            Returns: {
              custo_taxas: number
              dia: string
              faturamento_bruto: number
              lucro_bruto: number
              lucro_liquido: number
              status: Database["public"]["Enums"]["StatusFechamento"]
              vol_aditivada: number
              vol_diesel: number
              vol_etanol: number
              vol_gasolina: number
              volume_total: number
            }[]
          }
      get_frentistas_with_email: {
        Args: never
        Returns: {
          ativo: boolean
          cpf: string
          data_admissao: string
          email: string
          id: number
          nome: string
          telefone: string
          turno_id: number
          user_id: string
        }[]
      }
      projetar_quitacao: {
        Args: { p_divida_id: string; p_pagamento_mensal: number }
        Returns: {
          meses_necessarios: number
          total_a_pagar: number
          total_juros: number
        }[]
      }
      reconciliar_estoque_vendas: {
        Args: { p_data_fim: string; p_data_inicio: string; p_posto_id: number }
        Returns: {
          combustivel_id: number
          combustivel_nome: string
          compras_periodo: number
          divergencia: number
          divergencia_percent: number
          estoque_inicial: number
          estoque_real: number
          estoque_teorico: number
          vendas_periodo: number
        }[]
      }
      user_has_posto_access: { Args: { p_posto_id: number }; Returns: boolean }
      verificar_caixa_aberto: {
        Args: { p_frentista_id: number }
        Returns: Json
      }
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      installment_status: ["pendente", "pago", "atrasado"],
      periodicity_type: ["mensal", "quinzenal", "semanal", "diario"],
      Role: ["ADMIN", "GERENTE", "OPERADOR", "FRENTISTA"],
      StatusFechamento: ["RASCUNHO", "FECHADO", "ABERTO"],
      TipoTransacaoBaratencia: ["DEPOSITO", "CONVERSAO", "RESGATE", "ESTORNO"],
    },
  },
} as const

