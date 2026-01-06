# ANÁLISE DA FEATURE DE COMPRAS - COMPARAÇÃO COM PLANILHA

## Estrutura da Planilha "POSTO JORRO,2025"

### SEÇÃO DE VENDA (Linhas 4-11)
- **Linha 4**: Cabeçalhos
- **Linhas 5-10**: Dados de cada produto/bico
- **Linha 11**: Totais e médias

#### Colunas de Venda:
- **C**: Produtos (nome do combustível + bico)
- **D**: Inicial (leitura inicial do bico)
- **E**: Fechamento (leitura final do bico)
- **F**: Litros = `E - D` (litros vendidos)
- **G**: Valor LT R$ (preço de venda por litro)
- **H**: Valor por bico = `F * G` (receita total do bico)
- **I**: Lucro LT R$ = `G - G19` (lucro por litro, onde G19 é o valor para venda calculado)
- **J**: Lucro bico R$ = `I * F` (lucro total do bico)
- **K**: Margem do Produto % = `I / G` (margem percentual)
- **L**: Produto Vendido (litros - pode ter agrupamentos)
- **M**: Produto % = `L / F11` (percentual do produto no total)

### SEÇÃO DE COMPRA (Linhas 18-23)
- **Linha 18**: Cabeçalhos
- **Linhas 19-22**: Dados de compra por combustível
- **Linha 23**: Totais e médias

#### Colunas de Compra:
- **C**: Produtos (nome do combustível)
- **D**: Compra LT (litros comprados)
- **E**: Compra R$ (valor total da compra)
- **F**: Média LT R$ = `E / D` (custo médio por litro)
- **G**: Valor pra Venda = `F + H22` (preço de venda = custo médio + despesa por litro)
- **H**: Desp Mês (linha 19: `=D390`, linha 22: `=H19/F11`)
- **I**: % = `H22 / G` (percentual da despesa no preço)
- **J**: Estoque ano passado (estoque anterior)
- **K**: Compra e Estoque = `J + D` (estoque anterior + compra)
- **L**: Estoque Hoje = `K - L5` (estoque após vendas, onde L5 é litros vendidos)
- **M**: Perca e Sobra = `N - L` (diferença entre estoque físico e calculado)
- **N**: Estoque Tanque (medição física do tanque)

### FÓRMULAS CHAVE:

1. **H19 (Despesas do Mês)**: `=D390`
   - Referência a uma célula com o total de despesas do mês

2. **H22 (Despesa por Litro)**: `=H19/F11`
   - Despesas do mês dividido pelo total de litros vendidos
   - F11 = Total de litros vendidos

3. **G19 (Valor para Venda - G.Comum)**: `=F19+H22`
   - Custo médio (F19) + Despesa por litro (H22)
   - F19 = E19/D19 (Custo total / Litros comprados)

4. **I5 (Lucro por Litro)**: `=G5-G19`
   - Preço de venda (G5) - Valor para venda calculado (G19)

5. **K5 (Margem %)**: `=I5/G5`
   - Lucro por litro / Preço de venda

## COMPARAÇÃO COM O CÓDIGO

### ✅ CORRETO:

1. **calcMediaLtRs**: `compra_rs / compra_lt`
   - ✅ Corresponde a F19: `=E19/D19`

2. **calcDespesaPorLitro**: `despesasTotal / litrosBase`
   - ✅ Corresponde a H22: `=H19/F11`
   - ✅ Usa litros vendidos como base (F11)

3. **calcValorParaVenda**: `custoMedio + despesaLt`
   - ✅ Corresponde a G19: `=F19+H22`

4. **calcLitrosVendidos**: `fechamento - inicial`
   - ✅ Corresponde a F5: `=E5-D5`

5. **calcValorPorBico**: `litros * valorVenda`
   - ✅ Corresponde a H5: `=F5*G5`

6. **calcCompraEEstoque**: `estoque_anterior + compra_lt`
   - ✅ Corresponde a K19: `=J19+D19`

7. **calcEstoqueHoje**: `compraEstoque - litrosVendidos`
   - ✅ Corresponde a L19: `=K19-L5`

### ⚠️ ATENÇÃO - DIFERENÇAS IMPORTANTES:

1. **calcLucroLt**: `valorVenda - custoMedio`
   - ❌ **INCORRETO!** Na planilha é: `I5 = G5 - G19`
   - **Planilha**: Preço de venda (G5) - Valor para venda calculado (G19)
   - **Código atual**: Valor para venda (G19) - Custo médio (F19)
   - **PROBLEMA**: O código está calculando `(F19 + H22) - F19 = H22`, ou seja, apenas a despesa por litro
   - **CORRETO SERIA**: `precoVendaAtual - valorParaVenda`
   - **Onde**: precoVendaAtual é o preço que está sendo praticado (G5 na planilha)

2. **calcMargemPct**: `(lucroLt / valorVenda) * 100`
   - ⚠️ **PARCIALMENTE CORRETO** mas depende do calcLucroLt estar correto
   - **Planilha**: `K5 = I5/G5` (Lucro por litro / Preço de venda)
   - Como calcLucroLt está errado, a margem também fica errada

### 🔴 PROBLEMA CRÍTICO IDENTIFICADO:

O código atual **NÃO TEM** o conceito de **"Preço de Venda Atual"** (coluna G na seção de VENDA).

Na planilha:
- **G19** (seção COMPRA) = Valor SUGERIDO para venda = `F19 + H22`
- **G5** (seção VENDA) = Preço PRATICADO de venda (pode ser diferente de G19)
- **Lucro** = Diferença entre o preço praticado (G5) e o valor sugerido (G19)

No código atual:
- Só existe `calcValorParaVenda()` que calcula G19
- Não existe um campo para o preço de venda ATUAL/PRATICADO
- Por isso o lucro está sempre zero ou igual à despesa por litro

### 📋 SOLUÇÃO NECESSÁRIA:

1. Adicionar campo `preco_venda_atual` no estado `CombustivelHibrido`
2. Buscar o preço de venda atual da tabela `Combustivel` (campo `preco_venda`)
3. Corrigir `calcLucroLt`: `precoVendaAtual - calcValorParaVenda(c)`
4. Manter `calcValorParaVenda` como está (é o preço SUGERIDO)
5. Mostrar ambos na interface:
   - Valor para Venda (sugestão baseada em custo + despesas)
   - Preço Atual (praticado no sistema)
   - Lucro por Litro (diferença entre os dois)

## RESUMO:

A lógica de cálculo está **QUASE TODA CORRETA**, mas falta o conceito fundamental de:
- **Preço Sugerido** (baseado em custos) vs **Preço Praticado** (atual no sistema)
- O lucro deve ser a diferença entre esses dois valores
- Atualmente o código só calcula o preço sugerido e não compara com o preço real
