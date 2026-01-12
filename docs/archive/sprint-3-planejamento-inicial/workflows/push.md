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
- ✅ Todas as mudanças commitadas na branch de feature

### 📋 Passos de Execução

#### 1️⃣ Validação Inicial
```bash
git status
npm run build
```

#### 2️⃣ Merge e Push
```bash
# Salvar branch atual
FEATURE_BRANCH=$(git branch --show-current)

# Merge na main
git checkout main
git merge $FEATURE_BRANCH --no-ff -m "merge: $FEATURE_BRANCH (estável)"
git push origin main
```

#### 3️⃣ 🏆 MARCO DE VERSÃO ESTÁVEL (OBRIGATÓRIO)
Após o merge com sucesso, crie o ponto de restauração:

```bash
# Padronização sugerida pelo usuário:
git branch "versao-testada-funcionando-$(date +%d-%m-%Y)"
```

#### 4️⃣ Limpeza
```bash
git branch -d $FEATURE_BRANCH
```

---

## 📝 Notas Importantes
- O nome deve ser **sempre** prefixado com `versao-testada-funcionando-`.
- Isso garante o "Sufoco Zero" em caso de bugs futuros.
