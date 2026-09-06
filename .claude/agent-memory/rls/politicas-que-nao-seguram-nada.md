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
palavra `anon` em lugar nenhum. Vale para `CategoriaFinanceira`, `Receita`, `Notificacao`,
`ganhos`, `parcelas`, `frentistas_old_backup`.

**Atualizado 30/08/2026:** `HistoricoTanque` saiu desta lista — a `"Public Access"` deu lugar a
duas políticas: leitura anon `USING (true)` + `"Escrita só de usuário autenticado"` (ALL, `TO
public`, `auth.role()='authenticated'`), ou seja, caiu no padrão do item 1: escrita fechada para
anon (o upsert do painel em modo visitante falha), aberta `USING (true)` para logado.

## 5. As janelas temporais (`dentro_da_janela_de_escrita` / `_de_edicao`) seguram de verdade

Únicas políticas do banco com restrição efetiva contra o anon. Aplicadas em `Leitura`,
`Fechamento`, `FechamentoFrentista`, `Recebimento`, `Despesa` (DELETE). **Não são
`SECURITY DEFINER`, e isso está certo.** Não mexer nelas sem entender que são a única trava de
escrita que o PWA do frentista respeita — ver [[anon-e-o-painel]].

**Atualizado 30/08/2026:** as duas funções hoje têm corpo IDÊNTICO — `quando >= DATE '2025-12-31'
AND quando < CURRENT_DATE + 2 days` — a janela do replay, não os "7 dias" que o nome
`_insert_janela_7d` sugere. Nome de policy mente; ler sempre o `pg_get_functiondef`. Quando o
replay acabar, o corpo deve voltar a encolher.

## 6. UNIQUE não limita spam se a coluna-chave é nullable

`HistoricoTanque` tem `UNIQUE (tanque_id, data)`, mas `tanque_id` é **nullable** e NULL não
colide em UNIQUE: INSERT aberto sem `tanque_id IS NOT NULL` no `WITH CHECK` permite linhas
infinitas com tanque nulo. Apurado em 30/08/2026 ao desenhar a policy de INSERT do frentista.
Vale conferir em qualquer tabela onde o "1 por dia" dependa de um UNIQUE parcial de colunas
anuláveis.
