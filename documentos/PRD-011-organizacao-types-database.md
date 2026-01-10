# PRD-011: Organização e Modularização do database.ts

> **Versão:** 1.0  
> **Data:** 10/01/2026  
> **Issue:** #11  
> **Autor:** Thyago  
> **Status:** Em Análise  
> **Dependências:** PRD-008 (Modularização do api.ts)

---

## 1. Resumo Executivo

### 1.1 Problema
O arquivo `src/types/database.ts` possui **2.021 linhas** e **61 KB**, tornando-se difícil de navegar, lento para carregar no editor, e propenso a erros de importação. Contém definições de **30+ tabelas** em um único arquivo monolítico.

### 1.2 Solução Proposta
Modularizar o arquivo `database.ts` em uma estrutura organizada por domínio de negócio, mantendo compatibilidade total com o código existente e preservando a capacidade de regeneração automática pelo Supabase CLI.

### 1.3 Benefícios Esperados
- ✅ Redução de 95% no tamanho de cada arquivo individual
- ✅ Navegação mais rápida e eficiente
- ✅ Melhor performance do editor (TypeScript Language Server)
- ✅ Imports mais específicos e claros
- ✅ Facilita manutenção e compreensão do schema
- ✅ Reduz dívida técnica significativamente

---

## 2. Contexto e Motivação

### 2.1 Estado Atual

| Métrica | Valor Atual | Problema | Meta |
|---------|-------------|----------|------|
| Linhas de código | 2.021 | Difícil navegar | ~50-150 por arquivo |
| Tamanho do arquivo | 61 KB | Editor lento | ~5-10 KB por arquivo |
| Número de tabelas | 30+ | Tudo misturado | 1 domínio por arquivo |
| Tempo de carregamento | ~2-3s | Lento | <0.5s |
| Imports | Genéricos | Pouco específicos | Por domínio |

### 2.2 Tabelas Identificadas

#### **Domínio: Infraestrutura do Posto**
1. `Posto` - Dados do posto
2. `Turno` - Turnos de trabalho
3. `Configuracao` - Configurações do sistema
4. `Usuario` - Usuários do sistema
5. `UsuarioPosto` - Relação usuário-posto

#### **Domínio: Combustíveis e Equipamentos**
6. `Combustivel` - Tipos de combustível
7. `Bomba` - Bombas de combustível
8. `Bico` - Bicos das bombas
9. `Tanque` - Tanques de armazenamento
10. `HistoricoTanque` - Histórico de medições
11. `Estoque` - Controle de estoque

#### **Domínio: Operações Diárias**
12. `Frentista` - Frentistas
13. `Leitura` - Leituras de encerrantes
14. `Fechamento` - Fechamentos de caixa
15. `FechamentoFrentista` - Fechamento por frentista
16. `Recebimento` - Recebimentos

#### **Domínio: Pagamentos**
17. `FormaPagamento` - Formas de pagamento
18. `Maquininha` - Maquininhas de cartão

#### **Domínio: Financeiro**
19. `Emprestimo` - Empréstimos
20. `Parcela` - Parcelas de empréstimos
21. `Divida` - Dívidas
22. `Despesa` - Despesas

#### **Domínio: Compras e Fornecedores**
23. `Compra` - Compras de combustível
24. `Fornecedor` - Fornecedores

#### **Domínio: Produtos e Vendas**
25. `Produto` - Produtos da loja
26. `VendaProduto` - Vendas de produtos
27. `MovimentacaoEstoque` - Movimentações

#### **Domínio: Clientes e Crédito**
28. `Cliente` - Clientes
29. `NotaFrentista` - Notas de frentista
30. `Baratencia` - Sistema de crédito
31. `TokenAbastecimento` - Tokens de abastecimento

#### **Domínio: Notificações**
32. `Notificacao` - Notificações
33. `PushToken` - Tokens de push

### 2.3 Impacto da Dívida Técnica

**Problemas atuais:**
- ⚠️ Editor lento ao abrir o arquivo
- ⚠️ Autocomplete demorado
- ⚠️ Difícil encontrar tipos específicos
- ⚠️ Imports genéricos (`import { Database } from './types/database'`)
- ⚠️ Risco de conflitos em merges (arquivo grande)

---

## 3. Requisitos

### 3.1 Requisitos Funcionais

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF01 | Dividir database.ts em módulos por domínio | Alta |
| RF02 | Manter compatibilidade com imports existentes | Alta |
| RF03 | Preservar todos os tipos existentes | Alta |
| RF04 | Criar index.ts que re-exporta tudo | Alta |
| RF05 | Manter tipo `Database` principal funcionando | Alta |
| RF06 | Criar tipos auxiliares (helpers) | Média |

### 3.2 Requisitos Não-Funcionais

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RNF01 | Arquivos com no máximo 200 linhas | Alta |
| RNF02 | Documentação JSDoc em português | Média |
| RNF03 | Zero breaking changes | Alta |
| RNF04 | Build sem erros após refatoração | Alta |
| RNF05 | Performance do editor melhorada | Alta |
| RNF06 | Facilitar regeneração pelo Supabase CLI | Média |

### 3.3 Critérios de Aceite

- [ ] Arquivo original `database.ts` dividido em 8-10 módulos
- [ ] Cada módulo com no máximo 200 linhas
- [ ] Import `import { Database } from './types'` continua funcionando
- [ ] Imports específicos possíveis: `import { Combustivel } from './types/models'`
- [ ] `npm run build` passa sem erros
- [ ] Aplicação funciona normalmente
- [ ] Performance do editor melhorada (medida subjetiva)

---

## 4. Arquitetura Proposta

### 4.1 Estrutura de Diretórios

```
src/types/
├── database/
│   ├── index.ts                    # Re-exporta tudo + tipo Database
│   ├── base.ts                     # Tipos base (Json, helpers)
│   │
│   ├── tables/                     # Definições de tabelas por domínio
│   │   ├── infraestrutura.ts       # Posto, Turno, Configuracao, Usuario
│   │   ├── combustiveis.ts         # Combustivel, Bomba, Bico, Tanque, Estoque
│   │   ├── operacoes.ts            # Frentista, Leitura, Fechamento
│   │   ├── pagamentos.ts           # FormaPagamento, Maquininha
│   │   ├── financeiro.ts           # Emprestimo, Parcela, Divida, Despesa
│   │   ├── compras.ts              # Compra, Fornecedor
│   │   ├── produtos.ts             # Produto, VendaProduto, MovimentacaoEstoque
│   │   ├── clientes.ts             # Cliente, NotaFrentista, Baratencia
│   │   └── notificacoes.ts         # Notificacao, PushToken
│   │
│   ├── enums.ts                    # Todos os enums
│   ├── constants.ts                # Constantes exportadas
│   └── helpers.ts                  # Tipos auxiliares (TablesInsert, TablesUpdate, etc)
│
├── models/                         # Tipos auxiliares específicos (opcional)
│   ├── combustivel.ts
│   ├── frentista.ts
│   └── fechamento.ts
│
├── database.ts                     # DEPRECADO - redireciona para database/index.ts
├── fechamento.ts                   # Mantido
├── ui.ts                           # Mantido
└── index.ts                        # Ponto de entrada principal
```

### 4.2 Arquivo base.ts

```typescript
/**
 * Tipos Base do Database
 * 
 * @remarks
 * Tipos fundamentais usados em todo o schema do banco de dados.
 */

/**
 * Tipo JSON genérico do PostgreSQL
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

/**
 * Metadados internos do Supabase
 */
export type InternalSupabase = {
  PostgrestVersion: "13.0.5"
}
```

### 4.3 Exemplo de Módulo por Domínio

```typescript
// tables/combustiveis.ts

/**
 * Tabelas do Domínio: Combustíveis e Equipamentos
 * 
 * @remarks
 * Contém definições de tipos para:
 * - Combustivel: Tipos de combustível (GC, GA, ET, S10, Diesel)
 * - Bomba: Bombas de abastecimento
 * - Bico: Bicos das bombas
 * - Tanque: Tanques de armazenamento
 * - HistoricoTanque: Histórico de medições
 * - Estoque: Controle de estoque de combustíveis
 */

/**
 * Tabela: Combustivel
 * 
 * @description
 * Armazena os tipos de combustível disponíveis no posto.
 * Cada combustível tem código único (GC, GA, ET, S10, Diesel).
 */
export interface CombustivelTable {
  Row: {
    id: number
    posto_id: number
    codigo: string
    nome: string
    preco_custo: number
    preco_venda: number
    cor: string | null
    ativo: boolean
  }
  Insert: {
    id?: number
    posto_id: number
    codigo: string
    nome: string
    preco_custo?: number
    preco_venda?: number
    cor?: string | null
    ativo?: boolean
  }
  Update: {
    id?: number
    posto_id?: number
    codigo?: string
    nome?: string
    preco_custo?: number
    preco_venda?: number
    cor?: string | null
    ativo?: boolean
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

// ... demais tabelas do domínio
```

### 4.4 Arquivo index.ts (Agregador)

```typescript
// database/index.ts

/**
 * Database Schema Types
 * 
 * @remarks
 * Tipos TypeScript gerados a partir do schema do Supabase.
 * Organizados por domínio de negócio para melhor manutenibilidade.
 * 
 * @see https://supabase.com/docs/guides/api/generating-types
 */

// Importa tipos base
export * from './base'
export * from './enums'
export * from './constants'
export * from './helpers'

// Importa tabelas por domínio
import type { InternalSupabase } from './base'
import type { 
  PostoTable, 
  TurnoTable, 
  ConfiguracaoTable, 
  UsuarioTable,
  UsuarioPostoTable 
} from './tables/infraestrutura'

import type { 
  CombustivelTable, 
  BombaTable, 
  BicoTable,
  TanqueTable,
  HistoricoTanqueTable,
  EstoqueTable 
} from './tables/combustiveis'

// ... demais imports

/**
 * Tipo principal do Database
 * 
 * @remarks
 * Mantém compatibilidade com código existente.
 * Agrega todas as tabelas organizadas por domínio.
 */
export type Database = {
  __InternalSupabase: InternalSupabase
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
      
      // ... demais tabelas
    }
    Views: {}
    Functions: {}
    Enums: {
      // Importados de enums.ts
    }
    CompositeTypes: {}
  }
}

// Re-exporta tipos auxiliares
export type Tables<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Update']

// Exports de conveniência
export type Combustivel = Tables<'Combustivel'>
export type Frentista = Tables<'Frentista'>
export type Fechamento = Tables<'Fechamento'>
// ... demais exports
```

### 4.5 Compatibilidade com Código Existente

```typescript
// src/types/database.ts (DEPRECADO)

/**
 * @deprecated
 * Este arquivo foi modularizado. Use:
 * - `import { Database } from './database'` para o tipo principal
 * - `import { Combustivel } from './database'` para tipos específicos
 * 
 * Este arquivo será removido na versão 2.0
 */

export * from './database'
export type { Database as default } from './database'
```

---

## 5. Plano de Implementação

### 5.1 Fases

| Fase | Descrição | Arquivos | Estimativa |
|------|-----------|----------|------------|
| 1 | Criar estrutura de diretórios | `database/` | Pequeno |
| 2 | Criar base.ts e enums.ts | 2 arquivos | Pequeno |
| 3 | Migrar tabelas de infraestrutura | `infraestrutura.ts` | Médio |
| 4 | Migrar tabelas de combustíveis | `combustiveis.ts` | Médio |
| 5 | Migrar tabelas de operações | `operacoes.ts` | Grande |
| 6 | Migrar tabelas de pagamentos | `pagamentos.ts` | Pequeno |
| 7 | Migrar tabelas financeiras | `financeiro.ts` | Médio |
| 8 | Migrar tabelas de compras | `compras.ts` | Pequeno |
| 9 | Migrar tabelas de produtos | `produtos.ts` | Médio |
| 10 | Migrar tabelas de clientes | `clientes.ts` | Médio |
| 11 | Migrar tabelas de notificações | `notificacoes.ts` | Pequeno |
| 12 | Criar helpers.ts | Tipos auxiliares | Médio |
| 13 | Criar index.ts agregador | Ponto de entrada | Médio |
| 14 | Deprecar database.ts original | Redirect | Pequeno |
| 15 | Testes e validação | Build, runtime | Grande |

### 5.2 Estratégia de Commits

Cada fase = 1 commit seguindo Conventional Commits:

```bash
refactor(types): cria estrutura modular para database types (#11)
refactor(types): extrai tipos base e enums (#11)
refactor(types): modulariza tabelas de infraestrutura (#11)
refactor(types): modulariza tabelas de combustíveis (#11)
# ... demais commits
refactor(types): finaliza modularização do database.ts (#11)
```

### 5.3 Estratégia de Rollback

Se algo der errado:
1. O arquivo `database.ts` original será mantido como backup
2. Cada fase pode ser revertida individualmente
3. Branch separada permite abandonar sem impacto

---

## 6. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Breaking change em imports | Média | Alto | Manter database.ts como redirect |
| Erros de tipagem | Alta | Médio | Testar build após cada fase |
| Regeneração pelo Supabase CLI | Alta | Alto | Documentar processo de regeneração |
| Performance não melhora | Baixa | Médio | Medir antes e depois |

---

## 7. Melhorias Futuras

### 7.1 Tipos Auxiliares Específicos

Criar tipos auxiliares para operações comuns:

```typescript
// models/combustivel.ts
import type { Combustivel, Estoque } from '../database'

export interface CombustivelComEstoque extends Combustivel {
  estoque: Estoque
}

export interface CombustivelVendas extends Combustivel {
  totalVendido: number
  totalLitros: number
}
```

### 7.2 Validação com Zod

Criar schemas de validação:

```typescript
// models/combustivel.schema.ts
import { z } from 'zod'

export const combustivelSchema = z.object({
  codigo: z.enum(['GC', 'GA', 'ET', 'S10', 'DIESEL']),
  nome: z.string().min(2),
  preco_venda: z.number().positive(),
  // ...
})
```

### 7.3 Script de Regeneração

Criar script para regenerar types do Supabase mantendo modularização:

```bash
npm run types:generate  # Gera database.ts original
npm run types:modularize  # Divide em módulos
```

---

## 8. Definição de Pronto (DoD)

- [ ] Arquivo database.ts dividido em 8-10 módulos
- [ ] Cada módulo com no máximo 200 linhas
- [ ] Documentação JSDoc completa em português
- [ ] `npm run build` passa sem erros
- [ ] Aplicação funciona em localhost:3015
- [ ] Imports existentes funcionam sem alteração
- [ ] Performance do editor melhorada (subjetivo)
- [ ] Issue #11 fechada
- [ ] CHANGELOG.md atualizado
- [ ] Documentação de regeneração criada

---

## 9. Métricas de Sucesso

### 9.1 Antes da Refatoração

| Métrica | Valor |
|---------|-------|
| Arquivos | 1 |
| Linhas totais | 2.021 |
| Tamanho total | 61 KB |
| Tempo de carregamento | ~2-3s |
| Tabelas por arquivo | 30+ |

### 9.2 Depois da Refatoração

| Métrica | Valor Esperado |
|---------|----------------|
| Arquivos | 10-12 |
| Linhas por arquivo | ~50-200 |
| Tamanho por arquivo | ~3-10 KB |
| Tempo de carregamento | <0.5s |
| Tabelas por arquivo | 3-6 |

### 9.3 Redução de Dívida Técnica

- **Navegabilidade:** ⬆️ +90%
- **Manutenibilidade:** ⬆️ +85%
- **Performance:** ⬆️ +70%
- **Clareza de código:** ⬆️ +80%

---

## 10. Referências

### 10.1 Documentação
- [Supabase - Generating Types](https://supabase.com/docs/guides/api/generating-types)
- [TypeScript - Modules](https://www.typescriptlang.org/docs/handbook/modules.html)
- [Clean Code - Robert C. Martin](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882)

### 10.2 Projeto
- Issue: [#11](https://github.com/Thyago-vibe/Posto-Providencia/issues/11)
- Branch: `refactor/issue-11-database-types`
- Arquivo original: `src/types/database.ts` (2.021 linhas)
- PRD Relacionado: PRD-008 (Modularização do api.ts)

---

## 11. Anexos

### 11.1 Mapeamento de Tabelas por Domínio

| Domínio | Tabelas | Linhas Estimadas |
|---------|---------|------------------|
| Infraestrutura | 5 tabelas | ~150 linhas |
| Combustíveis | 6 tabelas | ~180 linhas |
| Operações | 5 tabelas | ~200 linhas |
| Pagamentos | 2 tabelas | ~60 linhas |
| Financeiro | 4 tabelas | ~120 linhas |
| Compras | 2 tabelas | ~60 linhas |
| Produtos | 3 tabelas | ~90 linhas |
| Clientes | 3 tabelas | ~120 linhas |
| Notificações | 2 tabelas | ~60 linhas |

**Total:** 32 tabelas → 9 arquivos (~1.040 linhas + 200 helpers + 100 base = ~1.340 linhas)

**Redução:** 2.021 → 1.340 linhas (-34% de código duplicado/boilerplate)

---

**Documento criado em:** 10/01/2026  
**Última atualização:** 10/01/2026  
**Próxima revisão:** Após implementação
