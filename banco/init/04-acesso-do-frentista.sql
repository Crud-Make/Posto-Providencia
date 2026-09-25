-- Acesso do frentista pela API (#101, fatia 1 — docs/design/fechamento-frentista-api.md §4 e §6).
--
-- Idempotente: pode rodar de novo em qualquer banco que já tenha 01 e 03 carregados.
--
-- 1. "AcessoFrentista": o PIN do frentista, em HASH (bcrypt, cast `hashed` do Laravel), nunca em
--    claro. Uma linha por frentista; sem linha, o frentista não entra pela API. Mora em tabela
--    própria, e não numa coluna de "Frentista", por dois motivos: o módulo dono do PIN é Pessoas
--    (quem autentica), não Cadastro; e "Frentista" é lido e ESCRITO pelo papel `anon` do Supabase
--    (policy "Enable Update for Anon on Frentista") — uma coluna ali ficaria ao alcance de qualquer
--    um com a chave pública do app.
--
--    O posto do frentista NÃO é repetido aqui: vem de "Frentista".posto_id, lido no login e a cada
--    requisição. Duas fontes para o mesmo fato divergiriam.
--
-- 2. "FechamentoFrentista".chave_envio: a chave de idempotência que o PWA manda em cada envio
--    (um UUID por tentativa). O mesmo envio chegando duas vezes (rede caiu depois de gravar e o
--    aparelho repetiu) devolve a linha que já existe em vez de 409. É NULL em toda linha antiga e
--    em toda linha escrita pelo painel; o índice único ignora NULL.

CREATE TABLE IF NOT EXISTS public."AcessoFrentista" (
    frentista_id integer PRIMARY KEY REFERENCES public."Frentista"(id) ON DELETE CASCADE,
    pin_hash text NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);

-- O hash de um PIN de 4 a 6 dígitos é quebrável por força bruta offline (10^6 tentativas). A
-- tabela é SÓ da API: no Supabase, tabela nova em `public` nasce exposta ao PostgREST, então
-- RLS ligada SEM nenhuma policy e sem GRANT para os papéis do app. O Laravel conecta como dono.
ALTER TABLE public."AcessoFrentista" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."AcessoFrentista" FROM anon, authenticated;

ALTER TABLE public."FechamentoFrentista" ADD COLUMN IF NOT EXISTS chave_envio uuid;

CREATE UNIQUE INDEX IF NOT EXISTS fechamento_frentista_chave_envio
    ON public."FechamentoFrentista" USING btree (chave_envio);
