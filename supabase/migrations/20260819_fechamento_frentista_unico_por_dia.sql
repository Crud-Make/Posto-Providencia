-- Um envio por frentista por dia.
--
-- `FechamentoFrentista` não tinha unicidade em (fechamento_id, frentista_id), e a
-- consolidação do pai (`consolidarFechamento`, em packages/api-core) SOMA os filhos.
-- Um segundo envio do mesmo frentista no mesmo dia — toque duplo, reload no meio,
-- replay repetido — dobrava o caixa do dia em silêncio. O PWA do frentista passou a
-- bloquear na tela (19/08/2026); este índice é a garantia no banco, que vale para
-- qualquer cliente. Correção de envio errado é pelo painel do gerente, não por
-- segundo envio.
create unique index if not exists fechamento_frentista_unico_por_dia
  on public."FechamentoFrentista" (fechamento_id, frentista_id);
