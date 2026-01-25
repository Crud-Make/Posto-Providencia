# Auditoria de Dívida Técnica - Posto Providência

> **Data:** 10/01/2026  
> **Branch:** refactor/tech-debt  
> **Objetivo:** Identificar todos os arquivos que precisam de refatoração

---

## 📊 Resumo Executivo

### Arquivos Identificados para Refatoração

| Categoria | Arquivos | Linhas Totais | Prioridade |
|-----------|----------|---------------|------------|
| **Types** | 2 | 2.427 | 🔴 Alta |
| **Components** | 17 | 9.312 | 🟡 Média |
| **Services** | 2 | 880 | 🟢 Baixa |
| **TOTAL** | 21 | 12.619 | - |

---

## 🔴 **PRIORIDADE ALTA - Types**

### 1. ✅ `database.ts` - **CONCLUÍDO** (PR #11)
- **Linhas:** 2.021 → **Modularizado em 12 arquivos**
- **Tamanho:** 61 KB → **~42 KB distribuídos**
- **Problema:** Arquivo monolítico com 37 tabelas
- **Solução:** Modularizado em 10 domínios + arquivos base
- **Status:** ✅ Concluído em 10/01/2026
- **Resultado:** Arquitetura DDD com tables/ organizadas por domínio

### 2. `ui.ts` - **NOVO**
- **Linhas:** 406
- **Tamanho:** 9 KB
- **Problema:** Tipos de UI misturados
- **Solução:** Dividir por domínio (Dashboard, Forms, Tables, etc)
- **Prioridade:** Média (após database.ts)

---

## 🟡 **PRIORIDADE MÉDIA - Components**

### Componentes Grandes (>500 linhas)

| Arquivo | Linhas | KB | Problema | Sugestão |
|---------|--------|----|----|----------|
| **StrategicDashboard.tsx** | 1.010 | 69 | Dashboard AI muito grande | Dividir em componentes menores |
| **TelaConfiguracoes.tsx** | 924 | 43 | Tela monolítica | Extrair seções (Combustíveis, Pagamentos, etc) |
| **TelaGestaoClientes.tsx** | 882 | 54 | Gestão completa em 1 arquivo | Dividir em CRUD + Listagem |
| **TelaRegistroCompras.tsx** | 730 | 43 | Formulário complexo | Extrair hooks e validações |
| **TelaGestaoBaratencia.tsx** | 717 | 43 | Sistema completo | Modularizar em componentes |
| **TelaDashboardSolvencia.tsx** | 624 | 38 | Dashboard complexo | Extrair gráficos e cards |
| **TelaGestaoFinanceira.tsx** | 567 | 36 | Gestão financeira | Dividir por tipo (Empréstimos, Dívidas) |
| **TelaGestaoEscalas.tsx** | 563 | 28 | Gestão de escalas | Extrair calendário e formulário |
| **TelaDashboardProprietario.tsx** | 540 | 30 | Dashboard proprietário | Modularizar widgets |

### Componentes Médios (400-500 linhas)

| Arquivo | Linhas | KB | Ação Sugerida |
|---------|--------|----|----|
| TelaGestaoFrentistas.tsx | 494 | 28 | Extrair hooks de gestão |
| TelaAnaliseVendas.tsx | 492 | 26 | Dividir análises por tipo |
| TelaGestaoEstoque.tsx | 490 | 30 | Separar listagem e movimentação |
| TelaDashboardEstoque.tsx | 474 | 23 | Extrair componentes de gráfico |
| TelaGestaoDespesas.tsx | 471 | 27 | Dividir CRUD e relatórios |
| TelaLeiturasDiarias.tsx | 464 | 23 | Extrair formulário de leitura |
| TelaDashboardVendas.tsx | 452 | 25 | Modularizar cards |
| TelaRelatorioDiario.tsx | 428 | 27 | Separar geração e visualização |
| TelaAnaliseCustos.tsx | 399 | 29 | Extrair cálculos para hooks |

---

## 🟢 **PRIORIDADE BAIXA - Services**

### 1. ✅ `aggregator.service.ts` - **CONCLUÍDO** (Issue #10)
- **Linhas:** 670
- **Tamanho:** 28 KB
- **Status:** Refatorado de legacy.service.ts
- **Observação:** Pode ser dividido futuramente em aggregators específicos

### 2. `aiService.ts`
- **Linhas:** 210
- **Tamanho:** 10 KB
- **Problema:** Service de IA pode crescer
- **Ação:** Monitorar crescimento

---

## 📋 **Plano de Ação Recomendado**

### **Fase 1: Types** ✅ CONCLUÍDA
- [x] PRD-008: Modularização api.ts ✅
- [x] PRD-009: Aggregator Service ✅
- [x] **PRD-009: Modularização database.ts** ✅ (PR #11 - 10/01/2026)
- [ ] PRD-012: Organização ui.ts (próximo)

### **Fase 2: Components Críticos** (Próxima)
Focar nos 3 maiores:
1. **StrategicDashboard.tsx** (1.010 linhas)
2. **TelaConfiguracoes.tsx** (924 linhas)
3. **TelaGestaoClientes.tsx** (882 linhas)

### **Fase 3: Components Médios**
Refatorar gradualmente conforme necessidade

---

## 🎯 **Critérios de Refatoração**

### Quando Refatorar?

| Métrica | Limite | Ação |
|---------|--------|------|
| Linhas | >500 | Considerar refatoração |
| Linhas | >800 | Refatoração urgente |
| Tamanho | >30 KB | Dividir em módulos |
| Complexidade | Alta | Extrair hooks/componentes |

### Padrões de Refatoração

#### **Para Components:**
```
TelaGestaoClientes.tsx (882 linhas)
↓
components/clientes/
├── TelaGestaoClientes.tsx      # Orquestrador (100 linhas)
├── ClientesList.tsx            # Listagem
├── ClienteForm.tsx             # Formulário
├── ClienteDetails.tsx          # Detalhes
└── hooks/
    ├── useClientes.ts          # Lógica de negócio
    └── useClienteForm.ts       # Validação
```

#### **Para Types:**
```
ui.ts (406 linhas)
↓
types/ui/
├── index.ts                    # Re-exporta tudo
├── dashboard.ts                # Tipos de dashboard
├── forms.ts                    # Tipos de formulários
├── tables.ts                   # Tipos de tabelas
└── common.ts                   # Tipos comuns
```

---

## 📊 **Métricas de Dívida Técnica**

### Estado Atual
- **Arquivos >500 linhas:** 9 componentes
- **Arquivos >800 linhas:** 3 componentes
- **Maior arquivo:** StrategicDashboard.tsx (1.010 linhas)
- **Total de linhas em arquivos grandes:** 12.619

### Meta Pós-Refatoração
- **Arquivos >500 linhas:** 0
- **Arquivos >300 linhas:** <5
- **Média de linhas/arquivo:** ~150-200
- **Redução estimada:** -40% de código duplicado

---

## 🚀 **Próximos PRDs Sugeridos**

### **PRD-012: Organização ui.ts**
- Dividir tipos de UI por domínio
- Estimativa: Pequeno
- Prioridade: Média

### **PRD-013: Refatoração StrategicDashboard**
- Modularizar dashboard AI
- Estimativa: Grande
- Prioridade: Alta

### **PRD-014: Refatoração TelaConfiguracoes**
- Dividir em seções independentes
- Estimativa: Média
- Prioridade: Alta

### **PRD-015: Refatoração TelaGestaoClientes**
- Extrair CRUD e hooks
- Estimativa: Média
- Prioridade: Média

---

## 📈 **Impacto Esperado**

### Benefícios da Refatoração Completa

| Aspecto | Melhoria Esperada |
|---------|-------------------|
| Manutenibilidade | +85% |
| Navegabilidade | +90% |
| Performance Editor | +70% |
| Testabilidade | +80% |
| Reusabilidade | +75% |
| Onboarding | +60% |

### ROI Estimado
- **Tempo de refatoração:** 40-60 horas
- **Tempo economizado/mês:** 10-15 horas
- **Payback:** 3-4 meses
- **Redução de bugs:** -30%

---

## ✅ **Checklist de Priorização**

### Refatorar AGORA (Alta Prioridade)
- [x] api.ts → services modulares ✅
- [x] legacy.service → aggregator.service ✅
- [x] database.ts → types modulares ✅ (PR #11)
- [ ] StrategicDashboard.tsx
- [ ] TelaConfiguracoes.tsx

### Refatorar EM BREVE (Média Prioridade)
- [ ] ui.ts
- [ ] TelaGestaoClientes.tsx
- [ ] TelaRegistroCompras.tsx
- [ ] TelaGestaoBaratencia.tsx

### Monitorar (Baixa Prioridade)
- [ ] Componentes 400-500 linhas
- [ ] aiService.ts
- [ ] Outros services

---

**Documento gerado em:** 10/01/2026  
**Última atualização:** 10/01/2026 07:43  
**Próxima revisão:** Após conclusão do PRD-012 (ui.ts)
