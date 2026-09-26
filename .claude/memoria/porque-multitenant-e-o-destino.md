---
name: porque-multitenant-e-o-destino
description: 20/09 — o dono explicou o PORQUÊ da refatoração: multi-tenant para vender a outros postos, sair do Supabase para não ter o dado preso, e portfólio de caso real; por isso as travas
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
