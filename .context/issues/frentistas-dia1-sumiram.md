# ISSUE: Envios dos Frentistas do Dia 1 Sumiram no Front

**Data:** 27/01/2026 11:00  
**Severidade:** 🔴 CRÍTICA  
**Status:** 🔍 Investigando

## 🚨 PROBLEMA
Envios dos frentistas do dia 01/01/2026 sumiram do frontend após migrations de lucro.

## ✅ DADOS NO BANCO
- Filip: R$ 2.746,16
- Barbra: R$ 2.705,53  
- Rosimeire: R$ 2.267,57
- Sinho: R$ 893,59
- Elyon: R$ 1.126,01
- **TOTAL:** R$ 9.738,86

## ❌ FRONTEND
Componente `EnviosMobile.tsx` mostra: "Nenhum envio do mobile"

## 🔍 INVESTIGAR
1. Políticas RLS de FechamentoFrentista
2. Service fechamentoFrentistaService
3. Hook useSessoesFrentistas
4. Component state

**Fechamento ID:** 189 (01/01/2026)
