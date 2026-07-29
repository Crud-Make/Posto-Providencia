# ⛽ Posto Providência

Sistema de operação e gestão de caixa para o Posto Providência. Monorepo com o dashboard administrativo (web) e o app do frentista (PWA), compartilhando a lógica de domínio.

![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Supabase](https://img.shields.io/badge/Supabase-3EC988?style=for-the-badge&logo=supabase&logoColor=white)
![Bun](https://img.shields.io/badge/Bun-000000?style=for-the-badge&logo=bun&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)

## 🏗️ Estrutura do monorepo

```
apps/web              Painel/dashboard do gerente (React 19 + Vite)
apps/pwa-frentista    PWA onde o frentista registra o fechamento de caixa pelo celular
packages/types        Tipos compartilhados (incluindo os gerados pelo Supabase)
packages/utils        Lógica de domínio pura e compartilhada (cálculo de fechamento e lucro)
packages/api-core     Cliente Supabase e acesso a dados desacoplado
```

Cálculo de domínio (fechamento de caixa, lucro, encerrantes) mora em `packages/utils` — é compartilhado entre os dois apps e coberto por testes golden master contra dados reais do posto.

## 📊 Funcionalidades

- **Dashboard do proprietário:** visão consolidada de vendas, lucro estimado, margem e metas.
- **Fechamento de caixa digital:** registro por frentista, turno e bico; separação entre valor declarado e valor conferido.
- **Controle de recebimentos:** dinheiro, cartões (por maquininha), PIX e fiado.
- **Despesas e compras:** custo operacional por litro calculado a partir de despesas reais do mês, sem valor fixo hardcoded.
- **Estoque e pista:** monitoramento de tanques e leitura de encerrantes por bico.
- **Clientes e fiado:** cadastro com limite de crédito e histórico de dívidas/pagamentos.
- **OCR de encerrante:** leitura automática do fotômetro via Gemini Vision (app do frentista).

## 🛠️ Stack

- **Frontend:** React 19, TypeScript, Vite.
- **Estilização:** Tailwind CSS.
- **Gráficos:** Recharts.
- **Backend:** Supabase (PostgreSQL, Auth, RLS).
- **Toolchain:** Bun (workspaces + Turborepo) — não usar npm/yarn/pnpm.
- **Deploy:** Vercel.

## ⚙️ Configuração local

1. **Clonar o repositório** (privado — precisa de acesso):
   ```bash
   git clone https://github.com/Crud-Make/Posto-Providencia.git
   cd Posto-Providencia
   ```

2. **Instalar dependências:**
   ```bash
   bun install
   ```

3. **Variáveis de ambiente:** copie `.env.example` para `.env` e preencha com as credenciais do Supabase:
   ```bash
   cp .env.example .env
   ```
   ```env
   VITE_SUPABASE_URL=seu_url_do_supabase
   VITE_SUPABASE_ANON_KEY=sua_chave_anon_do_supabase
   ```

4. **Iniciar o dashboard** (porta 3015):
   ```bash
   bun run dev
   ```

5. **Rodar os testes:**
   ```bash
   bun run test          # unitários/componente (Vitest)
   bun run test:golden   # golden master contra dados reais (bun:test)
   ```

## 📦 Deploy na Vercel

Configurado via `vercel.json` para SPA. Ao conectar o repositório na Vercel:
- **Build Command:** `bun run build`
- **Output Directory:** `dist`
- **Variables:** `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

---

Desenvolvido para a rede **Posto Providência**.
