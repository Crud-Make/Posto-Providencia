---
name: grafo-mentiu-affected-parcial
description: Formas de consulta ao graphify que funcionaram e as que não resolveram nó no backend PHP — com o grep que fecha cada uma
metadata:
  type: feedback
---

Conferido em **20/09/2026** no `graphify-out/` gerado no mesmo dia.

O que funcionou e o que não:

- `graphify affected "useSubmissaoFechamento()"` devolveu 4 nós, e o grep
  **confirmou**: em produção o único consumidor é
  `apps/web/src/components/fechamento-diario/index.tsx`. Os outros ~10 hits do
  grep são **menções em comentário**, não import — filtrar por `import` ou por
  `\.ts:\d+:.*from` antes de contar.
- `graphify affected "FechamentoDoDia"` respondeu `No unique node match`.
  Classe PHP resolve melhor por `graphify explain "<NomeDaClasse>"`, e mesmo
  assim o `explain` só mostra grau 1 dentro do próprio arquivo — ele **não**
  encontrou `routes/api.php` como consumidor do controller.

**Why:** o grafo subestima o backend PHP (rota → controller não vira aresta),
e superestima o frontend quando o nome aparece em comentário. Os dois erram
para lados opostos, então nenhum dos dois lados dispensa o grep.

**How to apply:** para PHP, o que fecha a pergunta "quem usa este módulo" é o
grep de namespace, não o `affected`:

```bash
cd /home/thygas/Projetos/trabalho/Posto-Providencia
rg -Un --no-heading 'App\\<Modulo>\\[A-Za-z\\]*' backend --glob '*.php' -o | sort | uniq -c
```

Para TS, contar só linhas com `import`, nunca o grep cru do identificador.
