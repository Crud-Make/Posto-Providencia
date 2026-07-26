# Posto Providência

Sistema de gestão do posto de combustível. O núcleo é o **fechamento de caixa**: conferir,
dia a dia e depois no acumulado do mês, o que saiu pelas bombas contra o que entrou no caixa.

Este arquivo é **só glossário**. Fórmula, arquitetura e regra de processo não moram aqui —
moram nas skills `fechamento-posto-providencia` / `etl-planilha-posto-providencia` e no `CLAUDE.md`.

## Language

### Encerrante

**Encerrante**:
A leitura acumulada de um bico — um odômetro que só anda pra frente e nunca zera.
Não é uma quantidade vendida; é uma posição do contador num instante.
_Evitar_: leitura, contador, medidor

**Salto do Encerrante**:
A diferença entre dois encerrantes do mesmo bico. É o que vira litro vendido.
No dia: `fechamento − inicial`. No mês: `fechamento do Último Dia Completo − inicial do dia 01`.
_Evitar_: delta, variação, consumo

**Bico**:
O ponto físico de abastecimento, dono do seu próprio encerrante. Seis no posto.
O nome do bico **não é estável entre as abas da planilha** — o mesmo bico 04 aparece como
`DS:.10,Bico 04` nos blocos diários e `Ds:.500,Bico 04` no bloco mensal.
_Evitar_: bomba (bomba é o equipamento, que abriga mais de um bico), pistola

### Lacuna

**Dia Parcial**:
Dia em que o bico tem encerrante inicial mas não tem fechamento. É um dia começado e não
encerrado — nunca conta como dia lançado, e nunca fecha o mês.
_Evitar_: dia incompleto, dia pela metade

**Último Dia Completo**:
O último dia do mês em que todos os bicos têm inicial **e** fechamento. É ele que fecha o
acumulado do mês, não o último dia do calendário nem o último dia com qualquer dado.
_Evitar_: último dia, dia atual, hoje

**Lacuna**:
Um ou mais dias seguidos sem fechamento lançado, no meio de um mês. O encerrante andou;
o caixa daqueles dias não existe.
_Evitar_: buraco, falha, dado faltando

**Litros em Lacuna**:
`Salto do Encerrante do mês − soma dos litros dos dias lançados`. É o combustível que
comprovadamente saiu pela bomba e não tem nenhum fechamento correspondente. Zero num mês
saudável; 9.134 L em fevereiro/2026.
_Evitar_: diferença, perda, sobra

### Fechamento

**Fechamento Diário**:
O ato de encerrar o caixa de um dia: encerrantes dos bicos + o que cada frentista arrecadou.
_Evitar_: caixa do dia, apuração

**Fechamento Mensal**:
A consolidação do mês inteiro a partir dos fechamentos diários. Corresponde ao bloco
`Caixa Dia 01 a 31` da planilha. Não é um lançamento próprio — é sempre derivado dos dias.
_Evitar_: fechamento do mês, resumo mensal, acumulado
