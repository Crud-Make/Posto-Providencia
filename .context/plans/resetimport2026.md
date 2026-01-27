---
title: Reset e Importação Crítica de Dados 2026
summary: Plano detalhado para zerar o sistema e realizar a importação crítica de dados atualizados de 2026 para entrega do projeto.
status: pending
generated: 2026-01-26
agents:
  - type: architect-specialist
    role: "Desenho da arquitetura de migração e mapeamento de dados"
  - type: database-specialist
    role: "Execução de comandos SQL e garantia de integridade referencial"
  - type: documentation-writer
    role: "Registro de evidências e documentação do estado final"
---

# Plano de Reset e Importação Crítica de Dados 2026

## 1. Contexto e Motivação
Este plano visa preparar o sistema **Posto Providência** para a fase final de entrega, garantindo que o banco de dados esteja livre de dados de teste e configurado com a operação real de 2026 conforme a planilha oficial `Posto,Jorro, 2026.xlsx`.

## 2. Fases de Execução

### Fase 1: Análise e Mapeamento (P)
**Propósito**: Garantir que cada célula da planilha tenha um destino correto no banco de dados.
**Passos**
1. Mapear a aba `POSTO JORRO 2026` para as tabelas `Combustivel`, `Posto` e `Produto`.
2. Mapear a aba `AFERICAO` para `Bomba` e `Bico`.
3. Mapear as colunas "Inicial" da aba `Mes, 01.` para a tabela `Leitura`.
4. Definir a ordem de inserção para evitar erros de Foreign Key.

### Fase 2: Reset e Estruturação (E)
**Propósito**: Limpar o sistema e criar a "espinha dorsal" operacional.
**Passos**
1. Executar `TRUNCATE CASCADE` em todas as tabelas (concluído).
2. Inserir o Posto principal ("Posto Jorro").
3. Inserir os Combustíveis com os preços de venda definidos para 2026.
4. Criar as Bombas (01, 02, 03) e seus respectivos Bicos vinculados aos combustíveis corretos.
5. Configurar os Tanques com estoque inicial estimado e capacidade.

### Fase 3: Importação de Dados Operacionais (E)
**Propósito**: Iniciar o histórico de 2026.
**Passos**
1. Inserir as leituras iniciais dos 6 bicos (valores de abertura do dia 01/01/2026).
2. Associar as leituras ao posto e bicos correspondentes.
3. (Opcional) Importar compras de combustível registradas na aba de controle.

### Fase 4: Validação e Handoff (V)
**Propósito**: Garantir a qualidade da entrega.
**Passos**
1. Verificar se as somas de bicos batem com os totais da planilha.
2. Validar se os preços de venda no banco coincidem com a planilha.
3. Gerar um relatório de "Estado Inicial" para o usuário.

## 3. Critérios de Sucesso
- Banco de dados com 0 registros em tabelas transacionais (Vendas, Despesas) exceto as configurações iniciais.
- Tabela de `Bico` com 6 registros vinculados corretamente.
- Tabela de `Leitura` contendo os encerrantes iniciais de 2026.
- Sistema navegável sem erros de tipagem no frontend devido a dados nulos.

## 4. Plano de Rollback
Em caso de erro catastrófico na importação:
1. Re-executar o script de TRUNCATE.
2. Corrigir os dados na planilha ou no script de mapeamento.
3. Reiniciar a importação a partir da Fase 2.

---
// [26/01 21:30] Criação do plano estruturado para entrega final conforme regras do projeto.
