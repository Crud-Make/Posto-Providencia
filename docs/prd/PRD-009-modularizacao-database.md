# PRD-009: Modularização do database.ts

> **Versão:** 1.0
> **Data:** 09/01/2026
> **Issue:** #9 (Implementado via PR #11)
> **Autor:** Thyago
> **Status:** ✅ Concluído
> **Data de Conclusão:** 10/01/2026

---

## 1. Resumo Executivo

### 1.1 Problema
O arquivo `src/types/database.ts` possui **2.020 linhas** e mistura:
- Schema gerado automaticamente pelo Supabase CLI
- Tipos helper customizados (`Tables<T>`, `TablesInsert<T>`, etc)
- Aliases de entidades (`Bico`, `Bomba`, `Combustivel`, etc)

Isso dificulta a regeneração do schema sem perder customizações.

### 1.2 Solução Proposta
Separar o arquivo em 3 módulos distintos:
1. **schema.ts** - Gerado automaticamente (não editar manualmente)
2. **helpers.ts** - Tipos utilitários genéricos
3. **entities.ts** - Aliases e tipos de entidade do domínio

### 1.3 Benefícios Esperados
- Regeneração segura do schema via `supabase gen types`
- Separação clara entre código gerado e customizado
- Facilidade de manutenção
- Melhor organização por responsabilidade

---

## 2. Contexto e Motivação

### 2.1 Estado Atual

| Métrica | Valor Atual | Meta |
|---------|-------------|------|
| Linhas de código | 2.020 | ~1800 (schema) + ~100 (helpers) + ~80 (entities) |
| Arquivos | 1 | 4 (index + 3 módulos) |
| Código auto-gerado | Misturado | Isolado em schema.ts |
| Código customizado | Misturado | Isolado em helpers.ts e entities.ts |

### 2.2 Estrutura Atual do Arquivo

```
database.ts (2020 linhas)
├── Linha 1-8:      Tipo Json
├── Linha 9-1835:   Database type (schema gerado)
│   ├── Tables (27 tabelas)
│   ├── Views
│   ├── Functions
│   └── Enums
├── Linha 1837-1965: Utility types (Tables<T>, TablesInsert<T>, etc)
└── Linha 1967-2020: Helper aliases (Bico, Bomba, etc)
```

### 2.3 Tabelas no Schema

| # | Tabela | Descrição |
|---|--------|-----------|
| 1 | Bico | Bicos de combustível |
| 2 | HistoricoTanque | Histórico de volumes |
| 3 | Bomba | Bombas de abastecimento |
| 4 | Combustivel | Tipos de combustível |
| 5 | Cliente | Clientes do posto |
| 6 | NotaFrentista | Notas de frentista |
| 7 | Divida | Dívidas ativas |
| 8 | Despesa | Despesas operacionais |
| 9 | Compra | Compras de combustível |
| 10 | Configuracao | Configurações do sistema |
| 11 | Emprestimo | Empréstimos |
| 12 | Estoque | Estoque de combustíveis |
| 13 | Fechamento | Fechamentos de caixa |
| 14 | FechamentoFrentista | Fechamento por frentista |
| 15 | FormaPagamento | Formas de pagamento |
| 16 | Fornecedor | Fornecedores |
| 17 | Frentista | Frentistas |
| 18 | Leitura | Leituras de encerrantes |
| 19 | Maquininha | Maquininhas de cartão |
| 20 | MovimentacaoEstoque | Movimentações de estoque |
| 21 | Notificacao | Notificações push |
| 22 | Parcela | Parcelas de empréstimo |
| 23 | Produto | Produtos (loja) |
| 24 | PushToken | Tokens de push |
| 25 | VendaProduto | Vendas de produtos |
| 26 | Tanque | Tanques de combustível |
| 27 | Posto | Postos |
| 28 | UsuarioPosto | Relação usuário-posto |
| 29 | Escala | Escalas de trabalho |
| 30 | Recebimento | Recebimentos |
| 31 | Turno | Turnos |
| 32 | Usuario | Usuários |
| 33 | ClienteBaratencia | Clientes Baratência |
| 34 | CarteiraBaratencia | Carteiras Baratência |
| 35 | TransacaoBaratencia | Transações Baratência |
| 36 | TokenAbastecimento | Tokens de abastecimento |
| 37 | PromocaoBaratencia | Promoções Baratência |

---

## 3. Requisitos

### 3.1 Requisitos Funcionais

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF01 | Manter compatibilidade com imports existentes | Alta |
| RF02 | Schema regenerável via `supabase gen types` | Alta |
| RF03 | Preservar todos os tipos helper existentes | Alta |
| RF04 | Preservar todos os aliases de entidade | Alta |

### 3.2 Requisitos Não-Funcionais

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RNF01 | Separação clara: gerado vs customizado | Alta |
| RNF02 | Documentação sobre regeneração do schema | Média |
| RNF03 | Build sem erros após refatoração | Alta |

### 3.3 Critérios de Aceite

- [x] Schema isolado em arquivo dedicado ✅
- [x] Helper types em arquivo separado ✅
- [x] Aliases de entidade em arquivo separado ✅
- [x] Import `import { Bico, Bomba } from './types/database'` continua funcionando ✅
- [x] Import `import { Tables } from './types/database'` continua funcionando ✅
- [x] `npm run build` passa sem erros ✅

---

## 4. Arquitetura Proposta

### 4.1 Estrutura de Diretórios

```
src/types/
├── database/
│   ├── index.ts           # Re-exporta tudo (compatibilidade)
│   ├── schema.ts          # Schema gerado pelo Supabase (NÃO EDITAR)
│   ├── helpers.ts         # Utility types genéricos
│   └── entities.ts        # Aliases de entidade do domínio
│
├── ui.ts                  # Tipos de UI (já existe)
├── fechamento.ts          # Tipos de fechamento (já existe)
├── index.ts               # Ponto central de exportação (já existe)
└── database.ts            # DEPRECADO - redireciona para database/index.ts
```

### 4.2 Arquivo schema.ts

```typescript
// schema.ts
// ⚠️ ARQUIVO AUTO-GERADO - NÃO EDITAR MANUALMENTE
// Regenerar com: npx supabase gen types typescript --local > src/types/database/schema.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      Bico: {
        Row: { /* ... */ }
        Insert: { /* ... */ }
        Update: { /* ... */ }
        Relationships: [ /* ... */ ]
      }
      // ... demais 36 tabelas
    }
    Views: { /* ... */ }
    Functions: { /* ... */ }
    Enums: {
      installment_status: "pendente" | "pago" | "atrasado"
      periodicity_type: "mensal" | "quinzenal" | "semanal" | "diario"
      Role: "ADMIN" | "GERENTE" | "OPERADOR" | "FRENTISTA"
      StatusFechamento: "RASCUNHO" | "FECHADO"
    }
    CompositeTypes: { /* ... */ }
  }
}

export const Constants = {
  public: {
    Enums: {
      installment_status: ["pendente", "pago", "atrasado"],
      periodicity_type: ["mensal", "quinzenal", "semanal", "diario"],
      Role: ["ADMIN", "GERENTE", "OPERADOR", "FRENTISTA"],
      StatusFechamento: ["RASCUNHO", "FECHADO"],
      TipoTransacaoBaratencia: ["DEPOSITO", "CONVERSAO", "RESGATE", "ESTORNO"],
      StatusTokenAbastecimento: ["PENDENTE", "USADO", "EXPIRADO", "CANCELADO"],
    },
  },
} as const
```

### 4.3 Arquivo helpers.ts

```typescript
// helpers.ts
/**
 * Tipos utilitários para acesso ao banco de dados
 *
 * @remarks
 * Tipos genéricos que facilitam o uso do schema Supabase
 */

import type { Database } from './schema';

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

/**
 * Extrai o tipo Row de uma tabela
 *
 * @example
 * type BombaRow = Tables<'Bomba'>
 */
export type Tables<
  DefaultSchemaTableNameOrOptions extends
  | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
    DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
    DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

/**
 * Extrai o tipo Insert de uma tabela
 *
 * @example
 * type NovaBomba = TablesInsert<'Bomba'>
 */
export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

/**
 * Extrai o tipo Update de uma tabela
 *
 * @example
 * type AtualizaBomba = TablesUpdate<'Bomba'>
 */
export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

/**
 * Extrai um Enum do schema
 *
 * @example
 * type MeuRole = Enums<'Role'>
 */
export type Enums<
  DefaultSchemaEnumNameOrOptions extends
  | keyof DefaultSchema["Enums"]
  | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

/**
 * Helper para tipos de Insert genérico
 */
export type InsertTables<T extends keyof DbTables> = DbTables[T]['Insert'];

/**
 * Helper para tipos de Update genérico
 */
export type UpdateTables<T extends keyof DbTables> = DbTables[T]['Update'];

// Alias interno para tabelas
type DbTables = Database['public']['Tables'];
```

### 4.4 Arquivo entities.ts

```typescript
// entities.ts
/**
 * Aliases de entidades do domínio
 *
 * @remarks
 * Tipos nomeados para facilitar uso no código da aplicação.
 * Mapeiam diretamente para as tabelas do banco de dados.
 */

import type { Database } from './schema';
import type { Enums } from './helpers';

type DbTables = Database['public']['Tables'];

// ============================================
// ENTIDADES PRINCIPAIS
// ============================================

export type Bico = DbTables['Bico']['Row'];
export type Bomba = DbTables['Bomba']['Row'];
export type Combustivel = DbTables['Combustivel']['Row'];
export type Compra = DbTables['Compra']['Row'];
export type Configuracao = DbTables['Configuracao']['Row'];
export type Emprestimo = DbTables['Emprestimo']['Row'];
export type Estoque = DbTables['Estoque']['Row'];
export type Fechamento = DbTables['Fechamento']['Row'];
export type FechamentoFrentista = DbTables['FechamentoFrentista']['Row'];
export type FormaPagamento = DbTables['FormaPagamento']['Row'];
export type Fornecedor = DbTables['Fornecedor']['Row'];
export type Frentista = DbTables['Frentista']['Row'];
export type Leitura = DbTables['Leitura']['Row'];
export type Maquininha = DbTables['Maquininha']['Row'];
export type Notificacao = DbTables['Notificacao']['Row'];
export type Parcela = DbTables['Parcela']['Row'];
export type Produto = DbTables['Produto']['Row'];
export type MovimentacaoEstoque = DbTables['MovimentacaoEstoque']['Row'];
export type PushToken = DbTables['PushToken']['Row'];
export type Recebimento = DbTables['Recebimento']['Row'];
export type Turno = DbTables['Turno']['Row'];
export type Usuario = DbTables['Usuario']['Row'];
export type VendaProduto = DbTables['VendaProduto']['Row'];
export type Posto = DbTables['Posto']['Row'];
export type UsuarioPosto = DbTables['UsuarioPosto']['Row'];
export type Cliente = DbTables['Cliente']['Row'];
export type NotaFrentista = DbTables['NotaFrentista']['Row'];
export type Tanque = DbTables['Tanque']['Row'];
export type HistoricoTanque = DbTables['HistoricoTanque']['Row'];
export type Escala = DbTables['Escala']['Row'];

// Alias para evitar conflito com tipo de UI
export type DBDivida = DbTables['Divida']['Row'];
export type DBDespesa = DbTables['Despesa']['Row'];

// ============================================
// BARATÊNCIA
// ============================================

export type ClienteBaratencia = DbTables['ClienteBaratencia']['Row'];
export type CarteiraBaratencia = DbTables['CarteiraBaratencia']['Row'];
export type TransacaoBaratencia = DbTables['TransacaoBaratencia']['Row'];
export type TokenAbastecimento = DbTables['TokenAbastecimento']['Row'];
export type PromocaoBaratencia = DbTables['PromocaoBaratencia']['Row'];

export type TipoTransacaoBaratencia = DbTables['TransacaoBaratencia']['Row']['tipo'];
export type StatusTokenAbastecimento = DbTables['TokenAbastecimento']['Row']['status'];

// ============================================
// ENUMS
// ============================================

export type Role = Enums<'Role'>;
export type StatusFechamento = Enums<'StatusFechamento'>;
export type InstallmentStatus = Enums<'installment_status'>;
export type PeriodicityType = Enums<'periodicity_type'>;
```

### 4.5 Arquivo index.ts (Ponto de Entrada)

```typescript
// database/index.ts
/**
 * Tipos do Banco de Dados
 *
 * @remarks
 * Ponto central de exportação para tipos do Supabase.
 * Mantém compatibilidade com imports existentes.
 */

// Re-exporta schema
export type { Database, Json } from './schema';
export { Constants } from './schema';

// Re-exporta helpers
export type {
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
  InsertTables,
  UpdateTables,
} from './helpers';

// Re-exporta entidades
export type {
  // Principais
  Bico,
  Bomba,
  Combustivel,
  Compra,
  Configuracao,
  Emprestimo,
  Estoque,
  Fechamento,
  FechamentoFrentista,
  FormaPagamento,
  Fornecedor,
  Frentista,
  Leitura,
  Maquininha,
  Notificacao,
  Parcela,
  Produto,
  MovimentacaoEstoque,
  PushToken,
  Recebimento,
  Turno,
  Usuario,
  VendaProduto,
  Posto,
  UsuarioPosto,
  Cliente,
  NotaFrentista,
  Tanque,
  HistoricoTanque,
  Escala,
  DBDivida,
  DBDespesa,
  // Baratência
  ClienteBaratencia,
  CarteiraBaratencia,
  TransacaoBaratencia,
  TokenAbastecimento,
  PromocaoBaratencia,
  TipoTransacaoBaratencia,
  StatusTokenAbastecimento,
  // Enums
  Role,
  StatusFechamento,
  InstallmentStatus,
  PeriodicityType,
} from './entities';
```

---

## 5. Plano de Implementação

### 5.1 Fases

| Fase | Descrição | Arquivos |
|------|-----------|----------|
| 1 | Criar pasta database/ | Estrutura |
| 2 | Extrair schema.ts | Linhas 1-1835 do original |
| 3 | Criar helpers.ts | Linhas 1837-1965 do original |
| 4 | Criar entities.ts | Linhas 1967-2020 do original |
| 5 | Criar index.ts | Re-exports |
| 6 | Atualizar types/index.ts | Apontar para database/ |
| 7 | Deprecar database.ts original | Redirect |
| 8 | Testes e validação | Build, runtime |

### 5.2 Estratégia de Commits

```
refactor(types): cria estrutura database/ para modularização (#9)
refactor(types): extrai schema gerado para schema.ts (#9)
refactor(types): extrai helpers para helpers.ts (#9)
refactor(types): extrai entidades para entities.ts (#9)
refactor(types): cria index.ts com re-exports (#9)
refactor(types): atualiza types/index.ts (#9)
refactor(types): depreca database.ts original (#9)
```

---

## 6. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Breaking change em imports | Baixa | Alto | Re-exports mantêm compatibilidade |
| Erro na extração do schema | Baixa | Médio | Validar com `supabase gen types` |
| Circular dependencies | Baixa | Alto | Dependência clara: schema → helpers → entities |

---

## 7. Definição de Pronto (DoD)

- [x] Schema isolado em schema.ts ✅
- [x] Helpers isolados em helpers.ts ✅
- [x] Entidades isoladas em aliases.ts ✅
- [x] Index.ts com re-exports ✅
- [x] `npm run build` passa sem erros ✅
- [x] Imports existentes funcionam ✅
- [x] Documentação sobre regeneração do schema ✅
- [x] Issue #9 fechada via PR #11 ✅

---

## 8. Implementação Realizada

### 8.1 Arquitetura Final (Superou o Planejado)

A implementação foi além do proposto no PRD original. Ao invés de apenas 3 arquivos (schema.ts, helpers.ts, entities.ts), foi criada uma **arquitetura modular por domínio**:

```
src/types/database/
├── index.ts              # Ponto central de exportação
├── base.ts               # Tipos primitivos (Json)
├── enums.ts              # Enums do banco de dados
├── constants.ts          # Constantes e valores enum
├── schema.ts             # Schema agregador (importa de tables/)
├── helpers.ts            # Utility types (Tables<T>, TablesInsert<T>, etc)
├── aliases.ts            # Aliases de entidades (Bico, Bomba, etc)
├── test_types_check.ts   # Validação de tipos
└── tables/               # ⭐ NOVO: Organização por domínio
    ├── infraestrutura.ts    # Posto, Usuario, Turno, Configuracao
    ├── combustiveis.ts      # Combustivel, Bomba, Bico, Tanque, Estoque
    ├── operacoes.ts         # Frentista, Leitura, Fechamento
    ├── pagamentos.ts        # FormaPagamento, Maquininha
    ├── financeiro.ts        # Emprestimo, Parcela, Divida, Despesa
    ├── compras.ts           # Compra, Fornecedor
    ├── produtos.ts          # Produto, VendaProduto, MovimentacaoEstoque
    ├── clientes.ts          # Cliente, NotaFrentista
    ├── baratencia.ts        # Sistema Baratência completo
    └── notificacoes.ts      # Notificacao, PushToken
```

### 8.2 Melhorias Implementadas

| Aspecto | Planejado | Implementado | Melhoria |
|---------|-----------|--------------|----------|
| **Arquivos** | 4 (index + 3) | 12 (index + 11) | +200% modularização |
| **Organização** | Flat | Hierárquica (tables/) | DDD aplicado |
| **Domínios** | Não especificado | 10 domínios claros | +Manutenibilidade |
| **Schema** | Monolítico | Distribuído por domínio | +Regeneração segura |

### 8.3 Commits Realizados

```
423ea28 - refactor(types): modulariza database.ts em domínios (#11)
```

**PR #11 mesclado com sucesso em:** 10/01/2026 03:45:59 -0300

### 8.4 Benefícios Alcançados

✅ **Separação Clara:** Código gerado vs customizado  
✅ **Regeneração Segura:** Schema pode ser regenerado sem perder customizações  
✅ **Navegação Melhorada:** Encontrar tipos por domínio é intuitivo  
✅ **Performance do Editor:** Arquivos menores = melhor performance  
✅ **Escalabilidade:** Fácil adicionar novos domínios  
✅ **Testabilidade:** Arquivo de validação de tipos incluído  

### 8.5 Comparação: Proposto vs Implementado

#### **Proposto (PRD Original):**
```
database/
├── schema.ts     (~1800 linhas - monolítico)
├── helpers.ts    (~100 linhas)
└── entities.ts   (~80 linhas)
```

#### **Implementado:**
```
database/
├── schema.ts           (98 linhas - agregador)
├── helpers.ts          (921 bytes)
├── aliases.ts          (3.7 KB)
├── base.ts             (405 bytes)
├── enums.ts            (507 bytes)
├── constants.ts        (527 bytes)
└── tables/             (10 arquivos por domínio)
    └── [3-8 KB cada]
```

**Resultado:** Arquitetura mais limpa, escalável e alinhada com DDD.

---

## 9. Regeneração do Schema

Após a modularização, o schema pode ser regenerado com:

```bash
# Regenerar schema do Supabase
npx supabase gen types typescript --local > src/types/database/schema.ts

# Ou se usar projeto remoto
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database/schema.ts
```

**Importante:** Após regenerar, verificar se novas tabelas precisam de aliases em `entities.ts`.

---

## 10. Referências

- Issue: [#9](https://github.com/Thyago-vibe/Posto-Providencia/issues/9)
- Pull Request: [#11](https://github.com/Thyago-vibe/Posto-Providencia/pull/11) ✅ Merged
- Branch: `refactor/tech-debt`
- Commit: `423ea28` - refactor(types): modulariza database.ts em domínios (#11)
- Data de Conclusão: 10/01/2026 03:45:59 -0300
- Arquivo original: `src/types/database.ts` (2.020 linhas) → **Modularizado**
- Relacionado: #7, #8, #10
