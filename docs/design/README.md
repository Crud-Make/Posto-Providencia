# Design Docs

Regra do `CLAUDE.md` §1: **nenhuma refatoração de módulo começa sem o Design Doc aprovado aqui.**
Um arquivo por módulo, `docs/design/<slug>.md`, referenciado pela issue do módulo.

Esqueleto mínimo (os 5 níveis de zoom do §2):

```markdown
# <módulo> — Design Doc
Issue: #NN · Estado: rascunho | aprovado | implementado · Data:

## 1. Contexto — o que muda para quem está fora (API, webhook, serviço)
## 2. Subsistema — onde entra no monólito modular
## 3. Componentes — Models, Services, Controllers, DTOs, Jobs, com nomes
## 4. Comportamento — sequência (Mermaid) e o que é assíncrono
## 5. Contratos — entrada/saída, Form Requests, esquema; sem ambiguidade
## Testes — o que prova que está certo (golden onde há dinheiro)
## Riscos e decisões em aberto
```

O primeiro Design Doc é o da Fase A inteira (Issue #60); os seguintes, um por módulo.
