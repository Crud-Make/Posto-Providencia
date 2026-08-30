---
name: despesa-tela-compras-vs-planilha-mes
description: O input "Despesas do Mês" da tela de Registro de Compras é local e efêmero; NÃO é a fonte do lucro da Planilha do Mês (que lê a tabela Despesa). Dois caminhos separados.
metadata:
  type: project
---

O campo **"Despesas do Mês (R$)"** da tela Registro de Compras (seção Compra e Custo /
`SecaoCompras`) é `useState<string>('')` digitado à mão em
`apps/web/src/components/registro-compras/index.tsx:38`. **Não lê a tabela `Despesa`**
e **não persiste no banco**: `handleSave`→`salvarDados` (`usePersistenciaRegistro.ts`)
grava só `Compra` + histórico de tanque + `Combustivel.preco_custo`; a despesa não entra
no payload. Só sobrevive em `sessionStorage` (`usePersistenciaFormulario`). É simulador de
preço da tela: alimenta "VALOR P/ VENDA" via `useCalculosRegistro.calcValorParaVenda`
(= custo médio compra/litro + despesaMes/litrosBase).

O lucro da **Planilha do Mês** (aba Gestão de Bicos, `fechamento-diario`) vem de outro
caminho: `useCustoMensal` lê a tabela `Despesa` via supabase e usa
`despesaOperacionalPorLitro` de `@posto/utils`. **Digitar naquele input não afeta o lucro
da Planilha do Mês.** São dois cálculos de rateio despesa/litro independentes — o da tela
de Compras é uma reimplementação local fora de `packages/utils`.

**Why:** pergunta de dinheiro recorrente ("alterar despesa ali muda o lucro?"). Resposta: não.
**How to apply:** ao investigar lucro/custo por litro, a fonte canônica é `useCustoMensal` +
tabela `Despesa` + `@posto/utils`; a tela de Compras é preview isolado.

Reconfirmar (19/08/2026):
```
grep -rn "Despesa\|useCustoMensal\|despesaService" apps/web/src/components/registro-compras/   # deve dar zero de tabela Despesa
grep -n "despesasMes" apps/web/src/components/registro-compras/hooks/usePersistenciaRegistro.ts # deve dar zero
```
