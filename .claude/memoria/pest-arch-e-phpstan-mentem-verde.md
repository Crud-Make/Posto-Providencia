---
name: pest-arch-e-phpstan-mentem-verde
description: Três formas de medir/travar o backend que dão verde falso — PHPStan em JSON dentro de agente, Pest Arch com lista de namespaces e com closure
metadata:
  type: feedback
---

Achado em 18/09/2026 montando as travas do backend (branch `chore/travas-laravel`):

1. **PHPStan troca a saída para JSON quando roda dentro de agente** (`{"tool":"phpstan",...}`),
   até com `--error-format=raw`. `grep` por `arquivo:linha` conta 0 em todo nível. Eu disse
   "nível 9 = 0 erros" e eram 8. Ler o campo `errors` do JSON.
2. **Pest 5: `arch()->expect([ns1, ns2])->not->toUse(...)` com LISTA de namespaces não reprova.**
   Namespace sozinho reprova. Lista de *funções* (`['dd','dump']`) funciona.
3. **Pest 5: `arch('x', fn () => expect(...))` (closure) é regra morta** — sai "risky", sem
   asserção, e passa com a violação. Só a forma encadeada vale; o PHPStan não entende a
   encadeada, por isso `tests/Arch` está em `excludePaths`.

**Why:** os três são gate verde que não olha nada — o mesmo padrão de [[gate-verde-sem-canario-nao-vale]].
**How to apply:** regra de arquitetura nova = plantar a violação e ver vermelho antes de confiar;
contagem de ferramenta PHP aqui = parsear o JSON, nunca grep.
