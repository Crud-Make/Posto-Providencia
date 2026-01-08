# 📱 Integração Mobile → Painel Principal - Fechamento de Caixa

## ✅ **Integração Completa Implementada!**

A integração entre o app mobile e o painel principal foi implementada com sucesso. Agora os frentistas podem enviar seus fechamentos de caixa pelo celular e os dados aparecem automaticamente no dashboard web.

---

## 🔧 **Arquivos Criados/Modificados**

### **Novos Arquivos**
1. **`/mobile/lib/api.ts`** - Service de API completo para o mobile
2. **`/supabase/migrations/link_frentista_users.sql`** - SQL para vincular usuários aos frentistas

### **Arquivos Modificados**
1. **`/mobile/app/(tabs)/registro.tsx`** - Integração real com Supabase
2. **`/Posto-Providencia/services/api.ts`** - Melhorias no cálculo de totais no dashboard

---

## 🚀 **Como Funciona**

### **No App Mobile:**
1. Frentista abre o app e faz login
2. Sistema detecta automaticamente o turno atual
3. Frentista preenche os valores recebidos (Cartão, Nota, PIX, Dinheiro)
4. Se houver falta de caixa, informa o valor e uma observação obrigatória
5. Ao confirmar, os dados são enviados ao Supabase

### **No Painel Web:**
1. Dashboard busca automaticamente os fechamentos do dia
2. Exibe card para cada frentista com:
   - Nome e foto
   - Turno trabalhado
   - Total vendido
   - Status (OK/Divergente/Aberto)
3. Atualiza em tempo real conforme novos fechamentos são enviados

---

## ⚙️ **Configuração Necessária**

### **1. Executar Migration no Supabase**

Execute o SQL no painel do Supabase para adicionar a coluna `user_id`:

\`\`\`sql
ALTER TABLE "Frentista" 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX idx_frentista_user_id ON "Frentista"(user_id);
\`\`\`

### **2. Vincular Usuários aos Frentistas**

Para cada frentista, você precisa vincular ao usuário correspondente:

\`\`\`sql
-- 1. Criar usuário no Supabase Auth (via painel ou código)
-- 2. Vincular ao frentista:

UPDATE "Frentista" 
SET user_id = 'UUID_DO_USUARIO'
WHERE id = [ID_DO_FRENTISTA];
\`\`\`

**Exemplo prático:**
\`\`\`sql
-- Listar frentistas sem vínculo
SELECT id, nome, cpf, ativo
FROM "Frentista"
WHERE user_id IS NULL AND ativo = true;

-- Criar usuário no Auth (via painel Supabase)
-- Email: joao.silva@posto.com
-- Senha: (definir senha temporária)

-- Vincular (substitua os valores reais)
UPDATE "Frentista" 
SET user_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
WHERE nome = 'João Silva';
\`\`\`

### **3. Verificar Vínculos**

\`\`\`sql
SELECT 
    f.id,
    f.nome as frentista_nome,
    u.email as usuario_email,
    f.ativo
FROM "Frentista" f
LEFT JOIN auth.users u ON f.user_id = u.id
WHERE f.ativo = true;
\`\`\`

---

## 🧪 **Como Testar**

### **Teste 1: Envio do Mobile**

1. **Abrir app mobile** no Expo Go
2. **Fazer login** com credenciais de um frentista
3. **Preencher fechamento:**
   - Cartão: R$ 500,00
   - Dinheiro: R$ 200,00
   - PIX: R$ 300,00
   - Total: R$ 1.000,00
4. **Confirmar envio**
5. **Verificar mensagem de sucesso**: "Fechamento enviado com sucesso!"

### **Teste 2: Visualização no Dashboard**

1. **Abrir painel web** (localhost:3005)
2. **Acessar Dashboard**
3. **Verificar card do frentista** na seção "Fechamentos do Dia"
4. **Conferir dados:**
   - Nome do frentista
   - Turno correto
   - Total: R$ 1.000,00
   - Status: OK (se não houver divergência)

### **Teste 3: Falta de Caixa**

1. **No mobile**, preencher:
   - Total informado: R$ 950,00
   - Falta de caixa: R$ 50,00
   - Observação: "Troco quebrado"
2. **Enviar fechamento**
3. **No dashboard**, verificar:
   - Status: Divergente (porque diferença > R$ 50)
   - Pode ver detalhes com observação

### **Teste 4: Bloqueio de Duplicação**

1. **Enviar um fechamento** pelo mobile
2. **Tentar enviar novamente** no mesmo turno/dia
3. **Verificar mensagem**: "Você já enviou um fechamento para este turno hoje."

---

## 📊 **Estrutura de Dados**

### **Tabela: Fechamento**
- `id`: ID único
- `data`: Data do fechamento
- `turno_id`: Turno (Manhã/Tarde/Noite)
- `usuario_id`: Usuário que criou
- `status`: ABERTO/FECHADO
- `total_recebido`: Soma dos pagamentos
- `observacoes`: Notas gerais

### **Tabela: FechamentoFrentista**
- `id`: ID único
- `fechamento_id`: Referência ao fechamento
- `frentista_id`: Frentista que enviou
- `valor_cartao`: Total em cartão
- `valor_nota`: Total em notas/vales
- `valor_pix`: Total em PIX
- `valor_dinheiro`: Total em dinheiro
- `valor_conferido`: Total após descontar falta
- `diferenca`: Falta ou sobra (negativo = falta)
- `observacoes`: Observações do frentista

---

## 🔐 **Segurança**

1. **Autenticação obrigatória**: Usuário deve estar logado
2. **Vinculação ao frentista**: Sistema verifica se usuário é um frentista ativo
3. **Bloqueio de duplicação**: Não permite múltiplos envios no mesmo turno/dia
4. **Validações**:
   - Valores não negativos
   - Observação obrigatória se houver falta
   - Turno válido

---

## 🎯 **Fluxo Completo**

\`\`\`mermaid
graph TD
    A[Frentista abre app] --> B[Login no Supabase]
    B --> C[Sistema detecta turno]
    C --> D[Preenche valores]
    D --> E{Há falta?}
    E -->|Sim| F[Adiciona observação]
    E -->|Não| G[Confirma envio]
    F --> G
    G --> H[submitMobileClosing]
    H --> I[Busca/cria Fechamento]
    I --> J[Verifica duplicação]
    J -->|Já enviou| K[Erro: já enviou]
    J -->|Primeira vez| L[Cria FechamentoFrentista]
    L --> M[Atualiza Fechamento]
    M --> N[Sucesso!]
    N --> O[Dashboard atualiza]
\`\`\`

---

## 🐛 **Troubleshooting**

### **Erro: "Frentista não encontrado"**
**Causa**: Usuário não está vinculado a um frentista
**Solução**: Execute o UPDATE para vincular user_id

### **Erro: "Não foi possível identificar o turno"**
**Causa**: Tabela Turno está vazia
**Solução**: Criar turnos no painel de Configurações

### **Fechamento não aparece no dashboard**
**Causa**: Filtros de data/turno/frentista ativos
**Solução**: Clicar em "Limpar Filtros" no dashboard

### **Erro de conexão no mobile**
**Causa**: URL do Supabase incorreta ou rede instável
**Solução**: Verificar lib/supabase.ts e conexão de internet

---

## 📈 **Próximos Passos (Melhorias Futuras)**

1. ✅ **Notificações push** quando gestor precisa revisar fechamentos
2. ✅ **Histórico de fechamentos** no app mobile
3. ✅ **Edição de fechamentos** (apenas antes do gestor fechar o dia)
4. ✅ **Relatórios em PDF** para impressão
5. ✅ **Dashboard analítico** com gráficos de performance por frentista

---

## 📞 **Suporte**

Em caso de dúvidas ou problemas:
1. Verificar logs no console do mobile/web
2. Consultar este documento
3. Verificar tabelas no Supabase
4. Testar com dados de exemplo

---

**Desenvolvido com ❤️ para otimizar o fechamento de caixa do Posto Providência**
