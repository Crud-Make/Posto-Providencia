# 🧠 Guia Rápido: Smart Types

> **Referência rápida para uso de Smart Types no Posto Providência**
> Para detalhes completos, veja [PRD-022-SMART-TYPES.md](../documentos/PRD-022-SMART-TYPES.md)

---

## 📖 O Que São Smart Types?

**Smart Types** são tipos TypeScript derivados automaticamente das tabelas do Supabase, eliminando duplicação e garantindo sincronização perfeita entre banco e código.

---

## ✅ Regras de Ouro

### 1️⃣ NUNCA Crie Interfaces Manuais

```typescript
// ❌ ERRADO
export interface Cliente {
  id: number;
  nome: string;
  documento?: string;
  // ...
}

// ✅ CORRETO
import type { ClienteTable } from '../../types/database/tables/clientes';
export type Cliente = ClienteTable['Row'];
```

### 2️⃣ Use Tipos Específicos do Supabase

```typescript
// Para leitura (SELECT)
type Cliente = ClienteTable['Row'];

// Para criação (INSERT)
type CreateCliente = ClienteTable['Insert'];

// Para atualização (UPDATE)
type UpdateCliente = ClienteTable['Update'];
```

### 3️⃣ Use `WithRelations` Para Relacionamentos

```typescript
import { WithRelations } from '../../types/ui/helpers';

// ✅ Type-safe
export type ClienteComNotas = WithRelations<
  Cliente,
  { notas?: NotaFrentista[] }
>;
```

### 4️⃣ Evite `as unknown as`

```typescript
// ❌ ERRADO
return (data as unknown as Cliente[]) || [];

// ✅ CORRETO
return (data || []) as Cliente[];
```

---

## 🛠️ Utility Types Disponíveis

### `WithRelations<T, R>`

**Localização:** `src/types/ui/helpers.ts`

**Uso:** Adicionar relacionamentos a tipos base.

```typescript
export type NotaFrentistaComFrentista = WithRelations<
  NotaFrentista,
  { frentista?: Pick<FrentistaTable['Row'], 'id' | 'nome'> }
>;
```

### TypeScript Built-in

```typescript
// Pegar apenas alguns campos
type ClienteResumo = Pick<Cliente, 'id' | 'nome' | 'documento'>;

// Remover campos
type ClienteSemMetadata = Omit<Cliente, 'created_at' | 'updated_at'>;

// Tornar todos opcionais
type ClienteParcial = Partial<Cliente>;

// Tornar todos obrigatórios
type ClienteCompleto = Required<Cliente>;
```

---

## 📝 Exemplos Práticos

### Service Básico

```typescript
import { supabase } from '../supabase';
import type { ClienteTable } from '../../types/database/tables/clientes';
import type { WithRelations } from '../../types/ui/helpers';

// Smart Types
export type Cliente = ClienteTable['Row'];
export type ClienteComNotas = WithRelations<
  Cliente,
  { notas?: NotaFrentista[] }
>;

export const clienteService = {
  async getAll(): Promise<Cliente[]> {
    const { data, error } = await supabase
      .from('Cliente')
      .select('*');

    if (error) throw error;
    return (data || []) as Cliente[];
  },

  async create(cliente: ClienteTable['Insert']): Promise<Cliente> {
    const { data, error } = await supabase
      .from('Cliente')
      .insert(cliente)
      .select()
      .single();

    if (error) throw error;
    return data as Cliente;
  },

  async update(id: number, updates: ClienteTable['Update']): Promise<Cliente> {
    const { data, error } = await supabase
      .from('Cliente')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Cliente;
  }
};
```

### Componente React

```typescript
import { clienteService, type Cliente, type ClienteComNotas } from '../../services/api';

const MeuComponente: React.FC = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selecionado, setSelecionado] = useState<ClienteComNotas | null>(null);

  useEffect(() => {
    async function carregar() {
      const data = await clienteService.getAll();
      setClientes(data); // ✅ Type-safe!
    }
    carregar();
  }, []);

  return (
    // JSX...
  );
};
```

---

## 🎯 Padrões Comuns

### Relacionamento Simples

```typescript
export type VendaComProduto = WithRelations<
  Venda,
  { produto?: Produto }
>;
```

### Relacionamento Aninhado

```typescript
export type FechamentoCompleto = WithRelations<
  Fechamento,
  {
    frentista?: Frentista;
    vendas?: WithRelations<Venda, { produto?: Produto }>[];
  }
>;
```

### Relacionamento com Pick

```typescript
export type NotaComFrentista = WithRelations<
  NotaFrentista,
  { frentista?: Pick<Frentista, 'id' | 'nome'> }
>;
```

---

## ⚠️ Erros Comuns

### ❌ Erro 1: Interface Manual

```typescript
// ❌ NÃO FAÇA
export interface Cliente {
  id: number;
  nome: string;
  // Se a tabela mudar, isso fica desatualizado!
}
```

**Solução:** Use `ClienteTable['Row']`

### ❌ Erro 2: Type Assertion Dupla

```typescript
// ❌ NÃO FAÇA
return (data as unknown as Cliente[]) || [];
```

**Solução:** Use cast direto

```typescript
// ✅ FAÇA
return (data || []) as Cliente[];
```

### ❌ Erro 3: Não Usar Tipos do Supabase

```typescript
// ❌ NÃO FAÇA
async create(cliente: {
  nome: string;
  documento?: string;
  // ... todos os campos manualmente
}): Promise<Cliente> { }
```

**Solução:** Use tipos gerados

```typescript
// ✅ FAÇA
async create(cliente: ClienteTable['Insert']): Promise<Cliente> { }
```

---

## 📚 Referências

- **PRD Completo:** [PRD-022-SMART-TYPES.md](../documentos/PRD-022-SMART-TYPES.md)
- **Utility Helpers:** [src/types/ui/helpers.ts](../src/types/ui/helpers.ts)
- **Exemplo Prático:** [src/services/api/cliente.service.ts](../src/services/api/cliente.service.ts)

---

## 🆘 Precisa de Ajuda?

1. Consulte o [PRD-022](../documentos/PRD-022-SMART-TYPES.md)
2. Veja exemplos em [cliente.service.ts](../src/services/api/cliente.service.ts)
3. Pergunte no chat do projeto

---

**Versão:** 1.0
**Última atualização:** 14/01/2026
**Autor:** Thyago (Desenvolvedor Principal)
