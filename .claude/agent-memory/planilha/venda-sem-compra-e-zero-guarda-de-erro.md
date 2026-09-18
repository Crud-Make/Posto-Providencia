---
name: venda-sem-compra-e-zero-guarda-de-erro
description: a planilha não tem nenhum IFERROR em 24.543 fórmulas; quando um produto vende sem compra no mês, o dono digita uma compra simbólica na célula para o denominador não zerar
metadata:
  type: reference
---

Conferido em 17/09/2026 na planilha de 30/08 (md5
`15cb9fe84b4f3163dec9b71af4601f54`).

**Zero guarda de erro.** Varredura por `IFERROR|IFNA|ISBLANK|ISERROR|IF(` em
**todas as fórmulas de todas as abas**: nenhuma ocorrência. Não há `IF` sequer.
Toda divisão é crua, então denominador vazio vira `#DIV/0!` **visível na
célula** — nunca zero, nunca branco, nunca valor do mês anterior. Há prova viva
no próprio arquivo: dias sem dado (o buraco conhecido de fevereiro) e blocos de
mês não preenchido deixam `#DIV/0!` nas células de `%` e de média.

**O caso "vendeu sem comprar" é real e a planilha não o resolve com fórmula.**
No bloco `Compra` da aba `POSTO JORRO 2026`, `F = Compra R$ ÷ Compra LT`
(`F16 = E16/D16` no mês 01, +31 linhas por mês). Num mês em que um produto teve
venda mas nenhuma entrada, **o dono digitou uma compra simbólica de 1 litro** na
célula de `Compra, LT.` com um valor de referência em `Compra, R$.`, o que faz
`F` devolver exatamente esse preço digitado. Não é erro, não é arraste do mês
anterior, não é preço de tabela: é **um preço de custo digitado à mão,
disfarçado de compra**.

Consequências que importam:

- O litro simbólico entra em `E = D_compra + D_estoque_anterior` no bloco
  Estoque, então mexe também em `Estoque Hoje` e em `Perca e Sobra`.
- O custo por litro daquele produto naquele mês **não tem lastro em nota** —
  é arbitrado. Qualquer conciliação de custo desse produto/mês vai divergir de
  compra real, e isso não é bug de ETL.

**How to apply:** ao modelar custo, não copiar a semântica de `custoMedioCompra`
devolvendo `null` nem a de cair no preço de cadastro do dia. A planilha exige um
**custo informado por mês e por produto**, com o caso "sem compra" tratado como
entrada do usuário, não como cálculo. Para achar os meses afetados, procurar
`Compra, LT.` com valor absurdamente baixo perto dos outros meses (é o sinal do
placeholder), não valor vazio — vazio não acontece.

Consulta para localizar o bloco Compra de cada mês na `POSTO JORRO 2026`:
linha-base do mês 01 = 15; some 31 por mês; produtos nas 4 linhas seguintes,
colunas `D` (litros) e `E` (R$). Na planilha de 30/08 existe bloco até o mês 08.

Ver [[custo-produto-media-do-proprio-mes]] e [[mapa-aba-posto-jorro-2026]].
