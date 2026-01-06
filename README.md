# ⛽ PostoGestão Pro - Dashboard Administrativo

O **PostoGestão Pro** é uma solução completa e moderna para a gestão automatizada de redes de postos de combustíveis. Desenvolvido para oferecer uma visão clara e em tempo real de toda a operação, desde as vendas na pista até a análise estratégica de lucros.

![Status do Projeto](https://img.shields.io/badge/Status-Finalizado-success?style=for-the-badge)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Supabase](https://img.shields.io/badge/Supabase-3EC988?style=for-the-badge&logo=supabase&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Mobile App](https://img.shields.io/badge/Mobile-Repo-blue?style=for-the-badge&logo=github)
![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)

## 🏗️ Arquitetura do Sistema
Este ecossistema é composto por dois repositórios independentes:
1.  **Dashboard (Este Repo):** Gestão administrativa e financeira (Vite/React).
2.  **Mobile App:** Operação de pista para frentistas e clientes (Expo/React Native). [Acessar Repositório](https://github.com/Thyago-vibe/posto-mobile).

### 📊 Dashboard do Proprietário (Owner View)
*   **Visão Consolidada:** Acompanhe múltiplos postos em uma única tela.
*   **Métricas em Tempo Real:** Vendas do dia, lucro estimado, margem média e metas mensais.
*   **Alertas Inteligentes:** Notificações automáticas sobre margem baixa, inadimplência elevada ou falta de fechamento.

### 💰 Gestão Financeira e Fechamento
*   **Fechamento de Caixa Digital:** Registro detalhado de vendas por frentista, turno e bico.
*   **Controle de Recebimentos:** Gestão completa de dinheiro, cartões (com separação por maquininha), PIX e Fiado.
*   **Despesas e Compras:** Registro de gastos operacionais e compras de combustíveis para cálculo preciso de lucro real.

### 📈 Controle de Estoque e Pista
*   **Monitoramento de Tanques:** Gráficos de volume e histórico de variações.
*   **Gestão de Produtos:** Controle de estoque de conveniência e lubrificantes.
*   **Leituras de Encerrantes:** Registro rigoroso de bicos para evitar perdas.

### 🤝 Clientes e "Fiado"
*   **Gestão de Crédito:** Cadastro de clientes com limites personalizados.
*   **Histórico de Dívidas:** Acompanhamento detalhado de parcelas e pagamentos pendentes.

### 🤖 Estrategista IA (Opcional)
*   **Análise Preditiva:** Integração com OpenAI/Gemini para sugestões de promoções baseadas no volume de vendas e desempenho por dia da semana.

## 📱 Aplicativo Mobile (Frentistas)
A operação de pista (fechamento, vendas de bico, vouchers) é realizada através de um aplicativo dedicado para Android/iOS.
*   **Repositório:** [posto-mobile](https://github.com/Thyago-vibe/posto-mobile)
*   **Tecnologia:** React Native + Expo.

## 🛠️ Tecnologias Utilizadas

*   **Frontend:** React 19, TypeScript, Vite.
*   **Estilização:** Tailwind CSS (Modern UI/UX).
*   **Gráficos:** Recharts para visualização de dados financeiros.
*   **Backend:** Supabase (PostgreSQL, Auth, RLS).
*   **Ícones:** Lucide React.
*   **Deploy:** Vercel.

## ⚙️ Configuração Local

1.  **Clonar o repositório:**
    ```bash
    git clone https://github.com/Thyago-vibe/Posto-Providencia.git
    cd Posto-Providencia
    ```

2.  **Instalar dependências:**
    ```bash
    npm install
    ```

3.  **Variáveis de Ambiente:**
    Crie um arquivo `.env` na raiz do projeto com suas credenciais do Supabase:
    ```env
    VITE_SUPABASE_URL=seu_url_do_supabase
    VITE_SUPABASE_ANON_KEY=sua_chave_anon_do_supabase
    ```

4.  **Iniciar desenvolvimento:**
    ```bash
    npm run dev
    ```

## 📦 Deploy na Vercel

O projeto já está configurado com `vercel.json` para suporte a Single Page Application (SPA). Ao conectar no GitHub da Vercel:
*   **Build Command:** `npm run build`
*   **Output Directory:** `dist`
*   **Variables:** Adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` nas configurações da Vercel.

---

Desenvolvido com ❤️ para a rede **Posto Providência**.
