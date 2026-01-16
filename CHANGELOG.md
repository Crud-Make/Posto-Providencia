# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [Não Lançado]

### Adicionado
- **Smart Types Fase 2 (#22)**: Infraestrutura completa de tipagem type-safe
  - Criados 4 arquivos de tipos (498 linhas): `smart-types.ts`, `form-types.ts`, `response-types.ts`, `index.ts`
  - Tipos derivados automaticamente do banco de dados para todas as 35+ entidades
  - Utility types para conversão automática de formulários (number → string)
  - Padrões de resposta de API com type guards (`isSuccess`, `isError`)
  - JSDoc completo em todos os arquivos com exemplos práticos
  - Guia de uso completo (`docs/GUIA-SMART-TYPES.md`) com 15+ exemplos
  - Relatório de refatoração (`docs/RELATORIO-REFATORACAO-SMART-TYPES.md`)
  - PRD-023 documentando planejamento e roadmap
  - Script de validação de regras (`scripts/validate-rules.ps1`)
  - Configuração ESLint (`eslint.config.mjs`)

- **Modo de Lançamento Flexível**: Permite salvar fechamentos diários com diferenças de caixa sem a obrigatoriedade de justificativa, facilitando o lançamento de dados históricos. Cor do alerta alterada para âmbar para indicar modo informativo.

### Alterado
- 🚀 Migração para branch de correção específica seguindo as regras do `.cursorrules`.
- 📝 Atualização do guia de backup e restauração (`docs/BACKUP_E_RESTAURACAO.md`).

### Melhorado
- **Type-Safety (#22)**: Redução de 91% nas ocorrências de `as unknown as` (23 → 2)
- **Infraestrutura de Tipos**: +896% de linhas de código de tipos (50 → 498)
- **Documentação**: JSDoc completo em 100% dos arquivos de tipos
- **Padrões de Código**: Estabelecidos padrões consistentes para todos os 32 services

### Corrigido
- ✨ Restauração completa de ambiente após formatação (arquivos `.env` e `.env.local`).
- 🛠️ Correção de política de segurança (INSERT) para frentistas na branch `fix/frentista-insert-policy`.
- 🔍 Depuração de erro 401 na criação de frentistas (ajuste de autenticação pós-restauração).
- **Perda de dados ao trocar aba do navegador**: Desativado polling agressivo e adicionada proteção para preservar dados digitados.
- **Cálculo incorreto de encerrantes**: Função `formatOnBlur` agora aceita qualquer formato numérico e assume últimos 3 dígitos como decimais.
- **Precisão Decimal e Máscara Monetária**: Implementada máscara estilo calculadora no detalhamento por frentista para permitir edição precisa de valores do mobile e correção de arredondamentos durante a digitação.
- **Correção de Permissão (RLS)**: Corrigido erro 403 ao tentar cadastrar novos frentistas através da criação de política de INSERT no Supabase.
- **Correção Crítica (RLS/Auth)**: Reescreve função `user_has_posto_access` para usar email em vez de ID (erro 22P02) e remove campo `turno_id` inválido do cadastro.
- **Erro de integridade ao re-salvar fechamento**: Adicionada desvinculação robusta de notificações para evitar violação de chave estrangeira em `FechamentoFrentista`.
- **Automatização de Leituras Iniciais**: Reativado o carregamento automático do último encerrante conhecido como leitura inicial para facilitar o lançamento histórico.
- **Correção de Persistência entre Datas**: Corrigido bug onde dados digitados em uma data "grudavam" ao mudar o calendário.

## [1.0.0] - 2026-01-04

### Adicionado
- Sistema de fechamento diário de caixa
- Dashboard de vendas
- Gestão de frentistas
- Integração com app mobile para leituras

---

## Como Usar Este Arquivo

### Quando corrigir um bug:
1. Adicione uma linha em `### Corrigido` na seção `[Não Lançado]`
2. Inclua o hash do commit entre parênteses
3. Faça commit do CHANGELOG junto com a correção

### Quando fizer deploy/release:
1. Mova os itens de `[Não Lançado]` para uma nova seção com a versão
2. Crie uma tag Git: `git tag -a v1.0.1 -m "Release 1.0.1"`
3. Push da tag: `git push origin v1.0.1`
