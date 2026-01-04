# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [Não Lançado]

### Adicionado
- **Modo de Lançamento Flexível**: Permite salvar fechamentos diários com diferenças de caixa sem a obrigatoriedade de justificativa, facilitando o lançamento de dados históricos. Cor do alerta alterada para âmbar para indicar modo informativo.

### Corrigido
- **Perda de dados ao trocar aba do navegador**: Desativado polling agressivo e adicionada proteção em `loadLeituras` para preservar dados digitados ([#93ac0c4](../../commit/93ac0c4))
- **Cálculo incorreto de encerrantes**: Função `formatOnBlur` agora aceita qualquer formato numérico e assume últimos 3 dígitos como decimais ([#93ac0c4](../../commit/93ac0c4))

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
