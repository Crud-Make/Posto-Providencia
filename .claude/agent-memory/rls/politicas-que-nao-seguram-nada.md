---
name: politicas-que-nao-seguram-nada
description: Padrões de política deste banco cuja redação parece restritiva mas não segura nada — ou trava demais e quebra a tela
metadata:
  type: project
---

Catálogo de redações enganosas encontradas no schema `public`. Apurado em 12/08/2026.

## 1. `auth.role() = 'authenticated'` — não protege, **inutiliza**

Política `"Permitir tudo para usuários autenticados"` (repetida em muitas tabelas, quase sempre
`TO public`, comando `ALL`). Sem login em funcionamento, `auth.role()` vale `'anon'` e a expressão
**nunca** é verdadeira. Efeito real: a tabela não fica protegida contra o anon (ele já entra por
outra política permissiva de leitura), e a **escrita fica impossível para todo mundo** — a tela
correspondente está quebrada, não segura.

Distinguir sempre os dois estados no relatório: *protegida* ≠ *inutilizável*.

## 2. `user_has_posto_access(posto_id)` — erra ou libera geral

`SECURITY DEFINER`, e por dentro faz `auth.uid()::text::integer`. `auth.uid()` é UUID: o cast
estoura `invalid input syntax for type integer`. E o primeiro `IF p_posto_id IS NULL THEN RETURN TRUE`
libera qualquer linha com `posto_id` nulo. Ou seja: nas linhas com posto a política **erra**, nas
linhas sem posto ela **abre**. Nunca restringe como o nome sugere. Usada em `FechamentoFrentista`
e `Recebimento`, para `authenticated`.

## 3. Política nomeada "para autenticados" convivendo com uma `USING (true)` na mesma tabela

Políticas permissivas se somam por OR. Em `Escala` (`"Allow all"` + `"Permitir modificacao Escala
para autenticados"`) e em `Configuracao` a restritiva é decorativa: a `USING (true)` já respondeu.
O advisor lista isso como `multiple_permissive_policies` (performance), mas o efeito é de segurança.

## 4. `TO public` é `anon` também

`public` inclui `anon`. Política `TO public USING (true)` = tabela aberta ao mundo, mesmo sem a
palavra `anon` em lugar nenhum. Vale para `CategoriaFinanceira`, `Receita`, `HistoricoTanque`
(`"Public Access"`), `Notificacao`, `ganhos`, `parcelas`, `frentistas_old_backup`.

## 5. As janelas temporais (`dentro_da_janela_de_escrita` / `_de_edicao`) seguram de verdade

Únicas políticas do banco com restrição efetiva contra o anon: limitam INSERT a 7 dias e UPDATE ao
mês anterior. Aplicadas em `Leitura`, `Fechamento`, `FechamentoFrentista`, `Recebimento`. **Não são
`SECURITY DEFINER`, e isso está certo.** Não mexer nelas sem entender que são a única trava de
escrita que o PWA do frentista respeita — ver [[anon-e-o-painel]].
