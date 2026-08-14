---
name: divergencia-26-27-julho
description: Status em 12/08/2026 da pendência 26-27/07 — planilha vazia nos dois dias; 27 confirmado como dado de teste pela AuditoriaDados; 26 é leitura parcial real; decisão do dono pendente
metadata:
  type: project
---

Investigado em **12/08/2026** a pedido do dono (pendência aberta em 07/08 em
`.claude/memoria/leituras-suspeitas-26-27-julho.md`). **Nenhum DELETE foi feito** —
segue pendente de decisão.

Conclusão apurada, sem os números (que envelhecem — reconferir com as consultas):

- **A planilha não tem nada nos dias 26 e 27**: os blocos `Caixa Dia 26/27 Posto
  Jorro.` existem na aba `MES, 07` só como rótulo na coluna B, sem uma célula
  sequer. O último dia com venda é o 24; o 25 tem só `Inicial` (o caso clássico do
  `dado_incompleto`).
- **27/07 é dado de teste, confirmado**: a `AuditoriaDados` mostra o mesmo conjunto
  de 6 leituras inserido, apagado e reinserido três vezes em minutos, em 31/07 —
  tentativa-e-erro manual contra produção, não lançamento de operação.
- **26/07 é leitura real e parcial**: encerrante encadeia com o 24 e com o 27, com
  casas decimais próprias de bomba, e o `Fechamento` do dia ficou `ABERTO`.

**Não vale como evidência** (foi checado e não distingue): frentista inexistente —
todos os `frentista_id` usados existem e estão ativos; e horário — convertido de
UTC, tudo cai em horário comercial.

**Where to apply:** os agregados do ETL (`docs/data/posto_jorro_2026.sqlite`,
`scripts/auditoria-lucro-mes.py`, goldens) leem `encerrante_diario`, que vem da
planilha — **não são afetados**. Quem enxerga o 26 e o 27 é o painel/app, que lê
`Leitura`, `Fechamento` e `vw_lucro_periodo` de produção. Se um número de tela não
bater com o do ETL em julho, é aqui que a diferença mora, antes de suspeitar de bug
de cálculo.

Como refazer a conferência: [[consulta-leitura-producao]] e [[onde-para-cada-fonte]].
