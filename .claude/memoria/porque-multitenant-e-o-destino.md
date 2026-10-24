---
name: porque-multitenant-e-o-destino
description: "20/09 + 24/09 — o PORQUÊ da refatoração: UM sistema para os vários postos da REDE PROVIDÊNCIA (hoje só o Posto Jorro, o próximo é o Posto BR), dado isolado por posto; sair do Supabase (vira só modelo) e portfólio de caso real; por isso as travas"
metadata:
  type: project
---

**Dito pelo dono em 20/09/2026**, e não estava escrito em doc nenhum. Sem isto, as travas
parecem cerimônia e o trabalho parece lento à toa.

A história, nas palavras dele: o Posto Providência/Jorro **nasceu de vibecoding**, não foi
profissional. Quando percebeu que era sistema grande, fez as primeiras refatorações — types,
utils, hooks, arquitetura com IA. **A peça-chave que fazia dar certo eram os testes que ele
rodava ao fim de cada commit** (hoje isso é o `pre-push`, que roda a suíte inteira, não o diff).
**Mas esqueceu de deixar multi-tenant — que é a migração para os demais postos.**

Três objetivos ao mesmo tempo, e eles quase sempre concordam:

1. **Técnico** — sair do Supabase para não ficar com o dado preso lá e ter o controle do sistema.
2. **Comercial** — multi-tenant para atender segundo, terceiro, quarto posto.
3. **Portfólio** — API multi-tenant como caso real de trabalho (ver [[situacao-entregador-quer-sair]]
   e [[portfolio-dados-o-que-as-vagas-pedem]]).

Por isso ele pede: travas de arquitetura, clean code, SOLID, spec-driven, análise ciclomática,
TDD, ferramentas de teste, padrões de mercado, DevOps em VPS. **Não é sobre-engenharia — é o
produto.** As travas são a evidência de profissionalismo que o portfólio precisa mostrar.

**Onde os três objetivos DIVERGEM** (observação minha, ele não decidiu ainda): migrar as 42
leituras e ~132 escritas do painel React legado é dez vezes mais trabalho que a API, e **não vale
nada para portfólio** — ninguém olha um hook migrado. O painel legado atende um posto e não
precisa ser multi-tenant; quem precisa é a API, que o posto novo vai consumir.

**Contradição a resolver:** a issue #93 registra "instalação separada, Supabase e Vercel próprios,
NÃO multi-tenant" para o segundo posto. O rumo declarado em 20/09 é o oposto. Ver
[[segundo-posto-cliente-novo]].

Ver [[progresso-fase-a-20-09]] e [[claude-md-4-vale-desde-18-09]].

## Confirmado pelo dono em 24/09/2026 — a lógica, nas palavras dele

"É um sistema para vários postos da **rede Providência**. De início só temos o **Posto Jorro**, e o
próximo é o **Posto BR**. Cada dado deve ser **isolado** em cada lugar."

- **Providência é a REDE, não um posto.** O `Posto` id 1 de produção se chama "Posto Jorro" — é ele.
- **Um sistema só, multi-tenant**: Laravel + Docker + Postgres na VPS; o Supabase é descontinuado e
  vira só modelo ([[supabase-descontinuado-laravel-e-o-sistema]]).
- **Isolamento por posto é regra, não detalhe**: toda rota `/api/postos/{posto}/...`, `PostoPolicy`,
  uniques com `posto_id` (#93, [[multi-tenant-impossivel-sem-migration]]). Nenhum dado de um posto
  aparece no outro.
- O Elias entra com uma conta e escolhe o posto numa tela ([[conta-do-elias-dois-postos]]).
- **Resolve a contradição acima**: nada de instalação separada por posto — o rumo é o multi-tenant.

**How to apply:** toda feature, tabela ou rota nova nasce com `posto_id` e passa pelo
`PostoPolicy`; teste que prove o isolamento (posto A não lê/grava no B) é parte do aceite.
