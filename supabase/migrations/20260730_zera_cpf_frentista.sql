-- Zera a coluna `Frentista.cpf`, que expunha CPF real a qualquer anônimo.
--
-- Contexto (30/07/2026):
--   A auditoria de RLS achou `Frentista` com 9 CPFs e 7 telefones legíveis E graváveis por
--   anônimo. Duas policies, ambas permissivas: "Acesso publico de leitura aos frentistas"
--   (SELECT, USING true) e "Enable Update for Anon on Frentista" (UPDATE, USING/CHECK true).
--   Como o painel web fala com o banco como `anon` — o login foi removido em 63f209d por ser
--   código inalcançável — a chave que está no bundle do front dá acesso a esses dados.
--
--   Mesma classe do incidente de 29/07 com `Usuario.senha`: dado pessoal em coluna aberta,
--   sobrando de uma funcionalidade que não se usa mais.
--
-- Por que zerar em vez de proteger:
--   A coleta de CPF foi descontinuada por decisão do dono. Todo o código que lia ou escrevia
--   essa coluna saiu na mesma mudança: o campo do formulário e sua máscara
--   (components/frentistas/components/FormFrentista.tsx), a exibição na lista e no detalhe
--   (ListaFrentistas.tsx, DetalhesFrentista.tsx), o mapeamento em useFrentistas.ts e o
--   fallback 'XXX.XXX.XXX-XX' em services/api/aggregator.service.ts. Nada mais lê a coluna.
--
--   Fechar a policy NÃO era alternativa: revogar `anon` em `Frentista` derrubaria a tela de
--   frentistas inteira, além do RPC get_frentistas_with_email() que o painel chama em
--   services/api/frentista.service.ts:24.
--
-- Por que o DROP NOT NULL:
--   A coluna era `text NOT NULL` (conferido no information_schema antes de escrever isto).
--   Sem derrubar a constraint, o UPDATE abaixo falha e todo INSERT de frentista novo passaria
--   a exigir um CPF que o formulário não coleta mais.
--
-- Por que não DROP COLUMN:
--   Zerar preserva a possibilidade de auditar a estrutura sem manter o dado. O DROP fica como
--   passo separado, se e quando o dono decidir — exige regenerar os tipos do Supabase.
--
-- Reversibilidade: nenhuma. Os 9 CPFs não voltam. É o efeito pretendido.

ALTER TABLE public."Frentista" ALTER COLUMN cpf DROP NOT NULL;

UPDATE public."Frentista" SET cpf = NULL WHERE cpf IS NOT NULL;
