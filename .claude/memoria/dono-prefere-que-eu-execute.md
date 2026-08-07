---
name: dono-prefere-que-eu-execute
description: "Entre receber um comando pronto e eu executar, o dono escolhe que eu execute — inclusive afrouxando trava para isso"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: b0cf8b27-0b49-44da-a82c-3a0c96c8839f
  modified: 2026-08-07T10:52:22.923Z
---

Em 07/08/2026, diante da correção de duas linhas em produção, ofereci três
caminhos e recomendei o mais conservador (ele colar o SQL no painel do Supabase,
sem mexer em trava nenhuma). Ele escolheu o outro: **tirar o `--read-only` do
`.mcp.json` para que eu aplicasse**. No mesmo dia, pediu "utilize o mcp e
corrija" e "atualize os grafos" — sempre a forma imperativa direta.

**Por quê:** ele quer o trabalho feito, não instruções para fazer o trabalho.
Entregar um bloco de comandos para ele copiar é, para ele, entregar pela metade.

**Como aplicar:** quando houver um caminho em que eu executo e outro em que ele
executa, propor o meu como padrão e deixar o dele como alternativa — o inverso do
que fiz. Continuar dizendo o custo em uma frase (o que a trava protege, qual a
janela de risco) e seguir; ele decide rápido e não quer o assunto relitigado.

Isto **não** revoga as travas do §14 nem a regra de ouro do §9 (nenhum merge na
`main` e nenhum push sem o "ok" dele). O que muda é a recomendação padrão, não a
permissão: afrouxar trava continua sendo escolha dele, feita explicitamente, e
fechada logo depois — ver [[janela-escrita-supabase-aberta]].
