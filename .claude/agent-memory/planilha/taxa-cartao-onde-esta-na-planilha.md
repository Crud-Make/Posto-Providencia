---
name: taxa-cartao-onde-esta-na-planilha
description: a taxa de cartão é calculada por meio de pagamento em TODO bloco de dia, mas o número que vira despesa vem do bloco de consolidação e é redigitado à mão na grade Despeza 2026
metadata:
  type: reference
---

Mapeado em 17/09/2026 sobre a planilha de 30/08 (md5
`15cb9fe84b4f3163dec9b71af4601f54`, `~/Downloads/Posto,Jorro, 2026.xlsx` e
`/mnt/dados/backups-posto/`). Vale para as duas perguntas que sempre voltam:
"a taxa é despesa do mês ou desconto por transação?" — **as duas coisas, em
lugares diferentes, e só uma alimenta o cálculo.**

**Três camadas, de baixo para cima:**

1. **Por dia, por meio de pagamento** — dentro de cada bloco `Caixa Dia NN`.
   Rótulo `Despeza com das taxas do Cartao.`. A alíquota é **literal digitada em
   cada bloco de dia** (não é constante da planilha, não é referência), e a taxa
   é `valor × alíquota`, somada num `Total.`. **Esse total diário não é
   referenciado por fórmula nenhuma** — conferi por regex em todas as abas.
   É cálculo de conferência, não entra em resultado de dia.
2. **Bloco de consolidação `Caixa Dia 01 a NN`**, no fim da mesma aba: repete o
   mesmo layout, mas a base é a soma das células diárias e a **alíquota é outra
   literal, digitada uma vez**. Só no mês 01 esse bloco tem coluna
   `Total Liquido` (`J1132`), com `= total − taxa` por meio de pagamento; ela
   **não é lida por nada fora do próprio bloco** e não existe nos outros meses.
3. **Grade `Despeza, 2026.`** na aba `POSTO JORRO 2026`, rubrica
   `Despeza com das taxas dos Cartao.` (`C294`, valores `D294:O294`).
   **Valores literais, redigitados à mão** — batem com o total do bloco de
   consolidação, não com a soma dos dias. Entram em `D321 = SUM(D293:D319)`,
   que vira `I16` (`Desp,Mês`) e `I19 = I16/F11` (custo operacional por litro).

**Conclusão para modelagem: a taxa é despesa do mês.** Ela chega ao resultado
uma única vez, diluída no custo por litro, e daí em `G16 = F16 + I19` e
`I5 = G5 − G16`. **Não** é deduzida da receita em lugar nenhum que alimente
lucro. Descontar a taxa da receita *e* contá-la como despesa é contagem dupla —
o modelo da planilha não faz isso.

**Duas armadilhas ao ler os blocos diários:**

- **O layout muda do mês 01 para o mês 02.** No mês 01 o bloco fica na coluna
  `H`/`I`, com 3 linhas de taxa e rótulos `Cartao,C.` / `Cartao,B.`, e a base é
  **digitada à parte**, por adquirente (`Inter pog` / `Bin`). A partir do mês 02
  o bloco fica em `K`(rótulo)/`L`(base)/`M`(alíquota)/`N`(taxa), com 5 linhas,
  e a base é **referência ao bloco Venda Frentista** (`L5 = M15`, etc.).
  Ler por posição fixa de coluna quebra no mês 01.
- **Os rótulos do mês 01 não se mapeiam pela inicial.** `Cartao,C.` carrega a
  alíquota que nos meses 02+ é a do `Cartao Debito`, e `Cartao,B.` a do
  `Cartao Credito`. Casar por nome inverte crédito com débito; casar pela
  alíquota é o que funciona.

**Divergência já encontrada (17/09/2026, ainda sem decisão do dono):** as
alíquotas diárias mudaram no meio do ano, e o bloco de consolidação **ficou com
as antigas**. Em dois meses o valor que virou despesa é menor que a soma dos
dias do próprio mês. Em um dos meses a rubrica `…taxas dos Cartao.` ficou
**vazia na grade**, então o `Desp,Mês` daquele mês — e o custo por litro que sai
dele — não tem taxa de cartão nenhuma. Ver [[divergencia-venda-resumo-vs-diario]],
que é a mesma classe de problema (resumo com parâmetro único × diário).

Como refazer a comparação (soma dos dias × consolidação × digitado):

```python
# em cada aba diaria: achar rotulo 'Despeza com das taxas do Cartao.',
# separar blocos 'Caixa Dia NN' de 'Caixa Dia NN a NN' pelo ' a ' no titulo,
# somar a celula a direita do 'Total.' de cada bloco;
# comparar com a linha 294 da aba 'POSTO JORRO 2026'.
```

Ver [[sem-lucro-liquido-diario]] e [[custo-produto-media-do-proprio-mes]].
