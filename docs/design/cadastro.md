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
- ~~O catálogo segue sem autenticação~~ — **fechado em 26/09/2026 (#102, `feat/#102-catalogo-com-login`).**
  O grupo do catálogo em `backend/routes/api.php` passou a `['token.atual', DefinePostoAtual::class,
  'posto.acesso']` (habilidade `ver`: é cadastro de leitura para quem trabalha no posto; o que é dado de
  proprietário — dashboard, proprietário, movimento — segue em `posto.acesso:gerir`). Sem token 401,
  posto de outro 403, posto inexistente 404 (depois do token). Motivo: o catálogo expõe
  `preco_custo`/`preco_venda` (`combustiveis`, e `tanques`/`bicos` que carregam o combustível), `taxa`
  (`formas-pagamento`, `maquininhas`), `cnpj`/`contato` (`fornecedores`) e `telefone`/`data_admissao`
  (`frentistas`), e cada posto da rede vê só o próprio. Quem consome: só o painel web, sempre por
  `buscarNaApi` (`base.ts`, que manda o Bearer da sessão) — `bico.api.ts`, `combustivel.api.ts`,
  `compras.api.ts`, `equipe.api.ts` (`/turnos`), `formaPagamento.api.ts`, `fornecedor.api.ts`,
  `frentista.api.ts` e `proprietario.api.ts`. O PWA do frentista **não** usa o catálogo (tem
  `frentistas/escolha`, `regua/tanques`, `produtos` próprios), e o token de PIN é recusado aqui (401).
  Públicas seguem só `GET /saude`, `POST /login`, `POST /postos/{posto}/frentistas/entrar` e
  `GET /postos/{posto}/frentistas/escolha` (id e nome). Provas em
  `backend/tests/Feature/Cadastro/CatalogoTest.php` (401 × 9 rotas, 403 gerente de outro posto, 200 gerente
  do posto, vínculo inativo 403, token de frentista 401). Requisito de produção, igual às demais rotas
  protegidas: o painel precisa do login da API (`VITE_API_LOGIN=1`) ou de `Usuario.auth_user_id`
  vinculado, senão o catálogo responde 401.

## Fornecedor pelo painel (#103, 30/09/2026)

**Por quê:** no ensaio Jorro+BR o posto novo não tinha fornecedor, a API só **lia** a lista e o painel não tinha
onde cadastrar — nenhuma compra podia ser registrada no BR.

**Contrato** (grupo `posto.acesso:gerir`; o posto sai da rota, nunca do corpo; nada se apaga):

| Rota | Corpo | Resposta |
|---|---|---|
| `POST /api/postos/{posto}/fornecedores` | `{ nome, cnpj, contato?: string\|null, ativo }` | 201 `{ data: FornecedorResource }` |
| `PUT /api/postos/{posto}/fornecedores/{fornecedor}` | idem | 200; de outro posto 404 |

- **CNPJ** conferido pelos DV em `App\Cadastro\Domain\Cnpj`, numérico **ou alfanumérico** (IN RFB 2.229/2024,
  emitido desde julho de 2026); guardado sempre como `XX.XXX.XXX/XXXX-DD`. Recusa: 422 `cnpj_invalido`.
- **Único no posto**, inclusive entre inativos (`Fornecedor_cnpj_posto_id_key`); a conferência compara **sem
  máscara**, porque há cadastro antigo gravado sem pontuação. Recusa: 422 `cnpj_repetido`.
- Forma fora do contrato: 422 `corpo_invalido`. Desativar é `ativo: false`; as compras seguem apontando para ele.
- Peças: `FornecedorDoPainelRequest` → `FornecedoresController` → `FornecedoresDoPosto` → `RespostaDoFornecedor`
  (classe própria para a `RespostaDoCadastro` não passar do teto de acoplamento do PHPMD).
- Painel: "+ Novo fornecedor" na tela de Compras (`NovoFornecedor.tsx`), só com a API ligada; grava e já seleciona.
  Editar/desativar pela tela ainda não existe — a rota PUT existe e está testada.
