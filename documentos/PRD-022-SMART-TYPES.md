# 📋 PRD-022 - Smart Types: Sistema de Tipagem Inteligente

## 📌 Informações do Documento

| Campo | Valor |
|-------|-------|
| **Produto** | Posto Providência - Sistema de Tipagem |
| **PRD** | #022 |
| **Versão** | 1.0 |
| **Data** | 14 de Janeiro de 2026 |
| **Autor** | Thyago (Desenvolvedor Principal) |
| **Status** | ✅ Em Implementação (Fase 1 Completa) |
| **Issue Relacionada** | #21 - Eliminar `any` do Projeto |
| **Branch** | `refactor/#21-eliminar-any` |

---

## 🎯 Visão Geral

### Contexto

Durante a refatoração para eliminar todos os usos de `any` no projeto (Issue #21), identificamos uma oportunidade de melhorar a arquitetura de tipos sem adicionar complexidade desnecessária através de DTOs (Data Transfer Objects).

### Problema

**Situação Atual:**

```typescript
// ❌ Problema 1: Interfaces manuais duplicadas
// src/services/api/cliente.service.ts
export interface Cliente {
  id: number;
  nome: string;
  documento?: string | null;
  telefone?: string | null;
  // ... 14 campos definidos MANUALMENTE
}

// ❌ Problema 2: Type assertions inseguras
return (data as unknown as Cliente[]) || [];
// ↑ Contorna o sistema de tipos - perigoso!

// ❌ Problema 3: Dessincronia com banco de dados
// Se a tabela Cliente mudar no banco, os tipos aqui podem ficar DESATUALIZADOS
```

**Consequências:**

1. ✅ **27 ocorrências** de `as unknown as` em 9 services
2. ✅ **Duplicação de definições** de tipos entre database e services
3. ✅ **Risco de dessincronia** entre esquema do banco e tipos TypeScript
4. ✅ **Falta de reuso** - cada service define suas próprias interfaces
5. ✅ **Type safety comprometido** - `as unknown as` esconde erros de tipo

### Solução: Smart Types

**Smart Types** são tipos TypeScript derivados automaticamente de uma **única fonte de verdade** (tabelas do Supabase), usando recursos avançados do TypeScript:

- **Mapped Types** - Transformar tipos existentes
- **Conditional Types** - Tipos condicionais
- **Utility Types** - Helpers reutilizáveis (`Pick`, `Omit`, `Partial`)
- **Type Inference** - Dedução automática de tipos

---

## 🚫 Por Que NÃO Usar DTOs?

### Análise de Trade-offs

| Aspecto | COM DTOs | COM Smart Types | Vencedor |
|---------|----------|-----------------|----------|
| **Linhas de código** | +500-800 linhas | +50-100 linhas | ✅ Smart Types |
| **Complexidade** | Alta (3 camadas) | Média (2 camadas) | ✅ Smart Types |
| **Manutenção** | Difícil (mudar em 3 lugares) | Fácil (mudar só no banco) | ✅ Smart Types |
| **Performance** | Pior (transformação runtime) | Melhor (zero overhead) | ✅ Smart Types |
| **Type Safety** | ✅ Igual | ✅ Igual | ➖ Empate |
| **Validação Runtime** | ✅ Sim (com custo) | ❌ Não (mas desnecessário) | ➖ Contexto |
| **Adequação** | ❌ Over-engineering | ✅ Fit perfeito | ✅ Smart Types |

### DTOs Fazem Sentido Quando:

- ✅ Você tem uma **API REST pública** com múltiplos consumidores
- ✅ Precisa **esconder** estrutura interna do banco
- ✅ Tem **lógica complexa de transformação** entre camadas
- ✅ Diferentes versões da API (v1, v2)

### Nosso Projeto:

- ❌ SPA monolítico (único consumidor)
- ❌ Supabase já fornece tipos seguros
- ❌ Não há necessidade de esconder estrutura do banco
- ❌ Transformações são simples (adicionar relacionamentos)

**Conclusão:** DTOs seriam **atrito inútil** (fricção desnecessária) neste projeto.

---

## 🏗️ Arquitetura de Smart Types

### Estrutura de Pastas

```
src/types/
├── database/                    # Tipos gerados do Supabase
│   ├── base.ts                 # Tipos primitivos
│   ├── enums.ts                # Enums do banco
│   ├── schema.ts               # Schema completo
│   └── tables/                 # Tabelas organizadas por domínio
│       ├── clientes.ts         # ClienteTable, NotaFrentistaTable
│       ├── operacoes.ts        # FechamentoTable, FrentistaTable
│       ├── financeiro.ts       # DividaTable, EmprestimoTable
│       └── ...
│
├── ui/                          # Smart Types para UI
│   ├── index.ts                # Exportador central
│   ├── helpers.ts              # ✅ IMPLEMENTADO
│   ├── smart-types.ts          # 🔄 Próximo passo
│   ├── form-types.ts           # 📋 Planejado
│   └── response-types.ts       # 📋 Planejado
│
└── index.ts                     # Exportador geral
```

### Camadas de Tipagem

```
┌─────────────────────────────────────────────────────┐
│ UI Layer (Componentes React)                       │
│ Consome: Smart Types (ui/), Form Types             │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│ Service Layer (api/*.service.ts)                    │
│ Consome: Smart Types derivados de Database Types   │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│ Database Layer (types/database/)                    │
│ Fonte Única de Verdade (Single Source of Truth)    │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│ Supabase (PostgreSQL Schema)                        │
│ Definição das tabelas                              │
└─────────────────────────────────────────────────────┘
```

---

## ✅ Implementação Atual (Fase 1)

### 1. Utility Type: `WithRelations<T, R>`

**Localização:** [src/types/ui/helpers.ts](src/types/ui/helpers.ts)

**Propósito:** Adicionar relacionamentos a tipos base de forma type-safe.

**Implementação:**

```typescript
/**
 * Utility type para adicionar relacionamentos a um tipo base.
 *
 * @template T - Tipo base (ex: ClienteTable['Row'])
 * @template R - Objeto com relacionamentos adicionais
 *
 * @example
 * type ClienteComNotas = WithRelations<
 *   ClienteTable['Row'],
 *   { notas?: NotaFrentistaTable['Row'][] }
 * >;
 */
export type WithRelations<T, R> = T & R;
```

**Vantagens:**

1. ✅ **Type-safe** - TypeScript valida todos os campos
2. ✅ **Autocomplete** - IDE sugere campos automaticamente
3. ✅ **Composição** - Pode combinar múltiplos relacionamentos
4. ✅ **Documentado** - JSDoc explica uso e exemplos

### 2. Refatoração de `cliente.service.ts`

**Localização:** [src/services/api/cliente.service.ts](src/services/api/cliente.service.ts)

**Antes:**

```typescript
// ❌ Interface manual (14 campos)
export interface Cliente {
  id: number;
  nome: string;
  documento?: string | null;
  // ... 12 campos a mais
}

// ❌ Type assertion insegura
return (data as unknown as Cliente[]) || [];
```

**Depois:**

```typescript
// ✅ Smart Types derivados do banco
export type Cliente = ClienteTable['Row'];
export type NotaFrentista = NotaFrentistaTable['Row'];

// ✅ Tipos com relacionamentos usando WithRelations
export type NotaFrentistaComFrentista = WithRelations<
  NotaFrentista,
  { frentista?: Pick<FrentistaTable['Row'], 'id' | 'nome'> }
>;

export type ClienteComNotas = WithRelations<
  Cliente,
  { notas?: NotaFrentista[] }
>;

export type ClienteCompleto = WithRelations<
  Cliente,
  { notas?: NotaFrentistaComFrentista[] }
>;

// ✅ Type assertion direta (mais segura)
return (data || []) as Cliente[];
```

**Melhorias:**

1. ✅ **-14 linhas** de definições manuais eliminadas
2. ✅ **Single Source of Truth** - `ClienteTable` é a única definição
3. ✅ **Auto-sincronização** - Se banco mudar, tipos atualizam automaticamente
4. ✅ **Type-safe em relacionamentos** - `Pick<>` garante apenas campos existentes
5. ✅ **Documentação clara** - Cada tipo tem propósito bem definido

### 3. Atualização de `ClienteTable`

**Localização:** [src/types/database/tables/clientes.ts](src/types/database/tables/clientes.ts)

**Mudança:**

```typescript
// Adicionado campo opcional 'bloqueado' que estava sendo usado mas não estava tipado
Row: {
  // ...
  bloqueado?: boolean  // ← Adicionado
  // ...
}
```

**Motivo:** Campo existia no código mas não estava na definição da tabela, causando inconsistência.

---

## 📋 Próximos Passos (Roadmap)

### Fase 2: Expandir Smart Types

#### 2.1. Criar `smart-types.ts`

```typescript
// src/types/ui/smart-types.ts

import type { ClienteTable } from '../database/tables/clientes';

/**
 * Cliente base (leitura completa)
 */
export type Cliente = ClienteTable['Row'];

/**
 * Cliente para criação (Insert)
 * Campos como id, created_at, updated_at são opcionais
 */
export type CreateCliente = ClienteTable['Insert'];

/**
 * Cliente para atualização (Update)
 * Todos os campos opcionais
 */
export type UpdateCliente = ClienteTable['Update'];

/**
 * Cliente resumido (para listas e seleções)
 * Apenas campos essenciais
 */
export type ClienteResumo = Pick<
  Cliente,
  'id' | 'nome' | 'documento' | 'saldo_devedor'
>;

/**
 * Cliente sem metadados técnicos
 * Remove created_at, updated_at
 */
export type ClienteSemMetadata = Omit<
  Cliente,
  'created_at' | 'updated_at'
>;
```

**Benefícios:**

- ✅ Tipos específicos para cada operação (CRUD)
- ✅ Reutilização em todo o projeto
- ✅ Documentação centralizada
- ✅ Menos código nos services

#### 2.2. Criar `form-types.ts`

```typescript
// src/types/ui/form-types.ts

/**
 * Converte campos numéricos em string para formulários HTML
 */
type FormFields<T> = {
  [K in keyof T]: T[K] extends number ? string : T[K];
};

/**
 * Torna campos obrigatórios opcionais (útil para edição)
 */
type OptionalFields<T, K extends keyof T> =
  Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Formulário de Cliente
 * Números viram strings (inputs HTML)
 */
export type ClienteFormData = FormFields<
  Pick<Cliente, 'nome' | 'documento' | 'telefone' | 'email' | 'limite_credito' | 'endereco'>
>;

// Resultado automático:
// {
//   nome: string;
//   documento: string;
//   telefone: string;
//   email: string;
//   limite_credito: string; // ← Convertido de number!
//   endereco: string;
// }
```

**Benefícios:**

- ✅ Tipos de formulário derivados automaticamente
- ✅ Conversões automáticas (number → string para inputs)
- ✅ Reduz duplicação em componentes

#### 2.3. Criar `response-types.ts`

```typescript
// src/types/ui/response-types.ts

/**
 * Resposta de sucesso padronizada
 */
export type SuccessResponse<T> = {
  data: T;
  success: true;
  timestamp: string;
};

/**
 * Resposta de erro padronizada
 */
export type ErrorResponse = {
  error: string;
  code: string;
  success: false;
  timestamp: string;
};

/**
 * União de resposta (sucesso ou erro)
 */
export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

/**
 * Type guard para verificar sucesso
 */
export function isSuccess<T>(
  response: ApiResponse<T>
): response is SuccessResponse<T> {
  return response.success === true;
}

/**
 * Resposta paginada genérica
 */
export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
};
```

**Benefícios:**

- ✅ Padrões consistentes de resposta
- ✅ Type guards para runtime safety
- ✅ Suporte a paginação type-safe

### Fase 3: Refatorar Outros Services

Aplicar o mesmo padrão em todos os services:

- [ ] `venda.service.ts`
- [ ] `fechamento.service.ts`
- [ ] `frentista.service.ts`
- [ ] `divida.service.ts`
- [ ] `emprestimo.service.ts`
- [ ] `compra.service.ts`
- [ ] `estoque.service.ts`
- [ ] `aggregator.service.ts`

**Meta:** Eliminar TODAS as 27 ocorrências de `as unknown as`.

### Fase 4: Atualizar Componentes

Refatorar componentes para usar Smart Types:

- [ ] `TelaGestaoClientes.tsx`
- [ ] `TelaFechamentoDiario.tsx`
- [ ] `TelaConfiguracoes.tsx`
- [ ] `TelaRegistroCompras.tsx`
- [ ] Dashboard components

---

## 🎓 Guia de Uso para Desenvolvedores

### Regra #1: NUNCA Definir Interfaces Manuais

```typescript
// ❌ ERRADO
export interface Cliente {
  id: number;
  nome: string;
  // ...
}

// ✅ CORRETO
import type { ClienteTable } from '../../types/database/tables/clientes';
export type Cliente = ClienteTable['Row'];
```

### Regra #2: Usar Smart Types para Relacionamentos

```typescript
// ❌ ERRADO
interface ClienteComNotas extends Cliente {
  notas?: Partial<NotaFrentista>[];
}

// ✅ CORRETO
import { WithRelations } from '../../types/ui/helpers';

export type ClienteComNotas = WithRelations<
  Cliente,
  { notas?: NotaFrentista[] }
>;
```

### Regra #3: Usar Tipos Específicos do Supabase

```typescript
// ✅ Para leitura
type Cliente = ClienteTable['Row'];

// ✅ Para criação (insert)
type CreateCliente = ClienteTable['Insert'];

// ✅ Para atualização (update)
type UpdateCliente = ClienteTable['Update'];
```

### Regra #4: Evitar `as unknown as`

```typescript
// ❌ ERRADO
return (data as unknown as Cliente[]) || [];

// ✅ CORRETO
return (data || []) as Cliente[];
// ou ainda melhor:
return (data as ClienteTable['Row'][]) || [];
```

### Regra #5: Usar Utility Types do TypeScript

```typescript
// ✅ Pegar apenas alguns campos
type ClienteResumo = Pick<Cliente, 'id' | 'nome' | 'documento'>;

// ✅ Remover campos
type ClienteSemMetadata = Omit<Cliente, 'created_at' | 'updated_at'>;

// ✅ Tornar todos opcionais
type ClienteParcial = Partial<Cliente>;

// ✅ Tornar todos obrigatórios
type ClienteCompleto = Required<Cliente>;
```

---

## 📊 Métricas de Sucesso

### Métricas Quantitativas

| Métrica | Antes | Meta Fase 1 | Atual | Meta Final |
|---------|-------|-------------|-------|------------|
| Ocorrências `as unknown as` | 27 | 20 | 23 | 0 |
| Interfaces manuais | ~50 | 45 | 48 | 0 |
| Linhas de código (tipos) | ~800 | 750 | 780 | 400 |
| Services refatorados | 0/33 | 1/33 | 1/33 | 33/33 |
| Componentes refatorados | 0/20 | 0/20 | 0/20 | 20/20 |

### Métricas Qualitativas

- ✅ **Type Safety:** Melhorado (eliminado `as unknown as` em cliente.service)
- ✅ **Manutenibilidade:** Melhorado (Single Source of Truth estabelecido)
- ✅ **Documentação:** Melhorado (JSDoc em todos os Smart Types)
- 🔄 **Developer Experience:** Em progresso (precisa expandir para outros services)
- 📋 **Consistência:** Planejado (aguardando Fase 2)

---

## 🔍 Exemplos Práticos

### Exemplo 1: Criação de Cliente

**Antes:**

```typescript
const novoCliente = {
  nome: 'João Silva',
  documento: '123.456.789-00',
  telefone: '(11) 98765-4321',
  limite_credito: 1000,
  posto_id: 1
  // ❌ Esqueci de adicionar algum campo obrigatório? Não sei!
};

await clienteService.create(novoCliente);
// ❌ TypeScript não reclama se faltar campos
```

**Depois:**

```typescript
const novoCliente: ClienteTable['Insert'] = {
  nome: 'João Silva',
  documento: '123.456.789-00',
  telefone: '(11) 98765-4321',
  limite_credito: 1000,
  posto_id: 1
  // ✅ TypeScript avisa se faltar campo obrigatório!
};

await clienteService.create(novoCliente);
// ✅ Type-safe! IDE mostra todos os campos disponíveis
```

### Exemplo 2: Consulta com Relacionamentos

**Antes:**

```typescript
// ❌ Não sei que campos 'notas' tem
const cliente = await clienteService.getById(1);
console.log(cliente.notas?.[0].valor); // Funciona mas sem autocomplete
```

**Depois:**

```typescript
// ✅ TypeScript sabe exatamente a estrutura
const cliente: ClienteCompleto = await clienteService.getById(1);
console.log(cliente.notas?.[0].valor);
//                         ↑ IDE autocompleta: valor, status, data, frentista...
```

### Exemplo 3: Atualização Parcial

**Antes:**

```typescript
// ❌ Qualquer campo aceito, sem validação
await clienteService.update(1, {
  nome: 'João Silva Jr.',
  campo_que_nao_existe: 'teste' // ❌ TypeScript não reclama!
});
```

**Depois:**

```typescript
// ✅ Apenas campos válidos da tabela
const updates: ClienteTable['Update'] = {
  nome: 'João Silva Jr.',
  // campo_que_nao_existe: 'teste' // ✅ Erro de compilação!
};

await clienteService.update(1, updates);
```

---

## 🚀 Impacto Esperado

### Para o Projeto

1. ✅ **Menos bugs** - Types seguros eliminam erros de tipo
2. ✅ **Refatoração segura** - Mudanças no banco propagam automaticamente
3. ✅ **Menos código** - ~50% redução em definições de tipos
4. ✅ **Melhor DX** - Autocomplete inteligente em toda IDE
5. ✅ **Documentação viva** - Tipos auto-explicativos

### Para a Issue #21

- ✅ **Fase 1:** Eliminar `any` (já feito)
- ✅ **Fase 2:** Melhorar tipagem com Smart Types (em andamento)
- 📋 **Fase 3:** Zero `as unknown as` (próximo)
- 📋 **Fase 4:** 100% type-safe em todo projeto

### Para a Equipe

1. ✅ **Onboarding mais rápido** - Tipos são auto-explicativos
2. ✅ **Menos revisões** - TypeScript detecta erros antes de PR
3. ✅ **Confiança em refatorar** - Type system garante correção
4. ✅ **Menos documentação** - Tipos documentam estrutura

---

## 📚 Referências

### TypeScript

- [Mapped Types](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html)
- [Conditional Types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html)
- [Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html)
- [Type Inference](https://www.typescriptlang.org/docs/handbook/type-inference.html)

### Supabase

- [TypeScript Support](https://supabase.com/docs/guides/api/generating-types)
- [Database Types](https://supabase.com/docs/reference/javascript/typescript-support)

### Arquitetura

- [Single Source of Truth](https://en.wikipedia.org/wiki/Single_source_of_truth)
- [DRY Principle](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself)

---

## ✅ Checklist de Implementação

### Fase 1: Fundação (✅ Completa)

- [x] Criar `types/ui/helpers.ts` com `WithRelations<T, R>`
- [x] Refatorar `cliente.service.ts` para usar Smart Types
- [x] Atualizar `ClienteTable` com campo `bloqueado`
- [x] Documentar todos os tipos com JSDoc
- [x] Testar em localhost:3015

### Fase 2: Expansão (📋 Próximo)

- [ ] Criar `types/ui/smart-types.ts` com tipos derivados
- [ ] Criar `types/ui/form-types.ts` para formulários
- [ ] Criar `types/ui/response-types.ts` para respostas
- [ ] Atualizar `types/ui/index.ts` para exportar tudo
- [ ] Documentar guia de uso em comentários

### Fase 3: Migração (📋 Planejado)

- [ ] Refatorar todos os 33 services
- [ ] Eliminar todas ocorrências de `as unknown as`
- [ ] Remover interfaces manuais duplicadas
- [ ] Validar com TypeScript strict mode

### Fase 4: Finalização (📋 Planejado)

- [ ] Atualizar componentes para usar Smart Types
- [ ] Executar testes de tipo
- [ ] Atualizar CHANGELOG.md
- [ ] Criar PR e solicitar validação do usuário

---

## 📝 Notas do Desenvolvedor

### Por Que Isso Importa?

Smart Types não é apenas "organização de código". É sobre:

1. **Segurança** - Menos bugs em produção
2. **Velocidade** - Menos tempo debugando tipos
3. **Confiança** - Refatorar sem medo de quebrar
4. **Qualidade** - Código auto-documentado

### Lições Aprendidas

1. ✅ **DTOs não são sempre a resposta** - Contexto importa
2. ✅ **TypeScript é poderoso** - Utility Types resolvem 90% dos casos
3. ✅ **Single Source of Truth** - Banco é a fonte, tipos derivam dele
4. ✅ **Simplicidade vence** - Menos código = menos bugs

---

**Última atualização:** 14/01/2026 - 10:45
**Próxima revisão:** Após conclusão da Fase 2
**Responsável:** Thyago (Desenvolvedor Principal)
