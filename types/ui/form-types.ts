/**
 * Form Types - Tipos para formulários React
 * 
 * @remarks
 * Converte automaticamente tipos do banco para tipos de formulário:
 * - number → string (inputs HTML aceitam apenas strings)
 * - Date → string (ISO format)
 * - boolean → checkbox state
 * 
 * Isso elimina a necessidade de conversões manuais e garante type-safety
 * em todo o fluxo de dados do formulário.
 * 
 * @example
 * ```typescript
 * // ✅ Formulário type-safe
 * const [formData, setFormData] = useState<ClienteFormData>({
 *   nome: '',
 *   documento: '',
 *   limite_credito: '', // string, não number!
 *   ativo: false
 * });
 * 
 * // ✅ Converter de volta ao submeter
 * const clienteData: CreateCliente = {
 *   ...formData,
 *   limite_credito: parseFloat(formData.limite_credito) || 0,
 *   posto_id: 1
 * };
 * ```
 * 
 * @author Sistema de Gestão - Posto Providência
 * @version 2.0.0
 * @since 2026-01-16
 */

// Tipos utilitários para formulários
import { Cliente } from './smart-types';

// ============================================================================
// UTILITY TYPES - Conversores genéricos
// ============================================================================

/**
 * Converte campos numéricos e de data em string para inputs HTML.
 * 
 * @template T - Tipo base a ser convertido
 * 
 * @example
 * ```typescript
 * type ClienteForm = FormFields<Cliente>;
 * // limite_credito: number → string
 * // created_at: Date → string
 * ```
 */
export type FormFields<T> = {
  [K in keyof T]: T[K] extends number
  ? string
  : T[K] extends number | null
  ? string
  : T[K] extends Date
  ? string
  : T[K] extends Date | null
  ? string
  : T[K];
};

/**
 * Torna campos específicos opcionais (útil para edição).
 * 
 * @template T - Tipo base
 * @template K - Chaves a tornar opcionais
 */
export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Torna campos específicos obrigatórios.
 * 
 * @template T - Tipo base
 * @template K - Chaves a tornar obrigatórias
 */
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// ============================================
// FORM DATA TYPES
// ============================================

/**
 * Dados do formulário de Cliente.
 * Converte tipos numéricos/data para string para input HTML.
 */
export type ClienteFormData = FormFields<Omit<Cliente, 'id' | 'created_at' | 'posto_id'>> & {
  id?: number; // Opcional para edição
};

// ============================================
// VALIDATION UTILS
// ============================================

export interface FieldValidation {
  isValid: boolean;
  error?: string;
  touched: boolean;
}

export type FormValidation<T> = {
  [K in keyof T]: FieldValidation;
};

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

