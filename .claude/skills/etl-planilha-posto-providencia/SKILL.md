---
name: etl-planilha-posto-providencia
description: >-
  Regras obrigatórias pra extrair dado da planilha real do Posto Providência
  (.xlsx) e importar pro banco (Supabase/Postgres) sem perder ou corromper
  dado. Use SEMPRE que for escrever ou rodar um script de importação/ETL a
  partir de um .xlsx do posto, ou que for atualizar uma importação já feita
  quando uma planilha nova chegar (ex.: "atualizado.xlsx"). Encoda 3 bugs
  reais já descobertos e corrigidos numa extração real desta planilha — não
  são hipotéticos, já aconteceram. Nunca importe direto pro banco de
  produção sem passar pelos 2 estágios abaixo.
---

# etl-planilha-posto-providencia

Esta planilha é artesanal (ver `planilha-jorro`/`fechamento-posto-providencia`
skills) — layout muda entre meses, tem lacunas de dado reais, e tem mais de
uma tabela pra "a mesma coisa" que podem divergir. Um script de importação
que assume estrutura fixa **vai** produzir números errados silenciosamente.
Regra de ouro: **nunca confie no que extraiu até validar contra um total
independente.**

## Os 2 estágios obrigatórios

**Estágio 1 — Staging bruto.** Extrai pra um formato neutro (JSON/CSV),
fiel à planilha, sem interpretar ou mapear pro schema do sistema ainda.
Preserva every valor exatamente como está, incluindo os `None`/vazios — não
vira zero, não vira omissão.

**Estágio 2 — Mapeamento validado.** Só depois de conferir o estágio 1,
mapeia pros nomes reais das tabelas do sistema. Cada mês importado precisa
bater contra um total independente (a aba de resumo mensal `POSTO JORRO
2026`, que já tem litros/venda/lucro por mês) antes de ser considerado
correto. Se não bater, **para nesse mês e investiga** — não segue pro
próximo mês achando que "deve ser only esse".

Nunca migre tudo de uma vez. Mês por mês, confirmando cada um antes de
avançar.

## Os 3 bugs reais já encontrados (não são hipóteses)

### 1. Nunca use offset fixo de linha pra achar o fim de um bloco de dia

O bloco de cada dia (`Caixa Dia NN Posto Jorro.`) tem tamanho variável —
muda por mês e por dia. Se você procurar por um rótulo (ex.: `"Produtos"`)
dentro de uma janela fixa (`start_row até start_row+40`), e o dia
**não tiver dado** (dia que ainda não aconteceu, ou nunca foi preenchido), a
busca **vaza pro próximo bloco** e lê dado de outro dia — ou pior, do bloco
de consolidação mensal (`Caixa Dia 01 a 31`) — como se fosse daquele dia.

**Correção obrigatória**: ache TODAS as labels `Caixa Dia` da aba primeiro,
em ordem, e use a posição da PRÓXIMA label como limite de busca do dia
atual. Nunca um número fixo de linhas.

```python
labels = [(row, label) for row, label in todas_as_linhas_com_label]
labels.append((ultima_linha+1, "__FIM__"))
for i in range(len(labels)-1):
    inicio, fim = labels[i][0], labels[i+1][0]   # nunca ultrapassa `fim`
```

### 2. `Litros = Fechamento − Inicial` sem checar se os dois existem gera lixo, não erro visível

Quando falta o encerrante `Inicial` OU `Fechamento` de um bico num dia, a
planilha calcula a subtração com o lado vazio como zero — resultando num
número absurdo (nesta planilha real, chegou a **−3,4 milhões de litros num
dia só**). Isso não dá erro, não quebra nada visivelmente — só entra um
número monstruoso no seu agregado e destrói qualquer soma/média que passar
por ele.

**Correção obrigatória**: antes de calcular litros, confira que `inicial is
not None and fechamento is not None`. Se faltar um dos dois, **marque o dia
como `dado_incompleto` e grave `litros = null`** — nunca deixe a subtração
rodar com um lado ausente. Registre o motivo (qual bico, qual campo faltou)
pra virar um item de correção manual depois, não um bug silencioso no banco.

### 3. Slot de dia além do calendário real do mês não é "dia vazio" — pode ter lixo dentro

Toda planilha mensal tem slots até o dia 31, mesmo em meses com menos dias
(fevereiro, meses de 30). Um slot além do calendário real:
- Geralmente está vazio — ok, ignora.
- Mas às vezes tem a consolidação do mês inteiro "vazada" pra dentro dele
  (achado real: fevereiro com só 28 dias tinha o total do MÊS inteiro
  gravado no slot do "dia 31", dobrando a soma se você não soubesse disso).

**Correção obrigatória**: calcule o número real de dias do mês
(`calendar.monthrange(ano, mes)`) e **ignore qualquer slot de dia além
desse número**, mesmo que ele pareça ter dado dentro.

## Checklist de importação por mês

- [ ] Blocos de dia delimitados pela próxima label real, nunca offset fixo
- [ ] Litros/valores calculados só quando ambos os lados (inicial/fechamento)
      existem; dia marcado como incompleto quando não existem
- [ ] Slots além do calendário real do mês (`calendar.monthrange`) ignorados
- [ ] Bloco `Caixa Dia NN a NN` (consolidação) excluído — nunca tratado
      como um dia
- [ ] Nomes de frentista e formas de pagamento lidos do cabeçalho de CADA
      bloco, nunca hardcoded por posição de coluna (muda por mês — ver
      `fechamento-posto-providencia` skill)
- [ ] Total de litros/venda do mês importado bate com o total da aba de
      resumo mensal (`POSTO JORRO 2026`) — se não bater, parar e investigar
      antes de seguir
- [ ] Se houver mais de uma tabela pra "a mesma despesa/valor" na planilha,
      confirmado com o usuário/dono qual é a fonte de verdade antes de
      escolher (achado real: duas tabelas de despesa mensal divergiam até
      4x entre si)
- [ ] Planilha original (`.xlsx`) mantida versionada em `docs/data/`, nunca
      descartada após a importação
- [ ] Script idempotente — pode ser rodado de novo quando uma planilha
      atualizada chegar, sem duplicar ou corromper o que já foi importado

## Sinal de que algo está errado

Se um total agregado (litros, venda, despesa) tiver magnitude muito maior
(ordens de grandeza) do que os outros meses/dias — **não é um mês
excepcional, é um bug de extração ou uma lacuna de dado**. Pare e investigue
a origem exata (que bico, que dia, que célula) antes de seguir.
