---
name: design-doc-p8-premissa-vencida
description: O §7 (d) do Design Doc fechamento-diario-api afirma que nenhum golden exercita useFechamento/calculators — era verdade em 20/09 e é FALSO desde o commit ef42ea0; o comentário do código é que está certo
metadata:
  type: project
---

A linha do **§7 (d)** de `docs/design/fechamento-diario-api.md` (hoje a 307) diz, em
texto corrido: *"Nenhum golden hoje exercita `useFechamento` nem `calculators.ts`; o
comentário de `useFechamento.ts:137` diz o contrário"*. **Isso era verdade quando foi
escrito (20/09/2026) e é falso desde o commit `ef42ea0`**, que criou
`frontend/apps/web/src/utils/calculators.golden.spec.ts` — o golden chama
`calcularTotais` de verdade contra os 31 dias de janeiro. **Quem está certo é o
comentário do código**, não o Design Doc.

**Why:** a frase do Design Doc é repassada como premissa em tarefa de workflow (foi,
em 21/09/2026) e leva o executor a "escrever o golden que já existe" — trabalho
duplicado sobre dinheiro, exatamente o erro que o §12 nomeia (fato datado lido como
presente). O Design Doc **não** é fonte para "existe teste?"; o disco é.

**How to apply:** antes de aceitar qualquer "não há golden para X", rodar isto. O
`test:golden` mora em `frontend/package.json`, e a lista de arquivos que ele roda é
o `find` dentro do próprio script:
```bash
cd /home/thygas/Projetos/trabalho/Posto-Providencia
find frontend -name '*.golden.spec.ts' -not -path '*/node_modules/*' | sort
grep -n 'test:golden' frontend/package.json     # o glob inclui apps/web, não só packages/utils
git log --oneline -1 -- frontend/apps/web/src/utils/calculators.golden.spec.ts
```

**O que a P8 ainda NÃO fez, e é o achado que sobra.** O golden só mede a divergência;
**nenhum call site foi trocado**. `totalVendasDoEncerrante`
(`frontend/packages/utils/src/leitura.ts:77`, o vencedor pelo §7 d) tem **zero
importador em código de produção** — só os dois goldens. Reconferir:
```bash
grep -rn 'totalVendasDoEncerrante' frontend/apps frontend/packages/*/src --include='*.ts' --include='*.tsx' \
  | grep -v node_modules | grep -vE '\.(test|spec)\.'
```

Ver [[golden-master-como-conferir]] e [[buraco-do-gate-no-fechamento-diario]].
