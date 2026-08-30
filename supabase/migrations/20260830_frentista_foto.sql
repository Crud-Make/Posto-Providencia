-- Foto de perfil do frentista.
--
-- Fica na própria linha de `Frentista`, como data URL JPEG, e não num bucket do
-- Storage. Dois motivos: (1) o `anon` JÁ tem UPDATE aberto nesta tabela, então a
-- coluna não abre permissão nova nenhuma, enquanto um bucket exigiria liberar
-- escrita anônima no Storage — superfície nova para um avatar; (2) são ~10
-- frentistas com ~10 KB cada, longe de justificar a infraestrutura de arquivo.
--
-- LIMITE CONHECIDO: o PWA do frentista não tem autenticação (client `anon`, o
-- frentista se escolhe numa lista). "Só o próprio frentista altera a foto" é
-- regra de TELA, não garantia do banco. Quem tem a `anon key` — que é pública
-- por natureza, vai no bundle JS — troca a foto de qualquer um. Isso já valia
-- para nome, CPF e telefone antes desta coluna existir; a foto não abre buraco,
-- só passa por um que já estava aberto. A garantia de verdade depende de ligar
-- login por frentista sobre a coluna `Frentista.user_id`, que já existe.
BEGIN;

ALTER TABLE public."Frentista"
    ADD COLUMN IF NOT EXISTS foto text;

-- Sem teto, o celular manda a foto crua (vários MB) para dentro do Postgres e
-- o `select` da lista de frentistas passa a arrastar isso a cada abertura do
-- app. 40.000 caracteres de base64 ≈ 30 KB de JPEG: folgado para um avatar de
-- 192px (~10 KB na prática) e apertado o bastante para barrar foto de câmera.
-- Este número é espelhado por `TETO_DATA_URL` em
-- `apps/pwa-frentista/src/lib/foto.ts` — os dois andam juntos.
ALTER TABLE public."Frentista"
    DROP CONSTRAINT IF EXISTS frentista_foto_tamanho;

ALTER TABLE public."Frentista"
    ADD CONSTRAINT frentista_foto_tamanho
    CHECK (
        foto IS NULL
        OR (foto LIKE 'data:image/jpeg;base64,%' AND length(foto) <= 40000)
    );

COMMENT ON COLUMN public."Frentista".foto IS
    'Avatar em data URL JPEG, recortado e reduzido a 192px no cliente. Nulo = mostra a inicial do nome.';

COMMIT;
