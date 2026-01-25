# 🛠️ INSTRUÇÕES PARA O AGENTE: Migração Monorepo

> **Olá, Engenheiro!** Você foi designado para transformar este projeto em um Monorepo de alta performance e salvar o App Mobile da dívida técnica. Siga este roteiro com precisão.

---

## 🏗️ FASE 1: Preparação do Terreno (Workspaces)

### 1. Reorganização Física
Mova as pastas atuais para a nova estrutura:
*   Mova o conteúdo de `src/` para `apps/web/src/`.
*   Mova `posto-mobile/` para `apps/mobile/`.
*   Ajuste os arquivos de configuração (`vite.config.ts`, `tsconfig.json`) para as novas localizações.

### 2. Configuração do Bun
No `package.json` da RAIZ do projeto, adicione:
```json
{
  "name": "posto-providencia-monorepo",
  "workspaces": [
    "apps/*",
    "packages/*"
  ]
}
```
Execute `bun install` para linkar os espaços de trabalho.

---

## 📦 FASE 2: Pacotes Compartilhados

### 1. Pacote `@posto/types`
1.  Crie `packages/types/package.json`.
2.  Mova os tipos do dashboard para cá.
3.  **IMPORTANTE**: Certifique-se de que `Fechamento.usuario_id` seja `number`.
4.  Exporte tudo via `index.ts`.

### 2. Pacote `@posto/utils`
1.  Extraia funções como `formatCurrency`, `formatDateDB`, `parseCurrency` para este pacote.
2.  Garanta que ambos os apps usem EXATAMENTE a mesma lógica de arredondamento financeiro.

---

## 📱 FASE 3: O Resgate do Mobile

Esta é a parte mais crítica. A aplicação mobile está sofrendo com arquivos gigantes.

### 1. Modularização da API
Substitua o `lib/api.ts` gigante por serviços modulares:
*   `services/auth.service.ts`
*   `services/fechamento.service.ts`
*   `services/frentista.service.ts`
Estes novos serviços devem usar o padrão `ApiResponse` que já usamos no Web.

### 2. Refatoração da `RegistroScreen` (registro.tsx)
Alvo: Reduzir de 1100 linhas para < 200 linhas.
*   **Ação**: Crie o hook `hooks/useRegistroFechamento.ts` para gerenciar todos os estados (`valorEncerrante`, `totalPagamentos`, etc) e as validações.
*   **Sub-componentes**: Crie a pasta `components/registro/` e extraia:
    *   `EncerranteCard.tsx`
    *   `PagamentosGrid.tsx`
    *   `NotasList.tsx`

---

## 🧪 FASE 4: Validação e Qualidade

1.  **TypeScript**: O erro `Maximum call stack` DEVE desaparecer. Se persistir, verifique se não há importações circulares entre pacotes.
2.  **Cross-Check**: Verifique se salvar um registro no mobile aparece corretamente no dashboard web em tempo real.
3.  **JSDoc**: Documente cada novo mídulo em Português.

---

## 🚦 Quando Parar?
Você terá concluído quando:
*   [ ] `bun run build` na raiz compilar tudo sem erros.
*   [ ] O mobile não tiver nenhum `as any` ou `any` nos serviços de fechamento.
*   [ ] A pasta `packages/types` for a única fonte da verdade para o banco de dados.

**Mãos à obra! O sucesso do faturamente do posto depende da precisão dos seus tipos.**
