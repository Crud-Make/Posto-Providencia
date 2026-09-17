// [14/01 15:10] Criação de Smart Types baseados em tabelas do Supabase
/**
 * Smart Types derivados das tabelas do Supabase
 *
 * @remarks
 * Centraliza tipos de domínio utilizados pela camada de services e UI,
 * garantindo single source of truth com o schema do banco.
 */
import type { ClienteTable, NotaFrentistaTable } from '../database/tables/clientes';
import type { Cliente as ClienteDomain } from '@posto/types';

/**
 * Cliente base para operações de leitura (SELECT).
 */
export type Cliente = ClienteDomain;

/**
 * Payload para criação de cliente (INSERT).
 * Campos gerenciados pelo banco (id, created_at, updated_at, etc.)
 * permanecem opcionais.
 */
export type CreateCliente = ClienteTable['Insert'];

/**
 * Payload para atualização parcial de cliente (UPDATE).
 * Todos os campos são opcionais, seguindo o tipo gerado pelo Supabase.
 */
export type UpdateCliente = ClienteTable['Update'];

/**
 * Cliente com conjunto reduzido de campos para listagens e seletores.
 */
export type ClienteResumo = Pick<Cliente, 'id' | 'nome' | 'documento' | 'saldo_devedor'>;

/**
 * Cliente sem metadados técnicos de criação/atualização.
 */
export type ClienteSemMetadata = Omit<Cliente, 'created_at' | 'updated_at'>;

/**
 * Nota de frentista base para operações de leitura.
 */
export type NotaFrentista = NotaFrentistaTable['Row'];

