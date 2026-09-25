---
name: salvamento-do-fechamento-diario-sequencia
description: A sequência de 6 passos do handleSave do painel não é transacional; parseValue É analisarValor (o comentário que diz o contrário é falso); o passo 0 apaga a leitura-base do bico que a tela mostra em branco
metadata:
  type: project
---

Mapa do `handleSave` de
`frontend/apps/web/src/components/fechamento-diario/hooks/useSubmissaoFechamento.ts`
(confirmado por grep em 20/09/2026, para a fatia P10 do Design Doc
`docs/design/fechamento-diario-api.md`).

**Ordem gravada no código, com o ponto de não-retorno:**
`deleteByDate(Leitura)` (:103, aborta) → `getDoDia` (:109) → ramo existe:
`DELETE FechamentoFrentista` + `DELETE Recebimento` em `Promise.all` (:115-118) /
ramo não existe: `create Fechamento` RASCUNHO (:127) → `bulkCreate Leitura` (:156)
→ `bulkCreate FechamentoFrentista` (:199) → `bulkCreate Recebimento` (:217) →
`update Fechamento` para FECHADO (:224). **Nada é atômico**: cada passo é uma ida
ao PostgREST e o `catch` (:252) só pinta a tela de vermelho, não desfaz.

**Três coisas que só o grep fecha:**

1. **`parseValue` É `analisarValor`** — `utils/formatters.ts:83` é um alias puro.
   O comentário em `utils/fechamentoMeios.ts:17-19` afirma que são funções
   diferentes ("nunca `analisarValor`, que é o parser de encerrante e divide
   dinheiro por mil") e isso é **falso**. Só não estoura porque a máscara de
   digitação garante vírgula antes do save; `parseValue("1234")` devolve `1.234`.
2. **A leitura-base some no salvamento** — `useLeituras.ts:294-297` deixa
   `fechamento: ''` quando `leitura_final === leitura_inicial` (1ª foto do dia);
   `handleSave:143` filtra fora quem tem `fechamento` vazio; e o passo 0 já apagou
   o dia inteiro (`leitura.service.ts:413-430`). A linha é apagada e não volta.
3. **`preco_litro` vem da tela, não do cadastro** — `handleSave:150` lê
   `bico.combustivel.preco_venda`, mas `bicos` já passou pela sobreposição de
   `precosEditados` em `useCarregamentoDados.ts:100-104`, alimentada por
   `aoRestaurarPrecoDoDia` (`useLeituras.ts:302`). Corrige, para esta tela, a
   leitura simples de [[preco-por-litro-duas-fontes]]: o cadastro é só o fallback.

**`Estoque` não existe no backend** — `find backend/app -name '*.php'` não devolve
nenhum model de Estoque (20/09/2026). Portar o desconto do passo 2 exigiria criar
model em outro módulo.

**Why:** o Command Laravel `GravaFechamentoDoDia` (P10) tem de reproduzir a ordem
passo a passo, e a tentação é recalcular no servidor o que a tela já calculou.
**How to apply:** o servidor grava o que recebe. `total_vendas`, `total_recebido`
e `diferenca` nascem de `useFechamento.ts:107-142` sobre o estado da TELA, com
preço por bico que o banco não tem — recalcular muda a conta.

Reconfirmar:
```bash
rg -n "parseValue" frontend/apps/web/src/utils/formatters.ts
rg -n "aindaSemFechamento|precosEditados" frontend/apps/web/src/components/fechamento-diario/hooks/useLeituras.ts frontend/apps/web/src/components/fechamento-diario/hooks/useCarregamentoDados.ts
find backend/app -name '*.php' | xargs grep -l Estoque
```

Relacionado: [[estoque-no-salvamento-do-fechamento]],
[[fechamento-frentista-delete-insert]], [[dois-escritores-de-total-vendas]],
[[tres-parsers-de-encerrante-no-web]].
