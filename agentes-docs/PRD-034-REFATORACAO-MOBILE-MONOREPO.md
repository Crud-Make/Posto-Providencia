# PRD-034: Refatoração Mobile e Migração Monorepo

> **Versão:** 1.0.0
> **Data:** Janeiro/2026
> **Status:** 📋 Planejado
> **Prioridade:** 🔴 CRÍTICA
> **Responsável:** Agente de Engenharia de Software

---

## 📋 Sumário Executivo

Este PRD detalha a refatoração completa do aplicativo mobile (`posto-mobile`) e sua integração em uma arquitetura de **Monorepo com Bun Workspaces**. O objetivo é eliminar dívida técnica crítica, padronizar tipos entre plataformas e criar uma base de código compartilhado sustentável.

### Métricas Atuais vs. Metas

| Métrica | Atual | Meta | Impacto |
|---------|-------|------|---------|
| Ocorrências de `any` | 13 | 0 | Compliance CLAUDE.md |
| Linhas em `registro.tsx` | 1.176 | < 400 | Manutenibilidade |
| Linhas em `api.ts` | 941 | < 200/arquivo | Modularidade |
| Tipos duplicados | 2 arquivos | 1 fonte | Consistência |
| Pacotes compartilhados | 0 | 3 | Reutilização |

---

## 🎯 Objetivos

### Objetivos Primários

1. **Eliminar todos os `any` types** - Compliance total com CLAUDE.md
2. **Modularizar arquivos gigantes** - Componentes < 400 linhas
3. **Criar arquitetura monorepo** - Código compartilhado entre Web e Mobile
4. **Padronizar tipos** - Uma única fonte de verdade (packages/types)

### Objetivos Secundários

5. **Melhorar DX** - IntelliSense preciso, builds mais rápidos
6. **Reduzir bugs de integração** - Tipos sincronizados automaticamente
7. **Facilitar onboarding** - Estrutura clara e documentada

---

## 🔍 Diagnóstico Detalhado

### 1. Violações de `any` Identificadas

```
┌─────────────────────────────────┬────────┬─────────────────────────────────────┬────────────┐
│ Arquivo                         │ Linha  │ Código                              │ Severidade │
├─────────────────────────────────┼────────┼─────────────────────────────────────┼────────────┤
│ lib/api.ts                      │ 299    │ (t as any).ativo !== false          │ ALTA       │
│ lib/api.ts                      │ 560    │ .map((item: any) => { ... })        │ ALTA       │
│ lib/api.ts                      │ 687    │ usuarioIdParaRegistro as any        │ ALTA       │
│ lib/useUpdateChecker.ts         │ 111    │ catch (error: any)                  │ MÉDIA      │
│ lib/useUpdateChecker.ts         │ 157    │ catch (error: any)                  │ MÉDIA      │
│ lib/useUpdateChecker.ts         │ 181    │ catch (error: any)                  │ MÉDIA      │
│ app/abertura-caixa.tsx          │ 74     │ catch (error: any)                  │ MÉDIA      │
│ lib/PostoContext.tsx            │ 83     │ catch (err: any)                    │ MÉDIA      │
│ app/(tabs)/registro.tsx         │ 34     │ icon: any                           │ ALTA       │
│ app/(tabs)/registro.tsx         │ 141    │ handleDateChange = (event: any)     │ ALTA       │
│ app/(tabs)/historico.tsx        │ 137    │ setFiltroAtivo(filtro.key as any)   │ ALTA       │
│ app/(tabs)/perfil.tsx           │ 130    │ icon: any                           │ ALTA       │
└─────────────────────────────────┴────────┴─────────────────────────────────────┴────────────┘
```

### 2. Arquivos Críticos

#### `lib/api.ts` (941 linhas - 23 funções)

**Problema:** Monolito com todas as responsabilidades de API misturadas.

**Funções identificadas:**
- Postos: `getAllPostos`, `getPostoById` (2)
- Frentistas: `getByUserId`, `updateFrentista`, `getAllFrentistasByPosto` (3)
- Usuários: `getUserByEmail` (1)
- Turnos: `getAllTurnos`, `getCurrentTurno` (2)
- Fechamentos: `getOrCreateFechamento`, `updateFechamentoTotals` (2)
- FechamentoFrentista: `createFechamentoFrentista`, `updateFechamentoFrentista`, `fechamentoFrentistaExists`, `getHistoricoFechamentosFrentista` (4)
- Clientes: `getAllClientes`, `searchClientes` (2)
- Submissão: `submitMobileClosing` (1)
- Produtos: `getAllProdutos`, `getProdutoById` (2)
- Vendas: `registrarVendaProduto`, `getVendasProdutoByFechamento` (2)
- Escalas: `getEscalasByFrentista`, `getEscalaByDate` (2)

#### `app/(tabs)/registro.tsx` (1.176 linhas)

**Problema:** Componente "God Object" com múltiplas responsabilidades.

**Estados identificados (20+):**
```typescript
// Frentista
const [frentistas, setFrentistas] = useState<Frentista[]>([]);
const [frentistaId, setFrentistaId] = useState<number | null>(null);
const [modalFrentistaVisible, setModalFrentistaVisible] = useState(false);
const [frentistasQueFecharam, setFrentistasQueFecharam] = useState<number[]>([]);

// Registro
const [registro, setRegistro] = useState<RegistroTurno>({ ... });

// Notas
const [notasAdicionadas, setNotasAdicionadas] = useState<NotaItem[]>([]);
const [modalNotaVisible, setModalNotaVisible] = useState(false);

// Data
const [dataFechamento, setDataFechamento] = useState<Date>(new Date());
const [showDatePicker, setShowDatePicker] = useState(false);
const [modalDataVisible, setModalDataVisible] = useState(false);

// UI
const [loading, setLoading] = useState(false);
const [salvando, setSalvando] = useState(false);
// ... mais 10+
```

### 3. Duplicação de Tipos

**Localização 1:** `posto-mobile/lib/types.ts` (126 linhas)
```typescript
export interface Frentista { ... }
export interface Fechamento { ... }
export interface Cliente { ... }
// 12 interfaces
```

**Localização 2:** `posto-mobile/lib/api.ts` (linhas 7-137)
```typescript
// Mesmas interfaces duplicadas inline
export interface Frentista { ... }
```

**Localização 3:** `src/types/database/` (Web - fonte autoritativa)
```typescript
// Tipos completos do banco de dados
// 37 arquivos de tipos
```

---

## 🏗️ Arquitetura Proposta

### Estrutura Final do Monorepo

```
/Posto-Providencia
├── apps/
│   ├── web/                          # Dashboard React + Vite
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   └── pages/
│   │   ├── package.json              # name: "@posto/web"
│   │   ├── vite.config.ts
│   │   └── tsconfig.json
│   │
│   └── mobile/                       # Expo App
│       ├── app/
│       │   ├── (tabs)/
│       │   │   ├── registro/         # NOVA ESTRUTURA MODULAR
│       │   │   │   ├── index.tsx     # Componente principal (~300 linhas)
│       │   │   │   ├── hooks/
│       │   │   │   │   ├── useRegistroForm.ts
│       │   │   │   │   ├── useRegistroData.ts
│       │   │   │   │   └── useRegistroSubmit.ts
│       │   │   │   └── components/
│       │   │   │       ├── HeaderRegistro.tsx
│       │   │   │       ├── FormaPagamentoGrid.tsx
│       │   │   │       ├── NotasModal.tsx
│       │   │   │       └── ResumoCaixa.tsx
│       │   │   ├── perfil/
│       │   │   ├── vendas/
│       │   │   └── historico/
│       │   └── _layout.tsx
│       │
│       ├── lib/
│       │   ├── services/             # API MODULARIZADA
│       │   │   ├── posto.service.ts
│       │   │   ├── frentista.service.ts
│       │   │   ├── turno.service.ts
│       │   │   ├── fechamento.service.ts
│       │   │   ├── cliente.service.ts
│       │   │   ├── produto.service.ts
│       │   │   └── index.ts          # Re-exports
│       │   ├── hooks/
│       │   ├── context/
│       │   └── supabase.ts
│       │
│       ├── package.json              # name: "@posto/mobile"
│       ├── metro.config.js           # Configuração monorepo
│       └── tsconfig.json
│
├── packages/
│   ├── types/                        # TIPOS COMPARTILHADOS
│   │   ├── src/
│   │   │   ├── database/             # Tipos do banco (migrados do web)
│   │   │   │   ├── tables/
│   │   │   │   ├── enums.ts
│   │   │   │   └── index.ts
│   │   │   ├── api/                  # Tipos de resposta API
│   │   │   │   ├── responses.ts
│   │   │   │   └── requests.ts
│   │   │   └── index.ts
│   │   ├── package.json              # name: "@posto/types"
│   │   └── tsconfig.json
│   │
│   ├── utils/                        # UTILITÁRIOS COMPARTILHADOS
│   │   ├── src/
│   │   │   ├── formatters.ts         # formatarMoeda, analisarValor
│   │   │   ├── calculators.ts        # cálculos financeiros
│   │   │   ├── validators.ts         # validações comuns
│   │   │   └── index.ts
│   │   ├── package.json              # name: "@posto/utils"
│   │   └── tsconfig.json
│   │
│   └── api-core/                     # CAMADA BASE SUPABASE
│       ├── src/
│       │   ├── client.ts             # Supabase client factory
│       │   ├── responses.ts          # ApiResponse, createSuccessResponse
│       │   ├── errors.ts             # Tratamento de erros padronizado
│       │   └── index.ts
│       ├── package.json              # name: "@posto/api-core"
│       └── tsconfig.json
│
├── package.json                      # Workspaces root
├── bun.lockb
├── tsconfig.base.json                # Configuração TS compartilhada
└── turbo.json                        # (Opcional) Turborepo config
```

### Configuração do Workspace

**`/package.json` (raiz)**
```json
{
  "name": "posto-providencia-monorepo",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "dev:web": "bun --filter @posto/web dev",
    "dev:mobile": "bun --filter @posto/mobile start",
    "build": "turbo run build",
    "build:web": "bun --filter @posto/web build",
    "typecheck": "turbo run typecheck",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "~5.8.2"
  }
}
```

**`/tsconfig.base.json`**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "composite": true
  }
}
```

---

## 📦 Especificação dos Pacotes

### 1. `@posto/types`

**Propósito:** Fonte única de verdade para tipos do banco de dados e contratos de API.

**Conteúdo migrado do Web:**
```typescript
// packages/types/src/database/tables/operacoes.ts
export interface Frentista {
  id: number;
  nome: string;
  cpf: string | null;
  telefone: string | null;
  data_admissao: string | null;
  ativo: boolean;
  user_id: string | null;
  turno_id: number | null;
  posto_id: number;
}

export interface Fechamento {
  id: number;
  data: string;
  usuario_id: number;  // CRÍTICO: number, não string
  turno_id: number;
  status: StatusFechamento;
  total_vendas: number | null;
  total_recebido: number | null;
  diferenca: number | null;
  observacoes: string | null;
  posto_id: number;
}

// ... demais tipos
```

**Enums padronizados:**
```typescript
// packages/types/src/database/enums.ts
export enum StatusFechamento {
  ABERTO = 'aberto',
  FECHADO = 'fechado',
  REVISAO = 'revisao'
}

export enum FormaPagamento {
  DINHEIRO = 'dinheiro',
  PIX = 'pix',
  CARTAO_CREDITO = 'cartao_credito',
  CARTAO_DEBITO = 'cartao_debito',
  NOTA_VALE = 'nota_vale'
}

export enum TipoEscala {
  TRABALHO = 'TRABALHO',
  FOLGA = 'FOLGA'
}
```

### 2. `@posto/utils`

**Propósito:** Funções utilitárias compartilhadas entre plataformas.

**Funções migradas:**
```typescript
// packages/utils/src/formatters.ts

/**
 * Converte string brasileira para número
 * @example analisarValor("1.234,56") // 1234.56
 */
export const analisarValor = (value: string): number => { ... }

/**
 * Formata número para moeda BRL
 * @example formatarMoeda(1234.56) // "R$ 1.234,56"
 */
export const formatarMoeda = (valor: number): string => { ... }

/**
 * Formata número para padrão BR com decimais
 * @example formatarParaBR(1234.567, 3) // "1.234,567"
 */
export const formatarParaBR = (num: number, decimais?: number): string => { ... }
```

```typescript
// packages/utils/src/calculators.ts

/**
 * Calcula total de pagamentos de um fechamento
 */
export const calcularTotalPagamentos = (
  pagamentos: Pick<FechamentoFrentista, 'valor_dinheiro' | 'valor_pix' | 'valor_cartao_credito' | 'valor_cartao_debito' | 'valor_nota'>
): number => {
  return (
    pagamentos.valor_dinheiro +
    pagamentos.valor_pix +
    pagamentos.valor_cartao_credito +
    pagamentos.valor_cartao_debito +
    pagamentos.valor_nota
  );
}

/**
 * Calcula diferença de caixa
 */
export const calcularDiferencaCaixa = (
  valorEsperado: number,
  valorInformado: number
): number => {
  return valorInformado - valorEsperado;
}
```

### 3. `@posto/api-core`

**Propósito:** Camada base para comunicação com Supabase.

```typescript
// packages/api-core/src/responses.ts

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
  timestamp: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export const createSuccessResponse = <T>(data: T): ApiResponse<T> => ({
  success: true,
  data,
  error: null,
  timestamp: new Date().toISOString()
});

export const createErrorResponse = <T>(
  code: string,
  message: string,
  details?: Record<string, unknown>
): ApiResponse<T> => ({
  success: false,
  data: null,
  error: { code, message, details },
  timestamp: new Date().toISOString()
});
```

---

## 🛠️ Plano de Refatoração Mobile

### Fase 1: Eliminação de `any` (Prioridade CRÍTICA)

#### 1.1 Correções em `lib/api.ts`

**Linha 299 - Filtro de turnos ativos:**
```typescript
// ❌ ANTES
const activeTurnos = turnos.filter(t => (t as any).ativo !== false);

// ✅ DEPOIS
interface TurnoComStatus extends Turno {
  ativo?: boolean;
}
const activeTurnos = turnos.filter((t: TurnoComStatus) => t.ativo !== false);
```

**Linha 560 - Mapeamento de histórico:**
```typescript
// ❌ ANTES
return (data || []).map((item: any) => { ... });

// ✅ DEPOIS
interface FechamentoFrentistaHistorico {
  id: number;
  Fechamento?: {
    data: string;
    Turno?: { nome: string };
  };
  valor_cartao: number;
  valor_nota: number;
  valor_pix: number;
  valor_dinheiro: number;
  encerrante?: number;
  diferenca_calculada?: number;
  observacoes?: string | null;
}

return (data || []).map((item: FechamentoFrentistaHistorico) => { ... });
```

**Linha 687 - Usuario ID:**
```typescript
// ❌ ANTES
usuarioIdParaRegistro as any

// ✅ DEPOIS
// Definir tipo correto na interface ou usar type guard
const usuarioIdParaRegistro: number = typeof userId === 'string'
  ? parseInt(userId, 10)
  : userId;
```

#### 1.2 Correções em `registro.tsx`

**Linha 34 - Icon type:**
```typescript
// ❌ ANTES
interface FormaPagamento {
  icon: any;
}

// ✅ DEPOIS
import type { LucideIcon } from 'lucide-react-native';

interface FormaPagamento {
  icon: LucideIcon;
}
```

**Linha 141 - DateTimePicker event:**
```typescript
// ❌ ANTES
const handleDateChange = (event: any, selectedDate?: Date) => { ... };

// ✅ DEPOIS
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';

const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => { ... };
```

#### 1.3 Correções de `catch (error: any)`

**Padrão a aplicar em todos os arquivos:**
```typescript
// ❌ ANTES
catch (error: any) {
  console.error('Erro:', error.message);
}

// ✅ DEPOIS
catch (error) {
  const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
  console.error('Erro:', mensagem);
}
```

### Fase 2: Modularização de `api.ts`

**Estrutura de serviços:**

```typescript
// lib/services/posto.service.ts
import { supabase } from '../supabase';
import type { Posto } from '@posto/types';
import type { ApiResponse } from '@posto/api-core';

export const postoService = {
  async getAll(): Promise<ApiResponse<Posto[]>> { ... },
  async getById(id: number): Promise<ApiResponse<Posto | null>> { ... }
};
```

```typescript
// lib/services/frentista.service.ts
import { supabase } from '../supabase';
import type { Frentista } from '@posto/types';
import type { ApiResponse } from '@posto/api-core';

export const frentistaService = {
  async getByUserId(userId: string): Promise<ApiResponse<Frentista | null>> { ... },
  async getAllByPosto(postoId: number): Promise<ApiResponse<Frentista[]>> { ... },
  async update(id: number, dados: Partial<Frentista>): Promise<ApiResponse<Frentista>> { ... }
};
```

```typescript
// lib/services/fechamento.service.ts
import { supabase } from '../supabase';
import type { Fechamento, FechamentoFrentista, SubmitClosingData } from '@posto/types';
import type { ApiResponse } from '@posto/api-core';

export const fechamentoService = {
  async getOrCreate(data: string, turnoId: number, postoId: number): Promise<ApiResponse<Fechamento>> { ... },
  async updateTotals(id: number, totais: Partial<Fechamento>): Promise<ApiResponse<void>> { ... }
};

export const fechamentoFrentistaService = {
  async create(dados: Omit<FechamentoFrentista, 'id'>): Promise<ApiResponse<FechamentoFrentista>> { ... },
  async update(id: number, dados: Partial<FechamentoFrentista>): Promise<ApiResponse<void>> { ... },
  async exists(fechamentoId: number, frentistaId: number): Promise<ApiResponse<boolean>> { ... },
  async getHistorico(frentistaId: number, limite?: number): Promise<ApiResponse<FechamentoFrentistaHistorico[]>> { ... }
};

export const submitMobileClosing = async (dados: SubmitClosingData): Promise<ApiResponse<void>> { ... };
```

```typescript
// lib/services/index.ts
export { postoService } from './posto.service';
export { frentistaService } from './frentista.service';
export { turnoService } from './turno.service';
export { fechamentoService, fechamentoFrentistaService, submitMobileClosing } from './fechamento.service';
export { clienteService } from './cliente.service';
export { produtoService } from './produto.service';
export { vendaService } from './venda.service';
export { escalaService } from './escala.service';
```

### Fase 3: Refatoração de `registro.tsx`

**Extração de Hooks:**

```typescript
// app/(tabs)/registro/hooks/useRegistroForm.ts
import { useState, useCallback } from 'react';
import type { RegistroTurno, NotaItem, FormaPagamento } from '@posto/types';

interface UseRegistroFormReturn {
  registro: RegistroTurno;
  setRegistro: React.Dispatch<React.SetStateAction<RegistroTurno>>;
  notasAdicionadas: NotaItem[];
  adicionarNota: (nota: NotaItem) => void;
  removerNota: (index: number) => void;
  limparFormulario: () => void;
  calcularTotais: () => { totalPagamentos: number; diferenca: number };
}

export const useRegistroForm = (valorEncerranteAnterior: number): UseRegistroFormReturn => {
  const [registro, setRegistro] = useState<RegistroTurno>(REGISTRO_INICIAL);
  const [notasAdicionadas, setNotasAdicionadas] = useState<NotaItem[]>([]);

  const adicionarNota = useCallback((nota: NotaItem) => {
    setNotasAdicionadas(prev => [...prev, nota]);
  }, []);

  const removerNota = useCallback((index: number) => {
    setNotasAdicionadas(prev => prev.filter((_, i) => i !== index));
  }, []);

  const limparFormulario = useCallback(() => {
    setRegistro(REGISTRO_INICIAL);
    setNotasAdicionadas([]);
  }, []);

  const calcularTotais = useCallback(() => {
    const totalPagamentos =
      registro.valor_dinheiro +
      registro.valor_pix +
      registro.valor_cartao_credito +
      registro.valor_cartao_debito +
      registro.valor_nota;

    const diferenca = totalPagamentos - (registro.valor_encerrante - valorEncerranteAnterior);

    return { totalPagamentos, diferenca };
  }, [registro, valorEncerranteAnterior]);

  return {
    registro,
    setRegistro,
    notasAdicionadas,
    adicionarNota,
    removerNota,
    limparFormulario,
    calcularTotais
  };
};
```

```typescript
// app/(tabs)/registro/hooks/useRegistroData.ts
import { useState, useEffect } from 'react';
import { frentistaService, turnoService, clienteService } from '../../../lib/services';
import type { Frentista, Turno, Cliente } from '@posto/types';

interface UseRegistroDataReturn {
  frentistas: Frentista[];
  turnos: Turno[];
  clientes: Cliente[];
  turnoAtual: Turno | null;
  loading: boolean;
  error: string | null;
  recarregar: () => Promise<void>;
}

export const useRegistroData = (postoId: number): UseRegistroDataReturn => {
  const [frentistas, setFrentistas] = useState<Frentista[]>([]);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [turnoAtual, setTurnoAtual] = useState<Turno | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const carregarDados = async () => {
    setLoading(true);
    setError(null);

    try {
      const [frentistasRes, turnosRes, clientesRes] = await Promise.all([
        frentistaService.getAllByPosto(postoId),
        turnoService.getAll(postoId),
        clienteService.getAll(postoId)
      ]);

      if (frentistasRes.success) setFrentistas(frentistasRes.data || []);
      if (turnosRes.success) {
        setTurnos(turnosRes.data || []);
        const atual = await turnoService.getCurrentTurno(postoId);
        if (atual.success) setTurnoAtual(atual.data);
      }
      if (clientesRes.success) setClientes(clientesRes.data || []);

    } catch (err) {
      const mensagem = err instanceof Error ? err.message : 'Erro ao carregar dados';
      setError(mensagem);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [postoId]);

  return {
    frentistas,
    turnos,
    clientes,
    turnoAtual,
    loading,
    error,
    recarregar: carregarDados
  };
};
```

```typescript
// app/(tabs)/registro/hooks/useRegistroSubmit.ts
import { useState, useCallback } from 'react';
import { submitMobileClosing } from '../../../lib/services';
import type { SubmitClosingData } from '@posto/types';

interface UseRegistroSubmitReturn {
  salvando: boolean;
  erro: string | null;
  sucesso: boolean;
  submeter: (dados: SubmitClosingData) => Promise<boolean>;
  limparEstado: () => void;
}

export const useRegistroSubmit = (): UseRegistroSubmitReturn => {
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  const submeter = useCallback(async (dados: SubmitClosingData): Promise<boolean> => {
    setSalvando(true);
    setErro(null);
    setSucesso(false);

    try {
      const resultado = await submitMobileClosing(dados);

      if (resultado.success) {
        setSucesso(true);
        return true;
      } else {
        setErro(resultado.error?.message || 'Erro ao salvar fechamento');
        return false;
      }
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : 'Erro desconhecido';
      setErro(mensagem);
      return false;
    } finally {
      setSalvando(false);
    }
  }, []);

  const limparEstado = useCallback(() => {
    setErro(null);
    setSucesso(false);
  }, []);

  return { salvando, erro, sucesso, submeter, limparEstado };
};
```

**Extração de Componentes:**

```typescript
// app/(tabs)/registro/components/FormaPagamentoGrid.tsx
import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

interface FormaPagamentoItem {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
}

interface FormaPagamentoGridProps {
  formasPagamento: FormaPagamentoItem[];
  valores: Record<string, number>;
  onValorChange: (id: string, valor: number) => void;
}

export const FormaPagamentoGrid: React.FC<FormaPagamentoGridProps> = ({
  formasPagamento,
  valores,
  onValorChange
}) => {
  return (
    <View className="flex-row flex-wrap justify-between">
      {formasPagamento.map((forma) => {
        const Icon = forma.icon;
        return (
          <View key={forma.id} className="w-[48%] mb-3">
            <View className={`p-3 rounded-lg ${forma.bgColor}`}>
              <View className="flex-row items-center mb-2">
                <Icon size={20} color={forma.color} />
                <Text className="ml-2 font-medium text-gray-700">{forma.label}</Text>
              </View>
              <TextInput
                className="bg-white rounded-lg p-3 text-lg"
                keyboardType="numeric"
                placeholder="R$ 0,00"
                value={valores[forma.id]?.toString() || ''}
                onChangeText={(text) => onValorChange(forma.id, parseFloat(text) || 0)}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
};
```

```typescript
// app/(tabs)/registro/components/NotasModal.tsx
import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, FlatList, TextInput } from 'react-native';
import { X, Plus, Trash2 } from 'lucide-react-native';
import type { Cliente, NotaItem } from '@posto/types';

interface NotasModalProps {
  visible: boolean;
  onClose: () => void;
  clientes: Cliente[];
  notasAdicionadas: NotaItem[];
  onAdicionarNota: (nota: NotaItem) => void;
  onRemoverNota: (index: number) => void;
}

export const NotasModal: React.FC<NotasModalProps> = ({
  visible,
  onClose,
  clientes,
  notasAdicionadas,
  onAdicionarNota,
  onRemoverNota
}) => {
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [valorNota, setValorNota] = useState('');

  const handleAdicionar = () => {
    if (clienteSelecionado && valorNota) {
      onAdicionarNota({
        cliente_id: clienteSelecionado.id,
        cliente_nome: clienteSelecionado.nome,
        valor: parseFloat(valorNota)
      });
      setClienteSelecionado(null);
      setValorNota('');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl p-6 max-h-[80%]">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-bold">Notas a Prazo</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Conteúdo do modal */}
          {/* ... */}
        </View>
      </View>
    </Modal>
  );
};
```

```typescript
// app/(tabs)/registro/components/ResumoCaixa.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { formatarMoeda } from '@posto/utils';

interface ResumoCaixaProps {
  totalPagamentos: number;
  valorEsperado: number;
  diferenca: number;
}

export const ResumoCaixa: React.FC<ResumoCaixaProps> = ({
  totalPagamentos,
  valorEsperado,
  diferenca
}) => {
  const diferencaPositiva = diferenca >= 0;

  return (
    <View className="bg-gray-50 rounded-xl p-4 mb-4">
      <Text className="text-lg font-bold mb-3">Resumo do Caixa</Text>

      <View className="flex-row justify-between mb-2">
        <Text className="text-gray-600">Total Informado:</Text>
        <Text className="font-semibold">{formatarMoeda(totalPagamentos)}</Text>
      </View>

      <View className="flex-row justify-between mb-2">
        <Text className="text-gray-600">Valor Esperado:</Text>
        <Text className="font-semibold">{formatarMoeda(valorEsperado)}</Text>
      </View>

      <View className="h-px bg-gray-300 my-2" />

      <View className="flex-row justify-between">
        <Text className="text-gray-600">Diferença:</Text>
        <Text className={`font-bold ${diferencaPositiva ? 'text-green-600' : 'text-red-600'}`}>
          {diferencaPositiva ? '+' : ''}{formatarMoeda(diferenca)}
        </Text>
      </View>
    </View>
  );
};
```

**Componente Principal Refatorado:**

```typescript
// app/(tabs)/registro/index.tsx (~300 linhas)
import React from 'react';
import { View, ScrollView, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Banknote, CreditCard, Smartphone, FileText, Send } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

// Hooks customizados
import { useRegistroForm } from './hooks/useRegistroForm';
import { useRegistroData } from './hooks/useRegistroData';
import { useRegistroSubmit } from './hooks/useRegistroSubmit';

// Componentes
import { FormaPagamentoGrid } from './components/FormaPagamentoGrid';
import { NotasModal } from './components/NotasModal';
import { ResumoCaixa } from './components/ResumoCaixa';
import { HeaderRegistro } from './components/HeaderRegistro';

// Context
import { usePosto } from '../../../lib/context/PostoContext';

const FORMAS_PAGAMENTO: Array<{
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
}> = [
  { id: 'dinheiro', label: 'Dinheiro', icon: Banknote, color: '#16a34a', bgColor: 'bg-green-50' },
  { id: 'pix', label: 'PIX', icon: Smartphone, color: '#0891b2', bgColor: 'bg-cyan-50' },
  { id: 'cartao_credito', label: 'Crédito', icon: CreditCard, color: '#2563eb', bgColor: 'bg-blue-50' },
  { id: 'cartao_debito', label: 'Débito', icon: CreditCard, color: '#7c3aed', bgColor: 'bg-purple-50' },
  { id: 'nota', label: 'Nota/Vale', icon: FileText, color: '#ea580c', bgColor: 'bg-orange-50' },
];

export default function RegistroScreen() {
  const { posto, frentista } = usePosto();
  const [modalNotaVisible, setModalNotaVisible] = React.useState(false);

  // Hooks customizados
  const { frentistas, turnos, clientes, turnoAtual, loading, error, recarregar } = useRegistroData(posto?.id || 0);
  const { registro, setRegistro, notasAdicionadas, adicionarNota, removerNota, limparFormulario, calcularTotais } = useRegistroForm(0);
  const { salvando, erro, sucesso, submeter, limparEstado } = useRegistroSubmit();

  // Cálculos
  const { totalPagamentos, diferenca } = calcularTotais();

  // Handlers
  const handleValorChange = (id: string, valor: number) => {
    setRegistro(prev => ({ ...prev, [`valor_${id}`]: valor }));
  };

  const handleSubmit = async () => {
    if (!turnoAtual) {
      Alert.alert('Erro', 'Nenhum turno ativo no momento');
      return;
    }

    const dados = {
      data: new Date().toISOString().split('T')[0],
      turno_id: turnoAtual.id,
      posto_id: posto!.id,
      frentista_id: frentista?.id,
      ...registro,
      notas: notasAdicionadas.map(n => ({ cliente_id: n.cliente_id, valor: n.valor }))
    };

    const sucesso = await submeter(dados);

    if (sucesso) {
      Alert.alert('Sucesso', 'Fechamento registrado com sucesso!');
      limparFormulario();
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center">
        <Text>Carregando...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 px-4">
        <HeaderRegistro
          turnoAtual={turnoAtual}
          frentista={frentista}
          data={new Date()}
        />

        <FormaPagamentoGrid
          formasPagamento={FORMAS_PAGAMENTO}
          valores={registro}
          onValorChange={handleValorChange}
        />

        <TouchableOpacity
          className="bg-orange-100 p-4 rounded-xl mb-4"
          onPress={() => setModalNotaVisible(true)}
        >
          <Text className="text-orange-700 font-semibold text-center">
            + Adicionar Nota a Prazo ({notasAdicionadas.length})
          </Text>
        </TouchableOpacity>

        <ResumoCaixa
          totalPagamentos={totalPagamentos}
          valorEsperado={registro.valor_encerrante}
          diferenca={diferenca}
        />

        {erro && (
          <View className="bg-red-100 p-3 rounded-lg mb-4">
            <Text className="text-red-700">{erro}</Text>
          </View>
        )}

        <TouchableOpacity
          className={`p-4 rounded-xl flex-row justify-center items-center ${salvando ? 'bg-gray-400' : 'bg-blue-600'}`}
          onPress={handleSubmit}
          disabled={salvando}
        >
          <Send size={20} color="#fff" />
          <Text className="text-white font-bold ml-2">
            {salvando ? 'Salvando...' : 'Registrar Fechamento'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <NotasModal
        visible={modalNotaVisible}
        onClose={() => setModalNotaVisible(false)}
        clientes={clientes}
        notasAdicionadas={notasAdicionadas}
        onAdicionarNota={adicionarNota}
        onRemoverNota={removerNota}
      />
    </SafeAreaView>
  );
}
```

---

## 📅 Cronograma de Implementação

### Fase 1: Preparação (Semana 1)

| Dia | Tarefa | Entregável |
|-----|--------|------------|
| 1 | Criar estrutura de workspaces | `package.json` raiz configurado |
| 1 | Configurar `tsconfig.base.json` | Configuração TS compartilhada |
| 2 | Criar `packages/types` | Estrutura base do pacote |
| 2-3 | Migrar tipos do web para `@posto/types` | Tipos centralizados |
| 4 | Criar `packages/utils` | Formatadores migrados |
| 5 | Criar `packages/api-core` | Padrão ApiResponse |

### Fase 2: Migração Física (Semana 2)

| Dia | Tarefa | Entregável |
|-----|--------|------------|
| 1 | Mover `src/` para `apps/web/` | Estrutura reorganizada |
| 2 | Mover `posto-mobile/` para `apps/mobile/` | Estrutura reorganizada |
| 3 | Ajustar imports e aliases | Projeto compilando |
| 4 | Configurar `metro.config.js` do Expo | Mobile funcional |
| 5 | Testar build de ambos os apps | CI verde |

### Fase 3: Refatoração Mobile (Semana 3-4)

| Dia | Tarefa | Entregável |
|-----|--------|------------|
| 1-2 | Eliminar todos os `any` | 0 violações |
| 3-4 | Modularizar `api.ts` em services | 8 arquivos de serviço |
| 5-6 | Extrair hooks de `registro.tsx` | 3 hooks customizados |
| 7-8 | Extrair componentes de `registro.tsx` | 5 componentes |
| 9 | Refatorar componente principal | < 400 linhas |
| 10 | Testes de integração | Funcionalidades validadas |

### Fase 4: Validação e Deploy (Semana 5)

| Dia | Tarefa | Entregável |
|-----|--------|------------|
| 1 | Testes end-to-end Web + Mobile | Bugs identificados |
| 2-3 | Correção de bugs encontrados | Sistema estável |
| 4 | Atualizar documentação | Docs atualizados |
| 5 | Deploy em produção | Release v4.0.0 |

---

## ⚠️ Riscos e Mitigações

### Risco 1: Quebra de Roteamento Expo
**Probabilidade:** Média
**Impacto:** Alto
**Mitigação:**
- Seguir documentação oficial do Expo para monorepos
- Configurar `metro.config.js` com `watchFolders` corretos
- Testar em ambiente isolado antes de merge

```javascript
// metro.config.js
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

module.exports = config;
```

### Risco 2: Incompatibilidade de Versões React
**Probabilidade:** Baixa
**Impacto:** Alto
**Mitigação:**
- Web usa React 19.2.1
- Mobile usa React 19.1.0
- Padronizar para versão compatível via `resolutions`

```json
{
  "resolutions": {
    "react": "19.1.0",
    "@types/react": "~19.1.0"
  }
}
```

### Risco 3: Tempo de Build Aumentado
**Probabilidade:** Média
**Impacto:** Baixo
**Mitigação:**
- Implementar Turborepo para cache de builds
- Configurar builds incrementais

### Risco 4: Regressões Funcionais
**Probabilidade:** Média
**Impacto:** Alto
**Mitigação:**
- Criar branch `feature/#34-monorepo-refactor`
- Testes manuais em cada fase
- Não alterar lógica de negócio, apenas estrutura

---

## ✅ Critérios de Aceite

### Obrigatórios

- [ ] `bun install` na raiz resolve todas as dependências
- [ ] `bun run build` compila Web e Mobile sem erros
- [ ] Zero ocorrências de `any` no código mobile
- [ ] `registro.tsx` possui menos de 400 linhas
- [ ] `api.ts` foi substituído por arquivos de serviço < 200 linhas cada
- [ ] Alteração em `@posto/types` gera erro de compilação em ambos os apps se houver quebra
- [ ] IntelliSense funciona corretamente no VS Code para imports de `@posto/*`

### Desejáveis

- [ ] Tempo de build do mobile não aumentou mais que 20%
- [ ] Turborepo configurado para cache de builds
- [ ] Documentação JSDoc em todas as funções públicas dos packages
- [ ] README atualizado com instruções de desenvolvimento no monorepo

---

## 📊 Métricas de Sucesso

| Métrica | Baseline | Meta | Medição |
|---------|----------|------|---------|
| Ocorrências de `any` | 13 | 0 | `grep -r "any" --include="*.ts*"` |
| Linhas em `registro.tsx` | 1.176 | < 400 | `wc -l` |
| Linhas em maior arquivo de serviço | 941 | < 200 | `wc -l` |
| Tipos duplicados | 2 locais | 1 local | Auditoria manual |
| Tempo de build Web | X seg | X seg | `time bun run build:web` |
| Tempo de build Mobile | Y seg | Y * 1.2 seg | `time bun run build:mobile` |
| Erros TypeScript | 0 | 0 | `tsc --noEmit` |

---

## 📚 Referências

- [Bun Workspaces Documentation](https://bun.sh/docs/install/workspaces)
- [Expo Monorepo Guide](https://docs.expo.dev/guides/monorepos/)
- [Turborepo Documentation](https://turbo.build/repo/docs)
- PRD-033: Migração para Monorepo (documento anterior)
- INSTRUCOES-MONOREPO.md (instruções para agentes)

---

## 🔄 Histórico de Revisões

| Versão | Data | Autor | Alterações |
|--------|------|-------|------------|
| 1.0.0 | Janeiro/2026 | Agente IA | Criação inicial |

---

**Aprovação:**

- [ ] Thyago (Desenvolvedor Principal)
- [ ] Revisão de Arquitetura

---

> **Nota:** Este PRD substitui e expande o PRD-033, incorporando análise detalhada do código atual e especificações técnicas completas para implementação.
