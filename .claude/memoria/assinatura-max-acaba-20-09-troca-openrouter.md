---
name: assinatura-max-acaba-20-09-troca-openrouter
description: Max expira quarta 23/09/2026; troca automática para OpenRouter + DeepSeek V4.1 Flash já configurada e testada
metadata: 
  node_type: memory
  type: project
  originSessionId: d3c6922a-da1d-4350-a972-3028421b10b0
  modified: 2026-09-17T23:27:37.578Z
---

**A assinatura Max expira quarta-feira, 23/09/2026.** A cota semanal renova quinta 24/09 — ou seja,
**a renovação nunca chega**: os 30 % que sobraram em 17/09 são tudo.

**FECHADO em 20/09:** o dono confirmou que a Max expira quarta e **decidiu ficar no harness do
Claude Code com DeepSeek V4.1 Flash** — que já é o que o `claude-provedor` aponta, nada a mudar no
script. Avaliou e descartou no mesmo dia: GPT-6 Astra, Trae SOLO e Cursor+Grok. O argumento que
pesou: trocar de FERRAMENTA (Trae, Cursor) mataria os 8 hooks do Claude Code, enquanto trocar só o
MOTOR preserva hooks, skills, catraca e memória de agente. Medido: das travas, **8 são de git/CI e
sobrevivem a qualquer ferramenta**; 6 das 8 que morrem têm equivalente tardio no commit ou push.
**Só `so-fable-na-formula.py` não tem substituto** — git não sabe qual modelo escreveu o arquivo.

Consequência a partir de quarta: o hook **barra o DeepSeek** de editar `packages/utils`, golden e
aggregator. Isso está CERTO e fica como está — falha fechada é a proteção que se quer quando o
modelo atrás fica mais fraco.

Configurado e testado em 17/09:

- Chave da OpenRouter em `~/.config/openrouter/chave` (0600). Saldo real: **US$ 5,85**
  (36 comprados − 30,15 já usados).
- `claude-openrouter.timer` corrigido de 20/09 para **23/09 23:59** — a data antiga jogava fora
  segunda, terça e quarta já pagas.
- `~/.local/bin/claude-provedor`: os três slots agora apontam para **`deepseek/deepseek-v4.1-flash`**
  (US$ 0,15 / 0,60 por MTok, 1M de contexto). Haiku segue em `deepseek-v4-flash-0731` (0,06 / 0,12).
  Saíram GLM 5.3 e `deepseek-v4-pro-0813`: no DeepSWE v1.1 o Pro faz 63 % a US$ 1,67/tarefa contra
  **74,2 % a US$ 0,60** do V4.1 Flash — pior e 4x mais caro.
- Testado de verdade: o slug resolve, responde em pt-BR. **78 % dos tokens de saída foram
  `reasoning`**, e saída custa 4x a entrada — é aí que o saldo vai embora.

**PENDENTE — a chave expira em 2026-09-24T23:24Z**, menos de um dia depois de a troca disparar.
Precisa gerar outra na OpenRouter **sem data de expiração** e substituir o arquivo.

Modelos avaliados e descartados em 17/09, com motivo: Muse Code/Spark (decisão do dono — reviews de
código ruim; batem com o 1.2, que faz 55 % no DeepSWE; só o 1.3 subiu para 75,4 %), Antigravity CLI
(edita arquivo sem mostrar diff, queima cota, sem memória de `.md`), GLM Coding Plan (US$ 18/mês,
69 %), Trae (IDE da ByteDance; SOLO só no Pro de US$ 10, não no Lite de US$ 5).

Ver [[situacao-entregador-quer-sair]] e [[claude-md-4-vale-desde-18-09]].
