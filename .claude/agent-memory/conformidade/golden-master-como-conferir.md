---
name: golden-master-como-conferir
description: Como conferir se o §0.6 está bloqueando fórmula — nunca assumir pelo que ficou escrito na sessão anterior
metadata:
  type: project
---

O estado do golden master **decide se um achado de fórmula é acionável ou
bloqueado**, e é o fato que mais apodrece nas instruções deste agente.

**Fato:** em **12/08/2026** o golden master está **verde** — `docs/data/` está no
disco (`fixture_lucro_custo_mes01.json`, `janeiro_referencia.sqlite`,
`posto_jorro_2026.sqlite`) e a suíte passa. Portanto o §0.6 **não** está bloqueando
correção de fórmula.

**Isto contradiz a instrução do meu próprio prompt**, que afirma como verificado em
07/08/2026 que "`docs/data/` sumiu do disco e os 5 `*.golden.spec.ts` falham". A
afirmação era verdadeira quando escrita e é falsa hoje: o ETL estágio 2 repôs a
fonte auditável. **Nunca repetir "o golden master está caído" sem rodar o comando** —
é exatamente a armadilha do §12 (fato datado lido como se fosse presente).

**Why:** afirmar bloqueio inexistente congela correção de dinheiro que já podia ser
feita; afirmar que está liberado quando está caído deixa fórmula mudar sem rede.
Os dois erros custam caro e nenhum aparece no `git status`, porque `docs/data/` é
gitignored.

**How to apply:** rodar isto antes de classificar qualquer achado como Bloqueado —
o `bun` precisa do PATH explícito quando a shell não é de login:
```bash
ls docs/data/ && export PATH="$HOME/.bun/bin:$PATH" && bun run test:golden
```
Nunca `bun test` puro (§7). A contagem de testes do golden **muda sozinha quando o
ETL roda** — divergiu, reconte antes de chamar de regressão; por isso o número não
está escrito aqui.

Ver [[formula-duplicada-fora-utils]].
