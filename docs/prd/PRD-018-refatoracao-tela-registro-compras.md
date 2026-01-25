# PRD-018: Refatoração da Tela de Registro de Compras (Planilha Híbrida)

> **Issue:** #18  
> **Componente:** `TelaRegistroCompras.tsx` (~808 linhas)  
> **Status:** Planejamento Detalhado  
> **Data:** 11/01/2026

---

## 🎯 1. Objetivo

Modularizar a `TelaRegistroCompras.tsx` para extrair a lógica de "Planilha Financeira Híbrida" (Leituras + Compras + Estoque), simplificando o componente principal e garantindo que os cálculos complexos de margem e rateio sejam testáveis e isolados.

---

## 🚩 2. Problemas Identificados (Análise de Código)

1.  **Monolito de Cálculo:** O componente contém mais de 15 funções `calc*` que emulam fórmulas de Excel (H22, G19, I5, etc.).
2.  **Estado Híbrido (`CombustivelHibrido`):** Um único array de estado carrega dados de 4 domínios diferentes: Cadastro, Vendas (Leituras), Compras (Entradas) e Tanque (Físico).
3.  **Persistência Acoplada:** O `handleSave` realiza operações sequenciais em tanques, compras e combustíveis sem uma abstração de serviço clara para a transação.
4.  **UX de Input Variável:** O componente gerencia inputs que ora permitem 3 decimais (leituras), ora 2 (moeda), ora nenhum, usando lógica ad-hoc.

---

## 🏗️ 3. Nova Arquitetura Proposta

### 3.1 Camada de Lógica (Hooks de Domínio)

-   **`useCombustiveisHibridos.ts`**:
    -   Orquestra o carregamento inicial (Bicos + Estoques + Tanques).
    -   Gerencia o estado unificado do array de combustíveis.
-   **`useCalculosRegistro.ts`**:
    -   Transforma o estado bruto em métricas calculadas.
    -   Calcula Lucro por Bico, Margem %, Perca/Sobra de Tanque.
    -   Gerencia o rateio de "Despesas do Mês" por litro vendido.
-   **`usePersistenciaRegistro.ts`**:
    -   Encapsula a lógica de salvamento multi-etapa.
    -   Garante o refresh dos dados após o sucesso.

### 3.2 Camada de UI (Componentes Especializados)

-   `src/components/registro-compras/`:
    -   **`HeaderRegistroCompras.tsx`**: Título, Seletor de Posto e botão de Salvar Global.
    -   **`SecaoVendas.tsx`**: Renderiza a tabela de Leituras e Performance.
    -   **`SecaoCompras.tsx`**: Renderiza a tabela de Entradas e Custo Médio.
    -   **`SecaoEstoque.tsx`**: Renderiza a tabela de Reconciliação (Físico vs Livro).
    -   **`InputFinanceiro.tsx`**: Input genérico com suporte a máscara híbrida (inteiro/decimal).

---

## 📋 4. Plano de Implementação

### Fase 1: Desacoplamento de Lógica
1.  Implementar `useCombustiveisHibridos` para limpar o `useEffect` e `loadData` do componente principal.
2.  Implementar `useCalculosRegistro` movendo todas as funções `calc*`.
3.  Integrar `useMemo` para garantir que os totais globais não causem lag na digitação.

### Fase 2: Componentização da UI
1.  Criar `SecaoVendas.tsx` movendo o primeiro `table`.
2.  Criar `SecaoCompras.tsx` movendo o segundo `table` e o campo de despesas de rateio.
3.  Criar `SecaoEstoque.tsx` movendo a tabela de reconciliação de tanques.

### Fase 3: Persistência e Limpeza
1.  Extrair `handleSave` para o hook `usePersistenciaRegistro`.
2.  Substituir formatadores locais por `utils/formatters.ts` (já corrigidos na Issue #3).

---

## ✅ 5. Critérios de Aceite

1.  **Fidelidade Financeira:** Os cálculos de Lucro e Margem devem ser idênticos aos da planilha original (baseada no PRD-018).
2.  **Modularidade:** `TelaRegistroCompras.tsx` deve apenas orquestrar os hooks e seções (< 150 linhas).
3.  **Responsividade:** A tabela deve permanecer legível e funcional em desktops.
4.  **Segurança:** O salvamento deve atualizar corretamente o estoque nos tanques e o custo médio no cadastro de combustíveis.

---

## 📅 6. Cronograma Estimado

-   **Preparação/Hooks:** 2.5h
-   **Componentes UI:** 3h
-   **Integração/Testes:** 1.5h
-   **Total:** ~7 horas
