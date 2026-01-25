# 📋 PRD Detalhado - Módulo de Vendas e Leituras

## 📌 Informações do Documento

| Campo | Valor |
|-------|-------|
| **Módulo** | Gestão de Vendas e Leituras de Bombas |
| **Prioridade** | 🔴 CRÍTICA (MVP) |
| **Complexidade** | Média-Alta |
| **Versão** | 1.0 |
| **Data** | 11 de Dezembro de 2025 |

---

## 🎯 Visão Geral

### Objetivo
Digitalizar o processo de registro de leituras das bombas e calcular automaticamente as vendas diárias, mensais e análises de lucratividade por produto.

### Contexto da Planilha Atual

Baseado na análise da planilha "Posto Jorro, mês 05", identificamos a seguinte estrutura:

**Dados Capturados:**
- Leitura Inicial e Final por bico
- Cálculo de Litros vendidos
- Valor por litro
- Valor total por bico
- Lucro por litro e total
- Margem de lucro percentual

**Produtos Identificados:**
1. G.C. Bico 01 (Gasolina Comum)
2. G.A. Bico 02 (Gasolina Aditivada)
3. Etanol Bico 03
4. Ds. 500 Bico 04 (Diesel S500)
5. G.C. Bico 05 (Gasolina Comum)

---

## 📊 FEATURE 1: Registro de Leituras Diárias

### Objetivo
Capturar as leituras inicial e final de cada bico para calcular vendas do dia.

### Layout da Tela

```
┌─────────────────────────────────────────────────────────────┐
│  🛢️ REGISTRO DE LEITURAS - 11/12/2025                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📅 Data: [11/12/2025]     🕐 Turno: [Dia Todo ▼]          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ BOMBA 01                                            │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │                                                     │   │
│  │  🟢 BICO 01 - Gasolina Comum                       │   │
│  │  ├─ Leitura Inicial:  [1.355.962,633] (auto)      │   │
│  │  ├─ Leitura Final:    [1.356.143,453]             │   │
│  │  ├─ Litros:           180,82 L ✅                  │   │
│  │  ├─ Preço/L:          [R$ 6,48]                    │   │
│  │  └─ Total:            R$ 1.171,71                  │   │
│  │                                                     │   │
│  │  🔵 BICO 02 - Gasolina Aditivada                   │   │
│  │  ├─ Leitura Inicial:  [600.141,821] (auto)        │   │
│  │  ├─ Leitura Final:    [600.229,292]               │   │
│  │  ├─ Litros:           87,47 L ✅                   │   │
│  │  ├─ Preço/L:          [R$ 6,48]                    │   │
│  │  └─ Total:            R$ 566,81                    │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ BOMBA 02                                            │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │                                                     │   │
│  │  🟡 BICO 03 - Etanol                               │   │
│  │  ├─ Leitura Inicial:  [353.848,833] (auto)        │   │
│  │  ├─ Leitura Final:    [354.043,233]               │   │
│  │  ├─ Litros:           194,40 L ✅                  │   │
│  │  ├─ Preço/L:          [R$ 4,58]                    │   │
│  │  └─ Total:            R$ 890,35                    │   │
│  │                                                     │   │
│  │  🔴 BICO 04 - Diesel S500                          │   │
│  │  ├─ Leitura Inicial:  [403.734,693] (auto)        │   │
│  │  ├─ Leitura Final:    [403.816,284]               │   │
│  │  ├─ Litros:           81,59 L ✅                   │   │
│  │  ├─ Preço/L:          [R$ 6,28]                    │   │
│  │  └─ Total:            R$ 512,39                    │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📊 RESUMO DO DIA                                    │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │                                                     │   │
│  │  Total de Litros:     544,28 L                     │   │
│  │  Faturamento:         R$ 3.141,26                  │   │
│  │  Preço Médio/L:       R$ 5,77                      │   │
│  │                                                     │   │
│  │  ✅ Todas as leituras validadas                    │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [← Cancelar]  [💾 Salvar Rascunho]  [✅ Confirmar]       │
└─────────────────────────────────────────────────────────────┘
```

### Estrutura de Dados

```typescript
interface LeituraDiaria {
  id: number;
  data: Date;
  bico_id: number;
  leitura_inicial: number;
  leitura_final: number;
  litros_vendidos: number;      // Calculado
  preco_litro: number;
  valor_total: number;           // Calculado
  turno?: 'MANHA' | 'TARDE' | 'NOITE' | 'DIA_TODO';
  usuario_id: number;
  created_at: Date;
}
```

### Fórmulas de Cálculo

#### 1. Litros Vendidos
```
litros_vendidos = leitura_final - leitura_inicial
```

**Exemplo (Bico 01):**
```
1.356.143,453 - 1.355.962,633 = 180,82 L
```

#### 2. Valor Total da Venda
```
valor_total = litros_vendidos × preco_litro
```

**Exemplo:**
```
180,82 L × R$ 6,48 = R$ 1.171,71
```

#### 3. Preço Médio do Dia
```
preco_medio = total_faturamento / total_litros
```

### Validações em Tempo Real

| Validação | Condição | Mensagem |
|-----------|----------|----------|
| Leitura final < inicial | `final < inicial` | ❌ "Leitura final deve ser maior que inicial" |
| Diferença muito alta | `litros > 3000` | ⚠️ "Vendas muito altas. Confirme os valores." |
| Leitura inconsistente | `inicial ≠ final_dia_anterior` | ⚠️ "Leitura inicial diferente do fechamento anterior" |
| Preço zerado | `preco == 0` | ❌ "Informe o preço por litro" |
| Sem vendas | `litros == 0` | ℹ️ "Bico sem vendas hoje" |

### Comportamento

**Auto-preenchimento:**
- Leitura inicial = Leitura final do dia anterior
- Preço por litro = Último preço cadastrado
- Data = Data atual

**Cálculo em tempo real:**
- Ao digitar leitura final, calcula litros automaticamente
- Ao alterar preço, recalcula valor total
- Atualiza resumo do dia instantaneamente

---

## 📈 FEATURE 2: Análise de Vendas Mensais

### Objetivo
Consolidar vendas do mês com análise de lucratividade por produto.

### Layout da Tela

```
┌─────────────────────────────────────────────────────────────┐
│  📊 ANÁLISE DE VENDAS - MAIO 2025                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📋 RESUMO GERAL DO MÊS                              │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │                                                     │   │
│  │  🛢️ Total Vendido:      58.028 litros              │   │
│  │  💰 Faturamento:        R$ 329.223,72              │   │
│  │  📈 Lucro Total:        R$ 43.225,06               │   │
│  │  📊 Margem Média:       13,13%                     │   │
│  │  💵 Lucro Médio/L:      R$ 0,82                    │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐
│  │ 🛢️ VENDAS POR PRODUTO                                                  │
│  ├─────────────────────────────────────────────────────────────────────────┤
│  │                                                                         │
│  │  Produto      Inicial    Final      Litros   Preço/L  Total      Lucro │
│  │  ──────────────────────────────────────────────────────────────────────│
│  │  🟢 GC B01   1.355.962  1.372.430  16.468   R$ 6,48  R$ 106.712  13,77%│
│  │  🔵 GA B02     600.141    608.229   8.087   R$ 6,48  R$ 52.406   13,77%│
│  │  🟡 ET B03     353.848    359.042   5.194   R$ 4,58  R$ 23.789   8,15% │
│  │  🔴 DS B04     403.734    416.897  13.163   R$ 6,28  R$ 82.661   12,11%│
│  │  🟢 GC B05     336.970    340.409   3.439   R$ 6,48  R$ 22.285   13,77%│
│  │  🟢 GC B06     369.455    380.025  10.570   R$ 6,48  R$ 68.494   13,77%│
│  │  ──────────────────────────────────────────────────────────────────────│
│  │  TOTAL                            58.028            R$ 329.223   13,13%│
│  │                                                                         │
│  └─────────────────────────────────────────────────────────────────────────┘
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 💰 LUCRATIVIDADE POR PRODUTO                        │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │                                                     │   │
│  │  Gasolina Comum                                     │   │
│  │  ████████████████████████████░░  R$ 27.216  (62,9%)│   │
│  │  30.477 L vendidos | Margem: 13,77%                │   │
│  │                                                     │   │
│  │  Diesel S500                                        │   │
│  │  ████████████░░░░░░░░░░░░░░░░░  R$ 10.011  (23,2%)│   │
│  │  13.163 L vendidos | Margem: 12,11%                │   │
│  │                                                     │   │
│  │  Gasolina Aditivada                                 │   │
│  │  ██████░░░░░░░░░░░░░░░░░░░░░░░  R$ 7.216   (16,7%)│   │
│  │  8.087 L vendidos | Margem: 13,77%                 │   │
│  │                                                     │   │
│  │  Etanol                                             │   │
│  │  ██░░░░░░░░░░░░░░░░░░░░░░░░░░░  R$ 1.940   (4,5%) │   │
│  │  5.194 L vendidos | Margem: 8,15% ⚠️               │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📊 INSIGHTS E RECOMENDAÇÕES                         │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │                                                     │   │
│  │  🏆 Produto mais lucrativo: Gasolina Comum         │   │
│  │     → Representa 62,9% do lucro total              │   │
│  │                                                     │   │
│  │  ⚠️ Etanol com margem baixa (8,15%)                │   │
│  │     → Considere ajustar preço de R$ 4,58 para      │   │
│  │        R$ 4,68 para atingir margem de 10%          │   │
│  │                                                     │   │
│  │  📈 Gasolina Comum: 52,5% das vendas em litros     │   │
│  │     → Principal produto do posto                   │   │
│  │                                                     │   │
│  │  💡 Diesel representa 22,7% das vendas             │   │
│  │     → Boa oportunidade de crescimento              │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [📥 Exportar Excel]  [📊 Gráfico Detalhado]  [📄 PDF]    │
└─────────────────────────────────────────────────────────────┘
```

### Estrutura de Dados

```typescript
interface VendaMensal {
  mes: number;
  ano: number;
  produto_id: number;
  produto_nome: string;
  bico_numero: number;
  leitura_inicial_mes: number;
  leitura_final_mes: number;
  litros_vendidos: number;
  preco_medio_litro: number;
  valor_total: number;
  custo_medio_litro: number;
  lucro_por_litro: number;
  lucro_total: number;
  margem_percentual: number;
}
```

### Fórmulas de Cálculo

#### 1. Litros Vendidos no Mês
```
litros_mes = leitura_final_mes - leitura_inicial_mes
```

**Exemplo (GC Bico 01):**
```
1.372.430,683 - 1.355.962,633 = 16.468,05 L
```

#### 2. Lucro por Litro
```
lucro_litro = preco_venda - custo_medio
```

**Exemplo (Gasolina Comum):**
```
R$ 6,48 - R$ 5,59 = R$ 0,89/L
```

#### 3. Margem Percentual
```
margem_% = (lucro_litro / preco_venda) × 100
```

**Exemplo:**
```
(0,89 / 6,48) × 100 = 13,73%
```

#### 4. Lucro Total do Produto
```
lucro_total = lucro_litro × litros_vendidos
```

**Exemplo (GC Total):**
```
R$ 0,89 × 30.477 L = R$ 27.124,53
```

#### 5. Participação no Lucro Total
```
participacao_% = (lucro_produto / lucro_total_posto) × 100
```

---

## 📊 FEATURE 3: Dashboard de Vendas

### Objetivo
Visão executiva das vendas com KPIs e tendências.

### Layout da Tela

```
┌─────────────────────────────────────────────────────────────┐
│  📊 DASHBOARD DE VENDAS                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📅 Período: [Maio 2025 ▼]                                 │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ 🛢️ LITROS│  │ 💰 VENDAS│  │ 📈 LUCRO │  │ 📊 MARGEM│   │
│  ├──────────┤  ├──────────┤  ├──────────┤  ├──────────┤   │
│  │ 58.028 L │  │R$ 329.223│  │R$ 43.225 │  │  13,13%  │   │
│  │          │  │          │  │          │  │          │   │
│  │ +5,2% ↗️ │  │ +8,1% ↗️ │  │ +12% ↗️  │  │ +0,8% ↗️ │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📈 EVOLUÇÃO DE VENDAS (ÚLTIMOS 6 MESES)            │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │                                                     │   │
│  │  60k ┤                                    ●         │   │
│  │  55k ┤                          ●                   │   │
│  │  50k ┤                ●                             │   │
│  │  45k ┤      ●                                       │   │
│  │  40k ┤●                                             │   │
│  │      └───────────────────────────────────          │   │
│  │       Dez  Jan  Fev  Mar  Abr  Mai                 │   │
│  │                                                     │   │
│  │  📊 Crescimento: +45% em 6 meses                   │   │
│  │  📈 Tendência: Fortemente crescente                │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🎯 MIX DE PRODUTOS (LITROS)                         │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │                                                     │   │
│  │       Gasolina C.                                   │   │
│  │       ████████████████░░░░░░  52,5%  (30.477 L)   │   │
│  │                                                     │   │
│  │       Diesel S500                                   │   │
│  │       ██████░░░░░░░░░░░░░░░░  22,7%  (13.163 L)   │   │
│  │                                                     │   │
│  │       Gasolina A.                                   │   │
│  │       ████░░░░░░░░░░░░░░░░░░  13,9%   (8.087 L)   │   │
│  │                                                     │   │
│  │       Etanol                                        │   │
│  │       ██░░░░░░░░░░░░░░░░░░░░   8,9%   (5.194 L)   │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [📊 Relatório Completo]  [📥 Exportar]                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Integração com Outros Módulos

### Fluxo de Dados

```
LEITURAS DIÁRIAS
      ↓
   Consolida
      ↓
VENDAS MENSAIS
      ↓
   Atualiza
      ↓
┌─────────────┬─────────────┬─────────────┐
│   ESTOQUE   │    CAIXA    │  ANÁLISE    │
│  (consome)  │ (faturamento)│ (margem)    │
└─────────────┴─────────────┴─────────────┘
```

### Exemplo de Integração

**Ao registrar leitura:**
1. Calcula litros vendidos
2. Atualiza estoque (subtrai quantidade)
3. Registra faturamento para fechamento de caixa
4. Recalcula margem com custo atual
5. Atualiza dashboard em tempo real

---

## 📱 Responsividade

### Mobile (≤767px)
- Cards empilhados verticalmente
- Tabela em formato de lista
- Inputs maiores para facilitar digitação
- Teclado numérico para leituras

### Tablet (768-1023px)
- Grid 2 colunas
- Tabelas com scroll horizontal
- Gráficos adaptados

### Desktop (≥1024px)
- Layout completo
- Múltiplas colunas
- Gráficos expandidos

---

## ✅ Critérios de Aceite

### Funcionalidades Obrigatórias
- [ ] Registrar leituras de todos os bicos
- [ ] Auto-preencher leitura inicial
- [ ] Calcular litros e valores automaticamente
- [ ] Validar leituras em tempo real
- [ ] Consolidar vendas mensais
- [ ] Calcular margem por produto
- [ ] Gerar relatórios exportáveis
- [ ] Dashboard com KPIs principais

### Performance
- [ ] Cálculos instantâneos (< 100ms)
- [ ] Carregamento de dashboard < 2s
- [ ] Exportação de relatório < 5s

### UX
- [ ] Feedback visual para validações
- [ ] Auto-save a cada alteração
- [ ] Confirmação antes de finalizar
- [ ] Responsivo em todos os dispositivos

---

## 🚀 Implementação

### Backend (FastAPI)

```python
@router.post("/api/leituras/")
async def registrar_leitura(
    leitura: LeituraCreate,
    db: Session = Depends(get_db)
):
    # Validar leitura
    if leitura.leitura_final < leitura.leitura_inicial:
        raise HTTPException(400, "Leitura final deve ser maior que inicial")
    
    # Calcular litros
    litros = leitura.leitura_final - leitura.leitura_inicial
    valor_total = litros * leitura.preco_litro
    
    # Criar registro
    nova_leitura = Leitura(
        **leitura.dict(),
        litros_vendidos=litros,
        valor_total=valor_total
    )
    db.add(nova_leitura)
    
    # Atualizar estoque
    estoque = db.query(Estoque).filter(
        Estoque.combustivel_id == leitura.combustivel_id
    ).first()
    estoque.quantidade_atual -= litros
    
    db.commit()
    return nova_leitura
```

### Frontend (Next.js)

```typescript
function RegistroLeituras() {
  const [leituras, setLeituras] = useState<Leitura[]>([]);
  
  const calcularLitros = (inicial: number, final: number) => {
    return final - inicial;
  };
  
  const handleLeituraChange = (bicoId: number, final: number) => {
    const leitura = leituras.find(l => l.bico_id === bicoId);
    if (leitura) {
      const litros = calcularLitros(leitura.inicial, final);
      const total = litros * leitura.preco_litro;
      
      setLeituras(prev => prev.map(l => 
        l.bico_id === bicoId 
          ? { ...l, final, litros, total }
          : l
      ));
    }
  };
  
  return (
    // JSX do formulário
  );
}
```

---

## 📄 Conclusão

Este PRD detalha o módulo de **Vendas e Leituras**, cobrindo:

✅ Registro diário de leituras  
✅ Análise mensal consolidada  
✅ Dashboard executivo  
✅ Integração com estoque e caixa  
✅ Cálculos automáticos de margem  

**Pronto para implementação!**
