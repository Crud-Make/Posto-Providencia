---
name: segundo-posto-cliente-novo
description: "06/09/2026 — sistema vai para um segundo posto (outro cliente, 12 bicos, do zero); decisão: instalação separada, não multi-tenant no mesmo Supabase"
metadata: 
  node_type: memory
  type: project
  originSessionId: 4ecfb669-1274-4c29-8c58-a54030002716
  modified: 2026-09-07T01:35:33.584Z
---

Em 06/09/2026 o dono disse que o sistema irá para **outro posto que está inaugurando**, com **12 bicos**.
Respostas dele: é **outro dono/cliente** (não o Elias), **começa do zero** (sem planilha), e a
estrutura dos 12 bicos (combustível/tanque) **ainda não foi levantada**.

**Decisão proposta e não contestada:** mesma codebase, **instalação separada** — projeto Supabase
novo + 3 projetos Vercel novos + `.env` próprio. Dentro do banco dele o posto é `posto_id = 1`, então
o `POSTO_ID = 1` cravado nos PWAs não precisa mudar agora.

**Why:** as 36 policies `TO anon` não filtram `posto_id` (`USING (true)`) e os PWAs rodam como anon;
dois clientes no mesmo projeto vazariam dado um pro outro. Backup/wipe/ETL/golden assumem um posto.

**How to apply:**
- ~~Bloqueio nº 1: o DDL do núcleo não está no repo~~ **RESOLVIDO em 17/09/2026** (commit `b8fb465`):
  `banco/init/01-esquema-base.sql` tem as 45 tabelas, 141 constraints e 103 policies, conferido
  45/45 contra o catálogo de produção com diff vazio. Gerado por `scripts/extrai-esquema-do-catalogo.py`,
  é estado final e não sequência de migration. Não precisa mais de `supabase db dump`.
  Atenção: `banco/dados/` é gitignored e não há seeder de negócio — `docker compose up` entrega
  esquema completo e **zero linha**.
- Não existe CRUD de bico/tanque/combustível funcional na UI (botões sem onClick em `GestaoBicos.tsx`);
  cadastro do posto novo é seed SQL.
- Nome "Posto Providência" hardcoded em ~10 arquivos (manifest, vite.config dos PWAs, login, PDF de
  escala, Edge Function `notifica-dono`) → parametrizar por `VITE_NOME_POSTO`.
- Risco de dinheiro: RPC legada `get_fechamento_mensal` classifica combustível por `ILIKE` no nome
  (GASOLINA/ADITIVADA/ETANOL/DIESEL) com taxa e margem fixas — combustível fora desses 4 zera em
  silêncio. Aposentar é tarefa à parte, com golden.
- Se o dono disser que "matriz" = Elias com filial no mesmo painel, a decisão inverte para multi-tenant
  e a RLS anon vira pré-requisito.

Relacionado: [[travas-mcp-destravadas]], [[reset-do-painel-apaga-em-silencio]], [[quem-tipa-o-client-supabase]].

## 07/09 — conta Supabase separada
Dono decidiu criar **outra conta Supabase** para o posto novo. Orientação dada: a conta deve ser
**do cliente** (dado e cobrança dele), com o thygas como membro. Na máquina: não fazer
`supabase link` (config.toml/.mcp.json seguem no Providência); aplicar esquema/seed com `--db-url`
e Edge Functions com `SUPABASE_ACCESS_TOKEN=<token da conta nova>` por comando. Vercel fica na
conta do thygas por ora — aviso: plano Hobby é não-comercial. Passo 1 (dump do esquema) ainda sem ok. **Issue #93** aberta em 07/09 com o plano completo (9 tarefas, riscos, pendências) — a fonte do estado é ela, não esta memória.

## 07/09 — EM ESPERA até fechar contrato
Dono decidiu **não começar nada antes de fechar o contrato** com o posto novo. Não abrir branch nem
rodar dump por conta própria. Estimativa dada: ~2 dias de trabalho, 3–5 de calendário depois de
conta + lista dos bicos; infra ~R$ 150–250/mês (Supabase Pro + Vercel) a repassar no preço.
Única exceção sugerida (não aceita ainda): tarefa 1 (dump do esquema) vale pelo Providência em si.

## 07/09 (noite) — estado real da relação com o Elias
Dono disse: Elias **não está usando** o painel; está "mega atarefado na abertura do próximo posto";
pediu à **filha** para resolver com o Thygo, ela não deu importância; o Thygo **também não mandou
mensagem** ("é eles que precisam"). Ou seja: o segundo posto da #93 é o do próprio Elias abrindo
agora, e a venda está parada dos dois lados. Combinado: a mensagem sai do Thygo, para o Elias
direto (não para a filha), com proposta concreta — dois postos sem ele em nenhum é o argumento.
Ver [[venda-elias]] (skill) e [[situacao-entregador-quer-sair]].

## 07/09 (noite) — CORREÇÃO: o Elias PAGA, em combustível
Eu vinha escrevendo "usa e não paga". **Errado.** O dono abastece no posto sem pagar a gasolina,
acumulado de ~R$ 2.500 até 07/09. É pagamento em espécie, informal, sem valor mensal combinado,
mas é pagamento — e para um entregador, gasolina é dinheiro direto. O que falta não é "cobrar",
é **formalizar**: valor mensal definido (em combustível ou dinheiro), escopo, e o segundo posto
incluído. Ajustar a mensagem ao Elias para reconhecer isso, não para cobrar do zero.
- Em 07/09 o Elias disse que daria **retorno pessoalmente "daqui uns 10 dias"** (~17/09/2026).
  Combinado: não pressionar por reunião antes; confirmar a data por mensagem curta para não
  escorregar, e usar os 10 dias para preparar: mês fechado × planilha, demo dos dois postos no
  celular, proposta de valor mensal por posto (combustível ou dinheiro). Skill `venda-elias`.
