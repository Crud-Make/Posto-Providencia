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
      HistoricoTanque: {
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
      },
      Bomba: {
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
      Combustivel: {
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
      Cliente: {
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

      NotaFrentista: {
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
      Divida: {
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
      Despesa: {
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
        }
        Relationships: [
          {
            foreignKeyName: "Despesa_posto_id_fkey"
            columns: ["posto_id"]
            isOneToOne: false
            referencedRelation: "Posto"
            referencedColumns: ["id"]
          }
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
      Configuracao: {
        Row: {
          categoria: string
          chave: string
          descricao: string | null
          id: number
          tipo: string
          updated_at: string
          valor: string
        }
        Insert: {
          categoria?: string
          chave: string
          descricao?: string | null
          id?: number
          tipo?: string
          updated_at?: string
          valor: string
        }
        Update: {
          categoria?: string
          chave?: string
          descricao?: string | null
          id?: number
          tipo?: string
          updated_at?: string
          valor?: string
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
          periodicidade?: Database["public"]["Enums"]["periodicity_type"]
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
          periodicidade?: Database["public"]["Enums"]["periodicity_type"]
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
      Estoque: {
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
      Fechamento: {
        Row: {
          createdAt: string
          data: string
          diferenca: number
          id: number
          observacoes: string | null
          status: Database["public"]["Enums"]["StatusFechamento"]
          total_recebido: number
          total_vendas: number
          turno_id: number | null
          updatedAt: string
          usuario_id: number
          posto_id: number
        }
        Insert: {
          createdAt?: string
          data: string
          diferenca: number
          id?: number
          observacoes?: string | null
          status?: Database["public"]["Enums"]["StatusFechamento"]
          total_recebido: number
          total_vendas: number
          turno_id?: number | null
          updatedAt?: string
          usuario_id: number
          posto_id: number
        }
        Update: {
          createdAt?: string
          data?: string
          diferenca?: number
          id?: number
          observacoes?: string | null
          status?: Database["public"]["Enums"]["StatusFechamento"]
          total_recebido?: number
          total_vendas?: number
          turno_id?: number | null
          updatedAt?: string
          usuario_id?: number
          posto_id?: number
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
      FechamentoFrentista: {
        Row: {
          fechamento_id: number
          frentista_id: number
          id: number
          observacoes: string | null
          valor_cartao: number
          valor_conferido: number
          valor_dinheiro: number
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
          valor_conferido?: number
          valor_dinheiro?: number
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
          valor_conferido?: number
          valor_dinheiro?: number
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
      FormaPagamento: {
        Row: {
          ativo: boolean
          id: number
          nome: string
          taxa: number | null
          tipo: string
          posto_id: number
        }
        Insert: {
          ativo?: boolean
          id?: number
          nome: string
          taxa?: number | null
          tipo: string
          posto_id: number
        }
        Update: {
          ativo?: boolean
          id?: number
          nome?: string
          taxa?: number | null
          tipo?: string
          posto_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "FormaPagamento_posto_id_fkey"
            columns: ["posto_id"]
            isOneToOne: false
            referencedRelation: "Posto"
            referencedColumns: ["id"]
          }
        ]
      }
      Fornecedor: {
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
      Frentista: {
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
      Maquininha: {
        Row: {
          ativo: boolean
          id: number
          nome: string
          operadora: string | null
          taxa: number | null
          posto_id: number
        }
        Insert: {
          ativo?: boolean
          id?: number
          nome: string
          operadora?: string | null
          taxa?: number | null
          posto_id: number
        }
        Update: {
          ativo?: boolean
          id?: number
          nome?: string
          operadora?: string | null
          taxa?: number | null
          posto_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "Maquininha_posto_id_fkey"
            columns: ["posto_id"]
            isOneToOne: false
            referencedRelation: "Posto"
            referencedColumns: ["id"]
          }
        ]
      }
      MovimentacaoEstoque: {
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
          tipo: string | null
          titulo: string
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
          tipo?: string | null
          titulo: string
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
          tipo?: string | null
          titulo?: string
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
      VendaProduto: {
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
      Tanque: {
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
      },
      Posto: {
        Row: {
          id: number
          nome: string
          cnpj: string | null
          endereco: string | null
          cidade: string | null
          estado: string | null
          telefone: string | null
          email: string | null
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          nome: string
          cnpj?: string | null
          endereco?: string | null
          cidade?: string | null
          estado?: string | null
          telefone?: string | null
          email?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          nome?: string
          cnpj?: string | null
          endereco?: string | null
          cidade?: string | null
          estado?: string | null
          telefone?: string | null
          email?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      UsuarioPosto: {
        Row: {
          id: number
          usuario_id: number
          posto_id: number
          role: string
          ativo: boolean
          created_at: string
        }
        Insert: {
          id?: number
          usuario_id: number
          posto_id: number
          role?: string
          ativo?: boolean
          created_at?: string
        }
        Update: {
          id?: number
          usuario_id?: number
          posto_id?: number
          role?: string
          ativo?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "UsuarioPosto_usuario_id_fkey"
            columns: ["usuario_id"]
            referencedRelation: "Usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "UsuarioPosto_posto_id_fkey"
            columns: ["posto_id"]
            referencedRelation: "Posto"
            referencedColumns: ["id"]
          }
        ]
      }
      Escala: {
        Row: {
          id: number
          frentista_id: number
          data: string
          tipo: 'FOLGA' | 'TRABALHO'
          turno_id: number | null
          observacao: string | null
          created_at: string
        }
        Insert: {
          id?: number
          frentista_id: number
          data: string
          tipo: 'FOLGA' | 'TRABALHO'
          turno_id?: number | null
          observacao?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          frentista_id?: number
          data?: string
          tipo?: 'FOLGA' | 'TRABALHO'
          turno_id?: number | null
          observacao?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "Escala_frentista_id_fkey"
            columns: ["frentista_id"]
            referencedRelation: "Frentista"
            referencedColumns: ["id"]
          }
        ]
      }
      Recebimento: {
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
      ClienteBaratencia: {
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
      CarteiraBaratencia: {
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
      TransacaoBaratencia: {
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
      TokenAbastecimento: {
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
      PromocaoBaratencia: {
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calcular_juros_divida: {
        Args: { p_divida_id: string; p_meses?: number }
        Returns: number
      }
      projetar_quitacao: {
        Args: { p_divida_id: string; p_pagamento_mensal: number }
        Returns: {
          meses_necessarios: number
          total_a_pagar: number
          total_juros: number
        }[]
      }
    }
    Enums: {
      installment_status: "pendente" | "pago" | "atrasado"
      periodicity_type: "mensal" | "quinzenal" | "semanal" | "diario"
      Role: "ADMIN" | "GERENTE" | "OPERADOR" | "FRENTISTA"
      StatusFechamento: "RASCUNHO" | "FECHADO"
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
      StatusFechamento: ["RASCUNHO", "FECHADO"],
      TipoTransacaoBaratencia: ["DEPOSITO", "CONVERSAO", "RESGATE", "ESTORNO"],
      StatusTokenAbastecimento: ["PENDENTE", "USADO", "EXPIRADO", "CANCELADO"],
    },
  },
} as const

// === HELPER TYPES ===
type DbTables = Database['public']['Tables'];

export type Bico = DbTables['Bico']['Row'];
export type Bomba = DbTables['Bomba']['Row'];
export type Combustivel = DbTables['Combustivel']['Row'];
export type Compra = DbTables['Compra']['Row'];
export type Divida = DbTables['Divida']['Row'];
export type Configuracao = DbTables['Configuracao']['Row'];
export type Emprestimo = DbTables['Emprestimo']['Row'];
export type Estoque = DbTables['Estoque']['Row'];
export type Fechamento = DbTables['Fechamento']['Row'];
export type FechamentoFrentista = DbTables['FechamentoFrentista']['Row'];
export type FormaPagamento = DbTables['FormaPagamento']['Row'];
export type Fornecedor = DbTables['Fornecedor']['Row'];
export type Frentista = DbTables['Frentista']['Row'];
export type Leitura = DbTables['Leitura']['Row'];
export type Maquininha = DbTables['Maquininha']['Row'];
export type Notificacao = DbTables['Notificacao']['Row'];
export type Parcela = DbTables['Parcela']['Row'];
export type Produto = DbTables['Produto']['Row'];
export type MovimentacaoEstoque = DbTables['MovimentacaoEstoque']['Row'];
export type PushToken = DbTables['PushToken']['Row'];
export type Recebimento = DbTables['Recebimento']['Row'];
export type Turno = DbTables['Turno']['Row'];
export type Usuario = DbTables['Usuario']['Row'];
export type VendaProduto = DbTables['VendaProduto']['Row'];

export type Posto = DbTables['Posto']['Row'];
export type UsuarioPosto = DbTables['UsuarioPosto']['Row'];
export type Cliente = DbTables['Cliente']['Row'];
export type NotaFrentista = DbTables['NotaFrentista']['Row'];

export type InsertTables<T extends keyof DbTables> = DbTables[T]['Insert'];
export type UpdateTables<T extends keyof DbTables> = DbTables[T]['Update'];

export type Role = Enums<'Role'>;
export type StatusFechamento = Enums<'StatusFechamento'>;
export type InstallmentStatus = Enums<'installment_status'>;
export type PeriodicityType = Enums<'periodicity_type'>;

// Baratência types (mapeados do Database['public']['Tables'])
export type ClienteBaratencia = DbTables['ClienteBaratencia']['Row'];
export type CarteiraBaratencia = DbTables['CarteiraBaratencia']['Row'];
export type TransacaoBaratencia = DbTables['TransacaoBaratencia']['Row'];
export type TokenAbastecimento = DbTables['TokenAbastecimento']['Row'];
export type PromocaoBaratencia = DbTables['PromocaoBaratencia']['Row'];

export type TipoTransacaoBaratencia = DbTables['TransacaoBaratencia']['Row']['tipo'];
export type StatusTokenAbastecimento = DbTables['TokenAbastecimento']['Row']['status'];

// Backwards compatibility or specific interfaces if needed
export type InsertClienteBaratencia = DbTables['ClienteBaratencia']['Insert'];
export type UpdateClienteBaratencia = DbTables['ClienteBaratencia']['Update'];
