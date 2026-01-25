/**
 * UI Types - Exportador central de tipos
 * 
 * @remarks
 * Ponto único de importação para todos os tipos de UI do sistema.
 * Organizado em três categorias principais:
 * 
 * 1. **Smart Types** - Tipos derivados do banco de dados
 * 2. **Form Types** - Tipos para formulários React
 * 3. **Response Types** - Tipos de resposta padronizados
 * 
 * @example
 * ```typescript
 * // ✅ Import centralizado
 * import {
 *   // Smart Types
 *   Cliente,
 *   CreateCliente,
 *   UpdateCliente,
 *   
 *   // Form Types
 *   ClienteFormData,
 *   FormFields,
 *   
 *   // Response Types
 *   ApiResponse,
 *   isSuccess,
 *   createSuccessResponse
 * } from '../../types/ui';
 * ```
 * 
 * @author Sistema de Gestão - Posto Providência
 * @version 2.0.0
 * @since 2026-01-16
 */

// ============================================================================
// SMART TYPES - Tipos derivados do banco de dados
// ============================================================================
export * from './smart-types';

// ============================================================================
// FORM TYPES - Tipos para formulários React
// ============================================================================
export * from './form-types';

// ============================================================================
// RESPONSE TYPES - Tipos de resposta padronizados
// ============================================================================
export * from './response-types';
