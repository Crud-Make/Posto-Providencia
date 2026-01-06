# Workflow Baratência - Implementação do Sistema de Fidelidade

Este workflow descreve os passos para construir a plataforma de arbitragem de preços e carteira digital do posto.

## 1. Infraestrutura do Banco (Ledger)
- [x] Criar tabelas de `ClienteBaratencia`, `CarteiraBaratencia` e `TransacaoBaratencia`.
- [ ] Implementar Triggers para atualizar saldo automaticamente ao realizar transações.
- [ ] Configurar RLS (Row Level Security) para garantir que um cliente só veja sua própria carteira.

## 2. API de Integração (Services)
- [ ] Criar `baratenciaService` em `services/api.ts` para lidar com:
    - Depósitos (Integração Pix).
    - Conversão de R$ para Litros (baseado no preço atual do `combustivelService`).
    - Geração de Token de Abastecimento.

## 3. App do Cliente (Interface Baratência)
- [ ] Inicializar projeto Expo ou Next.js para o cliente.
- [ ] Tela de Wallet: Visualização de saldos (R$ e Litros).
- [ ] Fluxo de Compra: Checkout para depósitos e travas de preço.
- [ ] Tela de Resgate: Geração de QR Code/PIN.

## 4. Integração PDV (App do Frentista)
- [ ] Adicionar botão "Resgate Baratência" na tela de registro.
- [ ] Implementar scanner de QR Code.
- [ ] Validar token via API e registrar automaticamente no campo `baratencia` do fechamento.

## 5. Dashboard Administrativo (Owner)
- [ ] Adicionar métricas de "Passivo de Litros" (Quanto o posto deve entregar aos clientes).
- [ ] Relatório de depósitos e conversões.
