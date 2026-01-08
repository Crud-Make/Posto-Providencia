---
description: Validação, Merge e Deploy automático para o Posto Providência (Uso: /push)
---

// turbo-all

Este workflow garante que todas as regras do Posto Providência sejam seguidas antes de enviar qualquer código para produção.

## 🚀 Workflow de Push (Merge + Deploy)

### ⚠️ PRÉ-REQUISITOS OBRIGATÓRIOS

Antes de executar `/push`, CONFIRME que:

- ✅ Código testado localmente em `http://localhost:3015`
- ✅ Usuário testou e deu **OK EXPLÍCITO**
- ✅ 0 erros de TypeScript (`npm run build`)
- ✅ Código funcionando conforme esperado
- ✅ Todas as mudanças commitadas na branch de feature
- ✅ Branch atual NÃO é `main` ou `master`

### 📋 Passos de Execução

#### 1️⃣ Verificar Branch Atual e Status

```bash
# Ver em qual branch você está
git branch

# Ver status (deve estar limpo ou com mudanças não commitadas)
git status

# Ver últimos commits
git log --oneline -5
```

**Resultado esperado:** Você está em uma branch de feature/fix/refactor (não main/master)

---

#### 2️⃣ Garantir que Todas as Mudanças Estão Commitadas

```bash
# Ver mudanças não commitadas
git status

# Se houver mudanças, adicionar e commitar
git add .
git commit -m "tipo: descrição clara da mudança final"
```

**Resultado esperado:** `git status` retorna "working tree clean"

---

#### 3️⃣ Executar Build e Validação

```bash
# Rodar build para verificar erros de TypeScript
npm run build
```

**Resultado esperado:** Build bem-sucedido sem erros

---

#### 4️⃣ Solicitar Aprovação do Usuário

**PERGUNTAR AO USUÁRIO:**

> "Você testou em `http://localhost:3015` e tudo está funcionando corretamente?
>
> **Digite 'OK' para fazer merge e deploy, ou 'CANCELAR' para abortar.**"

---

#### 5️⃣ Fazer Merge e Deploy

```bash
# Salvar nome do branch atual
FEATURE_BRANCH=$(git branch --show-current)

# Ir para branch principal
git checkout main

# Fazer merge
git merge $FEATURE_BRANCH --no-ff -m "merge: finalizar $FEATURE_BRANCH"

# Push para produção
git push origin main
```

---

#### 6️⃣ PADRONIZAÇÃO DE VERSÃO (REGRA DE OURO)

Conforme a nova regra de "Sufoco Zero", SEMPRE crie um ponto de restauração estável:

```bash
# Criar branch de backup estável
git branch versao-testada-funcionando-$(date +%d-%m-%Y)-[nome-breve]

# Exemplo: versao-testada-funcionando-04-01-2026-limpeza-rls
```

---

#### 7️⃣ Limpeza

```bash
# Deletar branch de feature
git branch -d $FEATURE_BRANCH
```

---

## 🎯 Checklist Final

- [ ] Testado em `localhost:3015`
- [ ] Usuário deu OK
- [ ] `npm run build` passou
- [ ] Merge realizado na main
- [ ] **Criado Marco `versao-testada-funcionando-xxx`** ✅
- [ ] Branch de feature deletada
