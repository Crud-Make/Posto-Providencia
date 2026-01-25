import { DatabaseEnums } from './enums';
import { PostoTable, TurnoTable, ConfiguracaoTable, UsuarioTable, UsuarioPostoTable } from './tables/infraestrutura';
import { CombustivelTable, BombaTable, BicoTable, TanqueTable, HistoricoTanqueTable, EstoqueTable } from './tables/combustiveis';
import { FrentistaTable, LeituraTable, FechamentoTable, FechamentoFrentistaTable, RecebimentoTable, EscalaTable } from './tables/operacoes';
import { FormaPagamentoTable, MaquininhaTable } from './tables/pagamentos';
import { EmprestimoTable, ParcelaTable, DividaTable, DespesaTable } from './tables/financeiro';
import { CompraTable, FornecedorTable } from './tables/compras';
import { ProdutoTable, VendaProdutoTable, MovimentacaoEstoqueTable } from './tables/produtos';
import { ClienteTable, NotaFrentistaTable } from './tables/clientes';
import { ClienteBaratenciaTable, CarteiraBaratenciaTable, TransacaoBaratenciaTable, TokenAbastecimentoTable, PromocaoBaratenciaTable } from './tables/baratencia';
import { NotificacaoTable, PushTokenTable } from './tables/notificacoes';

export interface Database {
  public: {
    Tables: {
      // Infraestrutura
      Posto: PostoTable
      Turno: TurnoTable
      Configuracao: ConfiguracaoTable
      Usuario: UsuarioTable
      UsuarioPosto: UsuarioPostoTable

      // Combustíveis
      Combustivel: CombustivelTable
      Bomba: BombaTable
      Bico: BicoTable
      Tanque: TanqueTable
      HistoricoTanque: HistoricoTanqueTable
      Estoque: EstoqueTable

      // Operações
      Frentista: FrentistaTable
      Leitura: LeituraTable
      Fechamento: FechamentoTable
      FechamentoFrentista: FechamentoFrentistaTable
      Recebimento: RecebimentoTable
      Escala: EscalaTable

      // Pagamentos
      FormaPagamento: FormaPagamentoTable
      Maquininha: MaquininhaTable

      // Financeiro
      Emprestimo: EmprestimoTable
      Parcela: ParcelaTable
      Divida: DividaTable
      Despesa: DespesaTable

      // Compras
      Compra: CompraTable
      Fornecedor: FornecedorTable

      // Produtos
      Produto: ProdutoTable
      VendaProduto: VendaProdutoTable
      MovimentacaoEstoque: MovimentacaoEstoqueTable

      // Clientes
      Cliente: ClienteTable
      NotaFrentista: NotaFrentistaTable
      ClienteBaratencia: ClienteBaratenciaTable
      CarteiraBaratencia: CarteiraBaratenciaTable
      TransacaoBaratencia: TransacaoBaratenciaTable
      TokenAbastecimento: TokenAbastecimentoTable
      PromocaoBaratencia: PromocaoBaratenciaTable

      // Notificações
      Notificacao: NotificacaoTable
      PushToken: PushTokenTable
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
      get_frentistas_with_email: {
        Args: Record<string, never>
        Returns: (FrentistaTable['Row'] & { email: string | null })[]
      }
      get_fechamento_mensal: {
        Args: { p_posto_id: number; p_mes: number; p_ano: number }
        Returns: {
          dia: string
          volume_total: number
          faturamento_bruto: number
          lucro_bruto: number
          custo_taxas: number
          lucro_liquido: number
          status: string
          vol_gasolina: number
          vol_aditivada: number
          vol_etanol: number
          vol_diesel: number
        }[]
      }
      get_encerrantes_mensal: {
        Args: { p_posto_id: number; p_mes: number; p_ano: number }
        Returns: {
          bico_nome: string
          combustivel_nome: string
          leitura_inicial: number
          leitura_final: number
          vendas_registradas: number
          diferenca: number
        }[]
      }
    }
    Enums: DatabaseEnums
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
