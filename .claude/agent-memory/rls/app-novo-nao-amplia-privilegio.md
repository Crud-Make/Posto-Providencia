---
name: app-novo-nao-amplia-privilegio
description: App novo que usa a mesma anon key não cria privilégio novo no banco — o privilégio é do papel anon, não do app; medir sempre no papel, nunca contando telas
metadata:
  type: project
---

Quando surge um app novo no monorepo apontando para o mesmo Supabase com a mesma `anon key`,
a pergunta "isso aumenta a exposição do banco?" se responde **no papel `anon`, não no app**.
O que o `anon` pode fazer já está decidido por grants + policies; um app é só mais um cliente
que usa o que já estava liberado. A resposta correta quase sempre é: *o privilégio é idêntico,
o que muda é a distribuição da chave e a facilidade operacional*.

**Why:** apurado em 16/08/2026 com o `apps/pwa-dono`. Ele parecia introduzir `DELETE`+`INSERT`
em `Leitura` e `UPDATE` em `Fechamento` como anônimo. Não introduzia: as seis operações moram
em `packages/api-core/src/encerrante.ts`, **compartilhado**, e o `apps/pwa-frentista` já
importava o mesmo módulo — além de o painel em modo visitante já fazer tudo isso. Contar telas
teria produzido um "aumenta a exposição" falso, e teria escondido que a exposição real já
estava no ar havia semanas.

**How to apply:**
- Para saber se o app adiciona algo, comparar **conjunto de operações do papel `anon`** antes e
  depois — não a lista de telas do app novo.
- `packages/api-core` é compartilhado entre os apps: um método exportado lá pode estar **sem uso
  de UI** num app e em uso no outro. Confirmar com grep em `.tsx`, não em `.ts` de serviço.
  Em 16/08/2026 o `pwa-frentista` exportava `salvarLeituras`/`lerEncerrante` sem nenhuma tela
  chamando — export morto, não superfície ativa.
- O que de fato cresce com um app novo, e vale dizer na resposta: mais um lugar de onde a chave
  pública vaza, mais um caminho para queimar cota de Edge Function, e uma operação destrutiva
  (o `delete`-por-dia de `Leitura`) virando um toque no celular sem autenticação.

Contexto de quem fala como anon: [[anon-e-o-painel]].
Por que a Edge Function não filtra nada disso: [[edge-function-verify-jwt-nao-protege]].
