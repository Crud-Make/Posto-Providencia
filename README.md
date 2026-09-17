# ⛽ Posto Providência

Sistema de operação e gestão de caixa para o Posto Providência. Monorepo com o painel do gerente (web), o app do frentista e o app do dono (PWAs), compartilhando a lógica de domínio.

**Release 4.0.0 — 06/09/2026.** Em uso real: os frentistas fecham o caixa pelo celular todo dia desde 30/08. Ver [Release](#-release-400--06092026).

![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Supabase](https://img.shields.io/badge/Supabase-3EC988?style=for-the-badge&logo=supabase&logoColor=white)
![Bun](https://img.shields.io/badge/Bun-000000?style=for-the-badge&logo=bun&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)

## 🏗️ Estrutura do monorepo

```
frontend/apps/web              Painel do gerente/dono (React 19 + Vite)
frontend/apps/pwa-frentista    PWA onde o frentista envia o fechamento de caixa e a régua dos tanques
frontend/apps/pwa-dono         PWA do dono: encerrante dos bicos por foto (OCR) e avisos de fechamento
frontend/packages/types        Tipos compartilhados (incluindo os gerados pelo Supabase)
frontend/packages/utils        Lógica de domínio pura e compartilhada (fechamento, lucro, custo, estoque)
frontend/packages/api-core     Cliente Supabase e acesso a dados desacoplado (consolidação do dia)
supabase/             Migrations versionadas e Edge Functions (`ler-encerrante`, `notifica-dono`)
scripts/              ETL da planilha, carga histórica, `reconsolidar-dia`, `aplica-migration`
```

Cálculo de domínio (fechamento de caixa, lucro, custo, encerrantes, estoque) mora em `frontend/packages/utils` — é compartilhado entre os três apps e coberto por **golden master contra a planilha real do posto** (3.296 asserções em 06/09/2026). A planilha é a fonte de verdade: em conflito, ela decide.

## 📊 Funcionalidades

- **Fechamento de caixa pelo celular:** cada frentista envia o próprio caixa (dinheiro, moedas, PIX, débito, crédito, nota, baratão) pelo PWA; o painel consolida o dia contra o encerrante dos bicos. `diferença = concentrador − conferido`: positivo é **falta**, negativo é **sobra**. Dia sem encerrante completo fica **"não apurado"** — nunca um zero que pareça caixa batido.
- **Encerrante por foto:** o dono fotografa o relatório dos 6 bicos e o OCR (Gemini Vision, Edge Function com limite de taxa e JWT) lê as seis leituras de uma vez. Também dá para digitar no painel, que apura o dia na hora.
- **Visão do Proprietário e Planilha do Mês:** a reprodução da planilha que o dono já usava — venda por produto, compra e custo médio do mês, despesa rateada por litro, lucro por produto, estoque teórico × régua e perda, impacto das trocas de preço.
- **Custo de uma fonte só:** custo do litro = **compra do mesmo mês**, por produto (modelo da planilha). Todas as telas de lucro usam a mesma porta; produto sem compra no mês aparece como "sem custo", nunca como lucro inflado.
- **Análise de Custos:** simulador — margem desejada → preço sugerido e lucro estimado por produto.
- **Relatório Diário, Dashboard e Dashboard de Vendas:** o dia e o mês em números, todos com a mesma conta.
- **Despesas, compras, estoque e tanques:** despesa real do mês (toda despesa entra no rateio), compras por nota, régua dos tanques pelo PWA do frentista, estoque teórico e perda.
- **Frentistas, clientes e fiado:** cadastro, presença ("quem está com o app aberto"), fiado com histórico.
- **Avisos ao dono:** notificação push quando um frentista fecha o caixa.

## 🛠️ Stack

- **Frontend:** React 19, TypeScript, Vite.
- **Estilização:** Tailwind CSS.
- **Gráficos:** Recharts.
- **Backend:** Supabase (PostgreSQL, Auth, RLS em todas as tabelas, Edge Functions em Deno).
- **Toolchain:** Bun (workspaces + Turborepo) — não usar npm/yarn/pnpm.
- **Testes:** Vitest (unitário/componente) e `bun:test` + `bun:sqlite` (golden master contra a planilha).
- **Deploy:** Vercel (três projetos: painel, PWA do frentista, PWA do dono).

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

Edge Functions vão pela CLI (`supabase functions deploy <nome> --project-ref <ref>`; o `verify_jwt` vem de `supabase/config.toml`). Migration em produção: `bun scripts/aplica-migration.ts supabase/migrations/<arquivo>.sql`.

## 🚀 Release 4.0.0 — 06/09/2026

Fecha a fase de auditoria e saneamento (PRs #80–#90). O que esta versão garante, com a prova ao lado:

| Garantia | Prova |
|---|---|
| Fórmula de fechamento e de lucro iguais às da planilha | golden master: **3.296** asserções contra a planilha real; janeiro fecha ao centavo (`lucro = venda − custo − despesas`) |
| Um custo só, em todas as telas | `frontend/packages/utils` + `services/custo-do-mes.ts`; julho dá o mesmo lucro na Visão do Proprietário e na Análise de Vendas |
| Dia não apurado nunca parece dia batido | `Fechamento.diferenca` nula até os 6 bicos serem lidos; tela mostra "não apurado" |
| Uso real | 4 frentistas enviando o caixa pelo PWA todo dia desde 30/08/2026 |
| Suíte | **446** testes Vitest · **3.296** golden · `tsc` limpo |
| Banco | RLS em todas as tabelas; OCR (`ler-encerrante` v11) só com JWT e com limite de taxa |

**O que esta release não é:** o sistema ainda depende de o dono mandar o encerrante todo dia — sem ele, o dia fica "não apurado" (honesto, mas não é o número). O veredito de entrega é medido em uso: duas semanas sem correção manual por falha do sistema. Pendências e decisões em aberto estão no `CHANGELOG.md` e em `.claude/memoria/`.

---

Desenvolvido para a rede **Posto Providência**.
