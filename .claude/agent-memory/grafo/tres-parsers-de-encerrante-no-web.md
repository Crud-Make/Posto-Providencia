---
name: tres-parsers-de-encerrante-no-web
description: O frontend/apps/web tem 3 parsers diferentes para a MESMA string de encerrante; um deles (useLeiturasDiarias) usa replace('.','') sem /g e divide por 1000 os bicos acima de 1 milhão
metadata:
  type: project
---

O `frontend/apps/web` converte a string de encerrante (`leituras[bicoId].inicial` /
`.fechamento`, tipo `Leitura` de `fechamento-diario/hooks/useLeituras.ts`) para
número por **três caminhos diferentes**, e um deles está errado.

A string **sempre** chega com ponto de milhar: no carregamento por
`formatarParaBR` (`toLocaleString('pt-BR')`) e na digitação/blur por
`formatarEntradaEncerrante` / `formatarAoSair`, que inserem `.` com regex `/g`.
Não existe caminho em que o campo fique sem milhar.

Os três parsers:
- `useLeituras.ts` → `replace(/\./g,'')` — correto (é o que a tela **mostra**)
- `utils/formatters.ts` → `analisarValor`/`parseValue` — correto para o formato BR
- `leituras-diarias/hooks/useLeiturasDiarias.ts` → `replace('.','')` **sem `/g`** — errado

**Por que só às vezes:** o `replace` sem `/g` só quebra com 2+ pontos, ou seja
encerrante ≥ 1.000.000. No `posto_jorro_2026.sqlite` isso é o **bico 01 (G.C.)**
e só ele. Um bug que some se você testar no bico errado.

**Efeito:** a tela exibe os litros certos (parser certo) e grava os errados
(parser errado), sem erro nenhum — o filtro `final > inicial` passa porque os
dois lados escalam junto.

**Como reconferir (não confie em contagem daqui):**
```bash
rg -n "replace\('\.', *''\)" apps packages --include=*.ts --include=*.tsx
python3 -c "import sqlite3;c=sqlite3.connect('docs/data/posto_jorro_2026.sqlite');print(*c.execute('select bico,sum(inicial>=1000000),count(*) from encerrante_diario group by bico'),sep=chr(10))"
```

Datado 16/08/2026. Relacionado: [[duas-nocoes-de-encerrante]],
[[preco-por-litro-duas-fontes]].
