# 📚 Complemento: useState e useContext nos Hooks

**Data:** 11/01/2026  
**Versão:** 1.1  
**Complemento ao:** GUIA-HOOKS-CUSTOMIZADOS.md

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [useState nos Hooks](#usestate-nos-hooks)
3. [useContext nos Hooks](#usecontext-nos-hooks)
4. [Contextos do Sistema](#contextos-do-sistema)
5. [Padrões de Uso](#padrões-de-uso)
6. [Exemplos Práticos](#exemplos-práticos)

---

## 🎯 Visão Geral

### Resposta Rápida

**SIM!** Os hooks customizados do sistema fazem uso extensivo de:

✅ **`useState`** - Todos os 14 hooks usam para gerenciar estado local  
✅ **`useContext`** - 6 hooks usam `usePosto()` para acessar contexto  
✅ **Contextos Customizados** - 3 contextos globais no sistema

### Estatísticas de Uso

| Hook React | Uso nos Hooks | Finalidade |
|------------|---------------|------------|
| **`useState`** | 14/14 (100%) | Gerenciar estado local |
| **`useContext`** | 6/14 (43%) | Acessar contexto global |
| **`useEffect`** | 12/14 (86%) | Efeitos colaterais |
| **`useCallback`** | 10/14 (71%) | Otimização de funções |

---

## 📦 useState nos Hooks

### Uso Geral

**TODOS os 14 hooks** usam `useState` para gerenciar estado local. É o hook mais fundamental.

### Padrões de Uso

#### 1. Estado de Loading
```typescript
// Padrão em TODOS os hooks de dados
const [loading, setLoading] = useState(true);

// Sempre usado com try/finally
const loadData = async () => {
    setLoading(true);
    try {
        // ... carregar dados
    } finally {
        setLoading(false); // SEMPRE no finally
    }
};
```

**Hooks que usam:**
- ✅ `useClientesData`
- ✅ `useConfiguracoesData`
- ✅ `useDashboardMetrics`
- ✅ `useWeeklyVolume`
- ✅ `useAIInsights`
- ✅ `useStockAlerts`
- ✅ `useTopPerformers`

#### 2. Estado de Dados
```typescript
// Arrays tipados
const [clientes, setClientes] = useState<ClienteComSaldo[]>([]);
const [products, setProducts] = useState<Produto[]>([]);
const [notas, setNotas] = useState<NotaFrentistaComRelacoes[]>([]);

// Objetos tipados
const [resumo, setResumo] = useState<ClientesResumoData>({
    totalClientes: 0,
    totalDevedores: 0,
    valorTotalPendente: 0
});

// Valores únicos
const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
```

**Hooks que usam:**
- ✅ Todos os 14 hooks

#### 3. Estado de Modal
```typescript
// Controle de abertura/fechamento
const [isOpen, setIsOpen] = useState(false);
const [isModalOpen, setIsModalOpen] = useState(false);
const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

// Item sendo editado
const [editingId, setEditingId] = useState<number | null>(null);
const [editingPayment, setEditingPayment] = useState<FormaPagamento | null>(null);
```

**Hooks que usam:**
- ✅ `useClienteForm`
- ✅ `useNotaFrentista`
- ✅ `usePagamento`
- ✅ `useFormaPagamento`
- ✅ `useResetSistema`

#### 4. Estado de Formulário
```typescript
// Dados do formulário
const [formData, setFormData] = useState<ClienteFormData>({
    nome: '',
    documento: '',
    telefone: '',
    email: '',
    limite_credito: '',
    endereco: ''
});

// Estado de salvamento
const [saving, setSaving] = useState(false);
```

**Hooks que usam:**
- ✅ `useClienteForm`
- ✅ `useNotaFrentista`
- ✅ `usePagamento`
- ✅ `useFormaPagamento`

---

## 🌐 useContext nos Hooks

### Contexto Principal: `usePosto()`

**6 hooks** usam `usePosto()` para acessar o posto ativo:

```typescript
import { usePosto } from '../../../contexts/PostoContext';

export function useNomeDoHook() {
    const { postoAtivoId } = usePosto(); // Acessa contexto global
    
    // Usa postoAtivoId para carregar dados
    const loadData = async () => {
        if (!postoAtivoId) return;
        const data = await api.getData(postoAtivoId);
        // ...
    };
}
```

### Hooks que Usam `usePosto()`

#### Dashboard AI (5 hooks)
1. ✅ `useDashboardMetrics`
2. ✅ `useWeeklyVolume`
3. ✅ `useStockAlerts`
4. ✅ `useTopPerformers`
5. ✅ `useAIPromotion`

#### Configurações (1 hook)
6. ✅ `useConfiguracoesData`

### Por Que Não Todos?

**Alguns hooks recebem `postoId` como parâmetro** em vez de usar contexto:

```typescript
// ❌ NÃO usa contexto - recebe como parâmetro
export function useClientesData(postoId: number | undefined) {
    // postoId vem do componente pai
}

// ✅ USA contexto - busca internamente
export function useDashboardMetrics() {
    const { postoAtivoId } = usePosto(); // Busca do contexto
}
```

**Motivo:** Flexibilidade - permite usar o hook com diferentes postos se necessário.

---

## 🏢 Contextos do Sistema

### 1. PostoContext

**Arquivo:** `src/contexts/PostoContext.tsx` (169 linhas)

**Responsabilidade:** Gerenciar posto ativo e lista de postos.

**Estado Gerenciado:**
```typescript
interface PostoContextType {
    postos: Posto[];              // Lista de postos
    postoAtivo: Posto | null;     // Posto selecionado
    postoAtivoId: number;         // ID do posto ativo
    loading: boolean;             // Estado de carregamento
    error: string | null;         // Erros
    setPostoAtivo: (posto: Posto) => void;        // Selecionar posto
    setPostoAtivoById: (id: number) => void;      // Selecionar por ID
    refreshPostos: () => Promise<void>;           // Recarregar
}
```

**Hook de Acesso:**
```typescript
import { usePosto } from '../contexts/PostoContext';

const { postoAtivoId, postoAtivo, setPostoAtivo } = usePosto();
```

**Funcionalidades:**
- ✅ Carrega postos do banco de dados
- ✅ Mantém posto ativo em `localStorage`
- ✅ Fallback para posto padrão em caso de erro
- ✅ Notifica mudanças para todos os componentes

**Usado em:**
- 6 hooks customizados
- Múltiplos componentes
- Toda a aplicação

---

### 2. AuthContext

**Arquivo:** `src/contexts/AuthContext.tsx` (144 linhas)

**Responsabilidade:** Gerenciar autenticação e usuário logado.

**Estado Gerenciado:**
```typescript
interface AuthContextType {
    session: Session | null;      // Sessão do Supabase
    user: Usuario | null;         // Usuário logado
    loading: boolean;             // Estado de carregamento
    signIn: (email: string, password: string) => Promise<{ error: any }>;
    signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
    signOut: () => Promise<void>;
}
```

**Hook de Acesso:**
```typescript
import { useAuth } from '../contexts/AuthContext';

const { user, session, signIn, signOut } = useAuth();
```

**Funcionalidades:**
- ✅ Autenticação com Supabase
- ✅ Mock user para desenvolvimento
- ✅ Persistência de sessão
- ✅ Gerenciamento de perfil

**Usado em:**
- Componentes de autenticação
- Guards de rota
- Componentes que precisam do usuário logado

---

### 3. ThemeContext

**Arquivo:** `src/contexts/ThemeContext.tsx` (1.526 bytes)

**Responsabilidade:** Gerenciar tema dark/light.

**Estado Gerenciado:**
```typescript
interface ThemeContextType {
    theme: 'light' | 'dark';
    toggleTheme: () => void;
}
```

**Hook de Acesso:**
```typescript
import { useTheme } from '../contexts/ThemeContext';

const { theme, toggleTheme } = useTheme();
```

**Funcionalidades:**
- ✅ Toggle entre dark/light
- ✅ Persistência em `localStorage`
- ✅ Aplicação de classes CSS

**Usado em:**
- Componentes de UI
- Header/Sidebar
- Botão de toggle de tema

---

## 🎨 Padrões de Uso

### Padrão 1: Hook com Contexto Interno

```typescript
/**
 * Hook que busca contexto internamente.
 * Mais simples de usar, menos flexível.
 */
export function useDashboardMetrics() {
    // ✅ Busca contexto internamente
    const { postoAtivoId } = usePosto();
    
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    
    const loadMetrics = useCallback(async () => {
        if (!postoAtivoId) return;
        
        setLoading(true);
        try {
            const data = await api.getMetrics(postoAtivoId);
            setMetrics(data);
        } finally {
            setLoading(false);
        }
    }, [postoAtivoId]);
    
    useEffect(() => {
        loadMetrics();
    }, [loadMetrics]);
    
    return { metrics, loading, refreshMetrics: loadMetrics };
}

// Uso no componente
const { metrics, loading } = useDashboardMetrics(); // Simples!
```

**Vantagens:**
- ✅ Mais simples de usar
- ✅ Menos props para passar
- ✅ Sempre usa posto ativo

**Desvantagens:**
- ❌ Menos flexível
- ❌ Difícil testar isoladamente
- ❌ Acoplado ao contexto

---

### Padrão 2: Hook com Parâmetro

```typescript
/**
 * Hook que recebe postoId como parâmetro.
 * Mais flexível, requer mais setup.
 */
export function useClientesData(postoId: number | undefined) {
    // ✅ Recebe postoId como parâmetro
    const [clientes, setClientes] = useState<ClienteComSaldo[]>([]);
    const [loading, setLoading] = useState(true);
    
    const loadClientes = useCallback(async () => {
        if (!postoId) return;
        
        setLoading(true);
        try {
            const data = await api.getClientes(postoId);
            setClientes(data);
        } finally {
            setLoading(false);
        }
    }, [postoId]);
    
    useEffect(() => {
        loadClientes();
    }, [loadClientes]);
    
    return { clientes, loading, refreshClientes: loadClientes };
}

// Uso no componente
const { postoAtivo } = usePosto(); // Busca no componente
const { clientes, loading } = useClientesData(postoAtivo?.id); // Passa como parâmetro
```

**Vantagens:**
- ✅ Mais flexível
- ✅ Fácil de testar
- ✅ Pode usar com diferentes postos
- ✅ Desacoplado do contexto

**Desvantagens:**
- ❌ Mais verboso no uso
- ❌ Precisa buscar contexto no componente

---

### Padrão 3: Hook com Callback

```typescript
/**
 * Hook que recebe callback de sucesso.
 * Permite comunicação com componente pai.
 */
export function useClienteForm(
    postoId: number | undefined,
    onSuccess: () => void // Callback
) {
    const [isOpen, setIsOpen] = useState(false);
    const [formData, setFormData] = useState<ClienteFormData>({
        nome: '',
        documento: '',
        telefone: '',
        email: '',
        limite_credito: '',
        endereco: ''
    });
    
    const handleSave = async () => {
        if (!postoId) return;
        
        try {
            await api.saveCliente(postoId, formData);
            toast.success('Cliente salvo!');
            setIsOpen(false);
            onSuccess(); // ✅ Chama callback do componente pai
        } catch (error) {
            toast.error('Erro ao salvar');
        }
    };
    
    return {
        isOpen,
        formData,
        openModal: () => setIsOpen(true),
        onClose: () => setIsOpen(false),
        onChange: (field, value) => setFormData(prev => ({ ...prev, [field]: value })),
        onSave: handleSave
    };
}

// Uso no componente
const clienteForm = useClienteForm(postoId, () => {
    refreshClientes(); // ✅ Executado após salvar
    toast.success('Lista atualizada!');
});
```

**Vantagens:**
- ✅ Comunicação clara entre hook e componente
- ✅ Evita acoplamento
- ✅ Permite ações customizadas após operações

---

## 💡 Exemplos Práticos

### Exemplo 1: Hook Simples com useState

```typescript
/**
 * Hook básico que gerencia lista de itens.
 */
export function useItemsList() {
    // Estados
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Função de carregamento
    const loadItems = useCallback(async () => {
        setLoading(true);
        setError(null);
        
        try {
            const data = await api.getItems();
            setItems(data);
        } catch (err) {
            setError('Erro ao carregar itens');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);
    
    // Carregar ao montar
    useEffect(() => {
        loadItems();
    }, [loadItems]);
    
    // Retorno
    return {
        items,
        loading,
        error,
        refresh: loadItems
    };
}
```

---

### Exemplo 2: Hook com Contexto

```typescript
/**
 * Hook que usa contexto para buscar dados do posto ativo.
 */
export function usePostoData() {
    // ✅ Acessa contexto
    const { postoAtivoId, postoAtivo } = usePosto();
    
    // Estados
    const [data, setData] = useState<PostoData | null>(null);
    const [loading, setLoading] = useState(true);
    
    // Carrega dados do posto
    const loadData = useCallback(async () => {
        if (!postoAtivoId) return;
        
        setLoading(true);
        try {
            const result = await api.getPostoData(postoAtivoId);
            setData(result);
        } finally {
            setLoading(false);
        }
    }, [postoAtivoId]);
    
    // Recarrega quando posto muda
    useEffect(() => {
        loadData();
    }, [loadData]);
    
    return {
        data,
        loading,
        posto: postoAtivo,
        refresh: loadData
    };
}
```

---

### Exemplo 3: Hook com Múltiplos Estados

```typescript
/**
 * Hook complexo com múltiplos estados e operações.
 */
export function useComplexForm() {
    // Estados de dados
    const [formData, setFormData] = useState<FormData>({
        field1: '',
        field2: '',
        field3: ''
    });
    
    // Estados de controle
    const [isOpen, setIsOpen] = useState(false);
    const [isValid, setIsValid] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    
    // Estados de operação
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(false);
    
    // Validação
    const validate = useCallback(() => {
        const newErrors: Record<string, string> = {};
        
        if (!formData.field1) {
            newErrors.field1 = 'Campo obrigatório';
        }
        
        setErrors(newErrors);
        setIsValid(Object.keys(newErrors).length === 0);
        
        return Object.keys(newErrors).length === 0;
    }, [formData]);
    
    // Alterar campo
    const onChange = useCallback((field: keyof FormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);
    
    // Salvar
    const onSave = useCallback(async () => {
        if (!validate()) return;
        
        setSaving(true);
        try {
            await api.save(formData);
            toast.success('Salvo!');
            setIsOpen(false);
        } catch (error) {
            toast.error('Erro ao salvar');
        } finally {
            setSaving(false);
        }
    }, [formData, validate]);
    
    // Validar quando dados mudam
    useEffect(() => {
        validate();
    }, [validate]);
    
    return {
        // Estados
        formData,
        isOpen,
        isValid,
        errors,
        saving,
        loading,
        
        // Ações
        onChange,
        onSave,
        openModal: () => setIsOpen(true),
        closeModal: () => setIsOpen(false)
    };
}
```

---

## 📊 Resumo de Uso

### useState

| Finalidade | Hooks | Exemplo |
|------------|-------|---------|
| **Loading** | 14/14 | `const [loading, setLoading] = useState(true);` |
| **Dados** | 14/14 | `const [items, setItems] = useState<Item[]>([]);` |
| **Modal** | 5/14 | `const [isOpen, setIsOpen] = useState(false);` |
| **Formulário** | 4/14 | `const [formData, setFormData] = useState<FormData>({...});` |
| **Erro** | 3/14 | `const [error, setError] = useState<string \| null>(null);` |

### useContext (via usePosto)

| Módulo | Hooks | Motivo |
|--------|-------|--------|
| **Dashboard AI** | 5/6 | Sempre usa posto ativo |
| **Configurações** | 1/4 | Apenas useConfiguracoesData |
| **Clientes** | 0/4 | Recebe postoId como parâmetro |

### Contextos Disponíveis

| Contexto | Hook | Usado em | Finalidade |
|----------|------|----------|------------|
| **PostoContext** | `usePosto()` | 6 hooks | Posto ativo |
| **AuthContext** | `useAuth()` | Componentes | Autenticação |
| **ThemeContext** | `useTheme()` | Componentes | Tema dark/light |

---

## 🎯 Boas Práticas

### 1. Sempre Tipifique useState
```typescript
// ✅ BOM
const [items, setItems] = useState<Item[]>([]);

// ❌ EVITAR
const [items, setItems] = useState([]);
```

### 2. Use Contexto com Moderação
```typescript
// ✅ BOM - Contexto para dados globais
const { postoAtivoId } = usePosto();

// ❌ EVITAR - Contexto para dados locais
// Não crie contexto para dados que só um componente usa
```

### 3. Inicialize Estados Corretamente
```typescript
// ✅ BOM - Valor inicial apropriado
const [loading, setLoading] = useState(true); // Começa carregando
const [items, setItems] = useState<Item[]>([]); // Array vazio
const [selected, setSelected] = useState<Item | null>(null); // Null inicial

// ❌ EVITAR - Valor inicial inadequado
const [loading, setLoading] = useState(false); // Deveria ser true
const [items, setItems] = useState<Item[]>(); // Undefined não é array
```

### 4. Use useCallback para Funções
```typescript
// ✅ BOM - Evita re-criação desnecessária
const loadData = useCallback(async () => {
    // ...
}, [postoId]);

// ❌ EVITAR - Cria nova função a cada render
const loadData = async () => {
    // ...
};
```

---

## 📚 Referências

- [React Hooks - useState](https://react.dev/reference/react/useState)
- [React Hooks - useContext](https://react.dev/reference/react/useContext)
- [Context API](https://react.dev/learn/passing-data-deeply-with-context)
- `GUIA-HOOKS-CUSTOMIZADOS.md` - Guia principal
- `src/contexts/` - Contextos do sistema

---

**Criado em:** 11/01/2026  
**Versão:** 1.1  
**Complemento ao:** GUIA-HOOKS-CUSTOMIZADOS.md
