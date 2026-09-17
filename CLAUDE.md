Este arquivo estabelece os padrões rigorosos, o fluxo de trabalho agêntico e os Quality Gates para a **refatoração completa de sistema** utilizando o **Claude Code**.

> **Versão:** 4.0 · **Vale desde 18/09/2026** · **Idioma:** pt-BR · O 3.3 está arquivado em
> [`.claude/docs/claude-md-3.3-arquivado.md`](.claude/docs/claude-md-3.3-arquivado.md).

---

## 0\. Ponte com este repositório (estado em 17/09/2026)

O que existe hoje e onde cada regra abaixo se encaixa:

* **Monorepo Bun (TypeScript):** `frontend/apps/web` (painel), `frontend/apps/pwa-frentista`, `frontend/apps/pwa-dono`,
  `frontend/packages/utils` (domínio, 18 golden masters), `frontend/packages/api-core`, `frontend/packages/types`. Toolchain
  do lado TS segue sendo **Bun** — nunca npm/yarn/pnpm. **Telas ficam como estão** (decisão de 17/09).
* **Banco:** `banco/init/*.sql` é o esquema inteiro de produção, gerado por
  `scripts/extrai-esquema-do-catalogo.py`; `docker-compose.yml` sobe Postgres 17 em `:5433`.
  Ver `banco/README.md`. O Supabase continua servindo os apps até o cutover (Issue #60).
* **Backend Laravel 13:** nasce em `backend/` (issue própria). **Os §5, §6 e §7 (CQRS, PHPMD,
  PHPStan, Deptrac, Pest ≥ 85 %, Locust, `pre-commit` PHP) entram em vigor no dia em que `backend`
  existir.** Até lá o gate de PR é o atual, rodado em `frontend/`: `bun run lint` (oxlint; `lint:eslint` é a
  passada completa), `bun run type-check`, `bun run test`, `bun run test:golden`. Caminhos `app/...` citados abaixo leem-se `backend/app/...`.
* **Documentação:** Design Doc de cada módulo em `docs/design/<slug>.md`; `docs/architecture.md` é
  o mapa vivo. `docs/data/` **não é lugar de documento**: é dado real, gitignored, nunca versionar.
* **Invariantes de dinheiro que não mudaram com a versão:** nenhuma fórmula muda sem golden master
  rodando (`bun run test:golden`; **nunca** `bun test` puro); regra de negócio vem da skill
  `fechamento-posto-providencia`, não de intuição; ETL vem da `etl-planilha-posto-providencia`;
  `diferenca = concentrador − conferido`; dinheiro quantizado por `emCentavos`.
* **Git:** nunca na `main`; branch por issue (`feat/#NN-...`); Conventional Commits em pt-BR;
  `push --force` proibido; `CHANGELOG.md` a cada entrega; nenhum merge ou push sem "ok" explícito.
* **Travas automáticas** em `.claude/hooks/` (dados, git, golden, delegação, memória) continuam
  ativas e independem deste arquivo. `python3 .claude/hooks/testa-hooks.py` confere.
* **Grafo:** `graphify-out/` é hipótese; grep confirma. Agente `grafo` é a porta de entrada.

---

## 1\. Filosofia &amp; Estratégia de Refatoração de Grande Escala

* **Spec-Driven Development**: Nenhuma refatoração de módulo é iniciada sem uma especificação/contrato prévio (Design Doc em `docs/`).
* **Evaluation-Driven Development**: Uso de métricas quantitativas e suítes de teste (Pest/PHPUnit) para guiar refatorações sem introduzir regressões.
* **Autonomia Progressiva**: O Claude Code atua com autonomia em tarefas bem delimitadas, mas cada mudança é submetida a checagens determinísticas e Quality Gates.
* **Mapeamento via GraphRAG / Graphify**: A base de código legada é modelada como um grafo de conhecimento para compreender dependências globais, classes e fluxos antes de qualquer alteração.
* **Manutenibilidade Humana**: O código refatorado deve ser prioritariamente legível e auditável por seres humanos, evitando abstrações obscuras e alta complexidade ciclomática.

---

## 2\. Redesign de Software: Os 5 Níveis de Zoom

Ao refatorar qualquer subsistema, aplique rigorosamente os 5 níveis de zoom:

1. **Contexto Geral**: Panorama das conexões externas do sistema (APIs, Webhooks, serviços terceiros).
2. **Arquitetura &amp; Subsistemas**: Mapeamento dos grandes blocos (Monolito Modular no Laravel 13).
3. **Componentes/Tijolos**: Identificação de Models, Services, Controllers, DTOs e Jobs.
4. **Comportamento &amp; Sequência**: Fluxo de eventos e chamadas assíncronas entre os componentes.
5. **Contratos &amp; Interfaces**: Especificação sem ambiguidade dos esquemas de entrada/saída, DTOs e Form Requests.

---

## 3\. Mapeamento de Dependências &amp; Arquitetura SaaS

Para evitar que a refatoração torne a base de código ininteligível ou crie dependências circulares:

* **Documentação Obrigatória**: Mantenha o arquivo `docs/architecture.md` atualizado com um diagrama **Mermaid** e a tabela de dependências entre módulos.
* **Sub-agente `doc-cycle-onboard`** (`.claude/agents/doc-cycle-onboard.md`): A cada refatoração ou alteração, este sub-agente analisa o `git diff` e propõe a atualização de `docs/architecture.md` e do Design Doc do módulo. Ele é somente leitura: devolve o patch, e a thread principal aplica.
* **Regra de Aceite**: Rejeite e mande refatorar qualquer código gerado que introduza alto acoplamento desnecessário ou dependências circulares entre módulos.

---

## 4\. Workflows Agênticos Dinâmicos no Claude Code (`ultracode`)

Refatorações de grande escala devem ser executadas utilizando **Workflows Dinâmicos** para não poluir ou esgotar a janela de contexto da sessão principal:

* **Modo Ultracode**: escreva `ultracode` no prompt (ou "use a workflow") para tarefas extensas de refatoração. O Claude Code orquestrará sub-agentes em background com revisões adversariais. Não há comando `/effort ultracode`.
* **Workflows Comuns para Refatoração**:  
  * **Auditoria de Complexidade &amp; Regras**: `ultracode: audit every module under backend/app/ for cyclomatic complexity violations, architectural leaks and missing validation contracts`
  * **Migração/Refatoração em Paralelo**: `use a workflow to refactor every controller under backend/app/Http/Controllers/ to use FormRequests and CQRS Commands, working on each file in an isolated copy`
  * **Loop de Correção de Análise Estática**: `use a workflow to run backend/vendor/bin/phpstan and PHPMD and keep fixing reported issues until zero errors remain`
* **Prompt Caching**: Sub-agentes paralelos reutilizam o prefixo de cache (TTL de 5 min a 1 hora), reduzindo custos e latência em execuções *fan-out*.

---

## 5\. Arquitetura Refatorada: Monolito Modular, CQRS &amp; Resiliência (Laravel 13 + Docker)

### Infraestrutura

* **Docker Compose**: Aplicação Laravel 13, PostgreSQL, Redis e ferramentas de teste rodando em containers Docker isolados.

### Padrão CQRS Rigoroso

* **Commands (Caminho de Escrita)**:  
  * Toda alteração de estado deve ser encapsulada em Commands/Jobs.
  * Execução assíncrona via **Laravel Queues (Redis)** para não travar a requisição HTTP.
  * **Garantia de Idempotência**: Prevenção de duplicidade em operações críticas (ex.: o mesmo envio de fechamento do frentista chegando duas vezes; hoje o unique de `FechamentoFrentista` está escrito e não aplicado).
  * **Dead Letter Queues (DLQ)**: Mensagens corrompidas ou falhas contínuas são isoladas em filas DLQ para análise sem paralisar o sistema.
* **Queries (Caminho de Leitura)**:  
  * Consultas otimizadas com *eager loading* para eliminar o **Problema N+1**.
  * Índices estratégicos no PostgreSQL.
  * Proteção contra **Cache Stampede** utilizando travas de concorrência (*locks*) e regeneração proativa de cache no Redis.

### Capacitação de IA no Laravel

* **Laravel Boost**: Instalação obrigatória (`composer require laravel/boost --dev` / `php artisan boost:install`).
* **Diretrizes Customizadas**: Regras de refatoração armazenadas na pasta `.ai/guidelines/*`.

---

## 6\. Quality Gates Obrigatórios (Critérios de Aceite para PRs)

Nenhum código refatorado deve ser mesclado sem aprovação nos 4 Quality Gates cruciais:

1. **Análise de Complexidade Ciclomática &amp; Legibilidade**:

  * **Objetivo**: Garantir que o código permaneça legível e sustentável para seres humanos, impedindo que o projeto fique complexo a ponto de apenas IAs conseguirem dar manutenção.
  * **Ferramental**: Validação automatizada via **PHPMD (PHP Mess Detector)**, **PHPStan** (para backend PHP) e **ESLint complexity rules** (para frontend React/TypeScript).
  * **Regra de Aceite**: Métodos e funções não devem ultrapassar a complexidade ciclomática limite (ex: CCN ≤ 10). Funções com múltiplos condicionais aninhados (`if/else`, `switch`, loops) devem ser decompostas em sub-rotinas limpas ou padrões comportamentais (Strategy/Command).
2. **Análise de Estrutura de Dependências (Deptrac / Pest Arch)**:

  * Validação estática das camadas (`vendor/bin/deptrac analyse`). Controllers chamam apenas Services/Commands e FormRequests; Services não acoplados a camadas de entrega.
3. **Cobertura de Testes (TDD com IA no Loop)**:

  * Cobertura mínima de **85%**. A IA deve implementar os testes unitários e de integração antes de dar a refatoração como concluída.
4. **Testes de Carga &amp; Performance (Locust via Docker)**:

  * Validação dos limites de RPS e latência executando o Locust em container dedicado (`scripts/locustfile.py` / `dockerfile.locust`).

---

## 7\. Git Hooks e Automação CI/CD

* **`pre-commit`**: Executa PHPMD (Análise de Complexidade Ciclomática), Deptrac, PHPStan e linter de TypeScript.
* **`pre-push`**: Executa a suíte de testes TDD determinísticos e validação de schemas de dados.
* **Revisão Automatizada em PRs**: Agentes no CI/CD revisam os Pull Requests e aplicam os 4 Quality Gates antes de autorizar o merge.

