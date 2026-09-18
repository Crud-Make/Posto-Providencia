# Cadastro — Design Doc

Issue: #97 (mãe: #60) · Estado: **aprovado por derivação** (é o §2/§3 do Design Doc da Fase A, aprovado em 17/09) · Data: 17/09/2026

> Primeiro módulo do backend. Só leitura nesta issue; escrita de cadastro é issue própria.
> Fonte dos tipos: `banco/init/01-esquema-base.sql` (catálogo de produção de 17/09).

## 1. Contexto — o que muda para quem está fora

Nada ainda. Os apps continuam lendo cadastro pelo PostgREST. Esta issue entrega os endpoints
equivalentes na API; a troca de consumidor acontece por app (#101 para o PWA, #103 para o painel).

## 2. Subsistema

`App\Cadastro` (Posto, Combustivel, Tanque, Bomba, Bico, Turno, Frentista, FormaPagamento,
Maquininha, Fornecedor) e `App\Pessoas` (Usuario, UsuarioPosto) — os dois nascem aqui porque a
policy de posto precisa do vínculo usuário↔posto. `App\Compartilhado` recebe o que os dois usam.

## 3. Componentes

| Camada | Classe | Responsabilidade |
|---|---|---|
| Compartilhado | `PostoAtual` | singleton por requisição: qual posto está em foco (definido pela rota) |
| Compartilhado | `PertenceAoPosto` (trait) | escopo global `posto_id = PostoAtual` em todo model de domínio; preenche `posto_id` ao criar. **É o filtro que a RLS nunca teve** (DECISÃO 5) |
| Compartilhado | `Enums\Role`, `Enums\StatusFechamento`, `Enums\PapelNoPosto` | espelham `"Role"`, `"StatusFechamento"` do banco e o `varchar` de `UsuarioPosto.role` |
| Cadastro\Domain | 10 models Eloquent | `$table` com o nome CamelCase real; sem `$timestamps` onde a tabela não tem; dinheiro `numeric` → cast `decimal:2` (string, nunca float); `foto` de Frentista oculta |
| Cadastro\Domain | `Policies\PostoPolicy` | `ver` (ADMIN global ou vínculo ativo) e `gerir` (ADMIN ou papel admin/gerente no posto). Registrada no Gate; **aplicada nas rotas só a partir da #102**, quando existir usuário autenticado |
| Cadastro\Application | `CatalogoDoPosto` | consultas de leitura por recurso, já com eager loading (sem N+1) |
| Cadastro\Http | `Middleware\DefinePostoAtual` | resolve `{posto}` da rota → 404 se não existe → `PostoAtual` |
| Cadastro\Http | `Controllers\CatalogoController` + `Resources\*` | `GET /api/postos/{posto}/{combustiveis,tanques,bombas,bicos,turnos,frentistas,formas-pagamento,maquininhas,fornecedores}` |
| database/factories | uma por model | dado sintético em pt-BR; `newFactory()` em cada model (fora de `App\Models`) |

Regra Deptrac ajustada: `Http` pode depender de `Domain` **para tipar e serializar** (Resources);
escrita continua passando por `Application`.

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
- Sem autenticação ainda: os endpoints são públicos até a #102. Igual ao PostgREST de hoje, nem mais nem menos.
