---
description: Validação, Merge e Deploy automático para o Posto Providência (Uso: /push)
---

// turbo-all

Este workflow garante que todas as regras do Posto Providência sejam seguidas antes de enviar qualquer código para produção.

### Passos de Execução:

1. **Garantir que as mudanças estão commitadas na branch de feature.**
```bash
git add .
git commit -m "chore: salvando alterações antes da entrega"
```

2. **Executar a entrega automatizada via script.**
```bash
npm run push
```

3. **Verificar status final.**
```bash
git status
git log -1
```
