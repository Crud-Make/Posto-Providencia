# 📋 PRD - Sistema de Gestão para Postos de Combustível

## 📌 Informações do Documento

| Campo | Valor |
|-------|-------|
| **Produto** | Posto Manager - Sistema de Gestão Integrada |
| **Versão** | 1.0 |
| **Data** | 11 de Dezembro de 2025 |
| **Autor** | Equipe de Produto |
| **Status** | Em Desenvolvimento |

---

## 🎯 Visão Geral do Produto

### Problema
Postos de combustível atualmente dependem de planilhas Excel complexas e manuais para gerenciar:
- Vendas diárias de combustível por bomba/bico
- Fechamento de caixa e conferência de frentistas
- Controle de estoque e compras
- Gestão de empréstimos e parcelas
- Aferição de equipamentos

Isso resulta em:
- ❌ Alto risco de erros humanos
- ❌ Dificuldade para gerar relatórios consolidados
- ❌ Falta de visibilidade em tempo real
- ❌ Perda de dados por problemas técnicos
- ❌ Dificuldade de acesso remoto

### Solução
**Posto Manager** é um SaaS completo que digitaliza e automatiza toda a gestão operacional e financeira de postos de combustível, oferecendo:
- ✅ Cálculos automáticos e validações em tempo real
- ✅ Dashboard com indicadores-chave
- ✅ Acesso multi-dispositivo (web e mobile)
- ✅ Backup automático na nuvem
- ✅ Relatórios e análises avançadas
- ✅ Alertas e notificações inteligentes

### Público-Alvo
- **Primário**: Proprietários e gerentes de postos de combustível pequenos e médios
- **Secundário**: Contadores e equipes administrativas
- **Terciário**: Frentistas (para registro de fechamentos)

---

## 🎨 Personas

### Persona 1: João - Proprietário do Posto
- **Idade**: 45 anos
- **Objetivo**: Ter visibilidade completa do negócio e aumentar lucratividade
- **Dores**: Passa horas conferindo planilhas, não confia 100% nos números, dificuldade para tomar decisões rápidas
- **Necessidades**: Dashboard executivo, alertas de anomalias, relatórios de lucratividade

### Persona 2: Maria - Gerente Operacional
- **Idade**: 32 anos
- **Objetivo**: Garantir que o caixa fecha corretamente todos os dias
- **Dores**: Conferência manual demorada, diferenças de caixa frequentes, dificuldade para rastrear erros
- **Necessidades**: Fechamento de caixa ágil, rastreamento de frentistas, histórico de diferenças

### Persona 3: Carlos - Frentista
- **Idade**: 28 anos
- **Objetivo**: Registrar vendas corretamente e evitar problemas no fechamento
- **Dores**: Processo manual confuso, medo de ser responsabilizado por erros
- **Necessidades**: Interface simples para registro, feedback imediato de diferenças

---

## 🏗️ Arquitetura do Sistema

### Stack Tecnológica Sugerida

**Frontend:**
- Next.js 14+ (App Router)
- TypeScript
- TailwindCSS
- Shadcn/ui
- Recharts (gráficos)
- React Hook Form + Zod (validação)

**Backend:**
- FastAPI (Python)
- PostgreSQL
- SQLAlchemy (ORM)
- Alembic (migrations)
- Pydantic (validação)

**Infraestrutura:**
- Docker + Docker Compose
- Vercel (frontend) / Railway (backend)
- Supabase (banco de dados)
- Cloudflare (CDN)

---

## 📦 Módulos e Features

## MÓDULO 1: 🛢️ Gestão de Vendas de Combustível

### Feature 1.1: Cadastro de Produtos (Combustíveis)

**Descrição:**
Permite cadastrar os tipos de combustível vendidos no posto com suas características.

**Regras de Negócio:**
- Cada combustível deve ter um código único (ex: GC, GA, ET, DS10)
- Nome completo obrigatório
- Possibilidade de ativar/desativar produtos sem deletá-los
- Histórico de alterações de preço

**Campos:**
- Nome (ex: "Gasolina Comum")
- Código (ex: "GC")
- Cor (para identificação visual)
- Status (ativo/inativo)
- Data de cadastro

**Telas:**
- Lista de combustíveis (tabela)
- Modal de cadastro/edição
- Histórico de preços

**Validações:**
- Nome: obrigatório, mínimo 3 caracteres
- Código: obrigatório, único, máximo 10 caracteres
- Não permitir exclusão se houver vendas associadas

---

### Feature 1.2: Cadastro de Bombas e Bicos

**Descrição:**
Gerencia a estrutura física do posto: bombas e seus respectivos bicos.

**Regras de Negócio:**
- Uma bomba pode ter múltiplos bicos (geralmente 2-4)
- Cada bico vende apenas um tipo de combustível
- Bicos podem ser temporariamente desativados (manutenção)
- Numeração dos bicos deve ser única no posto

**Campos da Bomba:**
- Nome/Número (ex: "BOMBA 01")
- Localização (opcional)
- Status (ativa/manutenção/inativa)

**Campos do Bico:**
- Número do bico (ex: 1, 2, 3...)
- Bomba associada
- Combustível
- Status (ativo/inativo)
- Última aferição

**Telas:**
- Lista de bombas (cards visuais)
- Detalhes da bomba (com lista de bicos)
- Modal de cadastro/edição

**Validações:**
- Número do bico único por bomba
- Combustível obrigatório
- Não permitir exclusão se houver leituras recentes

---

### Feature 1.3: Registro de Leituras Diárias

**Descrição:**
Captura as leituras inicial e final de cada bico para calcular as vendas do dia.

**Regras de Negócio:**
- Leitura final deve ser maior ou igual à inicial
- Leitura inicial do dia seguinte = leitura final do dia anterior
- Sistema deve alertar se diferença for muito alta (possível erro)
- Preço do litro pode variar por dia
- Cálculos automáticos: litros vendidos e valor total

**Campos:**
- Data
- Bico
- Leitura inicial (automática se houver leitura anterior)
- Leitura final
- Preço por litro (R$)
- **[Calculado]** Litros vendidos
- **[Calculado]** Valor total da venda

**Fórmulas:**
```
litros_vendidos = leitura_final - leitura_inicial
valor_venda = litros_vendidos × preco_litro
```

**Telas:**
- Formulário de leitura diária (uma tela com todos os bicos)
- Visualização de leituras anteriores
- Comparativo com dias anteriores

**Validações:**
- Leitura final ≥ leitura inicial
- Preço > 0
- Alerta se litros vendidos > 5000 (possível erro de digitação)
- Alerta se leitura inicial ≠ leitura final do dia anterior

**Experiência do Usuário:**
- Auto-completar leitura inicial com base no dia anterior
- Mostrar média de vendas dos últimos 7 dias para comparação
- Destacar visualmente se houver discrepância

---

### Feature 1.4: Dashboard de Vendas

**Descrição:**
Visão consolidada das vendas de combustível com métricas e gráficos.

**Métricas Exibidas:**
- Total de litros vendidos (hoje/semana/mês)
- Faturamento total
- Ticket médio por litro
- Combustível mais vendido
- Comparativo com período anterior

**Gráficos:**
- Vendas por combustível (pizza)
- Evolução diária de vendas (linha)
- Vendas por bico (barras)
- Heatmap de horários de pico (futuro)

**Filtros:**
- Período (hoje, semana, mês, customizado)
- Combustível específico
- Bomba/bico específico

---

## MÓDULO 2: 💳 Gestão de Caixa e Pagamentos

### Feature 2.1: Cadastro de Formas de Pagamento

**Descrição:**
Gerencia as formas de pagamento aceitas pelo posto.

**Formas Padrão:**
- Cartão de Crédito
- Cartão de Débito
- Pix
- Dinheiro
- Vale (combustível)

**Campos:**
- Nome
- Tipo (cartão/digital/físico)
- Taxa (%) - opcional
- Status (ativo/inativo)

**Regras de Negócio:**
- Não permitir exclusão se houver recebimentos associados
- Taxa pode ser aplicada automaticamente nos cálculos

---

### Feature 2.2: Cadastro de Maquininhas

**Descrição:**
Registra as máquinas de cartão utilizadas no posto.

**Campos:**
- Nome/Apelido (ex: "Sipag", "Azulzinha")
- Operadora (ex: Stone, PagSeguro)
- Taxa (%)
- Status (ativa/inativa)

**Regras de Negócio:**
- Múltiplas maquininhas podem estar ativas
- Histórico de transações por maquininha

---

### Feature 2.3: Registro de Recebimentos

**Descrição:**
Captura todos os recebimentos do dia por forma de pagamento e maquininha.

**Campos:**
- Data
- Forma de pagamento
- Maquininha (se aplicável)
- Valor (R$)
- Observações

**Regras de Negócio:**
- Soma automática por forma de pagamento
- Comparação com total de vendas das bombas
- Cálculo de diferença (falta/sobra)

**Fórmulas:**
```
total_recebido = SUM(todos_recebimentos)
diferenca = total_vendas_bombas - total_recebido
percentual_forma = valor_forma / total_recebido × 100
```

**Telas:**
- Formulário de registro (agrupado por forma)
- Resumo do dia (cards com totais)
- Histórico de recebimentos

**Validações:**
- Valor > 0
- Forma de pagamento obrigatória
- Alerta se diferença > 5% do total

---

### Feature 2.4: Fechamento de Caixa

**Descrição:**
Processo completo de fechamento do caixa diário com conferência.

**Etapas:**
1. Revisão das leituras de bombas
2. Registro de recebimentos
3. Conferência por frentista
4. Cálculo de diferenças
5. Finalização e bloqueio

**Campos do Fechamento:**
- Data
- Total vendas (bombas)
- Total recebido
- Diferença
- Status (aberto/fechado)
- Observações
- Responsável pelo fechamento

**Regras de Negócio:**
- Apenas um fechamento por dia
- Após fechado, não permite edição (apenas ajustes com justificativa)
- Diferenças acima de R$ 100 exigem justificativa obrigatória
- Gera PDF do fechamento automaticamente

**Telas:**
- Wizard de fechamento (passo a passo)
- Resumo final (antes de confirmar)
- Histórico de fechamentos
- Detalhes de um fechamento específico

**Alertas:**
- ⚠️ Diferença detectada
- ⚠️ Frentista com diferença recorrente
- ✅ Fechamento sem diferenças

---

## MÓDULO 3: 👷 Gestão de Frentistas

### Feature 3.1: Cadastro de Frentistas

**Descrição:**
Gerencia os colaboradores que atuam como frentistas.

**Campos:**
- Nome completo
- CPF
- Telefone
- Data de admissão
- Turno preferencial (manhã/tarde/noite)
- Status (ativo/inativo)
- Foto (opcional)

**Regras de Negócio:**
- CPF único
- Não permitir exclusão, apenas inativação
- Histórico completo de fechamentos

---

### Feature 3.2: Fechamento por Frentista

**Descrição:**
Registra os valores informados por cada frentista no final do turno.

**Campos:**
- Data
- Frentista
- Valor em cartão
- Valor em notas
- Valor em Pix
- Valor em dinheiro
- **[Calculado]** Total informado
- Valor conferido (após contagem)
- **[Calculado]** Diferença

**Fórmulas:**
```
total_informado = cartao + notas + pix + dinheiro
diferenca = total_informado - valor_conferido
```

**Regras de Negócio:**
- Diferença positiva = sobra
- Diferença negativa = falta
- Histórico de diferenças por frentista
- Alerta se frentista tiver 3+ diferenças no mês

**Telas:**
- Formulário de fechamento individual
- Lista de fechamentos do dia
- Ranking de frentistas (menor diferença)
- Histórico por frentista

**Validações:**
- Todos os valores ≥ 0
- Alerta se diferença > R$ 50

---

### Feature 3.3: Relatório de Performance

**Descrição:**
Análise de desempenho dos frentistas.

**Métricas:**
- Total de fechamentos
- Média de diferenças
- Maior diferença (positiva/negativa)
- Taxa de acerto (fechamentos sem diferença)
- Tendência (melhorando/piorando)

**Gráficos:**
- Evolução de diferenças ao longo do tempo
- Comparativo entre frentistas
- Distribuição de diferenças (histograma)

**Filtros:**
- Período
- Frentista específico
- Apenas com diferenças

---

## MÓDULO 4: 📦 Gestão de Estoque e Compras

### Feature 4.1: Registro de Compras

**Descrição:**
Registra as compras de combustível realizadas.

**Campos:**
- Data da compra
- Combustível
- Fornecedor
- Quantidade (litros)
- Valor total (R$)
- **[Calculado]** Custo por litro
- Nota fiscal (upload)
- Observações

**Fórmulas:**
```
custo_por_litro = valor_total / quantidade_litros
```

**Regras de Negócio:**
- Atualiza estoque automaticamente
- Recalcula custo médio ponderado
- Histórico completo de compras

**Telas:**
- Formulário de registro de compra
- Lista de compras (tabela)
- Detalhes da compra (com NF)

**Validações:**
- Quantidade > 0
- Valor total > 0
- Data não pode ser futura
- Alerta se custo muito diferente da média

---

### Feature 4.2: Controle de Estoque

**Descrição:**
Monitora o estoque atual de cada combustível.

**Campos:**
- Combustível
- Quantidade atual (litros)
- Capacidade do tanque
- **[Calculado]** Percentual ocupado
- Última compra
- Última venda
- Previsão de esgotamento

**Fórmulas:**
```
percentual_ocupado = (quantidade_atual / capacidade) × 100
dias_restantes = quantidade_atual / media_vendas_diarias
```

**Regras de Negócio:**
- Estoque atualizado automaticamente com vendas e compras
- Alerta quando estoque < 20% da capacidade
- Alerta quando previsão < 3 dias

**Telas:**
- Dashboard de estoque (cards por combustível)
- Gráfico de evolução do estoque
- Histórico de movimentações

**Alertas:**
- 🔴 Estoque crítico (< 10%)
- 🟡 Estoque baixo (< 20%)
- 🟢 Estoque adequado

---

### Feature 4.3: Análise de Margem e Precificação

**Descrição:**
Calcula a margem de lucro e sugere preços de venda.

**Campos:**
- Combustível
- Custo médio por litro
- Preço de venda atual
- **[Calculado]** Margem (R$ e %)
- **[Calculado]** Lucro por litro
- Despesas operacionais (%)
- **[Calculado]** Preço sugerido

**Fórmulas:**
```
margem_reais = preco_venda - custo_medio
margem_percentual = (margem_reais / custo_medio) × 100
lucro_liquido = margem_reais - (preco_venda × despesas_percentual)
preco_sugerido = custo_medio + margem_desejada + despesas
```

**Regras de Negócio:**
- Despesas operacionais configuráveis (padrão: 8-12%)
- Comparação com preços da concorrência (futuro)
- Histórico de alterações de preço

**Telas:**
- Dashboard de precificação
- Simulador de margem
- Histórico de preços

---

## MÓDULO 5: 💰 Gestão Financeira

### Feature 5.1: Cadastro de Empréstimos

**Descrição:**
Gerencia empréstimos tomados pelo posto.

**Campos:**
- Credor (nome)
- Valor total
- Quantidade de parcelas
- Valor da parcela
- Data do empréstimo
- Data do primeiro vencimento
- Periodicidade (mensal, quinzenal, etc.)
- Taxa de juros (%)
- Observações

**Regras de Negócio:**
- Gera parcelas automaticamente
- Calcula total pago e saldo devedor
- Alertas de vencimento

**Telas:**
- Lista de empréstimos (cards)
- Formulário de cadastro
- Detalhes do empréstimo (com parcelas)

**Validações:**
- Valor total > 0
- Quantidade de parcelas > 0
- Data de vencimento não pode ser passada

---

### Feature 5.2: Controle de Parcelas

**Descrição:**
Gerencia as parcelas de cada empréstimo.

**Campos:**
- Empréstimo
- Número da parcela
- Data de vencimento
- Valor
- Data de pagamento
- Status (pendente/pago/atrasado)
- Juros/multa (se houver)

**Fórmulas:**
```
total_pago = SUM(parcelas_pagas)
saldo_devedor = valor_total - total_pago
percentual_quitado = (total_pago / valor_total) × 100
```

**Regras de Negócio:**
- Status "atrasado" se data atual > vencimento e não pago
- Cálculo automático de juros se configurado
- Histórico de pagamentos

**Telas:**
- Calendário de vencimentos
- Lista de parcelas (filtros: todas/pendentes/pagas/atrasadas)
- Modal de pagamento

**Alertas:**
- 🔴 Parcela vencida
- 🟡 Vencimento em 3 dias
- 📧 Notificação por email/WhatsApp (futuro)

---

### Feature 5.3: Dashboard Financeiro

**Descrição:**
Visão consolidada da saúde financeira do posto.

**Métricas:**
- Faturamento do mês
- Custos do mês
- Lucro líquido
- Total de dívidas
- Parcelas do mês
- Fluxo de caixa projetado

**Gráficos:**
- Evolução de faturamento (linha)
- Receitas vs Despesas (barras)
- Composição de custos (pizza)
- Projeção de fluxo de caixa (área)

**Filtros:**
- Período (mês/trimestre/ano)
- Tipo de visualização

---

## MÓDULO 6: 🔧 Manutenção e Aferição

### Feature 6.1: Registro de Aferições

**Descrição:**
Controla as aferições periódicas das bombas conforme exigência do INMETRO.

**Campos:**
- Data da aferição
- Bico
- Variação alta (ml)
- Variação baixa (ml)
- Responsável
- Status (conforme/não conforme)
- Observações
- Próxima aferição (calculado)

**Regras de Negócio:**
- Aferição obrigatória a cada 6 meses
- Variação permitida: ±0,5% (conforme INMETRO)
- Alerta 15 dias antes do vencimento
- Bico não conforme deve ser sinalizado

**Telas:**
- Formulário de aferição
- Calendário de aferições
- Histórico por bico
- Relatório de conformidade

**Validações:**
- Variações dentro dos limites aceitáveis
- Data não pode ser futura

**Alertas:**
- 🔴 Aferição vencida
- 🟡 Aferição vence em 15 dias
- ⚠️ Bico não conforme

---

## MÓDULO 7: 📊 Relatórios e Análises

### Feature 7.1: Relatórios Operacionais

**Relatórios Disponíveis:**

1. **Relatório de Vendas Diárias**
   - Vendas por combustível
   - Vendas por bico
   - Comparativo com dia anterior
   - Ticket médio

2. **Relatório de Fechamento de Caixa**
   - Resumo de recebimentos
   - Diferenças por frentista
   - Formas de pagamento
   - Totalizadores

3. **Relatório de Estoque**
   - Posição atual
   - Movimentações do período
   - Previsão de reposição

4. **Relatório Financeiro**
   - DRE simplificado
   - Fluxo de caixa
   - Contas a pagar
   - Análise de margem

**Funcionalidades:**
- Exportação (PDF, Excel, CSV)
- Agendamento de envio por email
- Filtros avançados
- Comparativos entre períodos

---

### Feature 7.2: Analytics e Insights

**Descrição:**
Análises avançadas com insights acionáveis.

**Insights Gerados:**
- "Vendas de Gasolina Comum caíram 15% esta semana"
- "Frentista João teve 4 diferenças este mês"
- "Estoque de Etanol acabará em 2 dias"
- "Margem de lucro está abaixo da meta"
- "Parcela de R$ 7.900 vence amanhã"

**Gráficos Avançados:**
- Heatmap de vendas por hora/dia
- Análise de sazonalidade
- Previsão de vendas (ML - futuro)
- Benchmarking (comparação com mercado - futuro)

---

## 🔐 MÓDULO 8: Segurança e Permissões

### Feature 8.1: Gestão de Usuários

**Perfis de Acesso:**

1. **Administrador (Owner)**
   - Acesso total
   - Configurações do sistema
   - Gestão de usuários
   - Relatórios financeiros

2. **Gerente**
   - Fechamento de caixa
   - Gestão de frentistas
   - Relatórios operacionais
   - Registro de compras

3. **Operador**
   - Registro de leituras
   - Registro de recebimentos
   - Visualização de relatórios básicos

4. **Frentista**
   - Apenas fechamento próprio
   - Visualização do próprio histórico

**Campos do Usuário:**
- Nome
- Email
- Telefone
- Perfil
- Status (ativo/inativo)
- Último acesso

---

### Feature 8.2: Auditoria e Logs

**Descrição:**
Registra todas as ações importantes no sistema.

**Eventos Registrados:**
- Login/logout
- Criação/edição/exclusão de registros
- Fechamentos de caixa
- Alterações de preço
- Pagamento de parcelas

**Campos do Log:**
- Data/hora
- Usuário
- Ação
- Entidade afetada
- Valores anteriores/novos
- IP de origem

**Telas:**
- Histórico de auditoria (tabela)
- Filtros por usuário/ação/período
- Detalhes de uma ação específica

---

## 🎨 Design System e UX

### Princípios de Design

1. **Simplicidade**: Interface limpa e intuitiva
2. **Eficiência**: Mínimo de cliques para tarefas comuns
3. **Feedback**: Sempre informar o usuário sobre o resultado das ações
4. **Consistência**: Padrões visuais e de interação uniformes
5. **Responsividade**: Funcional em desktop, tablet e mobile

### Componentes Principais

**Cores:**
- Primary: Verde (combustível/energia)
- Success: Verde claro
- Warning: Amarelo/Laranja
- Danger: Vermelho
- Neutral: Cinza

**Tipografia:**
- Headings: Inter Bold
- Body: Inter Regular
- Numbers: JetBrains Mono (monospace)

**Componentes:**
- Cards informativos
- Tabelas com paginação
- Modais para formulários
- Toasts para notificações
- Gráficos interativos (Recharts)
- Formulários com validação em tempo real

---

## 📱 Responsividade

### Desktop (≥1024px)
- Layout em 2-3 colunas
- Sidebar fixa
- Gráficos expandidos
- Tabelas completas

### Tablet (768px - 1023px)
- Layout em 1-2 colunas
- Sidebar colapsável
- Gráficos adaptados
- Tabelas com scroll horizontal

### Mobile (≤767px)
- Layout em 1 coluna
- Menu hambúrguer
- Cards empilhados
- Tabelas simplificadas ou cards
- Botões de ação flutuantes

---

## 🚀 Roadmap de Desenvolvimento

### MVP (Versão 1.0) - 3 meses

**Prioridade ALTA:**
- ✅ Cadastro de combustíveis, bombas e bicos
- ✅ Registro de leituras diárias
- ✅ Fechamento de caixa básico
- ✅ Cadastro de frentistas
- ✅ Fechamento por frentista
- ✅ Dashboard básico
- ✅ Autenticação e permissões

**Prioridade MÉDIA:**
- ⏳ Registro de compras
- ⏳ Controle de estoque
- ⏳ Gestão de empréstimos
- ⏳ Relatórios básicos (PDF)

**Prioridade BAIXA:**
- 🔜 Aferição de bombas
- 🔜 Analytics avançado
- 🔜 Exportação de dados

### Versão 2.0 - 6 meses

- 📱 App mobile nativo
- 🤖 Integração com WhatsApp (notificações)
- 📧 Envio automático de relatórios
- 🔔 Sistema de alertas configurável
- 📊 Previsão de vendas (ML)
- 💳 Integração com APIs de maquininhas
- 🏪 Multi-posto (franquias)

### Versão 3.0 - 12 meses

- 🧾 Emissão de NF-e
- 📦 Integração com fornecedores
- 👥 CRM para clientes (fidelidade)
- 🎯 Programa de pontos
- 📍 Comparação com concorrentes (geolocalização)
- 🤖 Chatbot para suporte
- 🔗 API pública para integrações

---

## 📊 Métricas de Sucesso

### Métricas de Produto

**Adoção:**
- Número de postos cadastrados
- Usuários ativos diários/mensais
- Taxa de retenção (30/60/90 dias)

**Engajamento:**
- Fechamentos de caixa realizados
- Leituras registradas por dia
- Tempo médio na plataforma
- Features mais utilizadas

**Satisfação:**
- NPS (Net Promoter Score)
- CSAT (Customer Satisfaction)
- Taxa de churn
- Tickets de suporte abertos

### Métricas de Negócio

**Para o Cliente:**
- Redução de diferenças de caixa (%)
- Tempo economizado em fechamentos (horas/mês)
- Aumento de margem de lucro (%)
- Redução de perdas por erro humano (R$)

**Para o Produto:**
- MRR (Monthly Recurring Revenue)
- CAC (Customer Acquisition Cost)
- LTV (Lifetime Value)
- Taxa de conversão (trial → pago)

---

## 💰 Modelo de Negócio

### Planos de Assinatura

**Plano Básico - R$ 149/mês**
- 1 posto
- 3 usuários
- Módulos: Vendas, Caixa, Frentistas
- Suporte por email
- Armazenamento: 1GB

**Plano Profissional - R$ 299/mês**
- 1 posto
- 10 usuários
- Todos os módulos
- Suporte prioritário (chat)
- Armazenamento: 5GB
- Relatórios avançados
- API de integração

**Plano Enterprise - R$ 599/mês**
- Múltiplos postos
- Usuários ilimitados
- Todos os módulos
- Suporte dedicado (telefone)
- Armazenamento: 20GB
- White-label
- Customizações

**Add-ons:**
- App mobile: +R$ 49/mês
- Integração NF-e: +R$ 99/mês
- Consultoria: R$ 200/hora

---

## 🎯 Casos de Uso Detalhados

### Caso de Uso 1: Registro de Vendas do Dia

**Ator:** Gerente (Maria)

**Fluxo Principal:**
1. Maria acessa o sistema às 6h da manhã
2. Navega para "Leituras Diárias"
3. Sistema exibe formulário com todos os bicos
4. Para cada bico:
   - Leitura inicial já está preenchida (do dia anterior)
   - Maria insere a leitura final atual
   - Sistema calcula automaticamente os litros vendidos
   - Maria confirma o preço do litro (ou ajusta se houve mudança)
   - Sistema calcula o valor total
5. Maria revisa os totais
6. Clica em "Salvar Leituras"
7. Sistema valida e salva
8. Exibe resumo: "1.234 litros vendidos - R$ 7.890,00"

**Fluxo Alternativo:**
- Se leitura final < inicial: Sistema alerta "Leitura final deve ser maior que inicial"
- Se diferença muito alta: Sistema alerta "Vendas muito acima da média, confirme os valores"

**Resultado:** Vendas do dia registradas e disponíveis para fechamento de caixa

---

### Caso de Uso 2: Fechamento de Caixa

**Ator:** Gerente (Maria)

**Fluxo Principal:**
1. Maria acessa "Fechamento de Caixa" às 23h
2. Sistema exibe wizard com 4 etapas:

**Etapa 1: Revisão de Vendas**
- Mostra total de vendas por combustível
- Total geral das bombas: R$ 7.890,00
- Maria confirma

**Etapa 2: Recebimentos**
- Maria informa valores por forma de pagamento:
  - Cartão Crédito (Sipag): R$ 3.200,00
  - Cartão Débito (Azulzinha): R$ 2.100,00
  - Pix: R$ 1.800,00
  - Dinheiro: R$ 750,00
- Total recebido: R$ 7.850,00
- Sistema calcula diferença: -R$ 40,00 (falta)

**Etapa 3: Conferência de Frentistas**
- Para cada frentista, Maria registra os valores informados
- Sistema calcula diferenças individuais
- Identifica que Carlos teve falta de R$ 40,00

**Etapa 4: Finalização**
- Resumo completo
- Maria adiciona observação: "Falta de R$ 40 com Carlos - verificar amanhã"
- Clica em "Finalizar Fechamento"
- Sistema gera PDF e envia por email
- Status do dia: FECHADO

**Resultado:** Caixa fechado, diferenças identificadas, PDF gerado

---

### Caso de Uso 3: Alerta de Estoque Baixo

**Ator:** Sistema (automático)

**Fluxo:**
1. Sistema executa rotina diária às 8h
2. Verifica estoque de todos os combustíveis
3. Identifica: Etanol com 800 litros (15% da capacidade)
4. Calcula média de vendas: 400 litros/dia
5. Previsão: estoque acaba em 2 dias
6. Envia notificação para João (proprietário):
   - Push notification no app
   - Email: "⚠️ Estoque de Etanol crítico - 2 dias restantes"
   - WhatsApp (se configurado)
7. João acessa o sistema
8. Visualiza dashboard de estoque
9. Registra nova compra de 5.000 litros
10. Sistema atualiza estoque e cancela alerta

**Resultado:** Estoque reposto antes de acabar, evitando perda de vendas

---

## 🔒 Requisitos Não-Funcionais

### Performance
- Tempo de carregamento de páginas: < 2s
- Tempo de resposta de APIs: < 500ms
- Suporte a 100 usuários simultâneos (MVP)
- Suporte a 1.000 usuários simultâneos (v2.0)

### Segurança
- HTTPS obrigatório
- Criptografia de senhas (bcrypt)
- Tokens JWT com expiração
- Rate limiting em APIs
- Backup diário automático
- Conformidade com LGPD

### Disponibilidade
- Uptime: 99,5% (MVP)
- Uptime: 99,9% (v2.0)
- Backup a cada 24h
- Disaster recovery plan

### Escalabilidade
- Arquitetura horizontal (containers)
- Cache com Redis
- CDN para assets estáticos
- Database read replicas

### Usabilidade
- Acessibilidade WCAG 2.1 AA
- Suporte a navegadores modernos (Chrome, Firefox, Safari, Edge)
- Tempo de aprendizado: < 2 horas
- Documentação completa

---

## 📚 Glossário

| Termo | Definição |
|-------|-----------|
| **Bico** | Ponto de abastecimento em uma bomba de combustível |
| **Bomba** | Equipamento que contém múltiplos bicos |
| **Leitura** | Registro do totalizador de litros de um bico |
| **Fechamento** | Processo de conferência do caixa ao final do dia |
| **Frentista** | Colaborador responsável pelo abastecimento |
| **Aferição** | Verificação de precisão das bombas (INMETRO) |
| **Diferença** | Discrepância entre valores esperados e conferidos |
| **Maquininha** | Terminal de pagamento por cartão |
| **Custo médio** | Média ponderada do custo de compra |
| **Margem** | Diferença entre preço de venda e custo |

---

## 📞 Suporte e Documentação

### Canais de Suporte
- 📧 Email: suporte@postomanager.com
- 💬 Chat (horário comercial)
- 📱 WhatsApp Business
- 📚 Central de ajuda (self-service)
- 🎥 Vídeos tutoriais

### Documentação
- Guia de início rápido
- Manual do usuário completo
- API documentation (Swagger)
- FAQ
- Troubleshooting

---

## ✅ Critérios de Aceite (MVP)

### Funcionalidades Obrigatórias
- [ ] Usuário consegue cadastrar combustíveis, bombas e bicos
- [ ] Usuário consegue registrar leituras diárias
- [ ] Sistema calcula litros e valores automaticamente
- [ ] Usuário consegue fazer fechamento de caixa
- [ ] Sistema identifica diferenças de caixa
- [ ] Usuário consegue cadastrar e gerenciar frentistas
- [ ] Sistema gera PDF do fechamento
- [ ] Dashboard exibe métricas principais
- [ ] Sistema possui autenticação segura
- [ ] Sistema possui diferentes níveis de permissão

### Qualidade
- [ ] Todas as funcionalidades testadas (cobertura > 80%)
- [ ] Interface responsiva (desktop, tablet, mobile)
- [ ] Tempo de carregamento < 2s
- [ ] Zero erros críticos em produção
- [ ] Documentação completa

### UX
- [ ] Novo usuário consegue fazer primeiro fechamento em < 15 min
- [ ] Formulários com validação em tempo real
- [ ] Feedback visual para todas as ações
- [ ] Mensagens de erro claras e acionáveis

---

## 🎉 Conclusão

O **Posto Manager** resolve um problema real e crítico para postos de combustível: a gestão manual e propensa a erros. Com automação inteligente, interface intuitiva e insights acionáveis, o produto tem potencial para se tornar o padrão do setor.

**Próximos passos:**
1. Validação com 5-10 postos (beta)
2. Desenvolvimento do MVP (3 meses)
3. Lançamento soft launch
4. Iteração baseada em feedback
5. Escala e crescimento

---

**Documento vivo**: Este PRD será atualizado conforme aprendizados e feedback dos usuários.

**Última atualização**: 11 de Dezembro de 2025
