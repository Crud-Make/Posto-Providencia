# 🔍 Engenharia Reversa - Planilha Posto Jorro 2025

## 📋 Visão Geral da Planilha

A planilha **"Posto,Jorro, 2025.xlsx"** é um sistema completo de gestão para um posto de combustível com as seguintes funcionalidades:

### Estrutura de Abas (16 abas)

| Aba | Descrição | Finalidade |
|-----|-----------|------------|
| `Mes, 01.` a `Mes, 12.` | Controle diário | Caixa diário de cada dia do mês |
| `POSTO JORRO,2025` | Resumo mensal | Consolidado de vendas mensais |
| `Posto,25.` | Empréstimos | Controle de parcelas e empréstimos |
| `Planilha1` | Auxiliar | Dados auxiliares |
| `AFERICAO` | Aferição | Controle de aferição de bombas |

---

## 🛢️ MÓDULO 1: Controle de Vendas de Combustível

### Entidades

```
PRODUTO (Combustível)
- id
- nome (G.C. = Gasolina Comum, G.A. = Gasolina Aditivada, Etanol, DS10 = Diesel S10)
- bico_numero
- valor_litro

LEITURA_BOMBA
- id
- produto_id
- data
- leitura_inicial
- leitura_final
- litros_vendidos (calculado)
- valor_venda (calculado)
```

### Fórmulas de Cálculo

#### 1. Litros Vendidos
```
LITROS = LEITURA_FINAL - LEITURA_INICIAL
```
> Fórmula Excel: `=E6-D6`

#### 2. Valor da Venda por Bico
```
VALOR_VENDA = LITROS * VALOR_LITRO
```
> Fórmula Excel: `=F6*G6`

#### 3. Total de Litros do Dia
```
TOTAL_LITROS = SOMA(LITROS_BICO_1 + LITROS_BICO_2 + ... + LITROS_BICO_N)
```
> Fórmula Excel: `=F6+F7+F8+F9+F10+F11`

#### 4. Valor Médio por Litro
```
MEDIA_VALOR_LITRO = TOTAL_VENDAS / TOTAL_LITROS
```
> Fórmula Excel: `=H12/F12`

#### 5. Total de Vendas
```
TOTAL_VENDAS = SUM(VENDAS_TODOS_BICOS)
```
> Fórmula Excel: `=SUM(H6:H11)`

---

## 💳 MÓDULO 2: Formas de Pagamento

### Entidades

```
FORMA_PAGAMENTO
- id
- tipo (Cartão Crédito, Cartão Débito, Pix)

RECEBIMENTO
- id
- forma_pagamento_id
- maquininha (Sipag, Azulzinha, etc.)
- valor
- data
```

### Fórmulas de Cálculo

#### 1. Total por Forma de Pagamento
```
TOTAL_FORMA = VALOR_MAQUINA_1 + VALOR_MAQUINA_2
```
> Fórmula Excel: `=D15+E15`

#### 2. Percentual de Cada Forma
```
PERCENTUAL = VALOR_FORMA / TOTAL_RECEBIDO
```
> Fórmula Excel: `=F15/F18`

#### 3. Total Geral Recebido
```
TOTAL_RECEBIDO = SUM(TODAS_MAQUININHAS)
```
> Fórmula Excel: `=D18+E18`

---

## 👷 MÓDULO 3: Controle de Frentistas

### Entidades

```
FRENTISTA
- id
- nome
- ativo

FECHAMENTO_FRENTISTA
- id
- frentista_id
- data
- valor_cartao
- valor_nota
- valor_pix
- valor_dinheiro
- total (calculado)
- diferenca (calculado)
```

### Fórmulas de Cálculo

#### 1. Total por Frentista
```
TOTAL_FRENTISTA = CARTAO + NOTA + PIX + DINHEIRO
```
> Fórmula Excel: `=D22+E22+F22+G22`

#### 2. Diferença/Falta
```
DIFERENCA = TOTAL_INFORMADO - VALOR_CONFERIDO
```
> Fórmula Excel: `=H22-J22`

#### 3. Total da Equipe
```
TOTAL_EQUIPE_COLUNA = SUM(COLUNA_TODOS_FRENTISTAS)
```
> Fórmula Excel: `=SUM(D21:D30)`

#### 4. Falta Total vs Fechamento
```
DIFERENCA_CAIXA = TOTAL_VENDAS_BOMBAS - TOTAL_CONFERIDO_FRENTISTAS
```
> Fórmula Excel: `=H12-J31`

---

## 📊 MÓDULO 4: Resumo Mensal (POSTO JORRO,2025)

### Fórmulas de Cálculo

#### 1. Litros Vendidos no Mês (por produto)
```
LITROS_MES = LEITURA_FINAL_MES - LEITURA_INICIAL_MES
```
> Fórmula Excel: `=E5-D5`

#### 2. Venda Total por Produto
```
VENDA_PRODUTO = LITROS * VALOR_LITRO
```
> Fórmula Excel: `=F5*G5`

#### 3. Lucro por Litro
```
LUCRO_LITRO = PRECO_VENDA - PRECO_CUSTO
```
> Fórmula Excel: `=G5-G19` (Comparação com custo de compra)

#### 4. Lucro Total
```
LUCRO_TOTAL_PRODUTO = LUCRO_LITRO * LITROS_VENDIDOS
```
> Fórmula Excel: `=I39*F39`

---

## 🧮 MÓDULO 5: Compra, Custo e Estoque

### Entidades

```
COMPRA
- id
- produto_id
- data
- quantidade_litros
- valor_total
- custo_por_litro (calculado)

ESTOQUE
- id
- produto_id
- quantidade_atual
- ultima_atualizacao
```

### Fórmulas de Cálculo

#### 1. Custo Médio por Litro
```
CUSTO_MEDIO = VALOR_COMPRA_TOTAL / QUANTIDADE_LITROS
```
> Fórmula Excel: `=E47/D47`

#### 2. Preço de Venda Sugerido
```
PRECO_VENDA = CUSTO_MEDIO + MARGEM
```
> Fórmula Excel: `=F47+H50`

#### 3. Percentual de Despesa
```
PERCENTUAL_DESPESA = DESPESA_MES / PRECO_VENDA
```
> Fórmula Excel: `=H50/G47`

---

## 💰 MÓDULO 6: Controle de Empréstimos

### Entidades

```
EMPRESTIMO
- id
- credor (Pousada, Herculi, Marquinho, etc.)
- valor_total
- quantidade_parcelas
- data_inicio
- parcela_atual

PARCELA
- id
- emprestimo_id
- numero_parcela
- data_vencimento
- valor
- status (pago/pendente)
```

### Fórmulas de Cálculo

#### 1. Total Pago
```
TOTAL_PAGO = SUM(PARCELAS_PAGAS)
```
> Fórmula Excel: `=SUM(F2:F17)`

#### 2. Total a Pagar
```
TOTAL_PENDENTE = TOTAL_EMPRESTIMO - TOTAL_PAGO
```
> Fórmula Excel: `=SUM(F18-D18)`

#### 3. Percentual Quitado
```
PERCENTUAL = TOTAL_PAGO / TOTAL_EMPRESTIMO
```
> Fórmula Excel: `=F45/D45`

---

## 🔧 MÓDULO 7: Aferição de Bombas

### Entidades

```
AFERICAO
- id
- bomba_id
- bico_id
- data
- variacao_alta
- variacao_baixa
```

### Dados de Aferição
| Bomba | Bico | Produto | Alta | Baixa |
|-------|------|---------|------|-------|
| BOMBA 01 | 01 | GAS. C | -20 | -20 |
| BOMBA 01 | 02 | GAS. A | -20 | -40 |
| BOMBA 02 | 03 | ETANOL | -20 | -60 |
| BOMBA 02 | 04 | DS10 | 40 | -80 |
| BOMBA 03 | 05 | GAS. C | -60 | -20 |

---

## 🏗️ Estrutura de Dados para SaaS

### Modelo de Dados Sugerido (PostgreSQL)

```sql
-- Produtos/Combustíveis
CREATE TABLE combustiveis (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(50) NOT NULL,              -- 'Gasolina Comum', 'Gasolina Aditivada', etc.
    codigo VARCHAR(10),                      -- 'GC', 'GA', 'ET', 'DS10'
    created_at TIMESTAMP DEFAULT NOW()
);

-- Bombas e Bicos
CREATE TABLE bombas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(50) NOT NULL               -- 'BOMBA 01', 'BOMBA 02', etc.
);

CREATE TABLE bicos (
    id SERIAL PRIMARY KEY,
    bomba_id INTEGER REFERENCES bombas(id),
    numero INTEGER NOT NULL,
    combustivel_id INTEGER REFERENCES combustiveis(id)
);

-- Leituras de Bombas
CREATE TABLE leituras (
    id SERIAL PRIMARY KEY,
    bico_id INTEGER REFERENCES bicos(id),
    data DATE NOT NULL,
    leitura_inicial DECIMAL(15, 3) NOT NULL,
    leitura_final DECIMAL(15, 3) NOT NULL,
    valor_litro DECIMAL(10, 2) NOT NULL,
    -- Campos calculados
    litros_vendidos DECIMAL(15, 3) GENERATED ALWAYS AS (leitura_final - leitura_inicial) STORED,
    valor_venda DECIMAL(15, 2) GENERATED ALWAYS AS ((leitura_final - leitura_inicial) * valor_litro) STORED
);

-- Formas de Pagamento
CREATE TABLE formas_pagamento (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(50) NOT NULL               -- 'Cartão Crédito', 'Cartão Débito', 'Pix', 'Dinheiro'
);

CREATE TABLE maquininhas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(50) NOT NULL               -- 'Sipag', 'Azulzinha'
);

-- Fechamentos de Caixa
CREATE TABLE fechamentos_caixa (
    id SERIAL PRIMARY KEY,
    data DATE NOT NULL,
    total_vendas_bombas DECIMAL(15, 2),
    total_recebido DECIMAL(15, 2),
    diferenca DECIMAL(15, 2) GENERATED ALWAYS AS (total_vendas_bombas - total_recebido) STORED
);

-- Recebimentos por Forma de Pagamento
CREATE TABLE recebimentos (
    id SERIAL PRIMARY KEY,
    fechamento_id INTEGER REFERENCES fechamentos_caixa(id),
    forma_pagamento_id INTEGER REFERENCES formas_pagamento(id),
    maquininha_id INTEGER REFERENCES maquininhas(id),
    valor DECIMAL(15, 2) NOT NULL
);

-- Frentistas
CREATE TABLE frentistas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    ativo BOOLEAN DEFAULT TRUE
);

-- Fechamento por Frentista
CREATE TABLE fechamentos_frentista (
    id SERIAL PRIMARY KEY,
    fechamento_id INTEGER REFERENCES fechamentos_caixa(id),
    frentista_id INTEGER REFERENCES frentistas(id),
    valor_cartao DECIMAL(15, 2) DEFAULT 0,
    valor_nota DECIMAL(15, 2) DEFAULT 0,
    valor_pix DECIMAL(15, 2) DEFAULT 0,
    valor_dinheiro DECIMAL(15, 2) DEFAULT 0,
    valor_conferido DECIMAL(15, 2) DEFAULT 0,
    -- Campos calculados
    total DECIMAL(15, 2) GENERATED ALWAYS AS (valor_cartao + valor_nota + valor_pix + valor_dinheiro) STORED,
    diferenca DECIMAL(15, 2) GENERATED ALWAYS AS ((valor_cartao + valor_nota + valor_pix + valor_dinheiro) - valor_conferido) STORED
);

-- Compras de Combustível
CREATE TABLE compras (
    id SERIAL PRIMARY KEY,
    combustivel_id INTEGER REFERENCES combustiveis(id),
    data DATE NOT NULL,
    quantidade_litros DECIMAL(15, 2) NOT NULL,
    valor_total DECIMAL(15, 2) NOT NULL,
    -- Campo calculado
    custo_por_litro DECIMAL(10, 4) GENERATED ALWAYS AS (valor_total / quantidade_litros) STORED
);

-- Empréstimos
CREATE TABLE emprestimos (
    id SERIAL PRIMARY KEY,
    credor VARCHAR(100) NOT NULL,           -- Nome do credor
    valor_total DECIMAL(15, 2) NOT NULL,
    quantidade_parcelas INTEGER NOT NULL,
    data_inicio DATE NOT NULL
);

-- Parcelas de Empréstimos
CREATE TABLE parcelas (
    id SERIAL PRIMARY KEY,
    emprestimo_id INTEGER REFERENCES emprestimos(id),
    numero_parcela INTEGER NOT NULL,
    data_vencimento DATE NOT NULL,
    valor DECIMAL(15, 2) NOT NULL,
    data_pagamento DATE,
    pago BOOLEAN DEFAULT FALSE
);

-- Aferição de Bombas
CREATE TABLE afericoes (
    id SERIAL PRIMARY KEY,
    bico_id INTEGER REFERENCES bicos(id),
    data DATE NOT NULL,
    variacao_alta DECIMAL(10, 2),
    variacao_baixa DECIMAL(10, 2)
);
```

---

## 📱 Funcionalidades do SaaS

### 1. Dashboard Principal
- Total de vendas do dia/semana/mês
- Litros vendidos por combustível
- Comparativo de formas de pagamento
- Alertas de diferenças de caixa

### 2. Controle de Vendas
- Registro de leituras de bombas (inicial/final)
- Cálculo automático de litros e valores
- Atualização de preços por combustível

### 3. Gestão de Caixa
- Fechamento diário
- Registro de recebimentos por forma de pagamento
- Conferência por frentista
- Relatório de diferenças

### 4. Controle de Estoque
- Registro de compras
- Cálculo de custo médio
- Sugestão de preço de venda
- Alertas de estoque baixo

### 5. Gestão Financeira
- Controle de empréstimos
- Gestão de parcelas
- Calendário de vencimentos
- Relatório de quitação

### 6. Relatórios
- Vendas por período
- Lucratividade por combustível
- Performance de frentistas
- Histórico de preços

---

## 🚀 Próximos Passos

1. **Definir stack tecnológica** (Next.js, FastAPI, PostgreSQL, etc.)
2. **Criar MVP** com os módulos essenciais:
   - Vendas e leituras de bomba
   - Fechamento de caixa
   - Dashboard básico
3. **Expandir** para módulos secundários:
   - Gestão de empréstimos
   - Controle de estoque
   - Relatórios avançados
