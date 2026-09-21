---
name: guard-sem-auth-user-id-401
description: 20/09 medido — o caminho da API funciona ponta a ponta, mas nenhum Usuario tem auth_user_id; o guard 401 todo login real até alguém ligar o vínculo
metadata:
  type: project
---

**Medido em 20/09/2026**, ligando `VITE_API_URL=http://localhost:8000` e exercitando as rotas
protegidas contra o Postgres do compose (o passo que [[progresso-fase-a-20-09]] indicava).

## O que FUNCIONA (provado, não suposto)

A cadeia inteira responde: `token.atual` → `DefinePostoAtual` → `posto.acesso` → query → Resource.
`GET /api/postos/1/leituras?data=2026-01-05` devolve **200 com os 6 bicos**, dinheiro em string
decimal (`"4011.66"`), timestamp em UTC (`2026-01-05T00:00:00Z`). **Paridade confere com a
produção** nos 6 bicos do dia (638,800 L a 6,28 = 4.011,66; 307,460 = 1.930,85; 0,681 a 4,58 =
3,12). Sem token: **401**.

## 🔴 O BLOQUEIO que só apareceu com a tela na frente

**Nenhum `Usuario` tem `auth_user_id` preenchido — nem em produção, nem no compose.**

- Produção: a tabela `Usuario` tem **uma linha só**, `admin@postoprovidencia.com`, ADMIN, ativo,
  `auth_user_id = NULL`.
- A conta realmente usada para entrar no painel é **`posto@providencia.com`**
  (`auth.users` `8e984719-1e46-4ec7-9aca-b0b4e863a6bb`, último login 19/09) — e ela **não tem
  linha em `Usuario`**. Nem o e-mail bate.

`AutenticaPeloTokenAtual` resolve o usuário por `where('auth_user_id', $sub)`. Com a coluna vazia
o token é válido, a assinatura confere, e mesmo assim a resposta é **401 "Usuário sem acesso"**.
Ou seja: **no dia em que o painel apontar para o Laravel, todo login real cai em 401.** Não é
defeito do guard (ele falha fechado, como projetado) — é um vínculo de dado que nunca foi criado.

Isso contradiz, na prática, o que [[login-transicao-aceita-token-atual]] dava por resolvido: o
desenho aceita o token atual, mas o `Usuario.auth_user_id` que ele exige não existe em lugar nenhum.

**Conserto:** um UPDATE ligando `Usuario.auth_user_id` ao `auth.users.id` de quem usa o painel —
e antes disso decidir se a linha certa é a `admin@postoprovidencia.com` existente (trocando o
e-mail) ou uma linha nova para `posto@providencia.com`. **É escrita em produção: espera o "vai"
do dono.** No compose já está ligado (id 1 → `8e984719…`), por isso o 200 acima.

## A outra metade: não há o que ler no compose

`Fechamento`, `FechamentoFrentista` e `Recebimento` estão **zerados** no Postgres local (só 186
`Leitura`, 1 `Posto`, 6 `Bico`, janeiro/2026). Então **P6 e P7 responderam 200 com vazio**
(`{"data":[]}` e `{"data":null}`) — a forma está certa, mas **as duas rotas não foram exercitadas
contra dado de verdade**. Para valer, o compose precisa da carga de fechamento de janeiro.

Ver [[porque-multitenant-e-o-destino]] e [[multi-tenant-impossivel-sem-migration]].
