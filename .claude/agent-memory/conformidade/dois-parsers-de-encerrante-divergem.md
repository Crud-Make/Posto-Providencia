---
name: dois-parsers-de-encerrante-divergem
description: 8ª forma do resíduo — o mesmo campo de encerrante é lido por DOIS parsers que discordam por fator 1000 quando a string não tem vírgula; a tela usa um, a gravação usa o outro
metadata:
  type: project
---

Achado em **20/09/2026** auditando o módulo `fechamento-diario` para as fatias P10/P11
da #103. É a **forma 8** do resíduo de fórmula fora de `frontend/packages/utils` (as 7
primeiras estão em [[formula-duplicada-fora-utils]], que mora em
`.claude/agent-memory/conformidade/` na RAIZ do repo — ver nota de duplicação no fim).

**A forma:** um único `Record<bicoId, {inicial, fechamento}>` de string é consumido por
dois parsers diferentes no mesmo módulo.

- canônico do app: `analisarValor` (alias `parseValue`) em
  `frontend/apps/web/src/utils/formatters.ts:35` — **os 3 últimos dígitos são SEMPRE
  decimais** quando não há vírgula (`"1.718.359" → 1718.359`);
- reinlinado: `parseFloat(x.replace(/\./g,'').replace(',','.'))` — `"1.718.359" → 1718359`.

Quem usa cada um:
```bash
cd frontend
grep -n 'parseValue(leituras' apps/web/src/components/fechamento-diario/hooks/useSubmissaoFechamento.ts   # GRAVA
grep -n "replace(/\\\\./g, '').replace(',', '.')" apps/web/src/components/fechamento-diario/hooks/useLeituras.ts apps/web/src/components/fechamento-diario/hooks/useCalculoGestaoBicos.ts  # EXIBE
grep -rnE "replace\(/\\\\\./g, ''\)\.replace\(',', '\.'\)" apps/web/src --include='*.ts' --include='*.tsx' | grep -vE '\.(test|spec)\.'
```

**Por que não é bug aberto hoje:** `formatarAoSair`
(`useLeituras.ts:166`) normaliza para `"X.XXX.XXX,XXX"` — **sempre com vírgula** — no
`onBlur`. Com vírgula os dois parsers coincidem. A divergência vive só na janela entre
a tecla e o blur, porque `formatarEntradaEncerrante` (`useLeituras.ts:114`) devolve
`"1.718.359"` **sem vírgula** enquanto se digita. Confirmar que o blur ainda está
ligado antes de rebaixar o achado:
```bash
grep -n 'aoSairInicial\|aoSairFechamento\|onBlur' frontend/apps/web/src/components/fechamento-diario/components/TabelaLeituras.tsx
```

**Por que importa para a API (P10/P11):** quando a escrita sair do painel, o contrato
tem de dizer **qual parser** vale — se o payload leva string BR ou número já parseado.
Mandar a string e deixar o Laravel parsear cria a terceira implementação. Isto é
categoria **domínio** (muda número em entrada de encerrante), não estrutural: precisa
de golden antes, e o golden que morde é igualdade exata, não `toBeCloseTo`
(ver `golden-que-arredonda-nao-morde` na memória de sessão).

**Nota de duplicação de memória (20/09/2026):** existem DOIS diretórios de memória
deste agente — `.claude/agent-memory/conformidade/` na raiz (10 arquivos, o histórico
real) e `frontend/.claude/agent-memory/conformidade/` (novo, `?? frontend/.claude/` no
`git status`). O meu prompt aponta para o segundo. Antes de escrever, ler o da raiz:
```bash
ls .claude/agent-memory/conformidade/ frontend/.claude/agent-memory/conformidade/
```
