// [09/01 20:04] Centralizador de exportação de tipos para o sistema
/**
 * Ponto central de exportação de tipos.
 * Resolve conflitos entre tipos de UI e Database.
 * O tipo 'Cliente' vem de './ui' (smart-types), não de './database' (para evitar conflito).
 */

// Exportamos tudo de UI (que contém as interfaces de visualização, incl. Cliente)
export * from './ui';
export * from './fechamento';

// Re-exportamos explicitamente do database, OMITINDO 'Cliente' (já vem de ./ui)
export type {
    // Infraestrutura
    Posto, Turno, Configuracao, Usuario, UsuarioPosto,
    // Combustíveis
    Combustivel, Bomba, Bico, Tanque, HistoricoTanque, Estoque,
    // Operações
    Frentista, Leitura, Fechamento, FechamentoFrentista, Recebimento, Escala,
    // Pagamentos
    FormaPagamento, Maquininha,
    // Financeiro
    Emprestimo, Parcela, DBDivida, DBDespesa,
    // Compras
    Compra, Fornecedor,
    // Produtos
    Produto, VendaProduto, MovimentacaoEstoque,
    // Clientes (sem 'Cliente' - já vem de ./ui/smart-types)
    DBCliente, DBNotaFrentista,
    ClienteBaratencia, CarteiraBaratencia, TransacaoBaratencia, TokenAbastecimento, PromocaoBaratencia,
    // Notificações
    Notificacao, PushToken,
    // Insert/Update
    InsertClienteBaratencia, UpdateClienteBaratencia,
    // Enums
    Role, StatusFechamento, InstallmentStatus, PeriodicityType, TipoTransacaoBaratencia, StatusTokenAbastecimento,
} from './database/index';

// Re-export helpers
export type { InsertTables, UpdateTables } from './database/helpers';
