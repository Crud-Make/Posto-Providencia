# Memória — agente conformidade

- [Falsos positivos da varredura](falsos-positivos-varredura.md) — comentário que cita a regra, enum apagado (270c05c), `any` só em teste, shim de re-export, `../` na própria fatia
- [Fórmula duplicada fora de utils](formula-duplicada-fora-utils.md) — formas do resíduo; fallback 0,45 e rateio JÁ SAÍRAM; trio inline virou `calculos-*.ts` com golden; RPC SQL sem teste
- [Resíduo na fronteira hook↔utils](residuo-na-fronteira-hook-utils.md) — 6ª forma: importa o módulo canônico, trunca o retorno e re-deriva o denominador
- [Taxa de cartão deduzida duas vezes](taxa-cartao-deduzida-duas-vezes.md) — modelo do painel contradiz `frontend/packages/utils`; 20/09: os 3 sites são código morto, deletion test passa
- [Golden master: conferir, nunca lembrar](golden-master-como-conferir.md) — o "está caído" do meu prompt está desatualizado; o `test:golden` migrou para `frontend/`; rodar o comando
- [Dívida já aceita pelo dono](divida-aceita.md) — pasta por tipo técnico, kebab-case, import relativo, `as any` de teste
- [Como medir CCN aqui](medir-complexidade-ccn.md) — `oxlint --rules` é vazio mas `eslint/complexity` FUNCIONA; DESDE 17/09 há `.oxlintrc.json` com teto 20 (não o ≤10 do §6)
- [Saúde de código: onde medir](saude-de-codigo-onde-medir.md) — CCN por oxlint teto 0; override 35 apodrece; widgets FSD falam c/ Supabase; NÃO symlinkar docs/data em worktree
- [Quais regras do frontend têm trava](travas-do-frontend-quais-existem.md) — 19/09: eslint roda no pre-commit, não no pre-push; regras.md atrás do código (CA-2 já em Pest Arch)
- [Dois parsers de encerrante divergem](dois-parsers-de-encerrante-divergem.md) — 8ª forma do resíduo: a tela lê `1718359`, a gravação lê `1718.359`; latente só porque o `onBlur` normaliza
- [Design Doc §7 (d): a premissa da P8 venceu](design-doc-p8-premissa-vencida.md) — 21/09: o golden do `calcularTotais` JÁ existe (ef42ea0); quem mente é o Design Doc, não o comentário do código
- [CA-2: onde ainda vaza](ca-2-onde-ainda-vaza.md) — 21/09: Pest Arch já barra controller→Domain; os furos são `Compartilhado\Posto` (model fora da lista) e `routes/` fora do Deptrac; hook não commitado
- [O buraco do gate no fechamento-diario](buraco-do-gate-no-fechamento-diario.md) — verde por três isenções nomeadas (override 35, `components/` fora do boundaries, catraca), não por conformidade
