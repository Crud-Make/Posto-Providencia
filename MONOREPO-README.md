# 🏗️ Monorepo Posto Providência

Arquitetura Monorepo com Bun Workspaces unificando Dashboard Web e App Mobile.

## 📦 Estrutura

```
/Posto-Providencia
├── apps/
│   ├── web/          # Dashboard React + Vite
│   └── mobile/       # App React Native + Expo
└── packages/
    ├── types/        # 📘 Tipos compartilhados (fonte única de verdade)
    ├── utils/        # 🧮 Utilitários (formatadores, calculadores)
    └── api-core/     # 🔌 Padrão ApiResponse
```

## 🚀 Scripts Disponíveis

### Desenvolvimento
```bash
bun dev              # Inicia o Dashboard Web
bun dev:web          # Alias para bun dev
bun dev:mobile       # Inicia o app Mobile (Expo)
```

### Build
```bash
bun build            # Build do Web + validação dos pacotes
bun typecheck        # Verifica tipos em todos os pacotes
```

### Mobile
```bash
bun mobile:start     # Expo start
bun mobile:android   # Build Android
bun mobile:ios       # Build iOS
```

## 📘 Pacotes Compartilhados

### @posto/types
Fonte única de verdade para tipos do banco de dados e contratos de API.

```typescript
import { Fechamento, Cliente, ApiResponse } from '@posto/types';
```

**Garante:**
- ✅ Zero divergência de tipos entre Web e Mobile
- ✅ Se o banco mudar, ambas as plataformas ficam "vermelhas" até corrigir
- ✅ Autocomplete preciso para desenvolvedores

### @posto/utils
Utilitários compartilhados: formatação, cálculos financeiros, datas.

```typescript
import { formatCurrency, calcularDiferencaCaixa } from '@posto/utils';

const total = calcularDiferencaCaixa(1000, 950); // 50
const formatted = formatCurrency(total); // "R$ 50,00"
```

**Garante:**
- ✅ Mesma lógica de arredondamento financeiro
- ✅ Mesmos cálculos de fechamento em ambas as plataformas
- ✅ Formatação consistente de moedas e datas

### @posto/api-core
Padrão ApiResponse para respostas consistentes de API.

```typescript
import { createSuccessResponse, createErrorResponse } from '@posto/api-core';

// Sucesso
return createSuccessResponse({ id: 1, nome: "João" });

// Erro
return createErrorResponse('NOT_FOUND', 'Cliente não encontrado');
```

**Garante:**
- ✅ Tratamento de erro padronizado
- ✅ Contratos de API consistentes
- ✅ Facilita debugging de integrações

## 🔧 Migração

### Status Atual
- [x] Estrutura básica do Monorepo criada
- [x] Pacotes compartilhados implementados
- [ ] Mover código Web para `apps/web`
- [ ] Mover código Mobile para `apps/mobile`
- [ ] Atualizar imports para usar pacotes compartilhados
- [ ] Validar builds

### Próximos Passos
1. **Backup:** Criar branch de backup antes de mover arquivos
2. **Mover Web:** `mv src/ apps/web/src/`
3. **Mover Mobile:** `mv posto-mobile/ apps/mobile/`
4. **Instalar:** `bun install` (vai linkar os workspaces)
5. **Refatorar:** Substituir imports locais por `@posto/*`

## 📊 Benefícios

| Antes | Depois |
|-------|--------|
| Tipos duplicados (Web e Mobile) | Fonte única em `@posto/types` |
| Lógica de cálculo duplicada | Compartilhada em `@posto/utils` |
| 2 `package.json` desconectados | Workspaces sincronizados |
| Divergências de dados silenciosas | Erros de tipo explícitos |

## 🎯 Objetivo Final

Um sistema onde:
- **Um comando** (`bun install`) atualiza tudo
- **Um tipo mudado** afeta ambas as plataformas automaticamente
- **Zero duplicação** de lógica crítica
- **Build confiável** com validação cruzada de tipos

---

**Criado em:** 18/01/2026  
**Issue:** [#26 - PRD-034 Refatoração Mobile e Migração Monorepo](https://github.com/Thyago-vibe/Posto-Providencia/issues/26)
