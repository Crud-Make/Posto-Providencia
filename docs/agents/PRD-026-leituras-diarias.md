# PRD-026: Refatoração TelaLeiturasDiarias.tsx

> **Issue:** A criar
> **Componente:** `TelaLeiturasDiarias.tsx` (~517 linhas)
> **Sprint:** 4 (Componente 5/7)
> **Prioridade:** 🔴 Alta

---

## 🎯 Objetivo

Modularizar tela de leituras diárias (encerrantes), separando lógica de validação e cálculos em hooks especializados.

---

## 📊 Estrutura Proposta

```
src/components/leituras-diarias/
├── TelaLeiturasDiarias.tsx           # ~100 linhas
│
├── components/
│   ├── TabelaLeituras.tsx            # Grid de inputs (~180 linhas)
│   ├── ResumoLeituras.tsx            # Totalizadores (~100 linhas)
│   ├── AlertasInconsistencias.tsx    # Validações visuais (~80 linhas)
│   └── HistoricoComparado.tsx        # Comparação (~120 linhas)
│
└── hooks/
    ├── useLeituras.ts                # CRUD leituras (EXISTENTE - 441 linhas)
    ├── useValidacoes.ts              # Validações (~100 linhas)
    └── useCalculosLitros.ts          # Cálculos de volume (~80 linhas)
```

---

## 🔍 Responsabilidades dos Módulos

### Hooks

**useLeituras.ts** ⚠️ JÁ EXISTE
- Reutilizar hook existente em `src/hooks/useLeituras.ts`
- Contém lógica de busca, atualização e sincronização
- Reduzir duplicação de código

**useValidacoes.ts**
- Validar leitura atual > leitura anterior
- Validar litros vendidos dentro do esperado
- Detectar possíveis erros de digitação
- Comparar com médias históricas

**useCalculosLitros.ts**
- Calcular litros vendidos (atual - anterior)
- Calcular valor total (litros × preço)
- Totalizar por combustível
- Totalizar geral

### Componentes

**TabelaLeituras.tsx**
- Grid editável
- Colunas: Bico, Combustível, Leitura Anterior, Leitura Atual, Litros, Valor
- Input com 3 decimais
- Validação em tempo real
- Cores para erros/avisos

**ResumoLeituras.tsx**
- Cards de totais por combustível
- Total geral de litros
- Total geral em R$
- Comparação com dia anterior

**AlertasInconsistencias.tsx**
- Lista de alertas de validação
- Ícones por severidade (erro/aviso/info)
- Botão: Corrigir (focus no input)
- Estatísticas de qualidade

**HistoricoComparado.tsx**
- Tabela: Hoje vs Ontem vs Média Semanal
- Por combustível
- Variação percentual
- Gráfico de linha (últimos 7 dias)

---

## ✅ Critérios de Aceite

- [ ] Componente principal <150 linhas
- [ ] Reutilizar useLeituras.ts existente
- [ ] Validações funcionam corretamente
- [ ] Cálculos precisos (3 decimais)
- [ ] Zero `any`
- [ ] JSDoc em português
- [ ] Build sem erros

---

## 📚 Referência

**Hook Existente:** `src/hooks/useLeituras.ts` (441 linhas) - REUTILIZAR
**Padrão:** Similar ao TelaRegistroCompras (#19)

---

**Tempo Estimado:** 7-9 horas
