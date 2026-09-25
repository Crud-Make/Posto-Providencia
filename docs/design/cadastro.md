# Cadastro — Design Doc

Issue: #97 (mãe: #60) · Estado: **aprovado por derivação** (é o §2/§3 do Design Doc da Fase A, aprovado em 17/09) · Data: 17/09/2026 · Atualizado: 18/09/2026 (PostoPolicy movida para Pessoas; ciclo Cadastro ↔ Pessoas desfeito)

> Primeiro módulo do backend. Só leitura nesta issue; escrita de cadastro é issue própria.
> Fonte dos tipos: `banco/init/01-esquema-base.sql` (catálogo de produção de 17/09).

## 1. Contexto — o que muda para quem está fora

Nada ainda. Os apps continuam lendo cadastro pelo PostgREST. Esta issue entrega os endpoints
equivalentes na API; a troca de consumidor acontece por app (#101 para o PWA, #103 para o painel).

## 2. Subsistema

`App\Cadastro` (Combustivel, Tanque, Bomba, Bico, Turno, Frentista, FormaPagamento, Maquininha,
Fornecedor) e `App\Pessoas` (Usuario, UsuarioPosto) — os dois nascem aqui porque a policy de posto
precisa do vínculo usuário↔posto. `App\Compartilhado` recebe o que os dois usam: `Posto` (raiz do
tenant), `PostoAtual`, `PertenceAoPosto` e os `Enums`.

## 3. Componentes

| Camada | Classe | Responsabilidade |
|---|---|---|
| Compartilhado | `PostoAtual` | singleton por requisição: qual posto está em foco (definido pela rota) |
| Compartilhado | `PertenceAoPosto` (trait) | escopo global `posto_id = PostoAtual` em todo model de domínio; preenche `posto_id` ao criar. **É o filtro que a RLS nunca teve** (DECISÃO 5) |
| Compartilhado | `Enums\Role`, `Enums\StatusFechamento`, `Enums\PapelNoPosto` | espelham `"Role"`, `"StatusFechamento"` do banco e o `varchar` de `UsuarioPosto.role` |
| Compartilhado | `Posto` | raiz do tenant; sem relação de saída (Compartilhado não conhece módulo). Os filhos chegam pelo escopo `PertenceAoPosto`, cada model de Cadastro tem o `belongsTo(Posto)` |
| Cadastro\Domain | 9 models Eloquent | `$table` com o nome CamelCase real; sem `$timestamps` onde a tabela não tem; dinheiro `numeric` → cast `decimal:2` (string, nunca float); `foto` de Frentista oculta |
| Pessoas\Domain | `Policies\PostoPolicy` | `ver` (ADMIN global ou vínculo ativo) e `gerir` (ADMIN ou papel admin/gerente no posto). Responde "o que este `Usuario` pode", por isso mora em Pessoas e usa `Posto` só como alvo (desde 18/09; antes estava em Cadastro e fechava um ciclo Cadastro ↔ Pessoas). Registrada no Gate; **aplicada nas rotas só a partir da #102**, quando existir usuário autenticado |
| Cadastro\Application | `CatalogoDoPosto` | consultas de leitura por recurso, já com eager loading (sem N+1) |
| Cadastro\Http | `Middleware\DefinePostoAtual` | resolve `{posto}` da rota → 404 se não existe → `PostoAtual` |
| Cadastro\Http | `Controllers\CatalogoController` + `Resources\*` | `GET /api/postos/{posto}/{combustiveis,tanques,bombas,bicos,turnos,frentistas,formas-pagamento,maquininhas,fornecedores}` |
| database/factories | uma por model | dado sintético em pt-BR; `newFactory()` em cada model (fora de `App\Models`) |

Regra Deptrac ajustada: `Http` pode depender de `Domain` **para tipar e serializar** (Resources);
escrita continua passando por `Application`.

**Nenhum módulo depende de outro.** `Posto` mora em `App\Compartilhado` (raiz do tenant); Pessoas e
Cadastro apontam para ele, e não um para o outro. `Posto::usuarios()` não existe — o vínculo
usuário↔posto é navegado só pelo lado Pessoas (`Usuario::postos()` com o pivô `role`/`ativo`,
`Usuario::vinculos()` para o registro `UsuarioPosto`). Mapa `direcaoPermitidaEntreModulos()` =
`[Cadastro => [], Pessoas => []]`; `App\Compartilhado` não usa módulo (regra própria no Pest Arch e,
no Deptrac, o ruleset de `Compartilhado` sem `Domain`). O Deptrac não enxerga ciclo entre módulos
(junta o `Domain` de todos numa camada só); quem cobra é o Pest Arch
(`backend/tests/Arch/ArquiteturaTest.php`).

**`Compartilhado → Factories` (18/09/2026):** o `Posto` conhece a própria factory (`newFactory()`),
então o ruleset de `Compartilhado` no `deptrac.yaml` ganhou `Factories`, igual ao de `Domain`. Como
`Factories` pode depender de `Domain`, isso abriria o caminho `Compartilhado → factory → Domain de
módulo`. Duas regras do Pest Arch fecham: a `PostoFactory` não usa nenhum módulo, e
`App\Compartilhado` não usa nenhuma factory além da `PostoFactory`. As duas têm canário.

## 4. Comportamento

```mermaid
sequenceDiagram
    participant C as cliente
    participant M as DefinePostoAtual
    participant H as CatalogoController
    participant A as CatalogoDoPosto
    participant D as Bico (PertenceAoPosto)
    C->>M: GET /api/postos/1/bicos
    M->>M: Posto::find(1) ou 404; PostoAtual = 1
    M->>H: segue
    H->>A: bicos()
    A->>D: Bico::with(bomba, combustivel, tanque)->get()
    D-->>A: só posto_id = 1 (escopo global)
    H-->>C: BicoResource::collection
```

Síncrono, sem fila, sem cache.

## 5. Contratos

JSON `snake_case` igual ao banco. Dinheiro como string decimal (`"6.38"`). Exemplo de bico:

```json
{ "id": 3, "numero": 3, "ativo": true,
  "bomba": { "id": 2, "nome": "Bomba 2" },
  "combustivel": { "id": 1, "nome": "Gasolina Comum", "codigo": "GC", "preco_venda": "6.38" },
  "tanque": { "id": 1, "nome": "Tanque 1", "capacidade": "15000.00" } }
```

Sem coluna nova. `Frentista.foto` nunca sai pela API de catálogo.

## Testes

- Feature (Pest, Postgres real do compose, `DatabaseTransactions`, sem migration): escopo por posto
  (posto A não vê B), 404 de posto inexistente, cada endpoint responde a forma do contrato.
- Policy: ADMIN vê tudo; operador só o posto vinculado; `gerir` só admin/gerente do posto.
- Unit: enums espelham os valores do banco.
- CI: serviço Postgres 17 + `psql` carregando `banco/init/*.sql` antes do Pest. Cobertura ≥ 85 %
  passa a ser cobrada em `composer gates` (`app/Models` e `app/Providers` do esqueleto excluídos).

## Riscos e decisões em aberto

- `posto_id` é NULLABLE com `DEFAULT 1` em 8 das 10 tabelas: o escopo trata `null` como "não é
  deste posto". Tornar NOT NULL é migration da DECISÃO 5, fora desta issue.
- `Combustivel.preco_custo` é `numeric` sem escala: cast `decimal:4` para não truncar custo por litro.
- O catálogo segue **sem autenticação** (`backend/routes/api.php:50-60`), igual ao PostgREST de hoje.
  O `GET …/dashboard` saiu deste grupo em 22/09 (#103) e mora no grupo protegido com
  `posto.acesso:gerir` (ver `agregacao.md` §Autorização). **Fechar o catálogo é fatia própria**, e ela
  importa porque o catálogo expõe dado que não devia ser público: `preco_custo`/`preco_venda`
  (`CombustivelResource.php:23-24`; também em `tanques` e `bicos`, que sempre carregam o combustível
  por `with()` em `CatalogoDoPosto.php:36/:48`), `taxa` (`FormaPagamentoResource.php:22`,
  `MaquininhaResource.php:21`), `cnpj`/`contato` (`FornecedorResource.php:20-21`) e
  `telefone`/`data_admissao` (`FrentistaResource.php:20-21`). Quem consome sem token hoje:
  `bico.api.ts:94`, `frentista.api.ts:58`, `formaPagamento.api.ts:59` e `fornecedor.api.ts:38`. Esbarra
  no mesmo bloqueio do dashboard: sem `Usuario.auth_user_id` vinculado em produção, fechar é 401.
