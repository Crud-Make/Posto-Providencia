---
name: validar-feature-posto-providencia
description: >-
  Valida UMA feature do Posto Providência de ponta a ponta — entendendo a
  lógica antes de testar, e comparando as duas pontas (o que a tela mostra ×
  o que o banco guarda) depois. Use ao terminar de escrever uma feature, ao
  receber uma feature para conferir, antes de pedir ao dono que teste, quando
  aparecer "testa aí", "vamos validar", "confere se está certo", "roda isso",
  ou quando um número na tela não bater com o esperado. Também ao investigar
  bug relatado pelo dono. NÃO decide se o sistema está pronto para entregar —
  isso é `entrega-real-posto-providencia`, que audita o conjunto; esta aqui
  valida uma feature de cada vez e existe para achar o bug ANTES do dono.
---

# Validar Feature — entender a lógica, depois provar o número

> **Por que esta skill existe.** Em 16/08/2026, seis bugs reais foram achados
> numa tarde. Nenhum deles apareceu em teste automatizado, e **nenhum apareceu
> no primeiro uso da tela**. Todos apareceram no segundo passo: recarregar,
> voltar, salvar de novo, comparar com o banco, olhar quem mais escreve ali.
>
> As regras abaixo não são boas práticas genéricas. Cada uma é a cicatriz de um
> desses seis.

---

## Regra de invocação

**Uma feature por vez.** Validar duas ao mesmo tempo produz relatório
inauditável: quando o número diverge, não se sabe qual das duas mentiu.

Declare no começo, em uma linha: **o que a feature faz, quem a usa, e qual
número ela produz**. Se não couber numa linha, ou a feature é grande demais
para validar de uma vez, ou você ainda não a entendeu — e o §11 do CLAUDE.md
manda parar no segundo caso.

---

# Parte 1 — Entender a lógica ANTES de tocar na tela

Testar sem entender produz o pior resultado possível: verde que não significa
nada. As quatro perguntas abaixo se respondem **lendo código**, não rodando.

## 1.1 Trace o caminho inteiro, do dedo ao banco

Escreva a cadeia, com `arquivo:linha` em cada elo:

```
input do usuário → parse/máscara → estado → cálculo → payload → tabela.coluna
```

**Onde os bugs moram é nas setas, não nas caixas.** O bug do encerrante de
16/08 não estava no parse nem na gravação: estava no fato de a exibição usar
um parser e a gravação usar outro. Cada seta é uma tradução, e toda tradução
pode divergir.

Pergunte em cada elo: **quem mais faz esta mesma tradução no repo?** Se a
resposta for "mais alguém", você já achou o próximo bug — foi assim que
`litros = final − inicial` apareceu em quatro lugares com duas convenções
diferentes.

## 1.2 Descubra quem MAIS escreve na mesma tabela

```bash
grep -rn "from('SuaTabela')" apps packages --include=*.ts --include=*.tsx
```

Para cada escritor, confira: **grava as mesmas colunas? com os mesmos
valores?** Divergência aqui é bug garantido, só esperando os dois caminhos se
cruzarem no mesmo dia.

> Caso real: o painel gravava `turno_id: null` e o app do dono `turno_id: 1`.
> O delete-antes-de-gravar filtrava por turno, e `= 1` não casa com `NULL` em
> SQL. Resultado: `duplicate key` quando alguém lançava nos dois lugares. E,
> pior, o `consolidarFechamento` filtrava igual — leitura do painel **nunca**
> chegava a `total_vendas`, sem erro nenhum.

## 1.3 Leia o banco, e leia a migração na ordem certa

O arquivo em `supabase/migrations/` diz o que alguém **quis**. O catálogo diz o
que **é**. Confirme no catálogo — mas o erro mais comum aqui não é o arquivo
mentir: é **você ler a pasta na ordem errada**.

```sql
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'SuaTabela';
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
 WHERE conrelid = 'public."SuaTabela"'::regclass;
```

> **Caso real, e a armadilha é a ordem alfabética.** Duas migrações de 31/07
> mexem no mesmo índice:
>
> ```
> 20260731_leitura_uma_por_bico_por_dia.sql      ← dropa o índice COM turno
> 20260731_leitura_unica_por_bico_data_turno.sql ← cria o índice COM turno
> ```
>
> Os nomes locais **não têm o sufixo de hora**, e em ordem alfabética `uma` vem
> antes de `unica` (`m` < `n`). Quem lê a pasta na ordem do `ls` conclui que o
> turno entrou na chave por último — o **oposto** do que produção tem. A ordem
> real é por versão, e o histórico verdadeiro vive em
> `supabase_migrations.schema_migrations`, no Postgres.
>
> Em 16/08 isso custou caro: diagnostiquei um `duplicate key` do zero quando a
> resposta estava escrita na migração de 31/07, em português, na linha 13 —
> *"como `.eq('turno_id', 1)` não casa com [NULL]"*. O arquivo abre dizendo **"o
> posto não trabalha por turno"**, confirmado com o dono e com a planilha como
> prova. Ler as migrações que tocam a tabela, por versão, teria dado a resposta
> em um minuto.

Use o agente `schema` para o drift e o `rls` para quem alcança a tabela.
E antes de diagnosticar comportamento estranho de uma tabela, **leia o
cabeçalho das migrações dela** — neste projeto elas explicam o porquê, não só
o quê.

## 1.4 Ache a regra que parece errada e não é

Todo módulo deste projeto tem pelo menos uma linha que parece bug e é
correção. **Antes de "consertar", procure o commit que a introduziu.**

```bash
git log -S'<o trecho estranho>' --oneline -- <arquivo>
```

> Casos reais que já pareceram bug: o recorte `data < hoje` em
> `getUltimasLeiturasPorBico` (impede o 2º envio do dia de encolher o dia —
> `81a2a38`); a conferência de linhas sobrando depois do DELETE (um DELETE
> barrado pela RLS devolve 204 **sem erro**); e "ausência de leitura não é
> venda zero" (senão a diferença vira uma SOBRA gigante que nunca existiu).

Se você remover uma dessas, a suíte passa e o dinheiro fica errado.

---

# Parte 2 — As seis provas

Uma feature está validada quando as seis passam. Menos que isso é opinião.

## P1 — Prova do número independente

Calcule o resultado esperado **da fonte, não do código**. Planilha, papel do
encerrante, `docs/data/*.sqlite` pelo agente `planilha`.

Calcular a partir do próprio código é circular: você prova que ele faz o que
faz, não que faz o certo.

Escreva o número esperado **antes** de rodar. Anotado depois vira racionalização.

## P2 — Prova das duas pontas: tela × banco

**Esta é a prova que mais achou bug neste projeto, e é a mais pulada.**

Rode pela UI e depois consulte a tabela. Compare **campo a campo**.

> Caso real: a tela de Leituras exibia `348,487 L` e gravava `0,349 L` — mil
> vezes menor. O cálculo de exibição usava `replace(/\./g,'')`, a gravação
> usava `replace('.','')` sem o `/g`. Sobreviveu **7 meses** porque só o Bico
> 01 passa de 1 milhão, e só número com dois pontos de milhar quebra. A tela
> mostrava o valor certo o tempo todo.

Se as duas pontas batem, anote os dois números no relatório. Se não batem, **a
feature está reprovada** — não importa quão bonita esteja a tela.

## P3 — Prova da segunda visita

Não pare no primeiro sucesso. Depois de salvar:

1. **recarregue a tela** — os valores continuam lá?
2. **saia e volte** — o app sabe que já foi enviado?
3. **salve de novo** — dá o mesmo resultado, ou dobra?
4. **salve só uma parte, recarregue, complete o resto** — funciona?

> Casos reais, todos só no segundo passo: salvar um bico e voltar deixava os
> outros cinco com base ZERO e derrubava a tela para branco ao digitar; e
> enviar o encerrante limpava tudo, sem deixar prova de que o dia foi enviado
> — o dono achou que tinha perdido o trabalho.

O item 4 merece destaque: **o uso real é parcial**. Ninguém preenche seis
campos de uma vez, sempre. Quem só testa o caminho completo não testa o
caminho comum.

## P4 — Prova do teste que reprova

Se você escreveu teste, **quebre o código de propósito e confirme que ele
reprova**. Teste que nasce verde pode estar medindo nada.

> Caso real: 8 testes do caminho da foto passaram de primeira. Trocar o
> mapeamento OCR→bico por índice reprovou 2 deles, com a asserção exata. Sem
> essa checagem, não haveria como saber se a rede segurava.

Reverta a mutação. Registre no commit qual mutação foi usada.

## P5 — Prova do limite: o que esta validação NÃO pega

**Escreva explicitamente o que passa batido.** Validação que não declara o
próprio ponto cego produz falsa confiança, que é pior que nenhuma.

> Caso real: a máscara de vírgula pega dígito FALTANDO (vira retrocesso, aviso
> âmbar) e dígito SOBRANDO (vira salto acima de 3.000 L, aviso âmbar). Não
> pega dígito TROCADO no meio: `418315500` em vez de `418315000` passou sem
> aviso nenhum. Meio litro, R$ 2,49 — mas o mesmo mecanismo com o dígito mais
> à esquerda seria caro.

## P6 — Prova da limpeza

Teste que grava em produção **apaga o que gravou**, e confere o estado final:

```sql
SELECT count(*) FROM public."SuaTabela" WHERE <recorte do teste>;
```

> Duas armadilhas reais: dado de teste plausível demais para alguém
> identificar como teste depois; e **apagar leitura não reconsolida o
> `Fechamento` pai** — a consolidação só roda na escrita, então o dia fica
> afirmando venda que não existe mais.

Se limpar exige apagar dado, **peça antes**. Apagar não é seu para decidir.

---

# O que este projeto cobra além disso

- **Formatar não é calcular.** Máscara, parser e formatador são fronteiras, e
  fronteira é onde o número escorrega. A heurística "os 3 últimos dígitos são
  decimais" é **correta no encerrante** (odômetro tem 3 casas sempre) e
  **proibida em dinheiro** (já virou R$ 7.436,00 em R$ 7,44 em produção).
- **`bun run test:golden` antes e depois** de qualquer coisa que toque
  fórmula, e a contagem muda sozinha quando o ETL roda — divergiu, reconte
  antes de chamar de regressão (§7).
- **Falha silenciosa é pior que erro.** Ao validar, pergunte de cada caminho
  de erro: isto **grita** ou **engole**? `.catch(() => {})` engole. RLS
  barrando DELETE devolve 204 e engole. Leitura negada vira zero e engole.
- **A porta certa é a UI.** Editar direto no banco valida o banco, não a
  feature. Se o dono passa por cinco telas, você passa pelas cinco.
- **Servidor certo.** Este repo tem worktrees: 3015, 3016 e 3017 podem servir
  código DIFERENTE. Confirme qual árvore está na porta antes de concluir
  qualquer coisa — `readlink /proc/<pid>/cwd`.

---

# Formato do relatório

```
FEATURE: <uma linha: o que faz, quem usa, que número produz>
CAMINHO: <input> → <parse> → <cálculo> → <tabela.coluna>   (arquivo:linha)
OUTROS ESCRITORES: <lista, ou "nenhum" com o grep que provou>

P1 Número independente ..... <esperado, e de onde veio>
P2 Tela × banco ............ <valor na tela> / <valor na tabela>
P3 Segunda visita .......... recarga | volta | reenvio | parcial
P4 Teste reprova ........... <mutação usada, quantos falharam>
P5 Ponto cego .............. <o que passa batido>
P6 Limpeza ................. <estado final conferido>

VEREDITO: VALIDADA | REPROVADA — <o que falhou>
ACHADOS FORA DO ESCOPO: <o que apareceu de passagem>
```

**Evidência é comando rodado, `arquivo:linha` ou número conferido.** "Parece
que sim" é REPROVADA. Não sei ≠ passou.

E se a validação achar um bug fora do escopo da feature — vai achar —
**registre à parte e não conserte junto**. Misturar correção nova com
validação em curso é como se perde o que estava sendo provado.
