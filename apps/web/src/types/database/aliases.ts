import { Database } from './schema';
import { PostoTable, TurnoTable, ConfiguracaoTable, UsuarioTable, UsuarioPostoTable } from './tables/infraestrutura';
import { CombustivelTable, BombaTable, BicoTable, TanqueTable, HistoricoTanqueTable, EstoqueTable } from './tables/combustiveis';
import { FrentistaTable, LeituraTable, FechamentoTable, FechamentoFrentistaTable, RecebimentoTable, EscalaTable } from './tables/operacoes';
import { FormaPagamentoTable, MaquininhaTable } from './tables/pagamentos';
import { EmprestimoTable, ParcelaTable, DividaTable, DespesaTable } from './tables/financeiro';
import { CompraTable, FornecedorTable } from './tables/compras';
import { ProdutoTable, VendaProdutoTable, MovimentacaoEstoqueTable } from './tables/produtos';
import { ClienteTable, NotaFrentistaTable } from './tables/clientes';
import type {
  Posto as PostoDomain,
  Turno as TurnoDomain,
  Usuario as UsuarioDomain,
  Frentista as FrentistaDomain,
  Fechamento as FechamentoDomain,
  FechamentoFrentista as FechamentoFrentistaDomain,
  Escala as EscalaDomain,
  Produto as ProdutoDomain,
  VendaProduto as VendaProdutoDomain,
  Cliente as ClienteDomain,
} from '@posto/types';
import { ClienteBaratenciaTable, CarteiraBaratenciaTable, TransacaoBaratenciaTable, TokenAbastecimentoTable, PromocaoBaratenciaTable } from './tables/baratencia';
import { NotificacaoTable, PushTokenTable } from './tables/notificacoes';

// Infraestrutura
export type Posto = PostoDomain;
export type Turno = TurnoDomain;
export type Configuracao = ConfiguracaoTable['Row'];
export type Usuario = UsuarioDomain;
export type UsuarioPosto = UsuarioPostoTable['Row'];

// Combustíveis
export type Combustivel = CombustivelTable['Row'];
export type Bomba = BombaTable['Row'];
export type Bico = BicoTable['Row'];
export type Tanque = TanqueTable['Row'];
export type HistoricoTanque = HistoricoTanqueTable['Row'];
export type Estoque = EstoqueTable['Row'];

// Operações
export type Frentista = FrentistaDomain;
export type Leitura = LeituraTable['Row'];
export type Fechamento = FechamentoDomain;
export type FechamentoFrentista = FechamentoFrentistaDomain;
export type Recebimento = RecebimentoTable['Row'];
export type Escala = EscalaDomain;

// Pagamentos
export type FormaPagamento = FormaPagamentoTable['Row'];
export type Maquininha = MaquininhaTable['Row'];

// Financeiro
export type Emprestimo = EmprestimoTable['Row'];
export type Parcela = ParcelaTable['Row'];
export type DBDivida = DividaTable['Row'];
export type DBDespesa = DespesaTable['Row'];

// Compras
export type Compra = CompraTable['Row'];
export type Fornecedor = FornecedorTable['Row'];

// Produtos
export type Produto = ProdutoDomain;
export type VendaProduto = VendaProdutoDomain;
export type MovimentacaoEstoque = MovimentacaoEstoqueTable['Row'];

// Clientes
export type Cliente = ClienteDomain;
export type DBCliente = ClienteTable['Row'];
export type DBNotaFrentista = NotaFrentistaTable['Row'];
export type ClienteBaratencia = ClienteBaratenciaTable['Row'];
export type CarteiraBaratencia = CarteiraBaratenciaTable['Row'];
export type TransacaoBaratencia = TransacaoBaratenciaTable['Row'];
export type TokenAbastecimento = TokenAbastecimentoTable['Row'];
export type PromocaoBaratencia = PromocaoBaratenciaTable['Row'];

// Notificações
export type Notificacao = NotificacaoTable['Row'];
export type PushToken = PushTokenTable['Row'];

// Specific Insert/Update types (commonly used)
export type InsertClienteBaratencia = ClienteBaratenciaTable['Insert'];
export type UpdateClienteBaratencia = ClienteBaratenciaTable['Update'];

// Enum Aliases
export type Role = Database['public']['Enums']['Role'];
export type StatusFechamento = Database['public']['Enums']['StatusFechamento'];
export type InstallmentStatus = Database['public']['Enums']['installment_status'];
export type PeriodicityType = Database['public']['Enums']['periodicity_type'];
export type TipoTransacaoBaratencia = Database['public']['Enums']['TipoTransacaoBaratencia'];
export type StatusTokenAbastecimento = Database['public']['Enums']['StatusTokenAbastecimento'];
