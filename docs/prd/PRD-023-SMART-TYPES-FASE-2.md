# 📋 PRD-023 - Smart Types Fase 2: Expansão do Sistema de Tipagem

## 📌 Informações do Documento

| Campo | Valor |
|-------|-------|
| **Produto** | Posto Providência - Sistema de Tipagem Inteligente |
| **PRD** | #023 |
| **Versão** | 1.0 |
| **Data** | 16 de Janeiro de 2026 |
| **Autor** | Thyago (Desenvolvedor Principal) |
| **Status** | 📋 Planejado |
| **Issue Relacionada** | #22 - Smart Types |
| **Branch Sugerida** | `refactor/#22-smart-types-fase-2` |
| **PRD Anterior** | PRD-022 (Fase 1 - Completa) |

---

## 🎯 Visão Geral

### Contexto

A **Fase 1 de Smart Types** foi concluída com sucesso, estabelecendo a fundação do sistema:
- ✅ Criado `WithRelations<T, R>` helper
- ✅ Refatorado `cliente.service.ts` como exemplo
- ✅ Reduzidas 4 ocorrências de `as unknown as` (27 → 23)

### Problema Atual

Apesar do progresso, ainda temos:

```typescript
// ❌ Problema 1: 23 ocorrências de "as unknown as" em 32 services
return (data as unknown as Venda[]) || [];

// ❌ Problema 2: ~48 interfaces manuais duplicadas
export interface Frentista {
  id: number;
  nome: string;
  // ... duplicando definição do banco
}

// ❌ Problema 3: Tipos de formulário repetidos
const [nome, setNome] = useState<string>('');
const [limiteCredito, setLimiteCredito] = useState<string>(''); // number → string manual

// ❌ Problema 4: Sem padrão para respostas de API
type Response = any; // 😱
```

### Objetivo da Fase 2

**Criar a infraestrutura completa de Smart Types** para que todos os 32 services restantes possam ser refatorados de forma consistente e rápida.

---

## 🎯 Objetivos e Resultados Esperados

### Objetivos Principais

1. **Criar 3 arquivos de tipos reutilizáveis**
   - `smart-types.ts` - Tipos derivados do banco
   - `form-types.ts` - Tipos para formulários React
   - `response-types.ts` - Tipos de resposta padronizados

2. **Estabelecer padrões de uso**
   - Documentação JSDoc completa
   - Exemplos práticos em cada arquivo
   - Guia de migração para services

3. **Preparar terreno para Fase 3**
   - Refatoração em massa dos 32 services
   - Eliminação total de `as unknown as`

### Métricas de Sucesso

| Métrica | Antes | Meta Fase 2 | Impacto |
|---------|-------|-------------|---------|
| Arquivos de tipos criados | 1 | 4 | +300% |
| Linhas de código (tipos) | ~50 | ~350 | Infraestrutura completa |
| Services prontos para migração | 1 | 33 | Base para Fase 3 |
| Documentação (exemplos) | 1 | 15+ | Guia completo |

---

## 📋 Escopo Detalhado

### 1. Criar `src/types/ui/smart-types.ts`

**Propósito:** Tipos derivados para operações CRUD em todas as tabelas.

**Conteúdo:**

```typescript
/**
 * Smart Types - Tipos derivados automaticamente das tabelas do Supabase
 * 
 * @remarks
 * Este arquivo centraliza tipos para operações CRUD, eliminando duplicação
 * e garantindo sincronização com o banco de dados.
 * 
 * @example
 * ```typescript
 * // ✅ Usar tipo derivado
 * const cliente: Cliente = await clienteService.getById(1);
 * 
 * // ✅ Criar novo registro
 * const novoCliente: CreateCliente = { nome: 'João', posto_id: 1 };
 * 
 * // ✅ Atualizar registro
 * const updates: UpdateCliente = { nome: 'João Silva' };
 * ```
 * 
 * @author Sistema de Gestão - Posto Providência
 * @version 1.0.0
 */

import type { ClienteTable } from '../database/tables/clientes';
import type { FrentistaTable } from '../database/tables/operacoes';
import type { VendaTable } from '../database/tables/vendas';
import type { FechamentoTable } from '../database/tables/operacoes';
// ... outros imports

// ============================================================================
// CLIENTES
// ============================================================================

/**
 * Cliente completo (leitura do banco)
 */
export type Cliente = ClienteTable['Row'];

/**
 * Dados para criar novo cliente
 * Campos como id, created_at são opcionais/gerados
 */
export type CreateCliente = ClienteTable['Insert'];

/**
 * Dados para atualizar cliente
 * Todos os campos são opcionais
 */
export type UpdateCliente = ClienteTable['Update'];

/**
 * Cliente resumido para listas e seleções
 */
export type ClienteResumo = Pick<Cliente, 'id' | 'nome' | 'documento' | 'saldo_devedor'>;

/**
 * Cliente sem metadados técnicos
 */
export type ClienteSemMetadata = Omit<Cliente, 'created_at' | 'updated_at'>;

// ============================================================================
// FRENTISTAS
// ============================================================================

export type Frentista = FrentistaTable['Row'];
export type CreateFrentista = FrentistaTable['Insert'];
export type UpdateFrentista = FrentistaTable['Update'];
export type FrenistaResumo = Pick<Frentista, 'id' | 'nome' | 'ativo'>;

// ============================================================================
// VENDAS
// ============================================================================

export type Venda = VendaTable['Row'];
export type CreateVenda = VendaTable['Insert'];
export type UpdateVenda = VendaTable['Update'];

// ============================================================================
// FECHAMENTOS
// ============================================================================

export type Fechamento = FechamentoTable['Row'];
export type CreateFechamento = FechamentoTable['Insert'];
export type UpdateFechamento = FechamentoTable['Update'];

// ... repetir para todas as 18+ tabelas principais
```

**Estimativa:** 2 horas  
**Linhas:** ~200

---

### 2. Criar `src/types/ui/form-types.ts`

**Propósito:** Tipos para formulários React com conversões automáticas.

**Conteúdo:**

```typescript
/**
 * Form Types - Tipos para formulários React
 * 
 * @remarks
 * Converte automaticamente tipos do banco para tipos de formulário:
 * - number → string (inputs HTML aceitam apenas strings)
 * - Date → string (ISO format)
 * - boolean → checkbox state
 * 
 * @example
 * ```typescript
 * // ✅ Formulário type-safe
 * const [formData, setFormData] = useState<ClienteFormData>({
 *   nome: '',
 *   limite_credito: '', // string, não number!
 *   ativo: false
 * });
 * ```
 * 
 * @author Sistema de Gestão - Posto Providência
 * @version 1.0.0
 */

/**
 * Converte campos numéricos em string para inputs HTML
 */
export type FormFields<T> = {
  [K in keyof T]: T[K] extends number
    ? string
    : T[K] extends Date
    ? string
    : T[K];
};

/**
 * Torna campos específicos opcionais (útil para edição)
 */
export type OptionalFields<T, K extends keyof T> =
  Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Torna campos específicos obrigatórios
 */
export type RequiredFields<T, K extends keyof T> =
  Omit<T, K> & Required<Pick<T, K>>;

// ============================================================================
// FORMULÁRIOS ESPECÍFICOS
// ============================================================================

import type { Cliente, CreateCliente, Frentista } from './smart-types';

/**
 * Formulário de Cliente
 * Números viram strings para inputs HTML
 */
export type ClienteFormData = FormFields<
  Pick<Cliente, 'nome' | 'documento' | 'telefone' | 'email' | 'limite_credito' | 'endereco'>
>;

/**
 * Formulário de criação de Cliente
 * ID e timestamps são omitidos
 */
export type CreateClienteFormData = FormFields<
  Omit<CreateCliente, 'id' | 'created_at' | 'updated_at' | 'posto_id'>
>;

/**
 * Formulário de Frentista
 */
export type FrenistaFormData = FormFields<
  Pick<Frentista, 'nome' | 'cpf' | 'telefone' | 'email' | 'ativo'>
>;

// ============================================================================
// VALIDAÇÃO DE FORMULÁRIOS
// ============================================================================

/**
 * Estado de validação de campo
 */
export interface FieldValidation {
  isValid: boolean;
  error?: string;
  touched: boolean;
}

/**
 * Estado de validação de formulário completo
 */
export type FormValidation<T> = {
  [K in keyof T]: FieldValidation;
};

/**
 * Resultado de validação
 */
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}
```

**Estimativa:** 1 hora  
**Linhas:** ~100

---

### 3. Criar `src/types/ui/response-types.ts`

**Propósito:** Tipos padronizados para respostas de API.

**Conteúdo:**

```typescript
/**
 * Response Types - Tipos padronizados para respostas de API
 * 
 * @remarks
 * Estabelece padrões consistentes para:
 * - Respostas de sucesso/erro
 * - Paginação
 * - Loading states
 * - Type guards para runtime safety
 * 
 * @example
 * ```typescript
 * // ✅ Resposta type-safe
 * const response: ApiResponse<Cliente[]> = await fetch(...);
 * 
 * if (isSuccess(response)) {
 *   console.log(response.data); // ✅ TypeScript sabe que é Cliente[]
 * } else {
 *   console.error(response.error); // ✅ TypeScript sabe que é erro
 * }
 * ```
 * 
 * @author Sistema de Gestão - Posto Providência
 * @version 1.0.0
 */

// ============================================================================
// RESPOSTAS BÁSICAS
// ============================================================================

/**
 * Resposta de sucesso padronizada
 */
export interface SuccessResponse<T> {
  data: T;
  success: true;
  timestamp: string;
  message?: string;
}

/**
 * Resposta de erro padronizada
 */
export interface ErrorResponse {
  error: string;
  code: string;
  success: false;
  timestamp: string;
  details?: Record<string, unknown>;
}

/**
 * União de resposta (sucesso ou erro)
 */
export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Verifica se resposta é de sucesso
 */
export function isSuccess<T>(
  response: ApiResponse<T>
): response is SuccessResponse<T> {
  return response.success === true;
}

/**
 * Verifica se resposta é de erro
 */
export function isError<T>(
  response: ApiResponse<T>
): response is ErrorResponse {
  return response.success === false;
}

// ============================================================================
// PAGINAÇÃO
// ============================================================================

/**
 * Parâmetros de paginação
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Resposta paginada genérica
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Metadados de paginação
 */
export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

// ============================================================================
// LOADING STATES
// ============================================================================

/**
 * Estado de carregamento
 */
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

/**
 * Estado de dados com loading
 */
export interface DataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  state: LoadingState;
}

/**
 * Hook state pattern
 */
export interface AsyncState<T> {
  data: T | null;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  error: Error | null;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Cria resposta de sucesso
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string
): SuccessResponse<T> {
  return {
    data,
    success: true,
    timestamp: new Date().toISOString(),
    message
  };
}

/**
 * Cria resposta de erro
 */
export function createErrorResponse(
  error: string,
  code: string = 'UNKNOWN_ERROR',
  details?: Record<string, unknown>
): ErrorResponse {
  return {
    error,
    code,
    success: false,
    timestamp: new Date().toISOString(),
    details
  };
}
```

**Estimativa:** 1 hora  
**Linhas:** ~150

---

### 4. Atualizar `src/types/ui/index.ts`

**Propósito:** Exportador central para todos os Smart Types.

**Conteúdo:**

```typescript
/**
 * UI Types - Exportador central
 * 
 * @remarks
 * Ponto único de importação para todos os tipos de UI.
 * 
 * @example
 * ```typescript
 * // ✅ Import centralizado
 * import {
 *   Cliente,
 *   CreateCliente,
 *   ClienteFormData,
 *   ApiResponse,
 *   isSuccess
 * } from '../../types/ui';
 * ```
 * 
 * @author Sistema de Gestão - Posto Providência
 * @version 1.0.0
 */

// Helpers (Fase 1 - já existe)
export * from './helpers';

// Smart Types (Fase 2 - novo)
export * from './smart-types';

// Form Types (Fase 2 - novo)
export * from './form-types';

// Response Types (Fase 2 - novo)
export * from './response-types';

// Re-exporta tipos de domínio específico
export * from './attendants';
export * from './closing';
export * from './config';
export * from './dashboard';
export * from './financial';
export * from './mobile';
export * from './readings';
export * from './sales';
```

**Estimativa:** 15 minutos  
**Linhas:** ~30

---

## 🛠️ Implementação

### Passo 1: Preparação (15 min)

```bash
# 1. Commitar mudanças pendentes
git add src/services/aiService.ts src/services/api/solvency.service.ts src/services/api/tanque.service.ts
git commit -m "fix: ajustes em services (aiService, solvency, tanque)"

# 2. Atualizar main
git checkout main
git pull origin main

# 3. Criar branch
git checkout -b refactor/#22-smart-types-fase-2
```

### Passo 2: Criar Arquivos (3h)

1. **Criar `smart-types.ts`** (2h)
   - Definir tipos para todas as 18+ tabelas
   - Adicionar JSDoc completo
   - Incluir 5+ exemplos práticos

2. **Criar `form-types.ts`** (45min)
   - Implementar utility types
   - Criar tipos de formulário específicos
   - Adicionar helpers de validação

3. **Criar `response-types.ts`** (45min)
   - Definir padrões de resposta
   - Implementar type guards
   - Criar helpers de criação

4. **Atualizar `index.ts`** (15min)
   - Adicionar exports
   - Organizar por categoria
   - Documentar uso

### Passo 3: Validação (30 min)

```bash
# Build deve passar
bun run build

# TypeScript deve validar
bun run type-check

# Sem erros de lint
bun run lint
```

### Passo 4: Documentação (30 min)

1. Atualizar `docs/GUIA-SMART-TYPES.md`
2. Adicionar exemplos de uso
3. Criar guia de migração para services

### Passo 5: Commit e Push (15 min)

```bash
git add src/types/ui/
git commit -m "feat: implementa Smart Types Fase 2 - infraestrutura completa (#22)"
git push origin refactor/#22-smart-types-fase-2
```

---

## 📚 Exemplos de Uso

### Exemplo 1: Service Usando Smart Types

```typescript
// src/services/api/venda.service.ts

import { supabase } from '../supabase';
import type {
  Venda,
  CreateVenda,
  UpdateVenda,
  ApiResponse,
  createSuccessResponse,
  createErrorResponse
} from '../../types/ui';

export const vendaService = {
  /**
   * Busca todas as vendas
   */
  async getAll(): Promise<ApiResponse<Venda[]>> {
    try {
      const { data, error } = await supabase
        .from('Venda')
        .select('*');

      if (error) throw error;

      // ✅ Type-safe! Sem "as unknown as"
      return createSuccessResponse((data || []) as Venda[]);
    } catch (err) {
      return createErrorResponse(
        err instanceof Error ? err.message : 'Erro ao buscar vendas',
        'FETCH_ERROR'
      );
    }
  },

  /**
   * Cria nova venda
   */
  async create(venda: CreateVenda): Promise<ApiResponse<Venda>> {
    try {
      const { data, error } = await supabase
        .from('Venda')
        .insert(venda)
        .select()
        .single();

      if (error) throw error;

      return createSuccessResponse(data as Venda, 'Venda criada com sucesso');
    } catch (err) {
      return createErrorResponse(
        err instanceof Error ? err.message : 'Erro ao criar venda',
        'CREATE_ERROR'
      );
    }
  }
};
```

### Exemplo 2: Componente com Form Types

```typescript
// src/components/clientes/ClienteForm.tsx

import { useState } from 'react';
import type { ClienteFormData, ValidationResult } from '../../types/ui';

export const ClienteForm: React.FC = () => {
  // ✅ Type-safe! limite_credito é string (para input)
  const [formData, setFormData] = useState<ClienteFormData>({
    nome: '',
    documento: '',
    telefone: '',
    email: '',
    limite_credito: '', // string, não number!
    endereco: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Converter de volta para número antes de enviar
    const clienteData: CreateCliente = {
      ...formData,
      limite_credito: parseFloat(formData.limite_credito) || 0,
      posto_id: 1
    };

    const response = await clienteService.create(clienteData);

    if (isSuccess(response)) {
      console.log('✅ Cliente criado:', response.data);
    } else {
      console.error('❌ Erro:', response.error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* inputs... */}
    </form>
  );
};
```

### Exemplo 3: Hook com Response Types

```typescript
// src/hooks/useClientes.ts

import { useState, useEffect } from 'react';
import type { Cliente, AsyncState } from '../types/ui';
import { clienteService } from '../services/api';

export const useClientes = () => {
  // ✅ Type-safe async state
  const [state, setState] = useState<AsyncState<Cliente[]>>({
    data: null,
    isLoading: true,
    isError: false,
    isSuccess: false,
    error: null
  });

  useEffect(() => {
    async function load() {
      setState(prev => ({ ...prev, isLoading: true }));

      const response = await clienteService.getAll();

      if (isSuccess(response)) {
        setState({
          data: response.data,
          isLoading: false,
          isError: false,
          isSuccess: true,
          error: null
        });
      } else {
        setState({
          data: null,
          isLoading: false,
          isError: true,
          isSuccess: false,
          error: new Error(response.error)
        });
      }
    }

    load();
  }, []);

  return state;
};
```

---

## ✅ Checklist de Implementação

### Preparação
- [ ] Commitar mudanças pendentes (aiService, solvency, tanque)
- [ ] Atualizar branch main
- [ ] Criar branch `refactor/#22-smart-types-fase-2`

### Desenvolvimento
- [ ] Criar `src/types/ui/smart-types.ts` (2h)
  - [ ] Tipos para Cliente
  - [ ] Tipos para Frentista
  - [ ] Tipos para Venda
  - [ ] Tipos para Fechamento
  - [ ] Tipos para outras 14+ tabelas
  - [ ] JSDoc completo
  - [ ] 5+ exemplos

- [ ] Criar `src/types/ui/form-types.ts` (45min)
  - [ ] Utility type `FormFields<T>`
  - [ ] Utility type `OptionalFields<T, K>`
  - [ ] Utility type `RequiredFields<T, K>`
  - [ ] Tipos de formulário específicos
  - [ ] Tipos de validação
  - [ ] JSDoc completo

- [ ] Criar `src/types/ui/response-types.ts` (45min)
  - [ ] `SuccessResponse<T>`
  - [ ] `ErrorResponse`
  - [ ] `ApiResponse<T>`
  - [ ] Type guards (`isSuccess`, `isError`)
  - [ ] `PaginatedResponse<T>`
  - [ ] `AsyncState<T>`
  - [ ] Helpers de criação
  - [ ] JSDoc completo

- [ ] Atualizar `src/types/ui/index.ts` (15min)
  - [ ] Export de smart-types
  - [ ] Export de form-types
  - [ ] Export de response-types
  - [ ] Organização por categoria

### Validação
- [ ] Build passa (`bun run build`)
- [ ] Type-check passa (`bun run type-check`)
- [ ] Lint passa (`bun run lint`)
- [ ] Testar imports em arquivo de teste

### Documentação
- [ ] Atualizar `docs/GUIA-SMART-TYPES.md`
- [ ] Adicionar seção "Fase 2 Completa"
- [ ] Incluir exemplos de uso dos 3 novos arquivos
- [ ] Criar guia de migração para services

### Finalização
- [ ] Commit com mensagem semântica
- [ ] Push para branch
- [ ] Atualizar `CHANGELOG.md`
- [ ] Preparar para Fase 3

---

## 📊 Impacto Esperado

### Métricas

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| Arquivos de tipos | 1 | 4 | +300% |
| Linhas de infraestrutura | ~50 | ~350 | +600% |
| Services prontos para migração | 1 | 33 | +3200% |
| Padrões estabelecidos | 1 | 4 | +300% |

### Benefícios

1. **Para Desenvolvedores**
   - ✅ Padrões claros para todos os services
   - ✅ Autocomplete em 100% dos casos
   - ✅ Menos decisões (padrão já definido)
   - ✅ Exemplos práticos para copiar

2. **Para o Projeto**
   - ✅ Base sólida para Fase 3 (refatoração em massa)
   - ✅ Consistência em todos os services
   - ✅ Redução de bugs de tipo
   - ✅ Documentação viva

3. **Para Fase 3**
   - ✅ Migração de 32 services será mecânica
   - ✅ Estimativa reduzida de 16h para 8-10h
   - ✅ Menos erros (padrão já testado)

---

## 🚀 Próximos Passos (Fase 3)

Após conclusão desta fase:

1. **Refatorar services em lotes**
   - Lote 1: Services de domínio (cliente, frentista, venda) - 3h
   - Lote 2: Services de operação (fechamento, leitura) - 3h
   - Lote 3: Services financeiros (divida, emprestimo) - 2h
   - Lote 4: Aggregator e outros - 2h

2. **Eliminar todas as 23 ocorrências de `as unknown as`**

3. **Remover ~48 interfaces manuais duplicadas**

4. **Validação final com TypeScript strict mode**

---

## 📝 Notas do Desenvolvedor

### Por Que Esta Fase é Crítica?

A Fase 2 não é apenas "criar mais arquivos de tipos". É sobre:

1. **Estabelecer o padrão** que será replicado 32 vezes na Fase 3
2. **Reduzir fricção** para futuras refatorações
3. **Documentar decisões** de arquitetura
4. **Criar exemplos** que servem como template

### Lições da Fase 1

- ✅ `WithRelations<T, R>` foi um sucesso
- ✅ Documentação JSDoc é essencial
- ✅ Exemplos práticos aceleram adoção
- ⚠️ Precisa de mais tipos utilitários (daí form-types e response-types)

### Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Tipos muito genéricos | Baixa | Médio | Criar tipos específicos por domínio |
| Falta de exemplos | Média | Alto | Incluir 15+ exemplos práticos |
| Complexidade excessiva | Baixa | Alto | Manter utility types simples |
| Adoção lenta | Média | Médio | Documentação clara + guia de migração |

---

**Estimativa Total:** 3-4 horas  
**Complexidade:** Média  
**Prioridade:** Alta (bloqueia Fase 3)  
**Dependências:** Nenhuma (Fase 1 já completa)

**Última atualização:** 16/01/2026 - 08:44  
**Próxima revisão:** Após conclusão da implementação  
**Responsável:** Thyago (Desenvolvedor Principal)
