---
name: travas-do-frontend-quais-existem
description: Quais regras de arquitetura do frontend têm trava automática e quais só existem como texto — e o fato-raiz de que o CLAUDE.md 4.0 vigente NÃO contém mais as regras de FSD/any/enum/kebab
metadata:
  type: project
---

Levantado em **17/09/2026**. Responde "isto depende de boa vontade?" sem reabrir a
investigação toda.

## O fato-raiz: as regras do frontend saíram do CLAUDE.md vigente

O `CLAUDE.md` **4.0** (vale desde 18/09/2026) é inteiro sobre a refatoração
Laravel/CQRS. Ele **não menciona** FSD, `any`, `enum`, kebab-case nem "cálculo de
domínio mora em `frontend/packages/utils`". Essas regras existem só no **3.3
arquivado**, em `.claude/docs/claude-md-3.3-arquivado.md` (§1 cálculo em
`packages/utils`, §2 FSD, §4 `any`/`enum`/dinheiro, §8 kebab-case).

Consequência prática ao auditar: **citar "§2/§4/§8" sem dizer que são do 3.3
arquivado induz o dono a procurar no arquivo errado.** Sempre nomear a fonte.
```bash
grep -nEi 'fsd|kebab|\benum\b|packages/utils' CLAUDE.md          # ~1 hit, só um caminho
grep -nEi 'fsd|kebab|enum|packages/utils' .claude/docs/claude-md-3.3-arquivado.md
```

## Onde cada trava mora (conferir, não decorar)

Quatro camadas, e elas **não** cobrem as mesmas regras:

- `frontend/.oxlintrc.json` — **só** `eslint/complexity` (20; override 35 p/ 13
  arquivos) e `eslint/max-lines` (900). Sondado: oxlint com essa config **não** pega
  `any` nem `enum`.
- `frontend/eslint.config.mjs` — é onde mora `@typescript-eslint/no-explicit-any:
  error` e a regra `no-restricted-syntax` do `toISOString().split()`. **Não** roda no
  pre-commit nem no pre-push (os dois chamam só `bun run lint` = oxlint); roda
  **só no CI**, no passo `lint:eslint`.
- `scripts/hooks/pre-commit` (versionado) — oxlint quando há `.ts` no índice.
- `scripts/hooks/pre-push` — oxlint + type-check + vitest + **`test:golden`** + gates
  PHP. **Em 17/09/2026 estava NÃO versionado (`?? scripts/hooks/pre-push`)**: a trava
  do golden existia só nesta máquina. Reconferir antes de contar com ela:
  `git status --porcelain scripts/hooks/`
- `.github/workflows/ci.yml` — oxlint, eslint completo, type-check, vitest, build.
  **Não roda `test:golden` de propósito** (depende de `docs/data/`, gitignored).
- `.claude/hooks/*.py` — `portao-golden` e `checklist-commit` **avisam/perguntam** e
  só valem para mim, dentro do Claude Code. Não são gate do repositório.

## Sem trava nenhuma (só texto do 3.3 arquivado)

Regra de dependência do FSD · import cruzado entre os 3 apps · fórmula de dinheiro
fora de `frontend/packages/utils` · quantização por `emCentavos` · `enum` do TS ·
kebab-case · import relativo profundo. Nenhum Deptrac/Pest-Arch/regra de
`no-restricted-imports` existe no lado TS — o Deptrac do §6 é só do `backend/`.

Sondar se alguma trava nova pegou `any`/`enum` (saída vazia = não pega):
```bash
cd frontend && printf 'export enum T { A="a" }\nexport const f=(x:any):any=>x as any;\n' > /tmp/sonda.ts
./node_modules/.bin/oxlint -c .oxlintrc.json /tmp/sonda.ts
```

## O dinheiro NÃO é centavo inteiro neste repo

O 3.3 §4 foi **corrigido em 28/08/2026**: a regra real é "dinheiro em **reais
(float)**, quantizado por `emCentavos` na fronteira de saída de toda fórmula";
centavo inteiro só no parse de entrada do PWA. A redação antiga ("centavos inteiros")
descrevia um repo que nunca existiu. Portanto **`parseFloat` e `/ 100` não são
violação por si** — o achado é *float cru sem `emCentavos` na saída de fórmula*.
Minhas próprias instruções de prompt ainda trazem a redação velha.

Ver [[divida-aceita]], [[formula-duplicada-fora-utils]], [[medir-complexidade-ccn]],
[[golden-master-como-conferir]].

## Atualização 19/09/2026 (lido em origin/fase-a 40abfee)

Parte do acima envelheceu: o ESLint type-aware **roda no pre-commit** pela catraca
(`scripts/hooks/pre-commit:76-79`, só arquivos do índice, com `--no-inline-config`), e
`boundaries` + `no-restricted-imports` (Public API) já estão no `eslint.config.mjs`.
O **pre-push continua sem ESLint** (só oxlint + catraca tsc). E o registro
`docs/arquitetura/regras.md` está atrás do código: FSD-1..3 "plugin não instalado",
TS-2..4 "DECIDIDA" e CA-2 "SEM TRAVA", quando o Pest Arch já barra controller→Domain
(`tests/Arch/ArquiteturaTest.php:149-151`) — o buraco do CA-2 é só o Resource via
`deptrac.yaml:50`. Reconferir:
```bash
grep -n 'catraca\|eslint' scripts/hooks/pre-commit scripts/hooks/pre-push
grep -nE 'FSD-[1-3]|TS-[2-4]|CA-2' docs/arquitetura/regras.md
sed -n 145,155p backend/tests/Arch/ArquiteturaTest.php
```

**O escopo do `so-fable-na-formula.py` é estreito, e isso decide o que é "passo Fable"**
(lido em 20/09/2026). O regex `FORMULA` cobre só
`packages/utils/src/**.ts` e `apps/web/src/services/api/aggregator.service.ts`; o
`TESTE_DE_REGRA` cobre `*.golden.spec.ts` e `*.regressao.test.ts` (o `*.test.ts`/`*.spec.ts`
comum é livre). Tudo em `apps/web/src/components/**/hooks/` está **fora** — inclusive
fórmula de dinheiro escrita lá. Consequência prática: a trava de harness (modelo) e a
trava de git (pre-push + golden) **não cobrem o mesmo conjunto**, e só o que estiver
dentro de `packages/utils` sobrevive à saída do Fable como regra vigiada. Reconferir:
```bash
sed -n 28,40p .claude/hooks/so-fable-na-formula.py
```
