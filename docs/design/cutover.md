# Cutover — Design Doc

Issue: #105 (mãe: #60) · Estado: **rascunho — pendências do dono: VPS, backup e a janela de corte** · Data: 17/09/2026

> Último passo da Fase A, e o único irreversível. Todo o resto desta fase pode ser revertido com um
> `git revert`; este não.

## 1. Pré-requisito: o deploy da Vercel

Os três projetos (`posto-providencia`, `pwa`, `pwa-dono`) quebraram a partir do move da #95:
passavam na PR #107 e falharam em toda PR depois dela, porque o `vercel.json` foi para `frontend/` e
o Root Directory dos projetos seguiu apontando para os caminhos antigos.

**Corrigido em 17/09 por outra sessão** (configuração no painel da Vercel, não código).

⚠️ **Ainda não confirmado por deploy real.** Os últimos deploys registrados no GitHub são de
17/09 11:39 e 11:41 — o push da #111 — e estão como `failure`; mudar o Root Directory não
reexecuta deploy antigo. **A confirmação vem no próximo push**, e é ele que precisa vir verde antes
de qualquer passo do cutover. Não marcar este item como resolvido só pela configuração ter sido
salva.

## 2. Ordem — cada passo é reversível até o último

```
1. Backup do Postgres de produção (automático, testado com restore real)
2. Deploy do backend na VPS (Docker Compose) — sem tráfego ainda
3. Migração dos dados de movimento → conferência (§3)
4. Locust: 12 frentistas fechando no mesmo minuto
5. Vercel: VITE_API_URL de produção nos 3 projetos
6. Janela de convivência: Supabase em LEITURA por 1 semana (§4)
7. Remoção do Supabase do código
8. Cancelar o projeto Supabase   ← único passo irreversível
```

O passo 8 só acontece depois de **um dia inteiro de operação real** sem o Supabase, como a issue
pede. E depois de o backup do passo 1 ter sido restaurado em algum lugar pelo menos uma vez — backup
não testado não é backup.

## 3. ⚠️ Conferir a migração por valor, não por contagem de linha

Volume em 17/09: 1.410 `Leitura`, 1.197 `FechamentoFrentista`, 254 `Fechamento`, 117 `Despesa`,
4.517 `AuditoriaDados`.

**Contar linha não prova nada.** Uma migração pode trazer 1.410 leituras com o fuso deslocado e o
total continuar 1.410. Este repositório já tem a cicatriz: *"converter para horário local escorrega
cada leitura um dia para trás"*.

A conferência que vale:

- Os **7 meses reconciliam** contra `docs/data/posto_jorro_2026.sqlite` depois da migração, com a
  mesma asserção do golden. Mesmo número, não "número parecido".
- `Leitura.created_at` é **timestamptz** e continua em UTC no destino. Sem conversão no caminho.
- `bun run test:golden` verde apontando para o banco novo.
- Soma de `Despesa` por mês bate com a grade `Despeza, 2026.` da planilha (`docs/planilha-formulas.md` §3c).

⚠️ **Contexto que não pode ser esquecido:** a base transacional foi zerada em 14/08 de propósito e
está em replay. O que vai ser migrado **não é** o histórico completo — é o que o replay reconstruiu.
Combinar com o dono, antes de migrar, o que é a verdade a preservar: o banco atual, o backup em
`/mnt/dados`, ou a planilha.

## 4. A janela de convivência precisa de trava, não de intenção

A issue diz "Supabase em leitura por 1 semana". **Leitura precisa ser aplicada, não combinada.**

Uma aba esquecida aberta no painel antigo, ou um PWA que não recarregou, continua escrevendo no
sistema morto — e esse dado some no passo 8, sem ninguém perceber. É o mesmo modo de falha do
"apaga em silêncio", só que com uma semana de atraso.

Concretamente: revogar `INSERT`/`UPDATE`/`DELETE` dos papéis `anon` e `authenticated` no Supabase
assim que o passo 5 terminar. Erro de escrita visível é melhor que escrita perdida.

## 5. Limpeza — o aceite é um grep

```
git grep supabase   → vazio fora de banco/README.md e do CHANGELOG
```

Sai: `supabase/functions/` (as duas Edge Functions, já portadas em #98 e #99), `.mcp.json`, os hooks
de MCP, e o `supabase-js` de `frontend/packages/api-core`.

⚠️ **As travas de MCP estão destravadas desde 13/08 por decisão sua** (`execute_sql` escreve em
produção). Elas somem junto com o `.mcp.json` nesta issue — mas até lá continuam abertas, e o
cutover é justamente o período de maior risco. Vale repor antes, não depois.

## 6. Carga

Locust em container dedicado (`scripts/locustfile.py`, `dockerfile.locust`), meta da issue: **12
frentistas fechando no mesmo minuto**. É o §6.4 do CLAUDE.md, e é o único Quality Gate dos quatro que
ainda nunca rodou neste projeto.

O cenário precisa incluir o caminho que o Locust tende a não cobrir: dois envios do **mesmo**
frentista quase simultâneos — o unique de `(fechamento_id, frentista_id)` da #101 é o que segura, e
carga é onde ele é testado de verdade.

## Pendências do dono

- 🖥️ **Qual VPS**, e o custo mensal. Nada abaixo disso é decidível.
- 💾 **Estratégia de backup**: frequência, destino, e quem restaura se você estiver sem internet.
  Hoje o backup vive em `/mnt/dados`, na sua máquina — o que não protege contra a sua máquina.
- 📅 **Quando.** Cutover em dia de movimento é diferente de cutover em domingo à noite. E o Elias
  precisa saber, porque se algo travar, quem atende o frentista às 6h da manhã é você.
- 🔁 **#93 muda de sentido:** o segundo posto deixa de ser "instalação Supabase separada" e passa a
  ser "outro banco no mesmo backend" ou "outra instalação do compose". Isso é a DECISÃO 5 do Design
  Doc da Fase A ganhando consequência comercial — e muda o que você cobra pela implantação.

## Riscos

- É o único passo irreversível da Fase A. Tudo antes dele volta com `git revert`; cancelar o projeto
  Supabase, não.
- O `scripts/extrai-esquema-do-catalogo.py` ganha modo `--dados`. Ele já é a fonte do esquema
  versionado, então é o lugar certo — mas passa a ler **dado real**, e `docs/data/` é gitignored:
  cuidado para o modo novo não versionar dado de produção por acidente.
- Uma semana de convivência significa uma semana mantendo **dois** sistemas. Se aparecer bug nesse
  período, corrigir só no novo e deixar o antigo divergir — mesma regra que a #98 adotou para a Edge
  Function.
