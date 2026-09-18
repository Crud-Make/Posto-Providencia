---
name: sem-lucro-liquido-diario
description: a planilha não tem lucro (bruto ou líquido) por dia — nenhum bloco Caixa Dia tem linha de lucro ou de despesa; lucro só existe por mês e por bico na aba POSTO JORRO 2026
metadata:
  type: reference
---

Conferido em 17/09/2026 na planilha de 30/08 (md5
`15cb9fe84b4f3163dec9b71af4601f54`), varrendo rótulos em todas as abas diárias.

**O bloco `Caixa Dia NN` tem, e só tem:** `Venda Concentrador` (encerrante →
litros → valor por bico), o bloco de taxa de cartão (ver
[[taxa-cartao-onde-esta-na-planilha]]), `Venda Frentista` por meio de pagamento
e por pessoa, `Venda Concentrador` por pessoa, `Falta.`
(`= concentrador − frentista`), `%` e `Concentrador x Frentista`
(`= total do concentrador − caixa dos frentistas`). O bloco termina aí.

**Não existe no dia:** linha de lucro, de custo, de margem, nem despesa de
qualquer espécie **além da taxa de cartão** — o único rótulo com "despe" nas
abas diárias é `Despeza com das taxas do Cartao.`. Logo **não há rateio de
despesa por dia**, e não há lucro líquido diário para comparar contra nada.

**Onde o lucro existe:** só na aba `POSTO JORRO 2026`, por mês e por bico —
`I5 = G5 − G16` (preço − custo total do litro) e `J5 = I5 × F5`, totalizados em
`J11 = SUM(J5:J10)`. Como `G16 = F16 + I19` e `I19 = Desp,Mês ÷ litros
vendidos`, **esse lucro mensal já está líquido de despesa** (taxa de cartão
inclusa). Não existe etapa separada "lucro bruto − despesa", e a `Falta.` não é
descontada dele.

**How to apply:** se alguém pedir "lucro líquido do dia DD", a resposta é **não
está na planilha** — e não dá para derivar sem inventar um critério de rateio
que a fonte não usa. Um endpoint diário pode expor litros, venda por bico,
conferido, `diferenca` e taxa de cartão; "lucro líquido" só tem lastro na
granularidade mensal.

O que existe por frentista no bloco de consolidação mensal, e é fácil confundir
com lucro, é `Participacao de Lucro` (`= litros × constante literal`) e
`Participacao - Falta` (`= participação − falta`), que alimentam `Salario Pago`
(`= base digitada + participação − falta`). É comissão, não resultado.

Ver [[lucro-bruto-e-folha-onde-ficam]] e [[custo-operacional-fixo-so-no-historico]].
