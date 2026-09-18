# Memória — agente conformidade

- [Falsos positivos da varredura](falsos-positivos-varredura.md) — comentário que cita a regra, enum apagado (270c05c), `any` só em teste, shim de re-export, `../` na própria fatia
- [Fórmula duplicada fora de utils](formula-duplicada-fora-utils.md) — formas do resíduo; fallback 0,45 e rateio JÁ SAÍRAM; trio inline virou `calculos-*.ts` com golden; RPC SQL sem teste
- [Resíduo na fronteira hook↔utils](residuo-na-fronteira-hook-utils.md) — 6ª forma: importa o módulo canônico, trunca o retorno e re-deriva o denominador
- [Taxa de cartão deduzida duas vezes](taxa-cartao-deduzida-duas-vezes.md) — modelo do painel (por transação) contradiz o de `frontend/packages/utils` (despesa do mês)
- [Golden master: conferir, nunca lembrar](golden-master-como-conferir.md) — o "está caído" do meu prompt já está desatualizado; rodar o comando
- [Dívida já aceita pelo dono](divida-aceita.md) — pasta por tipo técnico, kebab-case, import relativo, `as any` de teste
- [Como medir CCN aqui](medir-complexidade-ccn.md) — `oxlint --rules` é vazio mas `eslint/complexity` FUNCIONA; DESDE 17/09 há `.oxlintrc.json` com teto 20 (não o ≤10 do §6)
- [Quais regras do frontend têm trava](travas-do-frontend-quais-existem.md) — CLAUDE.md 4.0 não traz mais FSD/any/enum/kebab (só o 3.3 arquivado); oxlint≠eslint; dinheiro é float quantizado
