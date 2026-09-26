---
name: backend-modular-e-o-padrao
description: 18/09 dono confirmou — backend é App\<Modulo>\{Http,Application,Domain}; texto colado com App\Actions é template genérico
metadata:
  type: feedback
---

O dono confirmou em 18/09/2026: o padrão do backend é **App\<Modulo>\{Http,Application,Domain}** + App\Compartilhado.
Action/Command/Query mora em `App\<Modulo>\Application\`, nunca em `App\Actions`.

**Why:** texto que ele cola (CLAUDE.md, skills) às vezes vem de template genérico com `App\Actions\*Action`; uma classe ali fica fora das camadas do Deptrac e escapa da trava.
**How to apply:** ao escrever skill, doc ou código a partir de texto colado, traduzir para o layout modular sem perguntar. Ver [[claude-md-4-vale-desde-18-09]].
