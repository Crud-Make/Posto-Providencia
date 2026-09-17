---
name: assinatura-max-acaba-20-09-troca-openrouter
description: Assinatura Claude Max termina em 20/09/2026; timer systemd troca o Claude Code para a OpenRouter sozinho; script claude-provedor faz ida e volta
metadata: 
  node_type: memory
  type: project
  originSessionId: b3a911db-56c8-43da-9f99-21e4cb4a2283
  modified: 2026-09-07T19:31:42.268Z
---

A assinatura Claude Pro/Max do usuário termina em **20/09/2026** e ele não sabe quando renova (só quando um projeto pagar). Decisão de 07/09/2026: usar a assinatura ao máximo até lá e trocar para a API da OpenRouter automaticamente.

**O que existe na máquina (fora do repo):**
- `~/.local/bin/claude-provedor {openrouter|anthropic|status}` — edita o bloco `env` e o `model` do `~/.claude/settings.json` (backup em `.bak` antes de cada troca). Ida e volta testadas em 07/09, settings volta idêntico.
- Timer `claude-openrouter.timer` (systemd --user, `Persistent=true`) dispara `claude-provedor openrouter` em **20/09/2026 23:59**.
- A chave da OpenRouter tem que estar em `~/.config/openrouter/chave` (chmod 600, começa com `sk-or-`). **Em 07/09 ainda não estava lá** — sem ela o timer recusa a troca e avisa via notify-send.
- **Decisão do dono (07/09): nada de modelo Anthropic depois da troca — só modelos chineses baratos (GLM, Qwen, DeepSeek).** Padrão: `z-ai/glm-5.3` (US$ 1,40/4,40), slot opus `deepseek/deepseek-v4-pro-0813`, slot haiku `deepseek/deepseek-v4-flash-0731`. Escolhidos por preço + contexto ≥ 1M + tools, não por benchmark — o dono troca com `/model` (picker da gateway ligado). O endpoint Anthropic-compatível da OpenRouter aceita qualquer modelo do catálogo; a doc só diz que a garantia é para Anthropic.

**Why:** o Claude Code não tem fallback de provedor — assinatura vencida vira `401`/"Login expired" e nada troca sozinho. Precedência confirmada na doc: `ANTHROPIC_AUTH_TOKEN` > `ANTHROPIC_API_KEY` > login da assinatura. A OpenRouter fala a Messages API nativa em `https://openrouter.ai/api` (sem proxy), com `ANTHROPIC_API_KEY=""` explicitamente vazia.

**How to apply:** depois de 20/09, se aparecer erro de auth ou "model not found", rode `claude-provedor status` antes de investigar. Quando renovar a assinatura: `claude-provedor anthropic` e `/login`. O `model` global `claude-fable-5-1[1m]` só existe na Anthropic — não deixe esse nome no settings com base_url da OpenRouter.
