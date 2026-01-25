# 📋 PRD Detalhado - Módulo de Custo, Estoque e Venda

## 📌 Informações do Documento

| Campo | Valor |
|-------|-------|
| **Módulo** | Gestão de Custo, Estoque e Precificação |
| **Prioridade** | 🟡 ALTA (MVP) |
| **Complexidade** | Alta |
| **Versão** | 1.0 |
| **Data** | 11 de Dezembro de 2025 |

---

## 🎯 Visão Geral

### Objetivo
Fornecer controle completo do ciclo financeiro do combustível: desde a compra (custo), passando pelo estoque, até a venda com análise de margem e lucratividade.

### Problema Atual (Planilha)

**Dores Identificadas:**
- ❌ Custo médio calculado manualmente
- ❌ Estoque não atualiza automaticamente com vendas
- ❌ Difícil saber margem de lucro real
- ❌ Sem alertas de estoque baixo
- ❌ Previsão de reposição inexistente
- ❌ Não sabe quando comprar nem quanto

**Impacto:**
- Perda de vendas por falta de estoque
- Compras emergenciais com preço alto
- Margem de lucro desconhecida
- Decisões de precificação sem dados

### Solução Proposta

**Sistema Integrado que:**
- ✅ Registra compras e calcula custo médio automaticamente
- ✅ Atualiza estoque em tempo real com vendas
- ✅ Calcula margem e lucro por combustível
- ✅ Alerta quando estoque está baixo
- ✅ Prevê quando vai acabar o estoque
- ✅ Sugere preço de venda baseado em margem desejada
- ✅ Mostra lucratividade real por período

---

## 👥 Personas

### Persona 1: João - Proprietário

**Contexto:**
- Compra combustível 2-3x por semana
- Quer maximizar lucro sem perder competitividade
- Precisa saber se está ganhando ou perdendo dinheiro

**Necessidades:**
- Ver margem de lucro em tempo real
- Saber quando comprar e quanto
- Comparar preço de compra ao longo do tempo
- Entender qual combustível dá mais lucro

**Jornada Atual:**
1. Recebe ligação do fornecedor
2. Consulta planilha para ver estoque
3. Calcula manualmente quanto precisa
4. Negocia preço sem saber margem atual
5. Registra compra na planilha
6. **Tempo: 30 minutos**

**Jornada Desejada:**
1. Sistema alerta "Gasolina acaba em 2 dias"
2. Abre dashboard, vê estoque e margem atual
3. Calcula automaticamente quanto comprar
4. Registra compra em 2 minutos
5. Sistema atualiza custo médio e margem
6. **Tempo: 5 minutos** ⚡

---

### Persona 2: Maria - Gerente

**Contexto:**
- Ajusta preços semanalmente
- Monitora concorrência
- Precisa manter margem mínima de 8%

**Necessidades:**
- Saber custo atual de cada combustível
- Calcular preço de venda para atingir margem
- Ver histórico de preços
- Alertas se margem cair abaixo do mínimo

---

## 🏗️ Arquitetura do Módulo

### Fluxo de Dados

```
┌─────────────┐
│   COMPRA    │ → Registra entrada de combustível
└──────┬──────┘
       │
       ↓
┌─────────────┐
│   ESTOQUE   │ → Atualiza quantidade disponível
└──────┬──────┘   Calcula custo médio ponderado
       │
       ↓
┌─────────────┐
│   VENDA     │ → Consome estoque
└──────┬──────┘   Calcula lucro real
       │
       ↓
┌─────────────┐
│  ANÁLISE    │ → Margem, lucratividade, ROI
└─────────────┘
```

---

## 📦 FEATURE 1: Registro de Compras

### Objetivo
Registrar todas as compras de combustível com cálculo automático de custo médio.

### Layout da Tela

```
┌─────────────────────────────────────────────────────────────┐
│  📦 REGISTRO DE COMPRA                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ DADOS DA COMPRA                                     │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │                                                     │   │
│  │  📅 Data da Compra                                  │   │
│  │  [11/12/2025]                                       │   │
│  │                                                     │   │
│  │  🛢️ Combustível                                     │   │
│  │  [Gasolina Comum ▼]                                 │   │
│  │                                                     │   │
│  │  🏢 Fornecedor                                      │   │
│  │  [Distribuidora Ipiranga ▼]                         │   │
│  │                                                     │   │
│  │  📊 Quantidade (Litros)                             │   │
│  │  [25.000,00]                                        │   │
│  │                                                     │   │
│  │  💰 Valor Total                                     │   │
│  │  [R$ 133.570,00]                                    │   │
│  │                                                     │   │
│  │  ──────────────────────────────────────            │   │
│  │  📈 Custo por Litro (calculado)                     │   │
│  │  R$ 5,3428                                          │   │
│  │                                                     │   │
│  │  ℹ️ Custo médio atual: R$ 5,20/L                   │   │
│  │  ℹ️ Novo custo médio: R$ 5,28/L (+1,5%)            │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ NOTA FISCAL (opcional)                              │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │                                                     │   │
│  │  📄 Número da NF                                    │   │
│  │  [12345]                                            │   │
│  │                                                     │   │
│  │  📎 Anexar arquivo                                  │   │
│  │  [📁 Escolher arquivo...]                           │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ IMPACTO NO ESTOQUE                                  │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │                                                     │   │
│  │  Estoque Atual:        5.200 L  (20%)              │   │
│  │  + Compra:           25.000 L                       │   │
│  │  ────────────────────────────────                   │   │
│  │  Novo Estoque:       30.200 L  (120%) ⚠️           │   │
│  │                                                     │   │
│  │  ⚠️ Atenção: Capacidade do tanque: 25.000 L        │   │
│  │  Excedente: 5.200 L                                 │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  📝 Observações (opcional)                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [Compra emergencial - preço acima da média]        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [Cancelar]                              [💾 Registrar]    │
└─────────────────────────────────────────────────────────────┘
```

### Estrutura de Dados

```typescript
interface Compra {
  id: number;
  data: Date;
  combustivel_id: number;
  fornecedor_id: number;
  quantidade_litros: number;
  valor_total: number;
  custo_por_litro: number;        // Calculado
  numero_nf?: string;
  arquivo_nf?: string;            // URL do arquivo
  observacoes?: string;
  usuario_id: number;
  created_at: Date;
}

interface Fornecedor {
  id: number;
  nome: string;
  cnpj: string;
  contato?: string;
  ativo: boolean;
}
```

### Fórmulas de Cálculo

#### 1. Custo por Litro da Compra
```
custo_por_litro = valor_total / quantidade_litros
```

**Exemplo:**
```
R$ 133.570,00 / 25.000 L = R$ 5,3428/L
```

#### 2. Novo Custo Médio Ponderado
```
novo_custo_medio = (estoque_atual × custo_medio_atual + quantidade_compra × custo_compra) 
                   / (estoque_atual + quantidade_compra)
```

**Exemplo:**
```
Estoque atual: 5.200 L a R$ 5,20/L
Compra: 25.000 L a R$ 5,3428/L

novo_custo = (5.200 × 5,20 + 25.000 × 5,3428) / (5.200 + 25.000)
           = (27.040 + 133.570) / 30.200
           = 160.610 / 30.200
           = R$ 5,3182/L
```

#### 3. Percentual de Ocupação do Tanque
```
percentual_ocupacao = (estoque_atual / capacidade_tanque) × 100
```

### Validações

| Campo | Validação | Mensagem |
|-------|-----------|----------|
| Data | Não pode ser futura | "Data não pode ser futura" |
| Quantidade | > 0 | "Quantidade deve ser maior que zero" |
| Quantidade | ≤ capacidade tanque | "Quantidade excede capacidade do tanque" |
| Valor | > 0 | "Valor deve ser maior que zero" |
| Custo/L | Variação > 20% da média | ⚠️ "Custo muito diferente da média. Confirme." |

### Regras de Negócio

1. **Atualização de Estoque:**
   - Ao registrar compra, adiciona quantidade ao estoque
   - Recalcula custo médio ponderado
   - Atualiza data da última compra

2. **Alertas:**
   - Se custo > 10% acima da média: "Preço alto, negocie melhor"
   - Se vai exceder capacidade: "Atenção: tanque vai transbordar"
   - Se fornecedor novo: "Primeiro pedido com este fornecedor"

3. **Histórico:**
   - Mantém histórico completo de compras
   - Permite análise de variação de preço
   - Identifica melhor fornecedor

---

## 📊 FEATURE 2: Dashboard de Estoque

### Objetivo
Visualizar estoque atual, previsão de esgotamento e alertas em tempo real.

### Layout da Tela

```
┌─────────────────────────────────────────────────────────────┐
│  📊 DASHBOARD DE ESTOQUE                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │ 🟢 GAS. C. │  │ 🔵 GAS. A. │  │ 🟡 ETANOL  │           │
│  ├────────────┤  ├────────────┤  ├────────────┤           │
│  │ 18.500 L   │  │  4.200 L   │  │  2.100 L   │           │
│  │ 74% ████░  │  │ 52% ███░░  │  │ 21% ██░░░  │           │
│  │            │  │            │  │            │           │
│  │ 📅 ~12 dias│  │ 📅 ~8 dias │  │ 📅 ~3 dias │           │
│  │ ✅ OK      │  │ ✅ OK      │  │ ⚠️ BAIXO   │           │
│  └────────────┘  └────────────┘  └────────────┘           │
│                                                             │
│  ┌────────────┐                                            │
│  │ 🔴 DIESEL  │                                            │
│  ├────────────┤                                            │
│  │  1.200 L   │                                            │
│  │ 12% █░░░░  │                                            │
│  │            │                                            │
│  │ 📅 ~2 dias │                                            │
│  │ 🔴 CRÍTICO │                                            │
│  └────────────┘                                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ⚠️ ALERTAS E AÇÕES RECOMENDADAS                     │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │                                                     │   │
│  │  🔴 URGENTE: Diesel S10 acaba em 2 dias            │   │
│  │     Sugestão: Comprar 20.000 L (R$ 125.600)        │   │
│  │     [📞 Ligar Fornecedor] [📝 Registrar Compra]    │   │
│  │                                                     │   │
│  │  🟡 ATENÇÃO: Etanol acaba em 3 dias                │   │
│  │     Sugestão: Comprar 15.000 L (R$ 68.700)         │   │
│  │     [📞 Ligar Fornecedor] [📝 Registrar Compra]    │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📈 MOVIMENTAÇÃO DOS ÚLTIMOS 7 DIAS                  │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │                                                     │   │
│  │  Gasolina Comum                                     │   │
│  │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░        │   │
│  │  Vendido: 6.500 L | Comprado: 25.000 L             │   │
│  │                                                     │   │
│  │  Gasolina Aditivada                                 │   │
│  │  ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        │   │
│  │  Vendido: 3.800 L | Comprado: 8.000 L              │   │
│  │                                                     │   │
│  │  Etanol                                             │   │
│  │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░        │   │
│  │  Vendido: 3.900 L | Comprado: 6.000 L              │   │
│  │                                                     │   │
│  │  Diesel S10                                         │   │
│  │  ▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░        │   │
│  │  Vendido: 4.800 L | Comprado: 0 L ⚠️               │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [📝 Registrar Compra]  [📊 Relatório Completo]           │
└─────────────────────────────────────────────────────────────┘
```

### Dados Exibidos

**Card de Estoque por Combustível:**
```typescript
interface EstoqueCombustivel {
  combustivel: string;
  quantidade_atual: number;
  capacidade_tanque: number;
  percentual_ocupado: number;
  media_vendas_diarias: number;
  dias_restantes: number;
  status: 'OK' | 'BAIXO' | 'CRITICO';
  ultima_compra: Date;
  proximo_pedido_sugerido: number;
}
```

### Fórmulas de Cálculo

#### 1. Percentual de Ocupação
```
percentual = (quantidade_atual / capacidade_tanque) × 100
```

#### 2. Média de Vendas Diárias
```
media_vendas = SUM(vendas_ultimos_7_dias) / 7
```

#### 3. Dias Restantes (Previsão)
```
dias_restantes = quantidade_atual / media_vendas_diarias
```

**Exemplo:**
```
Estoque atual: 2.100 L
Média de vendas: 700 L/dia
Dias restantes: 2.100 / 700 = 3 dias
```

#### 4. Quantidade Sugerida para Compra
```
quantidade_sugerida = (capacidade_tanque × 0.9) - quantidade_atual
```

**Exemplo:**
```
Capacidade: 25.000 L
Estoque atual: 1.200 L
Sugerido: (25.000 × 0.9) - 1.200 = 21.300 L
```

### Status do Estoque

| Percentual | Status | Cor | Ação |
|------------|--------|-----|------|
| > 50% | ✅ OK | Verde | Nenhuma |
| 20-50% | 🟡 BAIXO | Amarelo | Planejar compra |
| < 20% | 🔴 CRÍTICO | Vermelho | Comprar urgente |

### Alertas Automáticos

**Alerta Crítico (< 3 dias):**
```
🔴 URGENTE: [Combustível] acaba em X dias
Estoque atual: X litros
Média de vendas: X L/dia
Sugestão: Comprar X litros
Custo estimado: R$ X
```

**Alerta Baixo (3-7 dias):**
```
🟡 ATENÇÃO: [Combustível] acaba em X dias
Planeje a próxima compra
```

**Notificações:**
- Push notification no app
- Email para gerente e proprietário
- WhatsApp (se configurado)

---

## 💰 FEATURE 3: Análise de Custo e Margem

### Objetivo
Calcular e exibir margem de lucro, lucratividade e sugerir preços de venda.

### Layout da Tela

```
┌─────────────────────────────────────────────────────────────┐
│  💰 ANÁLISE DE CUSTO E MARGEM                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📅 Período: [Dezembro 2025 ▼]                             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🟢 GASOLINA COMUM                                   │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │                                                     │   │
│  │  💵 CUSTOS                                          │   │
│  │  ├─ Custo Médio/L:        R$ 5,28                  │   │
│  │  ├─ Despesas Operacionais: R$ 0,51 (8%)            │   │
│  │  └─ Custo Total/L:        R$ 5,79                  │   │
│  │                                                     │   │
│  │  💰 VENDA                                           │   │
│  │  ├─ Preço Atual/L:        R$ 6,48                  │   │
│  │  └─ Vendas no Mês:        45.230 L                 │   │
│  │                                                     │   │
│  │  📊 MARGEM E LUCRO                                  │   │
│  │  ├─ Margem Bruta/L:       R$ 0,69  (11,9%)        │   │
│  │  ├─ Margem Líquida/L:     R$ 0,69  (10,6%)        │   │
│  │  └─ Lucro Total:          R$ 31.208,70            │   │
│  │                                                     │   │
│  │  ──────────────────────────────────────            │   │
│  │                                                     │   │
│  │  🎯 SIMULADOR DE PREÇO                              │   │
│  │                                                     │   │
│  │  Margem desejada: [12%]                            │   │
│  │  ➜ Preço sugerido: R$ 6,48/L                       │   │
│  │  ➜ Lucro estimado/mês: R$ 32.500                   │   │
│  │                                                     │   │
│  │  [Aplicar Novo Preço]                              │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🔵 GASOLINA ADITIVADA                               │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │                                                     │   │
│  │  💵 CUSTOS                                          │   │
│  │  ├─ Custo Médio/L:        R$ 5,35                  │   │
│  │  ├─ Despesas Operacionais: R$ 0,52 (8%)            │   │
│  │  └─ Custo Total/L:        R$ 5,87                  │   │
│  │                                                     │   │
│  │  💰 VENDA                                           │   │
│  │  ├─ Preço Atual/L:        R$ 6,48                  │   │
│  │  └─ Vendas no Mês:        12.450 L                 │   │
│  │                                                     │   │
│  │  📊 MARGEM E LUCRO                                  │   │
│  │  ├─ Margem Bruta/L:       R$ 0,61  (10,4%)        │   │
│  │  ├─ Margem Líquida/L:     R$ 0,61  (9,4%)         │   │
│  │  └─ Lucro Total:          R$ 7.594,50             │   │
│  │                                                     │   │
│  │  ⚠️ Margem abaixo do mínimo (10%)                  │   │
│  │  💡 Sugestão: Aumentar para R$ 6,52/L              │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📊 COMPARATIVO DE LUCRATIVIDADE                     │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │                                                     │   │
│  │  Produto          Vendas    Margem    Lucro        │   │
│  │  ───────────────────────────────────────────       │   │
│  │  Gas. Comum      45.230 L   10,6%    R$ 31.208    │   │
│  │  Gas. Aditivada  12.450 L    9,4%    R$  7.594    │   │
│  │  Etanol          28.900 L   14,2%    R$ 18.756    │   │
│  │  Diesel S10      18.200 L    8,1%    R$  9.282    │   │
│  │  ───────────────────────────────────────────       │   │
│  │  TOTAL          104.780 L   10,8%    R$ 66.840    │   │
│  │                                                     │   │
│  │  🏆 Mais Lucrativo: Etanol (14,2%)                 │   │
│  │  ⚠️ Menos Lucrativo: Diesel S10 (8,1%)             │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📈 EVOLUÇÃO DE MARGEM (ÚLTIMOS 6 MESES)            │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │                                                     │   │
│  │  15% ┤                                    ●         │   │
│  │  14% ┤                          ●                   │   │
│  │  13% ┤                ●                             │   │
│  │  12% ┤      ●                                       │   │
│  │  11% ┤●                                             │   │
│  │  10% ┤                                              │   │
│  │      └───────────────────────────────────          │   │
│  │       Jul  Ago  Set  Out  Nov  Dez                 │   │
│  │                                                     │   │
│  │  📊 Tendência: ↗️ Crescente (+3,2% em 6 meses)     │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [📊 Exportar Relatório]  [⚙️ Configurar Despesas]        │
└─────────────────────────────────────────────────────────────┘
```

### Estrutura de Dados

```typescript
interface AnaliseCusto {
  combustivel_id: number;
  periodo: {
    inicio: Date;
    fim: Date;
  };
  custo_medio_litro: number;
  despesas_operacionais_percentual: number;
  despesas_operacionais_valor: number;
  custo_total_litro: number;
  preco_venda_litro: number;
  quantidade_vendida: number;
  margem_bruta_litro: number;
  margem_bruta_percentual: number;
  margem_liquida_litro: number;
  margem_liquida_percentual: number;
  lucro_total: number;
}
```

### Fórmulas de Cálculo Detalhadas (Atualizado conforme Planilha Posto Jorro 2025)

#### 1. Despesas Operacionais por Litro
A despesa por litro é calculada dividindo o **Valor Total de Despesas do Mês** pelo **Total de Litros Vendidos**.

```
despesas_litro = valor_total_despesas_mes / total_litros_vendidos
```

**Exemplo:**
```
Despesas Mês: R$ 21.192,32
Total Vendido: 46.042 L
despesas_litro = 21.192,32 ÷ 46.042 = R$ 0,4603
```

> **Nota:** Se não houver vendas registradas (ex: início do mês), o sistema usa o **Total de Litros Comprados** como base para o rateio.

#### 2. Preço de Venda (Cálculo Inverso)
Na planilha original, o preço de venda é composto pelo Custo Médio somado à Despesa por Litro.

```
preco_venda = custo_medio + despesas_litro
```

**Exemplo:**
```
Custo médio: R$ 5,26
Despesas/L: R$ 0,46
preco_venda = 5,26 + 0,46 = R$ 5,72
```

#### 3. Margem Bruta por Litro
```
margem_bruta = preco_venda - custo_medio
```

**Exemplo:**
```
Preço: R$ 6,48
Custo: R$ 5,28
margem_bruta = 6,48 - 5,28 = R$ 1,20
```

#### 4. Margem Bruta Percentual
```
margem_bruta_% = (margem_bruta / custo_medio) × 100
```

**Exemplo:**
```
margem_bruta_% = (1,20 / 5,28) × 100 = 22,7%
```

#### 5. Margem Líquida por Litro
```
margem_liquida = preco_venda - custo_total
```

**Exemplo:**
```
Preço: R$ 6,48
Custo total: R$ 5,79
margem_liquida = 6,48 - 5,79 = R$ 0,69
```

#### 6. Margem Líquida Percentual
```
margem_liquida_% = (margem_liquida / preco_venda) × 100
```

**Exemplo:**
```
margem_liquida_% = (0,69 / 6,48) × 100 = 10,6%
```

#### 7. Lucro Total no Período
```
lucro_total = margem_liquida × quantidade_vendida
```

**Exemplo:**
```
Margem líquida: R$ 0,69
Vendas: 45.230 L
lucro_total = 0,69 × 45.230 = R$ 31.208,70
```

#### 8. Preço Sugerido (baseado em margem desejada)
```
preco_sugerido = custo_total / (1 - margem_desejada/100)
```

**Exemplo:**
```
Custo total: R$ 5,79
Margem desejada: 12%
preco_sugerido = 5,79 / (1 - 0,12) = 5,79 / 0,88 = R$ 6,58
```

### Configuração de Despesas Operacionais

**Modal de Configuração:**
```
┌─────────────────────────────────────────┐
│  ⚙️ CONFIGURAR DESPESAS OPERACIONAIS   │
├─────────────────────────────────────────┤
│                                         │
│  Despesas incluídas no cálculo:        │
│                                         │
│  ☑️ Energia elétrica      2,0%         │
│  ☑️ Salários frentistas   3,5%         │
│  ☑️ Manutenção            1,0%         │
│  ☑️ Impostos variáveis    1,5%         │
│  ☐ Aluguel                0,0%         │
│  ☐ Outros                 0,0%         │
│                                         │
│  ────────────────────────────           │
│  TOTAL:                   8,0%         │
│                                         │
│  [Cancelar]          [Salvar]          │
└─────────────────────────────────────────┘
```

### Alertas de Margem

| Condição | Alerta | Cor |
|----------|--------|-----|
| Margem < 5% | 🔴 "Margem crítica! Prejuízo iminente" | Vermelho |
| Margem 5-8% | 🟡 "Margem baixa. Considere ajustar preço" | Amarelo |
| Margem 8-12% | ✅ "Margem adequada" | Verde |
| Margem > 12% | 🟢 "Margem excelente!" | Verde escuro |

---

## 📈 FEATURE 4: Histórico e Análise de Vendas

### Objetivo
Analisar vendas históricas para identificar padrões e otimizar estoque.

### Layout da Tela

```
┌─────────────────────────────────────────────────────────────┐
│  📈 HISTÓRICO DE VENDAS                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📅 Período: [01/12/2025] até [11/12/2025]                 │
│  🛢️ Combustível: [Todos ▼]                                 │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📊 RESUMO DO PERÍODO                                │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │                                                     │   │
│  │  Total Vendido:      12.791 litros                  │   │
│  │  Faturamento:        R$ 73.043,00                   │   │
│  │  Lucro:              R$ 7.830,00                    │   │
│  │  Ticket Médio/L:     R$ 5,71                        │   │
│  │  Margem Média:       10,7%                          │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📊 VENDAS POR DIA                                   │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │                                                     │   │
│  │  2000L ┤                                            │   │
│  │  1800L ┤              ██                            │   │
│  │  1600L ┤          ██  ██                            │   │
│  │  1400L ┤      ██  ██  ██  ██                        │   │
│  │  1200L ┤  ██  ██  ██  ██  ██  ██  ██                │   │
│  │  1000L ┤  ██  ██  ██  ██  ██  ██  ██  ██  ██        │   │
│  │        └────────────────────────────────────        │   │
│  │         01  02  03  04  05  06  07  08  09  10  11  │   │
│  │                                                     │   │
│  │  📊 Média diária: 1.163 L                           │   │
│  │  📈 Tendência: Estável                              │   │
│  │  🏆 Melhor dia: 05/12 (1.850 L)                     │   │
│  │  📉 Pior dia: 01/12 (980 L)                         │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🎯 VENDAS POR COMBUSTÍVEL                           │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │                                                     │   │
│  │  Gasolina C.    ████████████████░░░░  6.500 L (51%)│   │
│  │  Etanol         ██████████░░░░░░░░░░  3.900 L (30%)│   │
│  │  Gasolina A.    ████░░░░░░░░░░░░░░░░  1.600 L (13%)│   │
│  │  Diesel S10     ██░░░░░░░░░░░░░░░░░░    791 L  (6%)│   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📅 PADRÕES IDENTIFICADOS                            │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │                                                     │   │
│  │  ✅ Vendas maiores às sextas e sábados (+25%)      │   │
│  │  ✅ Pico de vendas entre 7h-9h e 17h-19h           │   │
│  │  ⚠️ Gasolina Comum representa 51% das vendas       │   │
│  │  💡 Etanol tem crescido 5% ao mês                  │   │
│  │  📊 Diesel tem baixa rotatividade                  │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📋 TABELA DETALHADA                                 │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │                                                     │   │
│  │  Data    Produto      Litros    Preço    Total     │   │
│  │  ──────────────────────────────────────────────    │   │
│  │  11/12   Gas. C.      593,82    6,48    3.848,57  │   │
│  │  11/12   Gas. A.      209,50    6,48    1.357,56  │   │
│  │  11/12   Etanol       475,79    4,58    2.179,12  │   │
│  │  11/12   Diesel         0,00    6,28        0,00  │   │
│  │  10/12   Gas. C.      612,30    6,48    3.967,70  │   │
│  │  10/12   Gas. A.      185,20    6,48    1.200,10  │   │
│  │  ...                                               │   │
│  │                                                     │   │
│  │  [1] [2] [3] ... [10]  Mostrando 1-10 de 44       │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [📥 Exportar Excel]  [📊 Gráfico Avançado]               │
└─────────────────────────────────────────────────────────────┘
```

### Métricas Calculadas

#### 1. Média Diária de Vendas
```
media_diaria = total_vendido / dias_periodo
```

#### 2. Tendência (Regressão Linear Simples)
```
tendencia = (vendas_ultimos_3_dias - vendas_primeiros_3_dias) / vendas_primeiros_3_dias
```

- Positivo > 5%: "Crescente"
- -5% a +5%: "Estável"
- Negativo < -5%: "Decrescente"

#### 3. Sazonalidade por Dia da Semana
```
media_dia_semana = SUM(vendas_dia_X) / quantidade_dia_X_no_periodo
```

**Exemplo:**
```
Vendas em sextas: 2.100 + 2.300 = 4.400 L
Quantidade de sextas: 2
Média sexta: 4.400 / 2 = 2.200 L/sexta
```

---

## 🔄 Integração entre Features

### Fluxo Completo

```
1. COMPRA
   ↓
   - Registra entrada de combustível
   - Atualiza estoque (+)
   - Recalcula custo médio ponderado
   ↓
2. ESTOQUE
   ↓
   - Monitora quantidade disponível
   - Calcula dias restantes
   - Emite alertas se baixo
   ↓
3. VENDA (Leituras Diárias)
   ↓
   - Consome estoque (-)
   - Registra quantidade vendida
   - Calcula faturamento
   ↓
4. ANÁLISE
   ↓
   - Calcula margem real
   - Identifica lucro/prejuízo
   - Sugere ajustes de preço
```

### Exemplo Prático Completo

**Situação Inicial:**
- Estoque Gasolina C: 5.200 L
- Custo médio: R$ 5,20/L
- Preço venda: R$ 6,38/L
- Margem: 18,5%

**Dia 1 - Compra:**
```
Compra: 25.000 L a R$ 5,3428/L
Novo estoque: 30.200 L
Novo custo médio: R$ 5,28/L
Nova margem: 17,2% (caiu!)
```

**Dia 2 - Venda:**
```
Vendas: 593,82 L
Estoque: 29.606,18 L
Faturamento: R$ 3.788,57
Lucro: R$ 653,00 (margem 17,2%)
```

**Dia 3 - Análise:**
```
Sistema identifica: Margem caiu de 18,5% para 17,2%
Sugestão: Ajustar preço para R$ 6,42/L
Novo lucro estimado: +R$ 23,74/dia
```

---

## 🎨 Componentes Reutilizáveis

### 1. Card de Métrica

```typescript
interface CardMetricaProps {
  titulo: string;
  valor: number | string;
  unidade?: string;
  icone: React.ReactNode;
  tendencia?: 'crescente' | 'decrescente' | 'estavel';
  percentual?: number;
  cor?: 'verde' | 'vermelho' | 'amarelo' | 'azul';
}
```

### 2. Gráfico de Barras de Estoque

```typescript
interface GraficoEstoqueProps {
  combustivel: string;
  quantidade: number;
  capacidade: number;
  status: 'OK' | 'BAIXO' | 'CRITICO';
}
```

### 3. Simulador de Preço

```typescript
interface SimuladorPrecoProps {
  custoTotal: number;
  margemAtual: number;
  onAlterarPreco: (novoPreco: number) => void;
}
```

---

## 📱 Responsividade

### Desktop (≥1024px)
- Cards em grid 3 colunas
- Gráficos lado a lado
- Tabelas completas

### Tablet (768-1023px)
- Cards em grid 2 colunas
- Gráficos empilhados
- Tabelas com scroll

### Mobile (≤767px)
- Cards em 1 coluna
- Gráficos simplificados
- Tabelas em formato de lista

---

## 🔐 Permissões

| Ação | Admin | Gerente | Operador |
|------|-------|---------|----------|
| Visualizar estoque | ✅ | ✅ | ✅ |
| Registrar compra | ✅ | ✅ | ❌ |
| Ver custos | ✅ | ✅ | ❌ |
| Ver margem/lucro | ✅ | ✅ | ❌ |
| Alterar preços | ✅ | ⚠️ Com aprovação | ❌ |
| Configurar despesas | ✅ | ❌ | ❌ |
| Exportar relatórios | ✅ | ✅ | ❌ |

---

## 📊 Métricas de Sucesso

### KPIs do Módulo

**Operacionais:**
- Tempo médio para registrar compra: < 3 min
- Acurácia do estoque: > 98%
- Tempo de resposta de alertas: < 1 min

**Financeiros:**
- Margem média mantida: > 10%
- Redução de rupturas de estoque: -80%
- Economia em compras emergenciais: -50%

**Usuário:**
- Satisfação com alertas: > 90%
- Uso do simulador de preço: > 70%
- Tempo economizado: 2h/semana

---

## ✅ Critérios de Aceite

### Funcionalidades Obrigatórias

**Compras:**
- [ ] Registrar compra com todos os campos
- [ ] Calcular custo médio ponderado corretamente
- [ ] Atualizar estoque automaticamente
- [ ] Upload de nota fiscal
- [ ] Validar capacidade do tanque

**Estoque:**
- [ ] Exibir estoque atual de todos os combustíveis
- [ ] Calcular dias restantes corretamente
- [ ] Emitir alertas em 3 níveis (OK/BAIXO/CRÍTICO)
- [ ] Sugerir quantidade de compra
- [ ] Gráfico de evolução de estoque

**Análise:**
- [ ] Calcular margem bruta e líquida
- [ ] Exibir lucro total por período
- [ ] Simulador de preço funcional
- [ ] Comparativo entre combustíveis
- [ ] Gráfico de evolução de margem

**Vendas:**
- [ ] Histórico completo de vendas
- [ ] Filtros por período e combustível
- [ ] Identificar padrões (dia da semana, horário)
- [ ] Exportar para Excel
- [ ] Gráficos interativos

### Performance
- [ ] Cálculos em tempo real (< 100ms)
- [ ] Carregamento de dashboard < 2s
- [ ] Geração de relatórios < 5s

### UX
- [ ] Alertas visuais claros
- [ ] Feedback imediato em cálculos
- [ ] Responsivo em todos os dispositivos
- [ ] Tooltips explicativos

---

## 🚀 Implementação Técnica

### Backend (FastAPI)

```python
# models.py
class Compra(Base):
    __tablename__ = "compras"
    
    id = Column(Integer, primary_key=True)
    data = Column(Date, nullable=False)
    combustivel_id = Column(Integer, ForeignKey("combustiveis.id"))
    fornecedor_id = Column(Integer, ForeignKey("fornecedores.id"))
    quantidade_litros = Column(Numeric(15, 2), nullable=False)
    valor_total = Column(Numeric(15, 2), nullable=False)
    custo_por_litro = Column(Numeric(10, 4))
    numero_nf = Column(String(50))
    arquivo_nf = Column(String(255))
    observacoes = Column(Text)
    
    # Relacionamentos
    combustivel = relationship("Combustivel", back_populates="compras")
    fornecedor = relationship("Fornecedor", back_populates="compras")

class Estoque(Base):
    __tablename__ = "estoque"
    
    id = Column(Integer, primary_key=True)
    combustivel_id = Column(Integer, ForeignKey("combustiveis.id"), unique=True)
    quantidade_atual = Column(Numeric(15, 2), default=0)
    custo_medio = Column(Numeric(10, 4))
    capacidade_tanque = Column(Numeric(15, 2))
    ultima_atualizacao = Column(DateTime, default=datetime.now)
    
    combustivel = relationship("Combustivel", back_populates="estoque")

# services/estoque_service.py
class EstoqueService:
    
    @staticmethod
    def calcular_custo_medio(
        estoque_atual: float,
        custo_atual: float,
        quantidade_compra: float,
        custo_compra: float
    ) -> float:
        """Calcula custo médio ponderado"""
        total_valor = (estoque_atual * custo_atual) + (quantidade_compra * custo_compra)
        total_quantidade = estoque_atual + quantidade_compra
        return total_valor / total_quantidade if total_quantidade > 0 else 0
    
    @staticmethod
    def calcular_dias_restantes(
        quantidade_atual: float,
        combustivel_id: int,
        db: Session
    ) -> int:
        """Calcula dias restantes baseado em média de vendas"""
        # Buscar vendas dos últimos 7 dias
        data_inicio = date.today() - timedelta(days=7)
        vendas = db.query(func.sum(Leitura.litros_vendidos))\
            .filter(
                Leitura.combustivel_id == combustivel_id,
                Leitura.data >= data_inicio
            ).scalar() or 0
        
        media_diaria = vendas / 7
        if media_diaria == 0:
            return 999  # Sem vendas recentes
        
        return int(quantidade_atual / media_diaria)
    
    @staticmethod
    def atualizar_estoque_compra(
        compra: Compra,
        db: Session
    ):
        """Atualiza estoque após compra"""
        estoque = db.query(Estoque)\
            .filter(Estoque.combustivel_id == compra.combustivel_id)\
            .first()
        
        if not estoque:
            # Criar estoque se não existir
            estoque = Estoque(
                combustivel_id=compra.combustivel_id,
                quantidade_atual=0,
                custo_medio=0
            )
            db.add(estoque)
        
        # Calcular novo custo médio
        novo_custo = EstoqueService.calcular_custo_medio(
            estoque.quantidade_atual,
            estoque.custo_medio,
            compra.quantidade_litros,
            compra.custo_por_litro
        )
        
        # Atualizar estoque
        estoque.quantidade_atual += compra.quantidade_litros
        estoque.custo_medio = novo_custo
        estoque.ultima_atualizacao = datetime.now()
        
        db.commit()

# routes/compras.py
@router.post("/api/compras/")
async def registrar_compra(
    compra_data: CompraCreate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user)
):
    # Validar capacidade do tanque
    estoque = db.query(Estoque)\
        .filter(Estoque.combustivel_id == compra_data.combustivel_id)\
        .first()
    
    if estoque:
        novo_total = estoque.quantidade_atual + compra_data.quantidade_litros
        if novo_total > estoque.capacidade_tanque:
            raise HTTPException(
                status_code=400,
                detail=f"Quantidade excede capacidade do tanque. "
                       f"Máximo: {estoque.capacidade_tanque - estoque.quantidade_atual}L"
            )
    
    # Criar compra
    compra = Compra(
        **compra_data.dict(),
        custo_por_litro=compra_data.valor_total / compra_data.quantidade_litros
    )
    db.add(compra)
    db.commit()
    
    # Atualizar estoque
    EstoqueService.atualizar_estoque_compra(compra, db)
    
    return compra

@router.get("/api/estoque/dashboard")
async def dashboard_estoque(
    db: Session = Depends(get_db)
):
    """Retorna dashboard completo de estoque"""
    estoques = db.query(Estoque).all()
    
    resultado = []
    for estoque in estoques:
        dias_restantes = EstoqueService.calcular_dias_restantes(
            estoque.quantidade_atual,
            estoque.combustivel_id,
            db
        )
        
        percentual = (estoque.quantidade_atual / estoque.capacidade_tanque) * 100
        
        # Determinar status
        if percentual < 20:
            status = "CRITICO"
        elif percentual < 50:
            status = "BAIXO"
        else:
            status = "OK"
        
        resultado.append({
            "combustivel": estoque.combustivel.nome,
            "quantidade_atual": float(estoque.quantidade_atual),
            "capacidade_tanque": float(estoque.capacidade_tanque),
            "percentual_ocupado": round(percentual, 1),
            "custo_medio": float(estoque.custo_medio),
            "dias_restantes": dias_restantes,
            "status": status
        })
    
    return resultado
```

### Frontend (Next.js)

```typescript
// hooks/useEstoque.ts
export function useEstoque() {
  const [estoques, setEstoques] = useState<EstoqueDashboard[]>([]);
  const [loading, setLoading] = useState(true);
  
  const fetchEstoque = async () => {
    const response = await api.get('/estoque/dashboard');
    setEstoques(response.data);
    setLoading(false);
  };
  
  useEffect(() => {
    fetchEstoque();
    // Atualizar a cada 5 minutos
    const interval = setInterval(fetchEstoque, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
  
  return { estoques, loading, refetch: fetchEstoque };
}

// components/CardEstoque.tsx
export function CardEstoque({ estoque }: { estoque: EstoqueDashboard }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OK': return 'bg-green-100 text-green-800';
      case 'BAIXO': return 'bg-yellow-100 text-yellow-800';
      case 'CRITICO': return 'bg-red-100 text-red-800';
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{estoque.combustivel}</h3>
        <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(estoque.status)}`}>
          {estoque.status}
        </span>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-600">Estoque:</span>
          <span className="font-semibold">
            {estoque.quantidade_atual.toLocaleString('pt-BR')} L
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${
              estoque.status === 'OK' ? 'bg-green-500' :
              estoque.status === 'BAIXO' ? 'bg-yellow-500' :
              'bg-red-500'
            }`}
            style={{ width: `${estoque.percentual_ocupado}%` }}
          />
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Previsão:</span>
          <span className="font-medium">
            ~{estoque.dias_restantes} dias
          </span>
        </div>
      </div>
    </div>
  );
}
```

---

## 📄 Conclusão

Este PRD detalha completamente o módulo de **Custo, Estoque e Venda**, cobrindo:

✅ Registro de compras com cálculo de custo médio  
✅ Dashboard de estoque com alertas inteligentes  
✅ Análise de margem e lucratividade  
✅ Histórico e padrões de vendas  
✅ Integração completa entre features  
✅ Código de exemplo (backend + frontend)  

**Próximos passos:**
1. Validar com usuários reais
2. Criar protótipos visuais
3. Implementar MVP
4. Testes com dados reais
5. Ajustes e melhorias

---

**Documento vivo**: Este PRD será atualizado conforme feedback e aprendizados.

**Última atualização**: 11 de Dezembro de 2025
