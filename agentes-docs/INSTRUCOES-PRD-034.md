# 🤖 INSTRUÇÕES PARA O AGENTE: PRD-034

> **Missão:** Refatorar o Mobile e criar estrutura Monorepo
> **Referência:** [PRD-034-REFATORACAO-MOBILE-MONOREPO.md](./PRD-034-REFATORACAO-MOBILE-MONOREPO.md)

---

## ⚡ RESUMO EXECUTIVO

Você deve transformar o projeto em um **Monorepo com Bun Workspaces**, eliminando dívida técnica do mobile.

### Metas Numéricas

| Métrica | Atual | Meta |
|---------|-------|------|
| `any` types | 13 | **0** |
| `registro.tsx` | 1.176 linhas | **< 400** |
| `api.ts` | 941 linhas | **Dividir em 8 serviços** |

---

## 🎯 FASE 1: Eliminar `any` (PRIORIDADE MÁXIMA)

### Correções Obrigatórias

```
📍 posto-mobile/lib/api.ts
   - Linha 299: (t as any).ativo → criar interface TurnoComStatus
   - Linha 560: item: any → criar interface FechamentoFrentistaHistorico
   - Linha 687: as any → usar type guard ou parseInt

📍 posto-mobile/app/(tabs)/registro.tsx
   - Linha 34: icon: any → import type { LucideIcon } from 'lucide-react-native'
   - Linha 141: event: any → DateTimePickerEvent

📍 Todos os catch (error: any)
   - Substituir por: catch (error) { const msg = error instanceof Error ? error.message : 'Erro' }
```

---

## 🎯 FASE 2: Modularizar `api.ts`

Criar pasta `posto-mobile/lib/services/` com:

```
services/
├── posto.service.ts        # getAllPostos, getPostoById
├── frentista.service.ts    # getByUserId, update, getAllByPosto
├── turno.service.ts        # getAll, getCurrentTurno
├── fechamento.service.ts   # getOrCreate, updateTotals, submitMobileClosing
├── cliente.service.ts      # getAll, search
├── produto.service.ts      # getAll, getById
├── venda.service.ts        # registrar, getByFechamento
├── escala.service.ts       # getByFrentista, getByDate
└── index.ts                # Re-exports
```

**Padrão de cada serviço:**
```typescript
import { supabase } from '../supabase';
import type { NomeTipo } from '@posto/types'; // ou '../types' por enquanto

export const nomeService = {
  async metodo(): Promise<Tipo> { ... }
};
```

---

## 🎯 FASE 3: Refatorar `registro.tsx`

### Extrair Hooks

```
app/(tabs)/registro/
├── index.tsx               # Componente principal (< 400 linhas)
├── hooks/
│   ├── useRegistroForm.ts     # Estados do formulário
│   ├── useRegistroData.ts     # Carregamento de dados
│   └── useRegistroSubmit.ts   # Lógica de submissão
└── components/
    ├── FormaPagamentoGrid.tsx # Grid de formas de pagamento
    ├── NotasModal.tsx         # Modal de notas a prazo
    ├── ResumoCaixa.tsx        # Resumo com diferença
    └── HeaderRegistro.tsx     # Cabeçalho com turno/frentista
```

---

## 🎯 FASE 4: Estrutura Monorepo

### 1. Configurar Workspaces

No `package.json` da **RAIZ**:
```json
{
  "name": "posto-providencia-monorepo",
  "workspaces": ["apps/*", "packages/*"]
}
```

### 2. Criar Pacotes

```
packages/
├── types/          # Migrar src/types/database/
├── utils/          # Migrar src/utils/formatters.ts
└── api-core/       # Padrão ApiResponse
```

### 3. Mover Apps

```
apps/
├── web/            # Mover conteúdo de src/
└── mobile/         # Mover posto-mobile/
```

---

## ✅ CHECKLIST DE VALIDAÇÃO

Antes de considerar completo:

- [ ] `grep -r "any" posto-mobile --include="*.ts*"` retorna 0 resultados
- [ ] `wc -l posto-mobile/app/(tabs)/registro.tsx` < 400
- [ ] `ls posto-mobile/lib/services/` mostra 8+ arquivos
- [ ] `bun install` na raiz funciona
- [ ] `bun run build` compila sem erros
- [ ] App mobile abre e funciona

---

## ⚠️ REGRAS IMPORTANTES

1. **NÃO altere lógica de negócio** - apenas estrutura
2. **Mantenha funcionalidade idêntica** - refatore, não reescreva
3. **Commits pequenos** - um por arquivo/funcionalidade
4. **Teste após cada fase** - não acumule mudanças
5. **Documente em português** - JSDoc obrigatório

---

## 🚀 COMANDO DE INÍCIO

```bash
# Verificar estado atual
cd posto-mobile
grep -rn "any" --include="*.ts*" lib/ app/

# Iniciar pela Fase 1
# Corrigir cada any encontrado
```

**Boa sorte, Engenheiro! O posto depende da precisão dos seus tipos.** ⛽
