# Regras de Negócio: Posto Providência

## 📊 Fonte de Dados
Baseado na planilha: `docs/data/Posto,Jorro, 2025.xlsx`

## 💰 Taxas e Custos Operacionais

### Taxas de Cartão
Conforme análise da planilha (abas "Mes, 09", "Mes, 10", "Mes, 11", "Mes, 12"):

```typescript
// Coluna "Despeza com das taxas do Cartao."
// Exemplo Mes 09:
// - Cartão Crédito: 0.007 (0.7%) - Linha 13
// - Cartão Débito: 0.025 (2.5%) - Linha 14

const TAXAS_CARTAO = {
  DEBITO: 0.012,   // Média estimada entre 0.7% e 1.5%
  CREDITO: 0.035,  // Média estimada entre 2.5% e 3.5%
  PIX: 0.0,        // Sem taxa (direto)
  DINHEIRO: 0.0,   // Sem taxa
  NOTA_PRAZO: 0.0  // Sem taxa imediata (risco de inadimplência)
};
```

### Margens de Lucro por Produto
Conforme aba "POSTO JORRO,2025" (Coluna "Margem do Produto %"):

```typescript
const MARGENS_PRODUTO = {
  GASOLINA_COMUM: 0.1179,    // 11.79% (Linha 4)
  GASOLINA_ADITIVADA: 0.1153, // 11.53% (Linha 5)
  ETANOL: 0.0902,            // 9.02% (Linha 6)
  DIESEL_S10: 0.0273,        // 2.73% (Linha 7)
  
  // Média ponderada para cálculos gerais
  MEDIA_PONDERADA: 0.1036    // ~10.36%
};
```

## 🧮 Cálculos de Fechamento

### 1. Lucro Bruto por Bico
```typescript
/**
 * Lucro Bruto = Litros Vendidos × Margem por Litro
 * 
 * Exemplo (Gasolina Comum - Bico 01):
 * - Litros: 17.055,29
 * - Valor/Litro: R$ 6,48
 * - Margem/Litro: R$ 0,7637
 * - Lucro Bruto: 17.055,29 × 0,7637 = R$ 13.025,46
 */
function calcularLucroBruto(litros: number, margemPorLitro: number): number {
  return litros * margemPorLitro;
}
```

### 2. Lucro Líquido (Descontando Taxas)
```typescript
/**
 * Lucro Líquido = Lucro Bruto - Custos de Taxas
 * 
 * Custos de Taxas = (Valor Cartão Débito × Taxa Débito) + 
 *                   (Valor Cartão Crédito × Taxa Crédito)
 */
function calcularLucroLiquido(
  lucroBruto: number,
  valorCartaoDebito: number,
  valorCartaoCredito: number
): number {
  const custoTaxas = 
    (valorCartaoDebito * TAXAS_CARTAO.DEBITO) +
    (valorCartaoCredito * TAXAS_CARTAO.CREDITO);
  
  return lucroBruto - custoTaxas;
}
```

### 3. Validação de Fechamento
```typescript
/**
 * Diferença Aceitável entre Encerrante e Declarado
 * 
 * Baseado na prática do posto:
 * - Tolerância: ±0.5% do total
 * - Acima disso: Requer justificativa do frentista
 */
const TOLERANCIA_DIFERENCA = 0.005; // 0.5%

function validarDiferenca(encerrante: number, declarado: number): {
  valido: boolean;
  diferenca: number;
  percentual: number;
} {
  const diferenca = encerrante - declarado;
  const percentual = Math.abs(diferenca / encerrante);
  
  return {
    valido: percentual <= TOLERANCIA_DIFERENCA,
    diferenca,
    percentual
  };
}
```

## 📋 Estrutura de Dados do Fechamento

### Sessão de Frentista
```typescript
interface SessaoFrentista {
  frentistaId: number;
  
  // Valores declarados pelo frentista (via app mobile)
  valor_dinheiro: number;
  valor_pix: number;
  valor_cartao_debito: number;
  valor_cartao_credito: number;
  valor_nota: number;
  valor_baratao: number;
  
  // Valor do encerrante (leitura do concentrador)
  valor_encerrante: number;
  
  // Calculados automaticamente
  valor_conferido: number;      // Soma dos declarados
  diferenca_calculada: number;  // Encerrante - Conferido
  
  // Metadados
  data_hora_envio?: string;
  tempId: string;
}
```

## 🎯 Regras de Validação

### 1. Envio Mobile
- Frentista DEVE enviar fechamento antes de encerrar turno
- Sistema DEVE validar se todos os campos foram preenchidos
- Diferença > 0.5% DEVE gerar alerta para gerente

### 2. Conciliação Web
- Gerente PODE ajustar valores manualmente (com log de auditoria)
- Sistema DEVE calcular automaticamente a diferença
- Fechamento só pode ser salvo se diferença estiver dentro da tolerância OU com justificativa

### 3. Cálculo de Lucro
- Lucro DEVE ser calculado por produto (baseado em litros × margem)
- Taxas de cartão DEVEM ser descontadas do lucro bruto
- Relatórios DEVEM mostrar lucro líquido (após taxas)

## 📊 Métricas Importantes

### Dashboard de Frentistas
```typescript
interface MetricasFrentista {
  vendasTotais: number;        // Soma de todos os meios de pagamento
  lucroLiquido: number;        // Vendas × Margem - Taxas
  totalDinheiro: number;       // Para controle de sangria
  melhorVendedor: {
    nome: string;
    total: number;
  };
  distribuicaoPagamentos: {
    pix: number;
    cartao: number;
    dinheiro: number;
    nota: number;
  };
}
```

## 🔄 Fluxo de Fechamento

1. **Mobile (Frentista)**
   - Preenche valores de cada meio de pagamento
   - Envia para servidor
   - Aguarda confirmação

2. **Backend**
   - Recebe dados do mobile
   - Calcula `valor_conferido` (soma)
   - Busca `valor_encerrante` do concentrador
   - Calcula `diferenca_calculada`
   - Salva na tabela `FechamentoFrentista`

3. **Web (Gerente)**
   - Visualiza todos os envios mobile
   - Confere diferenças
   - Ajusta se necessário (com justificativa)
   - Finaliza fechamento do dia

## 📝 Notas Importantes

- **Aferição de Bicos**: Planilha mostra variações de -80ml a +40ml (aba AFERICAO)
- **Empréstimos**: Sistema rastreia empréstimos com parcelas (aba Posto,25)
- **Histórico**: Dados de 2025 mostram padrão de vendas e margens consistentes

---

**Última Atualização**: 25/01/2026  
**Fonte**: Análise da planilha `Posto,Jorro, 2025.xlsx`  
**Responsável**: Sistema de Gestão - Posto Providência
