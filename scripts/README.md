# 🛠️ Scripts de Validação - Posto Providência

Este diretório contém scripts para validar e garantir conformidade com as regras do projeto definidas em `.cursorrules`.

## 📋 Scripts Disponíveis

### `validate-rules.sh`

Script de validação completa que verifica:

- ✅ **Branch atual** - Garante que não está trabalhando diretamente na `main`
- ✅ **Padrão de branches** - Valida nomenclatura (feature/, fix/, etc.)
- ✅ **Conventional Commits** - Verifica se commits seguem o padrão semântico
- ✅ **Arquivos pendentes** - Alerta sobre arquivos modificados não commitados
- ✅ **Documentação JSDoc** - Verifica se arquivos TS/TSX têm documentação

#### Como usar:

```bash
# Executar validação
./scripts/validate-rules.sh

# Ou adicionar ao seu workflow:
npm run validate
```

#### Códigos de saída:

- `0` - Tudo OK ou apenas avisos
- `1` - Erros encontrados (bloqueante)

---

## 🔧 Integração Recomendada

### 1. Adicionar ao package.json

```json
{
  "scripts": {
    "validate": "./scripts/validate-rules.sh",
    "pre-commit": "./scripts/validate-rules.sh"
  }
}
```

### 2. Git Hook (opcional)

Para validar automaticamente antes de cada commit:

```bash
# Criar hook pre-commit
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
./scripts/validate-rules.sh
EOF

chmod +x .git/hooks/pre-commit
```

### 3. CI/CD (GitHub Actions)

```yaml
# .github/workflows/validate.yml
name: Validate Rules
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Validate project rules
        run: ./scripts/validate-rules.sh
```

---

## 📚 Boas Práticas

1. **Execute antes de commitar**: `npm run validate`
2. **Corrija erros imediatamente**: Não acumule violações
3. **Leia as mensagens**: Os scripts explicam o que está errado
4. **Mantenha commits pequenos**: Facilita validação e review

---

## 🆘 Problemas Comuns

### "Você está na branch main!"

**Solução:**
```bash
git checkout -b feature/minha-feature
```

### "Commit não segue Conventional Commits"

**Solução:** Use prefixos corretos:
- `feat:` - Nova funcionalidade
- `fix:` - Correção de bug
- `docs:` - Documentação
- `refactor:` - Refatoração
- `style:` - Formatação
- `chore:` - Tarefas de manutenção

### "Arquivo sem JSDoc"

**Solução:** Adicione documentação:
```typescript
/**
 * Descrição da função
 * @param param1 - Descrição do parâmetro
 * @returns Descrição do retorno
 */
function minhaFuncao(param1: string): void {
  // código
}
```

---

## 🔄 Atualizações

Este script é atualizado conforme novas regras são adicionadas ao `.cursorrules`.

Última atualização: 2026-01-04
