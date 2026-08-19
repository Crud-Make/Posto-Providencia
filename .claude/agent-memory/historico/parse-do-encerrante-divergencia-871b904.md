---
name: parse-do-encerrante-divergencia-871b904
description: O parse errado do encerrante em useLeiturasDiarias nasceu em 871b904 (11/01/2026) junto com o parse certo da exibição; nenhuma correção anterior tocou o arquivo até 6c89f1d (16/08/2026)
metadata:
  type: project
---

O bug do `replace('.', '')` sem `/g` em
`apps/web/src/components/leituras-diarias/hooks/useLeiturasDiarias.ts` **nunca
foi corrigido antes de 16/08/2026**. Blame de `6c89f1d^` nas linhas 90-98:
100% `b58cf0f` (18/01/2026), sem um único commit intermediário.

**A linha certa e a errada nasceram no mesmo commit.** Em `871b904`
(11/01/2026, *"conclusão das sprints 4 e 5 - refatoração completa e
modularização"*), a modularização partiu leituras em dois caminhos:

- `src/components/fechamento-diario/hooks/useLeituras.ts` — **exibição**, ganhou
  `replace(/\./g, '')` e as máscaras de milhar. Correto.
- `src/components/leituras/index.tsx:82-83,89-90` — **gravação**, ficou com
  `parseFloat(l.inicial.replace('.', '').replace(',', '.'))`. Errado.

`b58cf0f` (18/01/2026, tag `v3.0.0`) extraiu esse `index.tsx` para o hook novo
`useLeiturasDiarias.ts` (160 linhas) **copiando o parse errado sem tocá-lo**.
Daí em diante o arquivo só foi varrido por coisas alheias ao parse: `4b3007d`
(26/07 lint), `63f209d` (29/07 login), `8aff33c` (31/07 fuso), `0f7c33b`
(14/08 calendário).

**O que o dono lembra é `bc3dd63`** (04/01/2026, *"fix(fechamento): corrige
cálculo de leituras e formatação de encerrante"*, mensagem citando
`parseValue`/`formatEncerranteInput`/`formatOnBlur` e *"formatação igual à
planilha Excel (1.718.359,423)"*). Ele tocou **só** `TelaFechamentoDiario.tsx`
e `services/api.ts` — exibição e entrada, nunca a gravação. É o §2 da minha
regra: a mensagem afirma "encerrante corrigido", o diff mostra outra coisa. Foi
também onde `parseValue` trocou `/\./g` pela heurística dos "últimos 3 dígitos
como decimais", que virou o `analisarValor` que fez **R$ 7.436,00 → R$ 7,44 em
produção**.

**A consolidação de `f2c212c`** (16/08/2026, `model/campo-numerico.ts`, "três
cópias do parser") **não podia ter pego este arquivo**: as 3 cópias eram todas
de `apps/web/src/widgets/planilha-do-mes/` (hook, célula editável, gravação da
régua). Os 5 arquivos do commit vivem inteiros nesse widget. `leituras-diarias/`
é outra fatia — alcançá-la seria import lateral (§2), e foi o mesmo motivo pelo
qual `6c89f1d` criou `model/encerrante-digitado.ts` em vez de importar o
`numeroDoCampo` canônico.

**How to apply:** quando a pergunta for "isso já foi corrigido?", separar
exibição de gravação antes de responder — neste repo elas divergiram por 7
meses no mesmo hook. E varredura de parser aqui é sempre por fatia, nunca
global: perguntar quais fatias ficaram de fora.

Ver [[bug-que-so-aparece-no-dado-grande]].
