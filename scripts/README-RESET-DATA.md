# 🗑️ Como Zerar Dados da Visão do Proprietário

## 📋 Visão Geral

Este guia explica como zerar os dados exibidos na **Visão do Proprietário** do sistema.

## 📊 Dados que Serão Zerados

A Visão do Proprietário exibe dados consolidados de:

1. **Fechamentos** - Vendas diárias e mensais
2. **Dívidas** - Dívidas pendentes de clientes
3. **Empréstimos** - Empréstimos ativos
4. **Despesas** - Despesas pendentes
5. **Vendas** - Registros individuais de vendas
6. **Fechamentos de Frentista** - Fechamentos por frentista

## 🚀 Opções de Limpeza

### Opção 1: Zerar TODOS os Postos

Use o script: `scripts/reset-owner-dashboard-data.sql`

**Quando usar:** Quando você quer começar do zero com todos os 3 postos.

**Como executar:**
1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Abra o arquivo `reset-owner-dashboard-data.sql`
4. Copie e cole o conteúdo
5. Clique em **Run**

### Opção 2: Zerar UM Posto Específico

Use o script: `scripts/reset-single-posto-data.sql`

**Quando usar:** Quando você quer limpar apenas um posto específico.

**Como executar:**
1. Abra o arquivo `reset-single-posto-data.sql`
2. **IMPORTANTE:** Altere a linha 13:
   ```sql
   target_posto_id INTEGER := 1; -- ALTERE AQUI O ID DO POSTO
   ```
   - `1` = Posto Providência
   - `2` = Posto Ribeira do Pombal
   - `3` = Posto Acajutiba
3. Acesse o Supabase Dashboard
4. Vá em **SQL Editor**
5. Copie e cole o conteúdo modificado
6. Clique em **Run**

## ⚠️ ATENÇÃO

- ✅ **Faça backup** antes de executar qualquer script
- ✅ Os scripts usam **transações** (BEGIN/COMMIT) para segurança
- ✅ Você verá mensagens de confirmação após a execução
- ❌ **Não é possível desfazer** após executar
- ❌ Os dados de **configuração** (Postos, Frentistas, Combustíveis, Bombas, Bicos) **NÃO serão afetados**

## 🔍 Verificação Após Limpeza

Após executar o script, a Visão do Proprietário deve exibir:

- **Vendas Hoje:** R$ 0
- **Lucro Est. Hoje:** R$ 0
- **Dívidas Totais:** R$ 0
- **Vendas Mês:** R$ 0
- **Despesas Pendentes:** R$ 0

## 📝 Dados que PERMANECEM

Os seguintes dados **não são afetados** pelos scripts:

- ✅ Postos cadastrados
- ✅ Frentistas
- ✅ Combustíveis
- ✅ Bombas e Bicos
- ✅ Clientes
- ✅ Configurações do sistema

## 🔄 Após a Limpeza

1. Recarregue a página da Visão do Proprietário
2. Clique no botão de **Refresh** (ícone de setas circulares)
3. Todos os valores devem estar zerados
4. Você pode começar a registrar novos dados

## 💡 Dica

Se você quiser manter alguns dados de exemplo, considere:
- Criar um backup antes de limpar
- Ou usar a Opção 2 para limpar apenas postos específicos
