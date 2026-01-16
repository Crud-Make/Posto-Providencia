/**
 * Smart Types - Tipos derivados automaticamente das tabelas do Supabase
 * 
 * @remarks
 * Este arquivo centraliza tipos para operações CRUD, eliminando duplicação
 * e garantindo sincronização com o banco de dados. Todos os tipos são derivados
 * automaticamente de `database.types.ts`, garantindo type-safety completo.
 * 
 * @example
 * ```typescript
 * // ✅ Usar tipo derivado para leitura
 * const cliente: Cliente = await clienteService.getById(1);
 * 
 * // ✅ Criar novo registro (campos opcionais/gerados são automáticos)
 * const novoCliente: CreateCliente = { 
 *   nome: 'João Silva', 
 *   posto_id: 1 
 * };
 * 
 * // ✅ Atualizar registro (todos os campos são opcionais)
 * const updates: UpdateCliente = { 
 *   nome: 'João Silva Jr.' 
 * };
 * 
 * // ✅ Usar tipos especializados
 * const resumo: ClienteResumo = {
 *   id: 1,
 *   nome: 'João',
 *   documento: '123.456.789-00',
 *   saldo_devedor: 150.00
 * };
 * ```
 * 
 * @author Sistema de Gestão - Posto Providência
 * @version 2.0.0
 * @since 2026-01-16
 */

import type {
  Bico as DbBico,
  Bomba as DbBomba,
  Combustivel as DbCombustivel,
  Compra as DbCompra,
  Configuracao as DbConfiguracao,
  Divida as DbDivida,
  Emprestimo as DbEmprestimo,
  Estoque as DbEstoque,
  Fechamento as DbFechamento,
  FechamentoFrentista as DbFechamentoFrentista,
  FormaPagamento as DbFormaPagamento,
  Fornecedor as DbFornecedor,
  Frentista as DbFrentista,
  Leitura as DbLeitura,
  Maquininha as DbMaquininha,
  MovimentacaoEstoque as DbMovimentacaoEstoque,
  NotaFrentista as DbNotaFrentista,
  Notificacao as DbNotificacao,
  Parcela as DbParcela,
  Posto as DbPosto,
  Produto as DbProduto,
  PushToken as DbPushToken,
  Recebimento as DbRecebimento,
  Turno as DbTurno,
  Usuario as DbUsuario,
  UsuarioPosto as DbUsuarioPosto,
  VendaProduto as DbVendaProduto,
  Cliente as DbCliente,
  ClienteBaratencia as DbClienteBaratencia,
  CarteiraBaratencia as DbCarteiraBaratencia,
  TransacaoBaratencia as DbTransacaoBaratencia,
  TokenAbastecimento as DbTokenAbastecimento,
  PromocaoBaratencia as DbPromocaoBaratencia,
  InsertTables,
  UpdateTables
} from '../../services/database.types';

// ============================================================================
// TIPOS BASE - Entidades do Banco de Dados
// ============================================================================

export type Bico = DbBico;
export type Bomba = DbBomba;
export type Combustivel = DbCombustivel;
export type Compra = DbCompra;
export type Configuracao = DbConfiguracao;
export type Divida = DbDivida;
export type Emprestimo = DbEmprestimo;
export type Estoque = DbEstoque;
export type Fechamento = DbFechamento;
export type FechamentoFrentista = DbFechamentoFrentista;
export type FormaPagamento = DbFormaPagamento;
export type Fornecedor = DbFornecedor;
export type Frentista = DbFrentista;
export type Leitura = DbLeitura;
export type Maquininha = DbMaquininha;
export type MovimentacaoEstoque = DbMovimentacaoEstoque;
export type NotaFrentista = DbNotaFrentista;
export type Notificacao = DbNotificacao;
export type Parcela = DbParcela;
export type Posto = DbPosto;
export type Produto = DbProduto;
export type PushToken = DbPushToken;
export type Recebimento = DbRecebimento;
export type Turno = DbTurno;
export type Usuario = DbUsuario;
export type UsuarioPosto = DbUsuarioPosto;
export type VendaProduto = DbVendaProduto;

// ============================================================================
// CLIENTES - Tipos especializados
// ============================================================================

/**
 * Cliente completo (leitura do banco)
 */
export type Cliente = DbCliente;

/**
 * Cliente resumido para listas e seleções
 */
export type ClienteResumo = Pick<
  Cliente,
  'id' | 'nome' | 'documento' | 'saldo_devedor'
>;

/**
 * Cliente sem metadados técnicos (created_at, updated_at)
 */
export type ClienteSemMetadata = Omit<
  Cliente,
  'created_at' | 'updated_at'
>;

// ============================================================================
// BARATÊNCIA - Sistema de Fidelidade
// ============================================================================

export type ClienteBaratencia = DbClienteBaratencia;
export type CarteiraBaratencia = DbCarteiraBaratencia;
export type TransacaoBaratencia = DbTransacaoBaratencia;
export type TokenAbastecimento = DbTokenAbastecimento;
export type PromocaoBaratencia = DbPromocaoBaratencia;

// ============================================================================
// TIPOS CRUD - Create/Update para todas as entidades
// ============================================================================

// Cliente
export type CreateCliente = InsertTables<'Cliente'>;
export type UpdateCliente = UpdateTables<'Cliente'>;

export type CreateBico = InsertTables<'Bico'>;
export type UpdateBico = UpdateTables<'Bico'>;

export type CreateBomba = InsertTables<'Bomba'>;
export type UpdateBomba = UpdateTables<'Bomba'>;

export type CreateCombustivel = InsertTables<'Combustivel'>;
export type UpdateCombustivel = UpdateTables<'Combustivel'>;

export type CreateCompra = InsertTables<'Compra'>;
export type UpdateCompra = UpdateTables<'Compra'>;

export type CreateConfiguracao = InsertTables<'Configuracao'>;
export type UpdateConfiguracao = UpdateTables<'Configuracao'>;

export type CreateDivida = InsertTables<'Divida'>;
export type UpdateDivida = UpdateTables<'Divida'>;

export type CreateEmprestimo = InsertTables<'Emprestimo'>;
export type UpdateEmprestimo = UpdateTables<'Emprestimo'>;

export type CreateEstoque = InsertTables<'Estoque'>;
export type UpdateEstoque = UpdateTables<'Estoque'>;

export type CreateFechamento = InsertTables<'Fechamento'>;
export type UpdateFechamento = UpdateTables<'Fechamento'>;

export type CreateFechamentoFrentista = InsertTables<'FechamentoFrentista'>;
export type UpdateFechamentoFrentista = UpdateTables<'FechamentoFrentista'>;

export type CreateFormaPagamento = InsertTables<'FormaPagamento'>;
export type UpdateFormaPagamento = UpdateTables<'FormaPagamento'>;

export type CreateFornecedor = InsertTables<'Fornecedor'>;
export type UpdateFornecedor = UpdateTables<'Fornecedor'>;

export type CreateFrentista = InsertTables<'Frentista'>;
export type UpdateFrentista = UpdateTables<'Frentista'>;

export type CreateLeitura = InsertTables<'Leitura'>;
export type UpdateLeitura = UpdateTables<'Leitura'>;

export type CreateMaquininha = InsertTables<'Maquininha'>;
export type UpdateMaquininha = UpdateTables<'Maquininha'>;

export type CreateMovimentacaoEstoque = InsertTables<'MovimentacaoEstoque'>;
export type UpdateMovimentacaoEstoque = UpdateTables<'MovimentacaoEstoque'>;

export type CreateNotaFrentista = InsertTables<'NotaFrentista'>;
export type UpdateNotaFrentista = UpdateTables<'NotaFrentista'>;

export type CreateNotificacao = InsertTables<'Notificacao'>;
export type UpdateNotificacao = UpdateTables<'Notificacao'>;

export type CreateParcela = InsertTables<'Parcela'>;
export type UpdateParcela = UpdateTables<'Parcela'>;

export type CreatePosto = InsertTables<'Posto'>;
export type UpdatePosto = UpdateTables<'Posto'>;

export type CreateProduto = InsertTables<'Produto'>;
export type UpdateProduto = UpdateTables<'Produto'>;

export type CreatePushToken = InsertTables<'PushToken'>;
export type UpdatePushToken = UpdateTables<'PushToken'>;

export type CreateRecebimento = InsertTables<'Recebimento'>;
export type UpdateRecebimento = UpdateTables<'Recebimento'>;

export type CreateTurno = InsertTables<'Turno'>;
export type UpdateTurno = UpdateTables<'Turno'>;

export type CreateUsuario = InsertTables<'Usuario'>;
export type UpdateUsuario = UpdateTables<'Usuario'>;

export type CreateUsuarioPosto = InsertTables<'UsuarioPosto'>;
export type UpdateUsuarioPosto = UpdateTables<'UsuarioPosto'>;

export type CreateVendaProduto = InsertTables<'VendaProduto'>;
export type UpdateVendaProduto = UpdateTables<'VendaProduto'>;

export type CreateClienteBaratencia = InsertTables<'ClienteBaratencia'>;
export type UpdateClienteBaratencia = UpdateTables<'ClienteBaratencia'>;

export type CreateCarteiraBaratencia = InsertTables<'CarteiraBaratencia'>;
export type UpdateCarteiraBaratencia = UpdateTables<'CarteiraBaratencia'>;

export type CreateTransacaoBaratencia = InsertTables<'TransacaoBaratencia'>;
export type UpdateTransacaoBaratencia = UpdateTables<'TransacaoBaratencia'>;

export type CreateTokenAbastecimento = InsertTables<'TokenAbastecimento'>;
export type UpdateTokenAbastecimento = UpdateTables<'TokenAbastecimento'>;

export type CreatePromocaoBaratencia = InsertTables<'PromocaoBaratencia'>;
export type UpdatePromocaoBaratencia = UpdateTables<'PromocaoBaratencia'>;
