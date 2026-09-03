-- #74: o frentista envia a medição de régua pelo PWA (client anon).
--
-- HistoricoTanque foi fechado para escrita anônima em 20260816 porque a régua
-- decide perda/sobra ("quem escreve sem login escolhe se o posto aparece com
-- perda ou sem"). Reabre-se SÓ o necessário, no MESMO padrão de janela
-- temporal das tabelas que o frentista já insere (Leitura/Fechamento):
--   - INSERT/UPDATE dentro da janela, com guardas de conteúdo;
--   - DELETE para anon continua fechado (nenhuma policy — nega).
--
-- Guardas e porquês:
--   - tanque_id IS NOT NULL: a coluna é anulável e NULL não colide no
--     UNIQUE (tanque_id, data) — sem esta guarda, spam anônimo infinito
--     (achado da auditoria de RLS de 30/08).
--   - volume_fisico >= 0: régua negativa não existe.
--   - (data)::timestamptz: mesmo cast do precedente em Despesa; as funções
--     de janela recebem timestamptz.

CREATE POLICY historico_tanque_insert_janela
  ON public."HistoricoTanque"
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    tanque_id IS NOT NULL
    AND volume_fisico IS NOT NULL
    AND volume_fisico >= 0
    AND dentro_da_janela_de_escrita((data)::timestamptz)
  );

CREATE POLICY historico_tanque_update_janela
  ON public."HistoricoTanque"
  FOR UPDATE
  TO anon, authenticated
  USING (dentro_da_janela_de_edicao((data)::timestamptz))
  WITH CHECK (
    tanque_id IS NOT NULL
    AND volume_fisico >= 0
    AND dentro_da_janela_de_edicao((data)::timestamptz)
  );
