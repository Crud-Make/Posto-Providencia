# Documento de Registro de Alterações: Remoção de Funcionalidades v2.1

## 1. Visão Geral
Este documento detalha a remoção completa das funcionalidades **"Baratência Estrategista de IA"** e **"Painel de Solvência"** do ecossistema Posto Providência (Web e Mobile), visando a simplificação do sistema e foco no core business (Controle de Fechamentos).

A operação envolveu a limpeza de código no frontend (React), mobile (React Native/Expo) e definições de banco de dados (Supabase).

## 2. Escopo das Alterações

### 2.1. Aplicação Web (`src/`)

#### Remoção de Componentes e Arquivos
Foram excluídos definitivamente do repositório:
- `src/components/TelaGestaoBaratencia.tsx` (Módulo completo de Baratência)
- `src/components/TelaDashboardSolvencia.tsx` (Painel de Solvência)
- `src/components/ai/` (Pasta completa contendo lógica de IA, hooks e componentes do Strategic Dashboard)

#### Limpeza de Rotas e Navegação (`App.tsx` e `BarraLateral.tsx`)
- **Removido**: Imports dos componentes excluídos.
- **Removido**: Estados de navegação `baratencia`, `solvency` e `ai_strategy`.
- **Removido**: Itens do menu lateral correspondentes.
- **Removido**: Renderização condicional das telas removidas.

#### Ajustes em Lógica de Negócio
- **`useSessoesFrentistas.ts`**: Removida lógica de cálculo e agregação de valores relacionados a `valor_baratao`.
- **`TabelaFrentistas.tsx`**: Removida coluna de exibição de valores do Baratão.
- **`TelaFechamentoDiario`**: Removidos campos de input e totais referentes ao Baratão.

### 2.2. Aplicação Mobile (`posto-mobile/`)

#### Interface de Usuário (`app/(tabs)/registro.tsx`)
- **Removido**: Componente de Input "Baratão" (Card com estilo visual rosa).
- **Removido**: Linha de resumo "Voucher promocional" no card de Resumo do Turno.
- **Removido**: Ícone `CircleDollarSign` (lucide-react-native) não utilizado.
- **Removido**: Estado `valorBaratao` da inicialização do formulário.

#### Integração e API (`lib/api.ts` e `lib/types.ts`)
- **Interface `SubmitClosingData`**: Removida propriedade `valor_baratao`.
- **Interface `FechamentoFrentista`**: Removida propriedade `baratao`.
- **Lógica de Envio**: O app mobile não envia mais este campo para o backend, evitando erros de "coluna inexistente".

### 2.3. Banco de Dados (Definições)

#### Tabelas (`src/types/database/tables/operacoes.ts`)
- **Tabela `FechamentoFrentista`**: Removida definição da coluna `baratao`.
- **Impacto**: O sistema agora opera ignorando qualquer existência residual dessa coluna no banco, tratando o fechamento apenas com os meios de pagamento padrão (Dinheiro, PIX, Cartões, Notas).

## 3. Justificativa Técnica
A remoção dessas funcionalidades visou reduzir a dívida técnica e a complexidade cognitiva do código. As features removidas não estavam alinhadas com o fluxo operacional atual do posto, gerando ruído na interface e manutenção desnecessária.

**Benefícios Imediatos:**
- **Performance**: Menor tamanho do bundle (menos componentes e bibliotecas carregadas).
- **Estabilidade**: Eliminação de pontos de falha em lógicas de IA complexas.
- **Usabilidade**: Interface mais limpa e direta para os frentistas e gestores.
- **Manutenibilidade**: Código mais enxuto e aderente aos princípios SOLID.

## 4. Estado Atual
O sistema encontra-se estável (Builds Web e Mobile verificados estaticamente). O fluxo principal de **Fechamento de Caixa** opera de forma direta, sem dependências das features removidas.

---
*Gerado automaticamente pelo Assistente de Código em 11/01/2026.*
