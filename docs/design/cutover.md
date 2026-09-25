# Cutover — Design Doc

Issue: #105 (mãe: #60) · Estado: **rascunho — pendências do dono: VPS, backup e a janela de corte** · Data: 17/09/2026

> Último passo da Fase A, e o único irreversível. Todo o resto desta fase pode ser revertido com um
> `git revert`; este não.

## 1. Pré-requisito: o Root Directory da Vercel

### Produção está no ar. O que está vermelho é preview.

Medido em 17/09 contra a API da Vercel, não contra o GitHub:

| Projeto | Produção viva | Estado | Deploy de |
|---|---|---|---|
| `posto-providencia` | `posto-providencia.vercel.app` → HTTP 200 | `READY` | 06/09/2026 20:06, `main` @ `6662b24` |
| `pwa` | `pwa-sandy-rho.vercel.app` → HTTP 200 | `READY` | 06/09/2026 20:06 |
| `pwa-dono` | `pwa-dono.vercel.app` → HTTP 200 | `READY` | 06/09/2026 20:06 |

Todos os deploys em `ERROR` desde a #95 têm `target: null` — são **preview**, de branch de trabalho
(`feat/#97`, `chore/#95`, `chore/#96`, `fase-a`). **Nenhum deploy de produção falhou.** Build
quebrado na Vercel não derruba o deploy vivo: ele apenas não é promovido. A produção não caiu, ficou
**congelada em 06/09** — e é isso que o cutover precisa descongelar, não consertar.

### ❌ Correção de 17/09: NÃO aconteceu

Uma versão anterior deste doc afirmava *"corrigido em 17/09 por outra sessão (configuração no painel
da Vercel)"*. **Falso.** Conferido na API em 17/09 com o token do CLI:

| Projeto | `rootDirectory` real | `updatedAt` |
|---|---|---|
| `posto-providencia` | `None` (raiz do repo) | 06/09/2026 20:06 |
| `pwa` | `apps/pwa-frentista` | 06/09/2026 20:06 |
| `pwa-dono` | `apps/pwa-dono` | 06/09/2026 20:06 |

Os três seguem nos caminhos de antes do move e **nenhum registrou alteração de configuração desde
06/09**. O erro do build diz o mesmo, com todas as letras:

```
pwa      → The specified Root Directory "apps/pwa-frentista" does not exist.
painel   → Skipping build cache since Package Manager changed from "bun" to "npm"
           sh: vite: command not found  /  Error: Command "vite build" exited with 127
```

O painel nem chega a reclamar de diretório porque o `rootDirectory` dele é a raiz — que existe, mas
depois da #95 não tem mais `package.json` nem `bun.lock`. Sem install, `vite` não existe no PATH.

### ⚠️ Não mudar o Root Directory antes do merge na `main`

O conserto é de uma linha em cada projeto — e é exatamente por isso que é perigoso fazer cedo:

| | `main` (produção hoje) | `fase-a` (refatoração) |
|---|---|---|
| Layout | `apps/`, `packages/`, `vercel.json` na raiz | tudo sob `frontend/` |
| Root Directory que funciona | raiz · `apps/pwa-frentista` · `apps/pwa-dono` | `frontend` · `frontend/apps/pwa-frentista` · `frontend/apps/pwa-dono` |

**As duas configurações não podem estar certas ao mesmo tempo**, porque `rootDirectory` é do projeto
e não da branch. Trocar agora deixa as previews da `fase-a` verdes e tira da `main` a capacidade de
deployar produção — se o dono reportar um bug antes do cutover, **não sobe hotfix**. Preview vermelha
de branch de refatoração é ruído; `main` não deployável é risco de dinheiro real.

**Decisão: a troca do Root Directory é um passo DESTE cutover** (passo 6 do §2), executado na
mesma janela em que a `fase-a` entra na `main` e os dois layouts convergem. Até lá, preview vermelha
fica vermelha, e o gate que vale é o do §7 do CLAUDE.md — o CI (`build`, `backend`), que roda a suíte
inteira e é obrigatório no merge, e o `pre-push`, que desde 24/09 roda só o golden.

### 🔎 Duas heranças a arrumar na mesma janela

Achadas ao ler as settings, não mordem hoje mas são armadilha:

* `pwa` e `pwa-dono` têm `outputDirectory: "apps/web/dist"` nas settings — o diretório do **painel**,
  não o deles. Só não quebra porque o `vercel.json` de cada um traz `"outputDirectory": "dist"`, e o
  `vercel.json` vence sobre o painel. Apagar esse `vercel.json` quebraria em silêncio.
* `pwa` tem `buildCommand: "npm run build"`, contra a regra de toolchain Bun do §0. Trocar por Bun ou
  zerar o campo e deixar o framework preset decidir.

## 2. Ordem — cada passo é reversível até o último

```
1. Backup do Postgres de produção (automático, testado com restore real)
2. Deploy do backend na VPS (Docker Compose) — sem tráfego ainda
3. Migração dos dados de movimento → conferência (§3)
4. Locust: 12 frentistas fechando no mesmo minuto
5. Merge da fase-a na main  ─┐  mesma janela, nesta ordem, sem intervalo:
6. Root Directory dos 3      │  a main passa a ter o layout frontend/ e a
   projetos → frontend/...  ─┘  configuração da Vercel passa a casar com ela
7. Deploy de produção verde nos 3 — CONFIRMA o §1 (é aqui, e só aqui)
8. Vercel: VITE_API_URL de produção nos 3 projetos
9. Janela de convivência: Supabase em LEITURA por 1 semana (§4)
10. Remoção do Supabase do código
11. Cancelar o projeto Supabase   ← único passo irreversível
```

**Passos 5 a 7 são um bloco.** Entre o merge e a troca do Root Directory a produção fica sem poder
deployar — a janela existe, e a regra é fechá-la em minutos, não deixar para depois. Valores exatos
por projeto na tabela do §1. Se o passo 7 vier vermelho, o caminho de volta é `git revert` do merge
**e** devolver os três `rootDirectory` aos valores de 06/09 — os dois, sempre juntos, porque um sem
o outro é o estado quebrado.

O passo 11 só acontece depois de **um dia inteiro de operação real** sem o Supabase, como a issue
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
sistema morto — e esse dado some no passo 11, sem ninguém perceber. É o mesmo modo de falha do
"apaga em silêncio", só que com uma semana de atraso.

Concretamente: revogar `INSERT`/`UPDATE`/`DELETE` dos papéis `anon` e `authenticated` no Supabase
assim que o passo 8 terminar. Erro de escrita visível é melhor que escrita perdida.

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
