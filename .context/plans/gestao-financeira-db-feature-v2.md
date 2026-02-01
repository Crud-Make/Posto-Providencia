# Gestão Financeira Consolidada - Backend e Banco de Dados

## 🎯 1. Objetivo e Escopo

Implementar a estrutura de backend e banco de Dados necessária para suportar a Gestão Financeira Completa. Até o momento, o sistema foca em Despesas. Esta feature introduz Receitas Extras (não operacionais) e uma gestão dinâmica de categorias para ambos.

### Escopo
- **Database**: Criação de tabelas `Receita` e `CategoriaFinanceira`.
- **Backend**: Implementação de serviços de API e tipos no Monorepo.
- **Integração**: Atualização do hook `useFinanceiro` para consolidar todos os fluxos.

---

## 🏗️ 2. Fases de Implementação

### Fase 1: Migração de Banco de Dados
**Objetivo**: Estabelecer a persistência para receitas e categorias dinâmicas.
**Responsável**: `database-specialist`

**Passos**:
1. Criar tabela `CategoriaFinanceira`:
   - Colunas: `id`, `nome`, `tipo` (receita/despesa), `icone`, `cor`, `posto_id`.
2. Criar tabela `Receita`:
   - Colunas: `id`, `descricao`, `valor`, `data`, `categoria_id`, `posto_id`, `status`, `observacoes`.
3. Migrar dados de `Despesa.categoria` (atual enum/string) para a nova tabela de categorias.
4. Aplicar políticas de RLS para acesso multi-posto.

**Checkpoint**: `git commit -m "feat(db): migração para receitas e categorias financeiras"`

---

### Fase 2: Tipos e Serviços (Monorepo)
**Objetivo**: Padronizar as interfaces e contratos de API entre Web e Mobile.
**Responsável**: `backend-specialist`

**Passos**:
1. Atualizar definitions no Monorepo.
2. Criar `receita.service.ts` em `apps/web/src/services/api/`.
3. Criar `categoria.service.ts` em `apps/web/src/services/api/`.
4. Exportar novos serviços através do barrel `apps/web/src/services/api/index.ts`.

**Checkpoint**: `git commit -m "feat(api): serviços e tipos para gestão financeira"`

---

### Fase 3: Integração e Lógica de Negócio
**Objetivo**: Integrar os novos dados no Dashboard de Gestão Financeira.
**Responsável**: `feature-developer`

**Passos**:
1. Atualizar o hook `useFinanceiro.ts` para buscar `Receitas` além de `Fechamentos` e `Despesas`.
2. Criar hook `useCategorias.ts` para busca facilitada de categorias.
3. Atualizar o componente `ResumoFinanceiro` para exibir receitas totais consolidadas.
4. Adicionar botão e modal para "Nova Receita" (similar ao de Despesas).

**Checkpoint**: `git commit -m "feat(web): integração de receitas no dashboard financeiro"`

---

### Fase 4: Validação e Documentação
**Objetivo**: Garantir integridade dos cálculos e documentar o novo fluxo.
**Responsável**: `test-writer` / `documentation-writer`

**Passos**:
1. Validar cálculos de Lucro Líquido.
2. Verificar se os filtros de período aplicam-se corretamente.
3. Atualizar PRDs relacionados.

**Checkpoint**: `git commit -m "docs: documentação da feature de gestão financeira completa"`

---

## 🔍 3. Critérios de Aceite

- [x] Tabelas `Receita` e `CategoriaFinanceira` criadas no Supabase com RLS.
- [x] CRUD completo de Receitas funcionando no frontend.
- [x] Dashboard reflete o lucro real considerando receitas extras.
- [x] Build do monorepo (`bun run build`) sem erros.
