# 📋 PRD - Stack Técnica do Projeto Posto Manager

## 📌 Informações do Documento

| Campo | Valor |
|-------|-------|
| **Projeto** | Posto Manager - Sistema de Gestão |
| **Versão** | 1.0 |
| **Data** | 11 de Dezembro de 2025 |
| **Tipo** | Documentação Técnica |

---

## 🎯 Visão Geral da Stack

### Arquitetura Escolhida: **Full-Stack TypeScript**

```
┌─────────────────────────────────────────────────────┐
│                   USUÁRIOS                          │
├─────────────────┬───────────────────────────────────┤
│   WEB BROWSER   │        MOBILE APP                 │
│   (Desktop)     │     (iOS + Android)               │
└────────┬────────┴──────────┬────────────────────────┘
         │                   │
         ▼                   ▼
┌─────────────────────────────────────────────────────┐
│              FRONTEND LAYER                         │
├─────────────────┬───────────────────────────────────┤
│   Next.js 14+   │    React Native (Expo)            │
│   TypeScript    │    TypeScript                     │
│   React 18      │    React 18                       │
└────────┬────────┴──────────┬────────────────────────┘
         │                   │
         └─────────┬─────────┘
                   ▼
         ┌─────────────────────┐
         │   SHARED PACKAGES   │
         │   (Monorepo)        │
         │  - Types            │
         │  - Validations      │
         │  - Utils            │
         │  - API Client       │
         └──────────┬──────────┘
                    │
                    ▼
         ┌─────────────────────┐
         │   BACKEND LAYER     │
         │   Next.js API       │
         │   Routes            │
         └──────────┬──────────┘
                    │
                    ▼
         ┌─────────────────────┐
         │   DATABASE LAYER    │
         │   PostgreSQL        │
         │   (Supabase)        │
         └─────────────────────┘
```

---

## 🏗️ Stack Completa Detalhada

### 1. Frontend Web

```json
{
  "framework": "Next.js 14.2+",
  "version": "App Router (não Pages Router)",
  "language": "TypeScript 5.3+",
  "react": "React 18.3+",
  "styling": {
    "framework": "TailwindCSS 3.4+",
    "components": "shadcn/ui",
    "icons": "Lucide React"
  },
  "forms": {
    "library": "React Hook Form 7.5+",
    "validation": "Zod 3.22+"
  },
  "state": {
    "server": "React Query (TanStack Query) 5.0+",
    "client": "Zustand 4.5+ (quando necessário)"
  },
  "charts": "Recharts 2.10+",
  "tables": "TanStack Table 8.0+",
  "dates": "date-fns 3.0+"
}
```

**Justificativa:**
- **Next.js 14+**: Server Components, streaming, melhor performance
- **shadcn/ui**: Componentes copiáveis, customizáveis, acessíveis
- **React Hook Form + Zod**: Type-safe forms com validação compartilhada
- **React Query**: Cache automático, refetch, otimistic updates

---

### 2. Frontend Mobile

```json
{
  "framework": "React Native",
  "tooling": "Expo SDK 50+",
  "router": "Expo Router 3.0+",
  "language": "TypeScript 5.3+",
  "styling": {
    "framework": "NativeWind 4.0+ (Tailwind for RN)",
    "components": "React Native Paper (opcional)"
  },
  "forms": "React Hook Form + Zod (mesmo do web)",
  "state": "React Query + Zustand (mesmo do web)",
  "navigation": "Expo Router (file-based)",
  "storage": "Expo SecureStore",
  "camera": "Expo Camera",
  "offline": "React Query Persist"
}
```

**Justificativa:**
- **Expo**: Simplifica build, updates OTA, acesso a APIs nativas
- **Expo Router**: Navegação file-based (igual Next.js)
- **NativeWind**: Usa mesmas classes Tailwind do web
- **Código compartilhado**: 70-80% com o web

---

### 3. Backend

```json
{
  "runtime": "Next.js API Routes",
  "language": "TypeScript 5.3+",
  "orm": "Prisma 5.8+",
  "validation": "Zod 3.22+",
  "auth": "NextAuth.js 5.0+ (Auth.js)",
  "api_pattern": "REST (com possibilidade de tRPC futuro)",
  "middleware": {
    "cors": "Built-in Next.js",
    "rate_limit": "@upstash/ratelimit",
    "logging": "Pino"
  }
}
```

**Justificativa:**
- **API Routes**: Integrado ao Next.js, deploy unificado
- **Prisma**: Type-safe ORM, migrations automáticas
- **NextAuth**: Auth completo (email, OAuth, JWT)
- **Zod**: Validação compartilhada com frontend

---

### 4. Banco de Dados

```json
{
  "database": "PostgreSQL 15+",
  "hosting": "Supabase",
  "orm": "Prisma",
  "migrations": "Prisma Migrate",
  "backup": "Automático (Supabase)",
  "features": {
    "row_level_security": true,
    "realtime": true,
    "storage": true,
    "auth": true
  }
}
```

**Justificativa:**
- **PostgreSQL**: Robusto, relacional, suporta JSON
- **Supabase**: Hospedagem gerenciada, backups, escalável
- **Prisma**: Type-safety end-to-end, migrations versionadas

---

### 5. Infraestrutura e Deploy

```json
{
  "web_hosting": "Vercel",
  "database": "Supabase",
  "storage": "Vercel Blob Storage",
  "mobile_builds": "EAS (Expo Application Services)",
  "ci_cd": "GitHub Actions",
  "monitoring": {
    "errors": "Sentry",
    "analytics": "Vercel Analytics",
    "performance": "Vercel Speed Insights"
  },
  "domains": "Vercel Domains"
}
```

**Justificativa:**
- **Vercel**: Deploy automático, edge functions, CDN global
- **EAS**: Builds iOS/Android na nuvem
- **GitHub Actions**: CI/CD gratuito

---

### 6. Desenvolvimento

```json
{
  "package_manager": "pnpm 8.0+",
  "monorepo": "Turborepo 1.12+",
  "linting": {
    "eslint": "ESLint 8.0+",
    "config": "@vercel/style-guide"
  },
  "formatting": "Prettier 3.0+",
  "git_hooks": "Husky + lint-staged",
  "testing": {
    "unit": "Vitest",
    "e2e": "Playwright",
    "component": "Testing Library"
  },
  "vscode_extensions": [
    "Prisma",
    "ESLint",
    "Prettier",
    "Tailwind CSS IntelliSense"
  ]
}
```

---

## 📁 Estrutura do Projeto (Monorepo)

```
posto-manager/
├── apps/
│   ├── web/                          # Next.js Web App
│   │   ├── app/
│   │   │   ├── (auth)/              # Rotas de autenticação
│   │   │   │   ├── login/
│   │   │   │   └── layout.tsx
│   │   │   ├── (dashboard)/         # Rotas do dashboard
│   │   │   │   ├── vendas/
│   │   │   │   ├── estoque/
│   │   │   │   ├── caixa/
│   │   │   │   ├── financeiro/
│   │   │   │   └── layout.tsx
│   │   │   ├── api/                 # API Routes (Backend)
│   │   │   │   ├── auth/
│   │   │   │   │   └── [...nextauth]/
│   │   │   │   ├── leituras/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── estoque/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── fechamento/
│   │   │   │   │   └── route.ts
│   │   │   │   └── compras/
│   │   │   │       └── route.ts
│   │   │   ├── layout.tsx
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── ui/                  # shadcn/ui components
│   │   │   └── features/            # Feature components
│   │   │       ├── vendas/
│   │   │       ├── estoque/
│   │   │       └── caixa/
│   │   ├── lib/
│   │   │   ├── auth.ts              # NextAuth config
│   │   │   ├── db.ts                # Prisma client
│   │   │   └── utils.ts
│   │   ├── public/
│   │   ├── prisma/
│   │   │   ├── schema.prisma        # Database schema
│   │   │   └── migrations/
│   │   ├── .env.local
│   │   ├── next.config.js
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── mobile/                       # React Native App
│       ├── app/                      # Expo Router
│       │   ├── (auth)/
│       │   │   └── login.tsx
│       │   ├── (tabs)/              # Bottom tabs
│       │   │   ├── vendas.tsx
│       │   │   ├── estoque.tsx
│       │   │   └── _layout.tsx
│       │   ├── _layout.tsx
│       │   └── index.tsx
│       ├── components/
│       ├── assets/
│       ├── app.json
│       ├── eas.json
│       └── package.json
│
├── packages/
│   ├── shared/                       # Código compartilhado
│   │   ├── src/
│   │   │   ├── types/               # TypeScript types
│   │   │   │   ├── index.ts
│   │   │   │   ├── leitura.ts
│   │   │   │   ├── estoque.ts
│   │   │   │   └── fechamento.ts
│   │   │   ├── validations/         # Zod schemas
│   │   │   │   ├── index.ts
│   │   │   │   ├── leitura.ts
│   │   │   │   └── estoque.ts
│   │   │   ├── api/                 # API client
│   │   │   │   ├── client.ts
│   │   │   │   ├── leituras.ts
│   │   │   │   └── estoque.ts
│   │   │   ├── utils/               # Utilities
│   │   │   │   ├── calculations.ts
│   │   │   │   ├── formatters.ts
│   │   │   │   └── validators.ts
│   │   │   └── constants/
│   │   │       └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── ui/                           # Componentes UI (opcional)
│       ├── src/
│       │   └── primitives/
│       └── package.json
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── .husky/
├── .vscode/
│   └── settings.json
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

---

## 🔧 Configuração Inicial

### 1. Criar Projeto

```bash
# Criar monorepo com Turborepo
npx create-turbo@latest posto-manager

# Ou criar Next.js standalone
npx create-next-app@latest posto-manager --typescript --tailwind --app

# Instalar dependências principais
pnpm add prisma @prisma/client
pnpm add zod react-hook-form @hookform/resolvers
pnpm add @tanstack/react-query
pnpm add next-auth
pnpm add date-fns
```

### 2. Configurar Supabase

```bash
# Criar projeto no Supabase
# 1. Acessar supabase.com
# 2. Criar novo projeto
# 3. Copiar connection string

# Configurar Prisma
npx prisma init

# .env
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"
DIRECT_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"
```

### 3. Schema do Prisma

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model Usuario {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  nome      String
  senha     String
  role      Role     @default(OPERADOR)
  ativo     Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  leituras     Leitura[]
  fechamentos  Fechamento[]
}

enum Role {
  ADMIN
  GERENTE
  OPERADOR
  FRENTISTA
}

model Combustivel {
  id     Int     @id @default(autoincrement())
  nome   String
  codigo String  @unique
  cor    String?
  ativo  Boolean @default(true)

  bicos    Bico[]
  estoque  Estoque?
  compras  Compra[]
  leituras Leitura[]
}

model Bomba {
  id        Int     @id @default(autoincrement())
  nome      String
  localizacao String?
  ativo     Boolean @default(true)

  bicos Bico[]
}

model Bico {
  id            Int     @id @default(autoincrement())
  numero        Int
  bomba_id      Int
  combustivel_id Int
  ativo         Boolean @default(true)

  bomba       Bomba       @relation(fields: [bomba_id], references: [id])
  combustivel Combustivel @relation(fields: [combustivel_id], references: [id])
  leituras    Leitura[]

  @@unique([bomba_id, numero])
}

model Leitura {
  id               Int      @id @default(autoincrement())
  data             DateTime
  bico_id          Int
  combustivel_id   Int
  leitura_inicial  Decimal  @db.Decimal(15, 3)
  leitura_final    Decimal  @db.Decimal(15, 3)
  litros_vendidos  Decimal  @db.Decimal(15, 3)
  preco_litro      Decimal  @db.Decimal(10, 2)
  valor_total      Decimal  @db.Decimal(15, 2)
  usuario_id       Int
  createdAt        DateTime @default(now())

  bico        Bico        @relation(fields: [bico_id], references: [id])
  combustivel Combustivel @relation(fields: [combustivel_id], references: [id])
  usuario     Usuario     @relation(fields: [usuario_id], references: [id])

  @@index([data])
  @@index([combustivel_id])
}

model Estoque {
  id                Int      @id @default(autoincrement())
  combustivel_id    Int      @unique
  quantidade_atual  Decimal  @db.Decimal(15, 2)
  custo_medio       Decimal  @db.Decimal(10, 4)
  capacidade_tanque Decimal  @db.Decimal(15, 2)
  ultima_atualizacao DateTime @default(now())

  combustivel Combustivel @relation(fields: [combustivel_id], references: [id])
}

model Compra {
  id                Int      @id @default(autoincrement())
  data              DateTime
  combustivel_id    Int
  fornecedor_id     Int
  quantidade_litros Decimal  @db.Decimal(15, 2)
  valor_total       Decimal  @db.Decimal(15, 2)
  custo_por_litro   Decimal  @db.Decimal(10, 4)
  numero_nf         String?
  arquivo_nf        String?
  observacoes       String?
  createdAt         DateTime @default(now())

  combustivel Combustivel @relation(fields: [combustivel_id], references: [id])
  fornecedor  Fornecedor  @relation(fields: [fornecedor_id], references: [id])
}

model Fornecedor {
  id      Int     @id @default(autoincrement())
  nome    String
  cnpj    String  @unique
  contato String?
  ativo   Boolean @default(true)

  compras Compra[]
}

model Fechamento {
  id               Int      @id @default(autoincrement())
  data             DateTime @unique
  total_vendas     Decimal  @db.Decimal(15, 2)
  total_recebido   Decimal  @db.Decimal(15, 2)
  diferenca        Decimal  @db.Decimal(15, 2)
  status           StatusFechamento @default(RASCUNHO)
  observacoes      String?
  usuario_id       Int
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  usuario              Usuario                @relation(fields: [usuario_id], references: [id])
  recebimentos         Recebimento[]
  fechamentos_frentista FechamentoFrentista[]
}

enum StatusFechamento {
  RASCUNHO
  FECHADO
}

model Recebimento {
  id                 Int     @id @default(autoincrement())
  fechamento_id      Int
  forma_pagamento_id Int
  maquininha_id      Int?
  valor              Decimal @db.Decimal(15, 2)

  fechamento      Fechamento      @relation(fields: [fechamento_id], references: [id])
  forma_pagamento FormaPagamento  @relation(fields: [forma_pagamento_id], references: [id])
  maquininha      Maquininha?     @relation(fields: [maquininha_id], references: [id])
}

model FormaPagamento {
  id   Int    @id @default(autoincrement())
  nome String @unique
  tipo String
  ativo Boolean @default(true)

  recebimentos Recebimento[]
}

model Maquininha {
  id        Int     @id @default(autoincrement())
  nome      String
  operadora String?
  taxa      Decimal? @db.Decimal(5, 2)
  ativo     Boolean @default(true)

  recebimentos Recebimento[]
}

model Frentista {
  id             Int      @id @default(autoincrement())
  nome           String
  cpf            String   @unique
  telefone       String?
  data_admissao  DateTime
  ativo          Boolean  @default(true)

  fechamentos FechamentoFrentista[]
}

model FechamentoFrentista {
  id               Int     @id @default(autoincrement())
  fechamento_id    Int
  frentista_id     Int
  valor_cartao     Decimal @db.Decimal(15, 2) @default(0)
  valor_nota       Decimal @db.Decimal(15, 2) @default(0)
  valor_pix        Decimal @db.Decimal(15, 2) @default(0)
  valor_dinheiro   Decimal @db.Decimal(15, 2) @default(0)
  valor_conferido  Decimal @db.Decimal(15, 2) @default(0)
  observacoes      String?

  fechamento Fechamento @relation(fields: [fechamento_id], references: [id])
  frentista  Frentista  @relation(fields: [frentista_id], references: [id])
}
```

### 4. Rodar Migrations

```bash
# Criar migration
npx prisma migrate dev --name init

# Gerar Prisma Client
npx prisma generate

# Abrir Prisma Studio (GUI)
npx prisma studio
```

---

## 🚀 Fluxo de Deploy

### Desenvolvimento Local

```bash
# 1. Instalar dependências
pnpm install

# 2. Configurar .env
cp .env.example .env.local

# 3. Rodar migrations
pnpm db:migrate

# 4. Seed database (opcional)
pnpm db:seed

# 5. Iniciar dev server
pnpm dev

# Acessar:
# Web: http://localhost:3000
# Prisma Studio: http://localhost:5555
```

### Deploy em Produção

```bash
# 1. Push para GitHub
git push origin main

# 2. Vercel detecta e faz deploy automático
# 3. Configurar variáveis de ambiente no Vercel:
#    - DATABASE_URL
#    - DIRECT_URL
#    - NEXTAUTH_SECRET
#    - NEXTAUTH_URL

# 4. Rodar migrations em produção
npx prisma migrate deploy
```

### Mobile (Expo)

```bash
# 1. Build para iOS e Android
eas build --platform all

# 2. Submit para lojas
eas submit --platform ios
eas submit --platform android

# 3. Updates OTA (sem rebuild)
eas update --branch production
```

---

## 📊 Métricas e Monitoramento

### Performance Targets

| Métrica | Target | Ferramenta |
|---------|--------|------------|
| **Time to First Byte** | < 200ms | Vercel Analytics |
| **First Contentful Paint** | < 1.5s | Lighthouse |
| **Largest Contentful Paint** | < 2.5s | Lighthouse |
| **Time to Interactive** | < 3.5s | Lighthouse |
| **API Response Time** | < 500ms | Sentry |
| **Database Query Time** | < 100ms | Prisma Metrics |

### Monitoramento

```typescript
// lib/monitoring.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV
});

// Tracking de performance
export function trackPerformance(name: string, duration: number) {
  Sentry.metrics.distribution(name, duration, {
    unit: 'millisecond'
  });
}
```

---

## 🔐 Segurança

### Checklist de Segurança

- [ ] **HTTPS obrigatório** (Vercel fornece)
- [ ] **Environment variables** nunca no código
- [ ] **API Rate Limiting** (@upstash/ratelimit)
- [ ] **Input Validation** (Zod em todas as APIs)
- [ ] **SQL Injection** (Prisma previne)
- [ ] **XSS Protection** (React escapa automaticamente)
- [ ] **CSRF Protection** (NextAuth fornece)
- [ ] **Row Level Security** (Supabase RLS)
- [ ] **Secrets Rotation** (mensal)
- [ ] **Dependency Updates** (Dependabot)

---

## 📚 Documentação e Recursos

### Links Importantes

| Recurso | URL |
|---------|-----|
| **Next.js Docs** | https://nextjs.org/docs |
| **Prisma Docs** | https://www.prisma.io/docs |
| **Supabase Docs** | https://supabase.com/docs |
| **shadcn/ui** | https://ui.shadcn.com |
| **Expo Docs** | https://docs.expo.dev |
| **React Query** | https://tanstack.com/query |

### Comandos Úteis

```bash
# Desenvolvimento
pnpm dev              # Iniciar dev server
pnpm build            # Build para produção
pnpm start            # Rodar build de produção
pnpm lint             # Rodar ESLint
pnpm format           # Formatar com Prettier

# Database
pnpm db:push          # Push schema sem migration
pnpm db:migrate       # Criar e rodar migration
pnpm db:studio        # Abrir Prisma Studio
pnpm db:seed          # Popular banco com dados

# Testing
pnpm test             # Rodar testes
pnpm test:e2e         # Rodar testes E2E
pnpm test:coverage    # Coverage report

# Mobile
pnpm mobile:ios       # Rodar no iOS
pnpm mobile:android   # Rodar no Android
pnpm mobile:build     # Build com EAS
```

---

## ✅ Próximos Passos

### Fase 1: Setup Inicial (Semana 1)
- [ ] Criar projeto Next.js
- [ ] Configurar Supabase
- [ ] Setup Prisma
- [ ] Rodar primeira migration
- [ ] Configurar autenticação

### Fase 2: MVP (Semanas 2-4)
- [ ] Implementar registro de leituras
- [ ] Implementar fechamento de caixa
- [ ] Implementar dashboard básico
- [ ] Deploy em staging

### Fase 3: Features Avançadas (Semanas 5-8)
- [ ] Gestão de estoque
- [ ] Análise de margem
- [ ] Relatórios
- [ ] App mobile

### Fase 4: Produção (Semana 9+)
- [ ] Testes completos
- [ ] Deploy em produção
- [ ] Monitoramento
- [ ] Feedback e iteração

---

## 📄 Conclusão

Esta stack foi escolhida para:

✅ **Máximo reaproveitamento de código** (TypeScript full-stack)  
✅ **Desenvolvimento rápido** (Next.js + Prisma)  
✅ **Type-safety end-to-end** (TypeScript + Prisma + Zod)  
✅ **Deploy simplificado** (Vercel + Supabase)  
✅ **Escalabilidade** (PostgreSQL + Edge Functions)  
✅ **Custo baixo** (Free tiers generosos)  

**Pronto para começar a implementação!** 🚀

---

**Última atualização**: 11 de Dezembro de 2025
