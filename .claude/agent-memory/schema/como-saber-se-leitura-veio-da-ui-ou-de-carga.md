---
name: como-saber-se-leitura-veio-da-ui-ou-de-carga
description: O createdAt distingue carga em lote de digitação pela UI — decide se um bug de front chegou ou não ao dado gravado
metadata:
  type: project
---

Para saber se uma linha de `public."Leitura"` foi **digitada na tela** ou veio de **carga em lote**,
conte os `createdAt` distintos. A tela grava um dia por vez (um `createdAt` por dia salvo); carga em
lote grava tudo no mesmo microssegundo.

```sql
SELECT COUNT(*) AS linhas,
       COUNT(DISTINCT "createdAt") AS timestamps_distintos,
       MIN("createdAt") AS gravado_min, MAX("createdAt") AS gravado_max,
       MIN(data) AS data_min, MAX(data) AS data_max
FROM public."Leitura";
```

**Why:** em 16/08/2026 a pergunta era se um bug de parse do painel já tinha corrompido produção.
O `createdAt` respondeu antes de qualquer análise de valor: um único timestamp para um mês inteiro
de datas prova que aquele dado **não passou pelo formulário**, e portanto não passou pelo parser
suspeito. A premissa que circulava — "está tudo sendo reconstruído dia a dia pela UI, então toda
linha é recente e digitada" — não se sustenta sozinha; ela precisa ser conferida por linha.

**How to apply:** antes de julgar dado como contaminado por bug de front-end, prove que ele passou
pelo front-end. `createdAt` único + `data` espalhada por muitos dias = carga por script, o bug de
tela não alcança. Vale ao contrário também: dado limpo por ter vindo de carga **não** absolve o bug —
ele segue armado para a primeira digitação real. Combine com [[leitura-sem-trava-de-magnitude]].
