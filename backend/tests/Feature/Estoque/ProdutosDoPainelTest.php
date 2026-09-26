<?php

declare(strict_types=1);

use App\Compartilhado\Enums\PapelNoPosto;
use App\Compartilhado\Enums\Role;
use App\Compartilhado\Posto;
use App\Estoque\Domain\Produto;
use App\Pessoas\Domain\Usuario;
use App\Pessoas\Domain\UsuarioPosto;
use Illuminate\Support\Facades\DB;

use function Pest\Laravel\getJson;
use function Pest\Laravel\postJson;
use function Pest\Laravel\putJson;
use function Pest\Laravel\withToken;

/*
|--------------------------------------------------------------------------
| Tela "Produtos e Estoque" do painel pela API (#103, painel-pela-api.md §12)
|--------------------------------------------------------------------------
| GET  /estoque/produtos          — os produtos ATIVOS do posto, por nome, com o custo.
| POST /estoque/produtos          — "Novo Produto" (idempotente pela chave).
| PUT  /estoque/produtos/{id}     — "Editar Produto" (nunca mexe no estoque).
| POST /estoque/movimentacoes     — "Registrar Movimentação": entrada refaz o custo médio e soma,
|                                   saída subtrai, ajuste soma — numa transação, idempotente.
|
| Cenário: posto A com "Óleo 20W" (10 un a R$ 10,00), "Aditivo" (3 un a R$ 4,50) e "Filtro velho"
| (inativo); posto B com "Óleo do B".
*/

const SEGREDO_PE = 'segredo-de-teste-dos-produtos-do-painel';

const CHAVE_PE = '6f1c2d3e-4b5a-4c6d-8e7f-000000000001';

function b64urlPe(string $cru): string
{
    return rtrim(strtr(base64_encode($cru), '+/', '-_'), '=');
}

function tokenPe(Usuario $usuario): string
{
    $c = b64urlPe((string) json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $p = b64urlPe((string) json_encode(['sub' => (string) $usuario->auth_user_id, 'aud' => 'authenticated', 'exp' => time() + 3600]));

    return $c.'.'.$p.'.'.b64urlPe(hash_hmac('sha256', $c.'.'.$p, SEGREDO_PE, binary: true));
}

function usuarioPe(string $sub, int $postoId, Role $role, PapelNoPosto $papel): Usuario
{
    DB::table('auth.users')->insert(['id' => $sub, 'email' => $sub.'@teste.local']);
    $u = Usuario::query()->where('auth_user_id', $sub)->sole();
    $u->forceFill(['role' => $role, 'ativo' => true])->save();
    UsuarioPosto::factory()->create(['usuario_id' => $u->id, 'posto_id' => $postoId, 'role' => $papel, 'ativo' => true]);

    return $u->refresh();
}

function gerentePe(int $postoId): string
{
    return tokenPe(usuarioPe('7b000000-0000-4000-8000-000000000001', $postoId, Role::Gerente, PapelNoPosto::Gerente));
}

/** @return array{a: int, b: int, oleo: int, aditivo: int, velho: int, oleoB: int} */
function cenarioPe(): array
{
    $a = Posto::factory()->create()->id;
    $b = Posto::factory()->create()->id;
    $produto = static fn (int $posto, string $nome, string $custo, int $estoque, bool $ativo = true): int => Produto::factory()->create([
        'posto_id' => $posto, 'nome' => $nome, 'categoria' => 'Lubrificante', 'preco_custo' => $custo, 'preco_venda' => '19.90',
        'estoque_atual' => $estoque, 'estoque_minimo' => 5, 'ativo' => $ativo, 'codigo_barras' => null, 'descricao' => null,
    ])->id;

    return [
        'a' => $a, 'b' => $b,
        'oleo' => $produto($a, 'Óleo 20W', '10.00', 10),
        'aditivo' => $produto($a, 'Aditivo', '4.50', 3),
        'velho' => $produto($a, 'Filtro velho', '1.00', 1, false),
        'oleoB' => $produto($b, 'Óleo do B', '8.00', 50),
    ];
}

/**
 * @param  array<string, mixed>  $extra
 * @return array<string, mixed>
 */
function formularioPe(array $extra = []): array
{
    return [
        'nome' => 'Fluido de freio', 'codigo_barras' => '789123', 'categoria' => 'Aditivo', 'preco_custo' => '12.345',
        'preco_venda' => '19.9', 'estoque_minimo' => 4, 'unidade_medida' => 'unidade', 'descricao' => 'DOT 4', ...$extra,
    ];
}

/** @return array<string, mixed> */
function movimentoPe(int $produto, string $tipo, int $quantidade, ?string $valor = null, string $chave = CHAVE_PE): array
{
    return array_filter(['chave' => $chave, 'produto_id' => $produto, 'tipo' => $tipo, 'quantidade' => $quantidade, 'valor_unitario' => $valor, 'observacao' => 'NF 123'], static fn ($v): bool => $v !== null);
}

/**
 * `[estoque_atual, preco_custo]` do produto, lido cru do banco.
 *
 * @return array{int, string}
 */
function produtoNoBancoPe(int $id): array
{
    $linha = DB::table('Produto')->where('id', $id)->first(['estoque_atual', 'preco_custo']);

    return [(int) $linha?->estoque_atual, (string) $linha?->preco_custo];
}

beforeEach(function (): void {
    config(['supabase.jwt_secret' => SEGREDO_PE]);
});

it('sem token: 401 nas quatro rotas, e nada gravado', function (): void {
    $c = cenarioPe();

    getJson("/api/postos/{$c['a']}/estoque/produtos")->assertUnauthorized();
    postJson("/api/postos/{$c['a']}/estoque/produtos", formularioPe(['chave' => CHAVE_PE, 'estoque_inicial' => 1]))->assertUnauthorized();
    putJson("/api/postos/{$c['a']}/estoque/produtos/{$c['oleo']}", formularioPe())->assertUnauthorized();
    postJson("/api/postos/{$c['a']}/estoque/movimentacoes", movimentoPe($c['oleo'], 'entrada', 5, '20'))->assertUnauthorized();

    expect(DB::table('MovimentacaoEstoque')->count())->toBe(0)
        ->and(produtoNoBancoPe($c['oleo']))->toBe([10, '10.00'])
        ->and(DB::table('Produto')->where('nome', 'Fluido de freio')->exists())->toBeFalse();
});

it('operador do posto: 403 nas quatro — a tela traz custo e grava, é de quem gere', function (): void {
    $c = cenarioPe();
    withToken(tokenPe(usuarioPe('7b000000-0000-4000-8000-000000000009', $c['a'], Role::Operador, PapelNoPosto::Operador)));

    getJson("/api/postos/{$c['a']}/estoque/produtos")->assertForbidden();
    postJson("/api/postos/{$c['a']}/estoque/produtos", formularioPe(['chave' => CHAVE_PE, 'estoque_inicial' => 1]))->assertForbidden();
    putJson("/api/postos/{$c['a']}/estoque/produtos/{$c['oleo']}", formularioPe())->assertForbidden();
    postJson("/api/postos/{$c['a']}/estoque/movimentacoes", movimentoPe($c['oleo'], 'entrada', 5, '20'))->assertForbidden();

    expect(DB::table('MovimentacaoEstoque')->count())->toBe(0)->and(produtoNoBancoPe($c['oleo']))->toBe([10, '10.00']);
});

it('gerente do posto A no posto B: 403 nas quatro, e nada muda no B', function (): void {
    $c = cenarioPe();
    withToken(gerentePe($c['a']));

    getJson("/api/postos/{$c['b']}/estoque/produtos")->assertForbidden();
    postJson("/api/postos/{$c['b']}/estoque/produtos", formularioPe(['chave' => CHAVE_PE, 'estoque_inicial' => 1]))->assertForbidden();
    putJson("/api/postos/{$c['b']}/estoque/produtos/{$c['oleoB']}", formularioPe())->assertForbidden();
    postJson("/api/postos/{$c['b']}/estoque/movimentacoes", movimentoPe($c['oleoB'], 'entrada', 5, '20'))->assertForbidden();

    expect(produtoNoBancoPe($c['oleoB']))->toBe([50, '8.00'])
        ->and(DB::table('Produto')->where('id', $c['oleoB'])->value('nome'))->toBe('Óleo do B')
        ->and(DB::table('MovimentacaoEstoque')->count())->toBe(0);
});

it('lista só os ATIVOS do posto, por nome, com o custo em string decimal', function (): void {
    $c = cenarioPe();
    withToken(gerentePe($c['a']));

    $resposta = getJson("/api/postos/{$c['a']}/estoque/produtos")->assertOk();

    $nomes = collect((array) $resposta->json('data'))->pluck('nome')->all();
    expect($nomes)->toBe(['Aditivo', 'Óleo 20W'])
        ->and($resposta->json('data.1'))->toMatchArray([
            'id' => $c['oleo'], 'nome' => 'Óleo 20W', 'codigo_barras' => null, 'categoria' => 'Lubrificante', 'descricao' => null,
            'preco_custo' => '10.00', 'preco_venda' => '19.90', 'estoque_atual' => 10, 'estoque_minimo' => 5,
            'unidade_medida' => 'unidade', 'ativo' => true, 'posto_id' => $c['a'],
        ]);
});

it('cadastra no posto da ROTA, com o estoque inicial, e o numeric(10,2) arredonda os preços como antes', function (): void {
    $c = cenarioPe();
    withToken(gerentePe($c['a']));

    $resposta = postJson("/api/postos/{$c['a']}/estoque/produtos", formularioPe(['chave' => CHAVE_PE, 'estoque_inicial' => 7, 'posto_id' => $c['b']]))
        ->assertCreated()
        ->assertJsonPath('data.repetido', false);

    $gravado = DB::table('Produto')->where('id', $resposta->json('data.produto.id'))->first();
    expect($gravado)->not->toBeNull()
        ->and((array) $gravado)->toMatchArray([
            'nome' => 'Fluido de freio', 'codigo_barras' => '789123', 'categoria' => 'Aditivo', 'descricao' => 'DOT 4',
            'preco_custo' => '12.35', 'preco_venda' => '19.90', 'estoque_atual' => 7, 'estoque_minimo' => 4,
            'unidade_medida' => 'unidade', 'ativo' => true, 'posto_id' => $c['a'], 'chave_cadastro' => CHAVE_PE,
        ])
        ->and($resposta->json('data.produto.preco_custo'))->toBe('12.35')
        ->and(DB::table('MovimentacaoEstoque')->count())->toBe(0);
});

it('o mesmo "Novo Produto" chegando duas vezes cria UM produto; a chave em outro produto é 409', function (): void {
    $c = cenarioPe();
    withToken(gerentePe($c['a']));
    $corpo = formularioPe(['chave' => CHAVE_PE, 'estoque_inicial' => 7]);

    $primeiro = postJson("/api/postos/{$c['a']}/estoque/produtos", $corpo)->assertCreated();
    postJson("/api/postos/{$c['a']}/estoque/produtos", $corpo)->assertOk()
        ->assertJsonPath('data.repetido', true)
        ->assertJsonPath('data.produto.id', $primeiro->json('data.produto.id'));
    postJson("/api/postos/{$c['a']}/estoque/produtos", [...$corpo, 'nome' => 'Outro'])->assertStatus(409)
        ->assertJsonPath('erro.codigo', 'chave_reutilizada');

    expect(DB::table('Produto')->where('posto_id', $c['a'])->count())->toBe(4);
});

it('edita os campos do formulário e NÃO mexe no estoque; produto de outro posto é 404', function (): void {
    $c = cenarioPe();
    withToken(gerentePe($c['a']));

    putJson("/api/postos/{$c['a']}/estoque/produtos/{$c['oleo']}", formularioPe(['nome' => 'Óleo 20W50', 'estoque_atual' => 999, 'codigo_barras' => '']))
        ->assertOk()
        ->assertJsonPath('data.nome', 'Óleo 20W50')
        ->assertJsonPath('data.preco_custo', '12.35')
        ->assertJsonPath('data.codigo_barras', null)
        ->assertJsonPath('data.estoque_atual', 10);
    putJson("/api/postos/{$c['a']}/estoque/produtos/{$c['oleoB']}", formularioPe())->assertNotFound();

    expect(produtoNoBancoPe($c['oleo']))->toBe([10, '12.35'])
        ->and(DB::table('Produto')->where('id', $c['oleoB'])->value('nome'))->toBe('Óleo do B');
});

it('ENTRADA: soma o estoque, refaz o custo médio e grava a movimentação — repetir não soma de novo', function (): void {
    $c = cenarioPe();
    withToken(gerentePe($c['a']));

    // 10 un a R$ 10,00 + 10 un a R$ 20 → 20 un a R$ 15,00.
    $resposta = postJson("/api/postos/{$c['a']}/estoque/movimentacoes", movimentoPe($c['oleo'], 'entrada', 10, '20'))
        ->assertCreated()
        ->assertJsonPath('data.repetido', false)
        ->assertJsonPath('data.produto.estoque_atual', 20)
        ->assertJsonPath('data.produto.preco_custo', '15.00');

    $linha = DB::table('MovimentacaoEstoque')->sole();
    expect((array) $linha)->toMatchArray([
        'produto_id' => $c['oleo'], 'tipo' => 'entrada', 'quantidade' => 10, 'observacao' => 'NF 123',
        'responsavel' => null, 'posto_id' => $c['a'], 'chave_movimentacao' => CHAVE_PE,
    ])->and($resposta->json('data.movimentacao.id'))->toBe($linha->id);

    postJson("/api/postos/{$c['a']}/estoque/movimentacoes", movimentoPe($c['oleo'], 'entrada', 10, '20'))
        ->assertOk()->assertJsonPath('data.repetido', true)->assertJsonPath('data.produto.estoque_atual', 20);
    postJson("/api/postos/{$c['a']}/estoque/movimentacoes", movimentoPe($c['oleo'], 'entrada', 11, '20'))
        ->assertStatus(409)->assertJsonPath('erro.codigo', 'chave_reutilizada');

    expect(produtoNoBancoPe($c['oleo']))->toBe([20, '15.00'])->and(DB::table('MovimentacaoEstoque')->count())->toBe(1);
});

it('SAÍDA subtrai e AJUSTE soma, sem tocar o custo; o valor unitário fora da entrada é ignorado', function (): void {
    $c = cenarioPe();
    withToken(gerentePe($c['a']));

    postJson("/api/postos/{$c['a']}/estoque/movimentacoes", movimentoPe($c['aditivo'], 'saida', 5, '99', '6f1c2d3e-4b5a-4c6d-8e7f-000000000002'))
        ->assertCreated()->assertJsonPath('data.produto.estoque_atual', -2)->assertJsonPath('data.produto.preco_custo', '4.50');
    postJson("/api/postos/{$c['a']}/estoque/movimentacoes", movimentoPe($c['aditivo'], 'ajuste', 4, null, '6f1c2d3e-4b5a-4c6d-8e7f-000000000003'))
        ->assertCreated()->assertJsonPath('data.produto.estoque_atual', 2);
    // Entrada sem custo unitário: soma, e o custo fica.
    postJson("/api/postos/{$c['a']}/estoque/movimentacoes", movimentoPe($c['aditivo'], 'entrada', 1, null, '6f1c2d3e-4b5a-4c6d-8e7f-000000000004'))
        ->assertCreated()->assertJsonPath('data.produto.estoque_atual', 3);

    expect(produtoNoBancoPe($c['aditivo']))->toBe([3, '4.50'])
        ->and(DB::table('MovimentacaoEstoque')->orderBy('id')->pluck('tipo')->all())->toBe(['saida', 'ajuste', 'entrada']);
});

it('o custo médio arredonda o valor EXATO: 4 un a 106,75 + 100 a 434,948 = 422,325 → 422.33', function (): void {
    $c = cenarioPe();
    DB::table('Produto')->where('id', $c['oleo'])->update(['estoque_atual' => 4, 'preco_custo' => '106.75']);
    withToken(gerentePe($c['a']));

    postJson("/api/postos/{$c['a']}/estoque/movimentacoes", movimentoPe($c['oleo'], 'entrada', 100, '434.948'))->assertCreated();

    expect(produtoNoBancoPe($c['oleo']))->toBe([104, '422.33']);
});

it('produto de OUTRO posto na movimentação: 422 produto_invalido, e nada muda', function (): void {
    $c = cenarioPe();
    withToken(gerentePe($c['a']));

    postJson("/api/postos/{$c['a']}/estoque/movimentacoes", movimentoPe($c['oleoB'], 'entrada', 5, '20'))
        ->assertStatus(422)->assertJsonPath('erro.codigo', 'produto_invalido');

    expect(produtoNoBancoPe($c['oleoB']))->toBe([50, '8.00'])->and(DB::table('MovimentacaoEstoque')->count())->toBe(0);
});

it('custo médio que não cabe no numeric(10,2): 422 custo_fora_da_coluna, e nada gravado', function (): void {
    $c = cenarioPe();
    // Estoque −999 e entrada de 1000: o denominador é 1 e a média extrapola.
    DB::table('Produto')->where('id', $c['oleo'])->update(['estoque_atual' => -999]);
    withToken(gerentePe($c['a']));

    postJson("/api/postos/{$c['a']}/estoque/movimentacoes", movimentoPe($c['oleo'], 'entrada', 1000, '9999999'))
        ->assertStatus(422)->assertJsonPath('erro.codigo', 'custo_fora_da_coluna');

    expect(produtoNoBancoPe($c['oleo']))->toBe([-999, '10.00'])->and(DB::table('MovimentacaoEstoque')->count())->toBe(0);
});

it('forma: 422 corpo_invalido', function (array $troca): void {
    $c = cenarioPe();
    withToken(gerentePe($c['a']));

    postJson("/api/postos/{$c['a']}/estoque/movimentacoes", [...movimentoPe($c['oleo'], 'entrada', 5, '20'), ...$troca])
        ->assertStatus(422)->assertJsonPath('erro.codigo', 'corpo_invalido');

    expect(DB::table('MovimentacaoEstoque')->count())->toBe(0);
})->with([
    'quantidade zero' => [['quantidade' => 0]],
    'quantidade fracionada' => [['quantidade' => 1.5]],
    'tipo fora da tela' => [['tipo' => 'perda']],
    'valor unitário como número JSON' => [['valor_unitario' => 20]],
    'valor unitário com vírgula' => [['valor_unitario' => '20,5']],
    'sem chave' => [['chave' => null]],
]);

it('forma do produto: preço como número JSON, sem nome ou estoque fracionado é 422 corpo_invalido', function (array $troca): void {
    $c = cenarioPe();
    withToken(gerentePe($c['a']));

    postJson("/api/postos/{$c['a']}/estoque/produtos", [...formularioPe(['chave' => CHAVE_PE, 'estoque_inicial' => 1]), ...$troca])
        ->assertStatus(422)->assertJsonPath('erro.codigo', 'corpo_invalido');

    expect(DB::table('Produto')->where('posto_id', $c['a'])->count())->toBe(3);
})->with([
    'preço número' => [['preco_custo' => 12.5]],
    'preço com expoente' => [['preco_venda' => '1e3']],
    'preço com 8 dígitos inteiros' => [['preco_venda' => '12345678']],
    'sem nome' => [['nome' => '']],
    'estoque inicial fracionado' => [['estoque_inicial' => 2.5]],
    'sem chave' => [['chave' => null]],
]);
