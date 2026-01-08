# 📋 PRD Detalhado - Tela de Fechamento de Caixa

## 📌 Informações do Documento

| Campo | Valor |
|-------|-------|
| **Feature** | Fechamento de Caixa Diário |
| **Módulo** | Gestão de Caixa |
| **Prioridade** | 🔴 CRÍTICA (MVP) |
| **Complexidade** | Alta |
| **Versão** | 1.0 |
| **Data** | 11 de Dezembro de 2025 |

---

## 🎯 Objetivo da Feature

Permitir que o gerente do posto realize o fechamento completo do caixa diário de forma rápida, precisa e auditável, identificando automaticamente diferenças entre vendas e recebimentos.

### Problema Atual (Planilha)
- ❌ Processo manual demorado (30-45 minutos)
- ❌ Erros de cálculo frequentes
- ❌ Dificuldade para identificar origem de diferenças
- ❌ Sem histórico estruturado
- ❌ Impossível fazer remotamente

### Solução Proposta
- ✅ Wizard guiado em 4 etapas (10-15 minutos)
- ✅ Cálculos automáticos e validações em tempo real
- ✅ Identificação precisa de diferenças por frentista
- ✅ Histórico completo e auditável
- ✅ Acesso remoto via web/mobile

---

## 👥 Personas e Casos de Uso

### Persona Principal: Maria - Gerente Operacional

**Contexto:**
- Realiza fechamento todos os dias às 23h
- Precisa conferir 6 frentistas
- Trabalha com 4 formas de pagamento
- 2 maquininhas de cartão
- Posto vende ~R$ 8.000/dia

**Jornada Atual (Planilha):**
1. Anota leituras finais das bombas (10 min)
2. Calcula litros e valores manualmente (5 min)
3. Conta dinheiro do caixa (10 min)
4. Confere valores de cada frentista (10 min)
5. Preenche planilha (5 min)
6. Identifica diferenças (5 min)
7. **Total: 45 minutos**

**Jornada Desejada (Sistema):**
1. Insere leituras finais (5 min)
2. Registra recebimentos (3 min)
3. Confere frentistas (5 min)
4. Revisa e finaliza (2 min)
5. **Total: 15 minutos** ⚡

---

## 🏗️ Arquitetura da Tela

### Estrutura em Wizard (4 Etapas)

```
┌─────────────────────────────────────────────────────────┐
│  FECHAMENTO DE CAIXA - 11/12/2025                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ● ━━━━━━━  ○ ━━━━━━━  ○ ━━━━━━━  ○                  │
│  Vendas    Recebimentos  Frentistas  Resumo            │
│                                                         │
│  [CONTEÚDO DA ETAPA ATUAL]                             │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │                                                 │   │
│  │         [Área de conteúdo dinâmica]            │   │
│  │                                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [Voltar]                           [Próxima Etapa →]  │
└─────────────────────────────────────────────────────────┘
```

---

## 📐 ETAPA 1: Revisão de Vendas

### Objetivo
Confirmar as vendas do dia baseadas nas leituras das bombas.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  ETAPA 1 DE 4: REVISÃO DE VENDAS                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 Vendas por Combustível                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Produto         Litros    Preço/L    Total          │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ 🟢 Gasolina C.  593.82    R$ 6.38    R$ 3.788,57   │   │
│  │ 🔵 Gasolina A.  209.50    R$ 6.38    R$ 1.336,61   │   │
│  │ 🟡 Etanol       475.79    R$ 4.58    R$ 2.179,12   │   │
│  │ 🔴 Diesel S10     0.00    R$ 6.28    R$ 0,00       │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ TOTAL          1.279,11              R$ 7.304,30   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  📋 Detalhes por Bico                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Bico  Produto      Inicial      Final      Litros   │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  01   GC        1482477.273  1483071.093   593.82   │   │
│  │  02   GA         571280.552   571490.052   209.50   │   │
│  │  03   ET         324361.883   324837.673   475.79   │   │
│  │  04   DS10       373826.093   373826.093     0.00   │   │
│  │  05   GC         360942.842   361041.452    98.61   │   │
│  │  06   GC         316702.231   316744.620    42.39   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ⚠️  Bico 04 (Diesel S10) não teve vendas hoje            │
│                                                             │
│  ☑️ Confirmo que as leituras estão corretas                │
│                                                             │
│  [Editar Leituras]              [Confirmar e Avançar →]    │
└─────────────────────────────────────────────────────────────┘
```

### Dados Exibidos

**Card de Resumo por Combustível:**
```json
{
  "produto": "Gasolina Comum",
  "codigo": "GC",
  "cor": "#22c55e",
  "litros_vendidos": 593.82,
  "preco_litro": 6.38,
  "valor_total": 3788.57,
  "percentual_do_total": 51.9
}
```

**Tabela de Detalhes por Bico:**
```json
{
  "bico_numero": 1,
  "produto": "Gasolina Comum",
  "leitura_inicial": 1482477.273,
  "leitura_final": 1483071.093,
  "litros_vendidos": 593.82,
  "valor_venda": 3788.57
}
```

### Regras de Negócio

1. **Cálculo de Litros:**
   ```
   litros_vendidos = leitura_final - leitura_inicial
   ```

2. **Cálculo de Valor:**
   ```
   valor_venda = litros_vendidos × preco_litro
   ```

3. **Total Geral:**
   ```
   total_vendas = SUM(valor_venda_todos_bicos)
   ```

### Validações

| Validação | Tipo | Mensagem |
|-----------|------|----------|
| Leitura final < inicial | ❌ Erro | "Leitura final deve ser maior que inicial no Bico X" |
| Litros > 5000 | ⚠️ Alerta | "Vendas muito altas no Bico X. Confirme os valores." |
| Bico sem vendas | ℹ️ Info | "Bico X não teve vendas hoje" |
| Diferença > 50% da média | ⚠️ Alerta | "Vendas X% diferentes da média. Verifique." |

### Ações Disponíveis

- **Editar Leituras**: Volta para tela de registro de leituras
- **Confirmar e Avançar**: Prossegue para Etapa 2

---

## 💳 ETAPA 2: Registro de Recebimentos

### Objetivo
Registrar todos os valores recebidos por forma de pagamento e maquininha.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  ETAPA 2 DE 4: RECEBIMENTOS                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  💰 Total de Vendas (Bombas): R$ 7.304,30                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 💳 CARTÃO DE CRÉDITO                                │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  Sipag        R$ [1.242,00]                         │   │
│  │  Azulzinha    R$ [  520,00]                         │   │
│  │  ────────────────────────────                       │   │
│  │  Subtotal     R$ 1.762,00        24,1% do total     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 💳 CARTÃO DE DÉBITO                                 │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  Sipag        R$ [1.161,00]                         │   │
│  │  Azulzinha    R$ [   70,00]                         │   │
│  │  ────────────────────────────────                   │   │
│  │  Subtotal     R$ 1.231,00        16,9% do total     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📱 PIX                                              │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  Valor        R$ [1.866,00]                         │   │
│  │  ────────────────────────────────                   │   │
│  │  Subtotal     R$ 1.866,00        25,5% do total     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 💵 DINHEIRO                                         │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  Valor        R$ [2.400,00]                         │   │
│  │  ────────────────────────────────                   │   │
│  │  Subtotal     R$ 2.400,00        32,9% do total     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📊 RESUMO                                           │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  Total Vendas (Bombas)      R$ 7.304,30            │   │
│  │  Total Recebido             R$ 7.259,00            │   │
│  │  ────────────────────────────────────────           │   │
│  │  ⚠️ DIFERENÇA (FALTA)       R$ -45,30              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [← Voltar]                         [Próxima Etapa →]      │
└─────────────────────────────────────────────────────────────┘
```

### Campos de Entrada

**Por Forma de Pagamento:**
```typescript
interface Recebimento {
  forma_pagamento_id: number;
  maquininha_id?: number;  // Opcional, apenas para cartões
  valor: number;
  observacoes?: string;
}
```

### Cálculos Automáticos

1. **Subtotal por Forma:**
   ```
   subtotal_cartao_credito = sipag_credito + azulzinha_credito
   ```

2. **Percentual:**
   ```
   percentual = (subtotal / total_recebido) × 100
   ```

3. **Total Recebido:**
   ```
   total_recebido = SUM(todos_subtotais)
   ```

4. **Diferença:**
   ```
   diferenca = total_vendas_bombas - total_recebido
   ```
   - Negativo = FALTA
   - Positivo = SOBRA
   - Zero = FECHOU CERTINHO ✅

### Validações em Tempo Real

| Campo | Validação | Feedback |
|-------|-----------|----------|
| Valor | > 0 | "Valor deve ser maior que zero" |
| Valor | Formato moeda | Aceita: 1234,56 ou 1.234,56 |
| Total | Diferença > R$ 100 | ⚠️ "Diferença alta detectada" |
| Total | Diferença > 5% | ⚠️ "Diferença de X% do total" |

### Estados Visuais

**Diferença Zero:**
```
✅ CAIXA FECHOU CERTINHO!
Total Vendas: R$ 7.304,30
Total Recebido: R$ 7.304,30
Diferença: R$ 0,00
```

**Falta (Negativo):**
```
⚠️ FALTA NO CAIXA
Total Vendas: R$ 7.304,30
Total Recebido: R$ 7.259,00
Diferença: R$ -45,30 (0,6%)
```

**Sobra (Positivo):**
```
ℹ️ SOBRA NO CAIXA
Total Vendas: R$ 7.304,30
Total Recebido: R$ 7.350,00
Diferença: R$ +45,70 (0,6%)
```

### Comportamento

1. **Auto-cálculo**: Ao digitar qualquer valor, recalcula automaticamente
2. **Formatação**: Formata para moeda ao sair do campo
3. **Destaque**: Diferença aparece em vermelho (falta) ou verde (sobra)
4. **Persistência**: Salva automaticamente a cada alteração (draft)

---

## 👷 ETAPA 3: Conferência de Frentistas

### Objetivo
Registrar os valores informados por cada frentista e identificar diferenças individuais.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  ETAPA 3 DE 4: CONFERÊNCIA DE FRENTISTAS                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  💰 Diferença Total do Caixa: R$ -45,30                    │
│  Vamos identificar de quem é a diferença...                │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 👤 LEANDRO                                          │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  Cartão       R$ [2.346,00]                         │   │
│  │  Nota         R$ [   50,00]                         │   │
│  │  Pix          R$ [    0,00]                         │   │
│  │  Dinheiro     R$ [  443,08]                         │   │
│  │  ────────────────────────────────                   │   │
│  │  Total Informado    R$ 2.839,08                     │   │
│  │  Valor Conferido    R$ [2.839,08]                   │   │
│  │  ────────────────────────────────                   │   │
│  │  ✅ Diferença       R$ 0,00                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 👤 GABI                                             │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  Cartão       R$ [1.225,00]                         │   │
│  │  Nota         R$ [  280,00]                         │   │
│  │  Pix          R$ [    0,00]                         │   │
│  │  Dinheiro     R$ [  775,00]                         │   │
│  │  ────────────────────────────────                   │   │
│  │  Total Informado    R$ 2.280,00                     │   │
│  │  Valor Conferido    R$ [2.234,70]                   │   │
│  │  ────────────────────────────────                   │   │
│  │  ⚠️ FALTA            R$ -45,30                      │   │
│  │                                                     │   │
│  │  📝 Observação: [Gabi esqueceu de registrar...]    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 👤 ELIANE                                           │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  Cartão       R$ [  190,00]                         │   │
│  │  Nota         R$ [   20,00]                         │   │
│  │  Pix          R$ [  370,00]                         │   │
│  │  Dinheiro     R$ [  553,70]                         │   │
│  │  ────────────────────────────────                   │   │
│  │  Total Informado    R$ 1.133,70                     │   │
│  │  Valor Conferido    R$ [1.133,70]                   │   │
│  │  ────────────────────────────────                   │   │
│  │  ✅ Diferença       R$ 0,00                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [+ Adicionar Frentista]                                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📊 RESUMO GERAL                                     │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  Total Informado por Frentistas    R$ 6.252,78     │   │
│  │  Total Conferido                   R$ 6.207,48     │   │
│  │  ────────────────────────────────────────           │   │
│  │  Total de Diferenças               R$ -45,30       │   │
│  │                                                     │   │
│  │  ✅ Diferença identificada e justificada!          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [← Voltar]                         [Finalizar →]          │
└─────────────────────────────────────────────────────────────┘
```

### Estrutura de Dados

```typescript
interface FechamentoFrentista {
  frentista_id: number;
  frentista_nome: string;
  valor_cartao: number;
  valor_nota: number;
  valor_pix: number;
  valor_dinheiro: number;
  total_informado: number;  // Calculado
  valor_conferido: number;
  diferenca: number;        // Calculado
  observacoes?: string;
}
```

### Cálculos

1. **Total Informado:**
   ```
   total_informado = cartao + nota + pix + dinheiro
   ```

2. **Diferença Individual:**
   ```
   diferenca = total_informado - valor_conferido
   ```

3. **Soma de Diferenças:**
   ```
   total_diferencas = SUM(diferenca_todos_frentistas)
   ```

### Validações

| Validação | Condição | Ação |
|-----------|----------|------|
| Diferença > R$ 50 | `abs(diferenca) > 50` | Exige observação obrigatória |
| Diferença recorrente | 3+ diferenças no mês | Alerta: "Frentista com diferenças frequentes" |
| Soma não bate | `total_diferencas ≠ diferenca_caixa` | Erro: "Diferenças não explicam o total" |

### Estados Visuais por Frentista

**Sem Diferença:**
```
✅ Diferença: R$ 0,00
[Card com borda verde]
```

**Com Falta:**
```
⚠️ FALTA: R$ -45,30
[Card com borda vermelha]
[Campo de observação obrigatório]
```

**Com Sobra:**
```
ℹ️ SOBRA: R$ +20,00
[Card com borda azul]
[Campo de observação opcional]
```

### Comportamento

1. **Expansão**: Cards colapsáveis, expandir ao clicar
2. **Auto-cálculo**: Recalcula ao digitar valores
3. **Validação**: Não permite avançar se diferenças não justificadas
4. **Histórico**: Mostra ícone se frentista tem histórico de diferenças

---

## 📄 ETAPA 4: Resumo e Finalização

### Objetivo
Revisar todos os dados antes de finalizar o fechamento.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  ETAPA 4 DE 4: RESUMO FINAL                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📅 Fechamento do dia 11/12/2025                           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🛢️ VENDAS                                           │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  Gasolina Comum      593,82 L    R$ 3.788,57       │   │
│  │  Gasolina Aditivada  209,50 L    R$ 1.336,61       │   │
│  │  Etanol              475,79 L    R$ 2.179,12       │   │
│  │  Diesel S10            0,00 L    R$ 0,00           │   │
│  │  ──────────────────────────────────────            │   │
│  │  TOTAL             1.279,11 L    R$ 7.304,30       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 💳 RECEBIMENTOS                                     │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  Cartão Crédito      R$ 1.762,00    (24,1%)        │   │
│  │  Cartão Débito       R$ 1.231,00    (16,9%)        │   │
│  │  Pix                 R$ 1.866,00    (25,5%)        │   │
│  │  Dinheiro            R$ 2.400,00    (32,9%)        │   │
│  │  ──────────────────────────────────────            │   │
│  │  TOTAL RECEBIDO      R$ 7.259,00                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 👷 FRENTISTAS                                       │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  Leandro      R$ 2.839,08    ✅ R$ 0,00            │   │
│  │  Gabi         R$ 2.280,00    ⚠️ R$ -45,30          │   │
│  │  Eliane       R$ 1.133,70    ✅ R$ 0,00            │   │
│  │  ──────────────────────────────────────            │   │
│  │  TOTAL        R$ 6.252,78    R$ -45,30             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📊 RESULTADO FINAL                                  │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  Total Vendas (Bombas)       R$ 7.304,30           │   │
│  │  Total Recebido              R$ 7.259,00           │   │
│  │  ──────────────────────────────────────            │   │
│  │  ⚠️ DIFERENÇA (FALTA)        R$ -45,30  (0,6%)     │   │
│  │                                                     │   │
│  │  Responsável: Gabi                                 │   │
│  │  Obs: Gabi esqueceu de registrar venda em dinheiro │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  📝 Observações Gerais (opcional):                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [Movimento tranquilo. Falta será descontada...]    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ☑️ Confirmo que todas as informações estão corretas       │
│                                                             │
│  [← Voltar]    [💾 Salvar Rascunho]    [✅ FINALIZAR]      │
└─────────────────────────────────────────────────────────────┘
```

### Ações Disponíveis

**Salvar Rascunho:**
- Salva o fechamento com status "RASCUNHO"
- Permite edição posterior
- Não gera PDF
- Não bloqueia o dia

**Finalizar:**
- Valida todos os dados
- Muda status para "FECHADO"
- Gera PDF automaticamente
- Bloqueia edições (apenas ajustes com justificativa)
- Envia notificação

### Validações Finais

| Validação | Condição | Ação |
|-----------|----------|------|
| Checkbox não marcado | `!confirmado` | Erro: "Confirme as informações" |
| Diferença > R$ 100 sem obs | `abs(diferenca) > 100 && !observacoes` | Erro: "Justifique a diferença" |
| Diferenças não explicadas | `soma_frentistas ≠ diferenca_total` | Erro: "Diferenças não batem" |

### Após Finalização

**Modal de Sucesso:**
```
┌─────────────────────────────────────┐
│  ✅ FECHAMENTO CONCLUÍDO!          │
├─────────────────────────────────────┤
│                                     │
│  Caixa do dia 11/12/2025 fechado   │
│  com sucesso!                       │
│                                     │
│  📄 PDF gerado automaticamente      │
│  📧 Email enviado para:             │
│     - gerente@posto.com             │
│     - dono@posto.com                │
│                                     │
│  [📥 Baixar PDF]  [👁️ Visualizar]  │
│                                     │
│  [Fechar]                           │
└─────────────────────────────────────┘
```

---

## 📊 Componentes Reutilizáveis

### 1. Card de Resumo Financeiro

```typescript
interface CardResumoProps {
  titulo: string;
  valor: number;
  icone: React.ReactNode;
  cor?: 'verde' | 'vermelho' | 'azul' | 'cinza';
  subtitulo?: string;
}
```

**Exemplo:**
```tsx
<CardResumo
  titulo="Total de Vendas"
  valor={7304.30}
  icone={<TrendingUp />}
  cor="verde"
  subtitulo="1.279,11 litros"
/>
```

### 2. Input de Moeda

```typescript
interface InputMoedaProps {
  valor: number;
  onChange: (valor: number) => void;
  label: string;
  erro?: string;
  disabled?: boolean;
}
```

**Comportamento:**
- Formata automaticamente (R$ 1.234,56)
- Aceita apenas números e vírgula
- Valida valores negativos
- Destaca em vermelho se erro

### 3. Tabela de Produtos

```typescript
interface TabelaProdutosProps {
  produtos: Produto[];
  mostrarDetalhes?: boolean;
  editavel?: boolean;
}
```

### 4. Stepper (Wizard)

```typescript
interface StepperProps {
  etapas: string[];
  etapaAtual: number;
  onMudarEtapa: (etapa: number) => void;
}
```

---

## 🔄 Fluxos Alternativos

### Fluxo 1: Editar Fechamento Salvo como Rascunho

1. Usuário acessa "Fechamentos"
2. Clica em fechamento com status "RASCUNHO"
3. Sistema carrega dados salvos
4. Usuário pode editar qualquer etapa
5. Finaliza ou salva novamente

### Fluxo 2: Ajustar Fechamento Finalizado

1. Usuário acessa fechamento "FECHADO"
2. Clica em "Solicitar Ajuste"
3. Sistema exige justificativa obrigatória
4. Usuário edita valores
5. Sistema registra no log de auditoria
6. Gera novo PDF com marca d'água "AJUSTADO"

### Fluxo 3: Fechamento com Múltiplas Diferenças

1. Sistema detecta diferenças em 3+ frentistas
2. Exibe alerta: "Múltiplas diferenças detectadas"
3. Sugere revisão completa
4. Permite salvar como rascunho para investigação

---

## 📱 Responsividade

### Desktop (≥1024px)
- Wizard em tela cheia
- Tabelas completas
- Cards lado a lado

### Tablet (768-1023px)
- Wizard em modal
- Tabelas com scroll
- Cards empilhados

### Mobile (≤767px)
- Wizard em tela cheia
- Uma coluna
- Inputs maiores
- Botões flutuantes

---

## 🎨 Design Tokens

### Cores

```css
--cor-sucesso: #22c55e;
--cor-erro: #ef4444;
--cor-alerta: #f59e0b;
--cor-info: #3b82f6;
--cor-neutro: #6b7280;
```

### Tipografia

```css
--font-titulo: 'Inter', sans-serif;
--font-numeros: 'JetBrains Mono', monospace;
--tamanho-titulo: 1.5rem;
--tamanho-valor: 2rem;
```

---

## 🔐 Permissões

| Ação | Admin | Gerente | Operador | Frentista |
|------|-------|---------|----------|-----------|
| Visualizar fechamento | ✅ | ✅ | ✅ | ❌ |
| Criar fechamento | ✅ | ✅ | ❌ | ❌ |
| Editar rascunho | ✅ | ✅ | ❌ | ❌ |
| Finalizar | ✅ | ✅ | ❌ | ❌ |
| Ajustar finalizado | ✅ | ⚠️ Com aprovação | ❌ | ❌ |
| Deletar | ✅ | ❌ | ❌ | ❌ |

---

## 📊 Métricas e Analytics

### Eventos Rastreados

```typescript
// Início do fechamento
analytics.track('fechamento_iniciado', {
  data: '2025-12-11',
  usuario_id: 123,
  timestamp: Date.now()
});

// Conclusão de etapa
analytics.track('fechamento_etapa_concluida', {
  etapa: 1,
  tempo_gasto: 120, // segundos
  teve_erros: false
});

// Finalização
analytics.track('fechamento_finalizado', {
  diferenca: -45.30,
  tempo_total: 780, // segundos
  teve_diferencas_frentistas: true
});
```

### KPIs

- Tempo médio de fechamento
- Taxa de fechamentos sem diferença
- Frentista com mais diferenças
- Forma de pagamento mais usada
- Horário médio de fechamento

---

## ✅ Critérios de Aceite

### Funcionalidades

- [ ] Wizard com 4 etapas funcionando
- [ ] Cálculos automáticos corretos
- [ ] Validações em tempo real
- [ ] Salvar como rascunho
- [ ] Finalizar e bloquear
- [ ] Gerar PDF automaticamente
- [ ] Enviar email com PDF
- [ ] Registrar no log de auditoria

### UX

- [ ] Transição suave entre etapas
- [ ] Feedback visual para erros
- [ ] Loading states apropriados
- [ ] Confirmação antes de finalizar
- [ ] Responsivo em todos os dispositivos

### Performance

- [ ] Carregamento < 2s
- [ ] Cálculos instantâneos (< 100ms)
- [ ] Geração de PDF < 5s

---

## 🚀 Implementação Técnica

### Backend (FastAPI)

```python
@router.post("/api/fechamentos/")
async def criar_fechamento(
    data: date,
    vendas: List[VendaBico],
    recebimentos: List[Recebimento],
    frentistas: List[FechamentoFrentista],
    observacoes: Optional[str] = None,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user)
):
    # Validações
    total_vendas = sum(v.valor_venda for v in vendas)
    total_recebido = sum(r.valor for r in recebimentos)
    diferenca = total_vendas - total_recebido
    
    # Criar fechamento
    fechamento = Fechamento(
        data=data,
        total_vendas=total_vendas,
        total_recebido=total_recebido,
        diferenca=diferenca,
        status="RASCUNHO",
        usuario_id=usuario.id
    )
    db.add(fechamento)
    db.commit()
    
    return fechamento
```

### Frontend (Next.js)

```typescript
// hooks/useFechamento.ts
export function useFechamento() {
  const [etapa, setEtapa] = useState(1);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [recebimentos, setRecebimentos] = useState<Recebimento[]>([]);
  
  const calcularDiferenca = () => {
    const totalVendas = vendas.reduce((acc, v) => acc + v.valor, 0);
    const totalRecebido = recebimentos.reduce((acc, r) => acc + r.valor, 0);
    return totalVendas - totalRecebido;
  };
  
  const finalizar = async () => {
    const response = await api.post('/fechamentos/', {
      vendas,
      recebimentos,
      frentistas
    });
    return response.data;
  };
  
  return { etapa, setEtapa, vendas, recebimentos, finalizar };
}
```

---

## 📄 Conclusão

Esta especificação detalha completamente a tela de Fechamento de Caixa, pronta para implementação. Todos os fluxos, validações, cálculos e componentes estão documentados.

**Próximos passos:**
1. Criar protótipo no Figma
2. Implementar componentes base
3. Desenvolver lógica de negócio
4. Testes unitários e E2E
5. Deploy em staging
