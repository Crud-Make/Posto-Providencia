<?php

declare(strict_types=1);

use App\Cadastro\Domain\Combustivel;
use App\Cadastro\Domain\Fornecedor;
use App\Cadastro\Domain\Tanque;
use App\Compartilhado\Enums\PapelNoPosto;
use App\Compartilhado\Enums\Role;
use App\Compartilhado\Posto;
use App\Compartilhado\PostoAtual;
use App\Compras\Domain\Compra;
use App\Estoque\Domain\Estoque;
use App\Pessoas\Application\VerificaTokenDoSupabase;
use App\Pessoas\Domain\Usuario;
use App\Pessoas\Domain\UsuarioPosto;
use Illuminate\Support\Facades\DB;

use function Pest\Laravel\postJson;
use function Pest\Laravel\withToken;

/*
|--------------------------------------------------------------------------
| POST /api/postos/{posto}/compras — o "Salvar" do Registro de Compras (#103)
|--------------------------------------------------------------------------
| Os EFEITOS são os de `usePersistenciaRegistro` + `compraService.create` + `tanqueService` no
| Supabase, com os números que o Supabase gravaria (o float do painel arredondado pelo Postgres na
| escala da coluna — conferido à parte em node + psql, ver o Design Doc):
|
|   Compra GC:  5000 L por R$ 29.175,50 → custo 5.8351;  Estoque 10000.50 → 15000.50;
|               Tanque 8000.25 → 13000.25
|   Compra ET:  3000,555 L por R$ 10.000,00 → Compra.quantidade_litros 3000.56, custo 3.3327;
|               Estoque 2000.10 → 5000.66 (o float dá 5000.655 e o numeric(15,2) sobe)
|   Régua GC:   volume_livro "13654.123" → 13654.12; volume_fisico "13600" → 13600.00
|   Régua ET:   sem medição → o volume_fisico que o PWA gravou no dia FICA.
*/

const SEGREDO_CP = 'segredo-de-teste-das-compras';

const DIA_CP = '2026-01-20';

function b64urlCp(string $cru): string
{
    return rtrim(strtr(base64_encode($cru), '+/', '-_'), '=');
}

function tokenCp(string $sub): string
{
    $c = b64urlCp((string) json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $p = b64urlCp((string) json_encode(['sub' => $sub, 'aud' => 'authenticated', 'exp' => time() + 3600]));

    return $c.'.'.$p.'.'.b64urlCp(hash_hmac('sha256', $c.'.'.$p, SEGREDO_CP, binary: true));
}

function usuarioCp(string $sub, int $postoId, Role $role, PapelNoPosto $papel): Usuario
{
    DB::table('auth.users')->insert(['id' => $sub, 'email' => $sub.'@teste.local']);
    $u = Usuario::query()->where('auth_user_id', $sub)->sole();
    $u->forceFill(['role' => $role, 'ativo' => true])->save();
    UsuarioPosto::factory()->create(['usuario_id' => $u->id, 'posto_id' => $postoId, 'role' => $papel, 'ativo' => true]);

    return $u->refresh();
}

/**
 * Um posto com dois combustíveis, cada um com tanque e linha de Estoque, e um fornecedor.
 *
 * @return array{posto: Posto, gc: Combustivel, et: Combustivel, tanqueGc: Tanque, tanqueEt: Tanque, fornecedor: Fornecedor}
 */
function cenarioCp(): array
{
    $posto = Posto::factory()->create();
    app(PostoAtual::class)->definir($posto->id);

    $gc = Combustivel::factory()->create(['nome' => 'Gasolina Comum']);
    $et = Combustivel::factory()->create(['nome' => 'Etanol']);
    $tanqueGc = Tanque::factory()->create(['combustivel_id' => $gc->id, 'estoque_atual' => '8000.25']);
    $tanqueEt = Tanque::factory()->create(['combustivel_id' => $et->id, 'estoque_atual' => '1000.00']);
    Estoque::factory()->create(['combustivel_id' => $gc->id, 'quantidade_atual' => '10000.50', 'custo_medio' => '5.10']);
    Estoque::factory()->create(['combustivel_id' => $et->id, 'quantidade_atual' => '2000.10', 'custo_medio' => '3.90']);

    $cenario = [
        'posto' => $posto, 'gc' => $gc, 'et' => $et, 'tanqueGc' => $tanqueGc, 'tanqueEt' => $tanqueEt,
        'fornecedor' => Fornecedor::factory()->create(),
    ];
    app(PostoAtual::class)->limpar();

    return $cenario;
}

/**
 * O corpo do "Salvar"; `$troca` é `caminho.com.pontos => valor` (data_set), para estragar um campo.
 *
 * @param  array{posto: Posto, gc: Combustivel, et: Combustivel, tanqueGc: Tanque, tanqueEt: Tanque, fornecedor: Fornecedor}  $c
 * @param  array<string, mixed>  $troca
 * @return array<string, mixed>
 */
function corpoCp(array $c, array $troca = []): array
{
    $corpo = [
        'chave' => 'a0000000-0000-4000-8000-000000000001',
        'data' => DIA_CP,
        'fornecedor_id' => $c['fornecedor']->id,
        'itens' => [
            [
                'combustivel_id' => $c['gc']->id, 'tanque_id' => $c['tanqueGc']->id,
                'compra' => ['quantidade_litros' => '5000', 'valor_total' => '29175.50'],
                'volume_livro' => '13654.123', 'volume_fisico' => '13600',
            ],
            [
                'combustivel_id' => $c['et']->id, 'tanque_id' => $c['tanqueEt']->id,
                'compra' => ['quantidade_litros' => '3000.555', 'valor_total' => '10000.00'],
                'volume_livro' => '4200.5', 'volume_fisico' => null,
            ],
        ],
    ];
    foreach ($troca as $caminho => $valor) {
        data_set($corpo, $caminho, $valor);
    }

    return is_array($corpo) ? $corpo : [];
}

function urlCp(int $postoId): string
{
    return "/api/postos/{$postoId}/compras";
}

/** Coluna numeric como o PDO a entrega (string), sem o cast do Eloquent mudar a escala. */
function textoCp(mixed $valor): string
{
    return is_string($valor) || is_int($valor) ? (string) $valor : 'null';
}

/** @return array{estoque: string, tanque: string} */
function saldosCp(Combustivel $combustivel, Tanque $tanque): array
{
    return [
        'estoque' => textoCp(DB::table('Estoque')->where('combustivel_id', $combustivel->id)->value('quantidade_atual')),
        'tanque' => textoCp(DB::table('Tanque')->where('id', $tanque->id)->value('estoque_atual')),
    ];
}

/** @return array{livro: string, fisico: string} */
function reguaCp(Tanque $tanque): array
{
    $linha = DB::table('HistoricoTanque')->where('tanque_id', $tanque->id)->where('data', DIA_CP)->first();

    return ['livro' => textoCp($linha?->volume_livro), 'fisico' => textoCp($linha?->volume_fisico)];
}

beforeEach(function (): void {
    config(['supabase.jwt_secret' => SEGREDO_CP]);
    app()->forgetInstance(VerificaTokenDoSupabase::class);
});

it('sem token: 401 e nada gravado', function (): void {
    $c = cenarioCp();

    postJson(urlCp($c['posto']->id), corpoCp($c))->assertUnauthorized();

    expect(DB::table('Compra')->count())->toBe(0);
});

it('operador do posto: 403 — compra é escrita de quem gere', function (): void {
    $c = cenarioCp();
    $operador = usuarioCp('cc000000-0000-4000-8000-000000000001', $c['posto']->id, Role::Operador, PapelNoPosto::Operador);

    withToken(tokenCp((string) $operador->auth_user_id))
        ->postJson(urlCp($c['posto']->id), corpoCp($c))->assertForbidden();

    expect(DB::table('Compra')->count())->toBe(0);
});

it('gerente de OUTRO posto: 403 no posto vizinho, e nada muda lá', function (): void {
    $c = cenarioCp();
    $vizinho = Posto::factory()->create();
    $gerenteDoVizinho = usuarioCp('cc000000-0000-4000-8000-000000000002', $vizinho->id, Role::Gerente, PapelNoPosto::Gerente);

    withToken(tokenCp((string) $gerenteDoVizinho->auth_user_id))
        ->postJson(urlCp($c['posto']->id), corpoCp($c))->assertForbidden();

    expect(DB::table('Compra')->count())->toBe(0)
        ->and(saldosCp($c['gc'], $c['tanqueGc']))->toBe(['estoque' => '10000.50', 'tanque' => '8000.25']);
});

it('gerente: 201 e os efeitos com os números que o Supabase gravaria', function (): void {
    $c = cenarioCp();
    DB::table('HistoricoTanque')->insert(['tanque_id' => $c['tanqueEt']->id, 'data' => DIA_CP, 'volume_fisico' => '4100.00']);
    $gerente = usuarioCp('cc000000-0000-4000-8000-000000000003', $c['posto']->id, Role::Gerente, PapelNoPosto::Gerente);

    $resposta = withToken(tokenCp((string) $gerente->auth_user_id))
        ->postJson(urlCp($c['posto']->id), corpoCp($c))
        ->assertCreated()
        ->assertJsonPath('data.repetido', false)
        ->assertJsonCount(2, 'data.compras')
        ->assertJsonPath('data.compras.0.quantidade_litros', '5000.00')
        ->assertJsonPath('data.compras.0.valor_total', '29175.50')
        ->assertJsonPath('data.compras.0.custo_por_litro', '5.8351')
        ->assertJsonPath('data.compras.0.data', DIA_CP.'T00:00:00Z')
        ->assertJsonPath('data.compras.1.quantidade_litros', '3000.56')
        ->assertJsonPath('data.compras.1.custo_por_litro', '3.3327');

    expect($resposta->getContent())->toContain('"valor_total":"29175.50"');

    $compras = Compra::query()->orderBy('id')->get();
    expect($compras)->toHaveCount(2)
        ->and($compras[0]?->posto_id)->toBe($c['posto']->id)
        ->and($compras[0]?->fornecedor_id)->toBe($c['fornecedor']->id)
        ->and($compras[0]?->observacoes)->toBe('Atualização de estoque via Painel')
        ->and($compras[0]?->data->utc()->format('Y-m-d H:i'))->toBe(DIA_CP.' 00:00');

    expect(saldosCp($c['gc'], $c['tanqueGc']))->toBe(['estoque' => '15000.50', 'tanque' => '13000.25'])
        ->and(saldosCp($c['et'], $c['tanqueEt']))->toBe(['estoque' => '5000.66', 'tanque' => '4000.56']);

    // custo_medio NÃO é carimbado (o painel parou em 03/09/2026).
    expect(textoCp(DB::table('Estoque')->where('combustivel_id', $c['gc']->id)->value('custo_medio')))->toBe('5.1000');

    expect(reguaCp($c['tanqueGc']))->toBe(['livro' => '13654.12', 'fisico' => '13600.00'])
        ->and(reguaCp($c['tanqueEt']))->toBe(['livro' => '4200.50', 'fisico' => '4100.00']);   // a régua do PWA fica
});

it('a mesma chave de novo: 200 repetido, e os litros NÃO somam duas vezes', function (): void {
    $c = cenarioCp();
    $gerente = usuarioCp('cc000000-0000-4000-8000-000000000004', $c['posto']->id, Role::Gerente, PapelNoPosto::Gerente);
    $token = tokenCp((string) $gerente->auth_user_id);

    withToken($token)->postJson(urlCp($c['posto']->id), corpoCp($c))->assertCreated();
    withToken($token)->postJson(urlCp($c['posto']->id), corpoCp($c))
        ->assertOk()
        ->assertJsonPath('data.repetido', true)
        ->assertJsonCount(2, 'data.compras');

    expect(DB::table('Compra')->count())->toBe(2)
        ->and(saldosCp($c['gc'], $c['tanqueGc']))->toBe(['estoque' => '15000.50', 'tanque' => '13000.25']);
});

it('a mesma chave com outro valor: 409 chave_reutilizada', function (): void {
    $c = cenarioCp();
    $gerente = usuarioCp('cc000000-0000-4000-8000-000000000005', $c['posto']->id, Role::Gerente, PapelNoPosto::Gerente);
    $token = tokenCp((string) $gerente->auth_user_id);

    withToken($token)->postJson(urlCp($c['posto']->id), corpoCp($c))->assertCreated();
    $outro = corpoCp($c, ['itens.0.compra.valor_total' => '29175.51']);

    withToken($token)->postJson(urlCp($c['posto']->id), $outro)
        ->assertStatus(409)
        ->assertJsonPath('erro.codigo', 'chave_reutilizada');

    expect(DB::table('Compra')->count())->toBe(2);
});

it('recusas de posto: fornecedor, combustível e tanque do vizinho são 422 e nada é gravado', function (string $campo, string $codigo): void {
    $c = cenarioCp();
    $vizinho = cenarioCp();
    $gerente = usuarioCp('cc000000-0000-4000-8000-'.sprintf('%012d', 100 + strlen($campo)), $c['posto']->id, Role::Gerente, PapelNoPosto::Gerente);

    $corpo = corpoCp($c, match ($campo) {
        'fornecedor' => ['fornecedor_id' => $vizinho['fornecedor']->id],
        'combustivel' => ['itens.1.combustivel_id' => $vizinho['et']->id],
        default => ['itens.1.tanque_id' => $vizinho['tanqueEt']->id],
    });

    withToken(tokenCp((string) $gerente->auth_user_id))
        ->postJson(urlCp($c['posto']->id), $corpo)
        ->assertStatus(422)
        ->assertJsonPath('erro.codigo', $codigo);

    expect(DB::table('Compra')->count())->toBe(0)
        ->and(saldosCp($c['gc'], $c['tanqueGc']))->toBe(['estoque' => '10000.50', 'tanque' => '8000.25'])
        ->and(DB::table('HistoricoTanque')->count())->toBe(0);
})->with([
    'fornecedor' => ['fornecedor', 'fornecedor_invalido'],
    'combustivel' => ['combustivel', 'combustivel_invalido'],
    'tanque' => ['tanquex', 'tanque_invalido'],
]);

it('tanque do posto mas de outro combustível: 422 tanque_invalido', function (): void {
    $c = cenarioCp();
    $gerente = usuarioCp('cc000000-0000-4000-8000-000000000011', $c['posto']->id, Role::Gerente, PapelNoPosto::Gerente);
    $corpo = corpoCp($c, ['itens.1.tanque_id' => $c['tanqueGc']->id]);

    withToken(tokenCp((string) $gerente->auth_user_id))
        ->postJson(urlCp($c['posto']->id), $corpo)
        ->assertStatus(422)->assertJsonPath('erro.codigo', 'tanque_invalido');
});

it('compra sem fornecedor: 422 fornecedor_invalido (o alert do painel, agora no servidor)', function (): void {
    $c = cenarioCp();
    $gerente = usuarioCp('cc000000-0000-4000-8000-000000000012', $c['posto']->id, Role::Gerente, PapelNoPosto::Gerente);

    withToken(tokenCp((string) $gerente->auth_user_id))
        ->postJson(urlCp($c['posto']->id), corpoCp($c, ['fornecedor_id' => null]))
        ->assertStatus(422)->assertJsonPath('erro.codigo', 'fornecedor_invalido');
});

it('só régua, sem compra e sem fornecedor: 201, grava a régua e não toca o estoque', function (): void {
    $c = cenarioCp();
    $gerente = usuarioCp('cc000000-0000-4000-8000-000000000013', $c['posto']->id, Role::Gerente, PapelNoPosto::Gerente);
    $corpo = corpoCp($c, ['fornecedor_id' => null, 'itens.0.compra' => null, 'itens.1.compra' => null]);

    withToken(tokenCp((string) $gerente->auth_user_id))
        ->postJson(urlCp($c['posto']->id), $corpo)
        ->assertCreated()->assertJsonCount(0, 'data.compras')->assertJsonCount(2, 'data.medicoes');

    expect(DB::table('Compra')->count())->toBe(0)
        ->and(saldosCp($c['gc'], $c['tanqueGc']))->toBe(['estoque' => '10000.50', 'tanque' => '8000.25'])
        ->and(DB::table('HistoricoTanque')->count())->toBe(2);
});

it('régua fora da janela de escrita: 422 fora_da_janela e NENHUMA compra (o Supabase deixava a primeira)', function (): void {
    $c = cenarioCp();
    $gerente = usuarioCp('cc000000-0000-4000-8000-000000000014', $c['posto']->id, Role::Gerente, PapelNoPosto::Gerente);

    withToken(tokenCp((string) $gerente->auth_user_id))
        ->postJson(urlCp($c['posto']->id), corpoCp($c, ['data' => '2025-12-30']))
        ->assertStatus(422)->assertJsonPath('erro.codigo', 'fora_da_janela');

    expect(DB::table('Compra')->count())->toBe(0);
});

it('compra sem tanque fora da janela: grava — a policy de Compra não tem janela', function (): void {
    $c = cenarioCp();
    $gerente = usuarioCp('cc000000-0000-4000-8000-000000000015', $c['posto']->id, Role::Gerente, PapelNoPosto::Gerente);
    $corpo = corpoCp($c, ['data' => '2025-11-30', 'itens' => [['combustivel_id' => $c['gc']->id, 'tanque_id' => null,
        'compra' => ['quantidade_litros' => '1000', 'valor_total' => '5000.00'], 'volume_livro' => null, 'volume_fisico' => null]]]);

    withToken(tokenCp((string) $gerente->auth_user_id))
        ->postJson(urlCp($c['posto']->id), $corpo)->assertCreated();

    expect(saldosCp($c['gc'], $c['tanqueGc']))->toBe(['estoque' => '11000.50', 'tanque' => '8000.25']);
});

it('custo que não cabe em numeric(10,4): 422 custo_fora_do_limite', function (): void {
    $c = cenarioCp();
    $gerente = usuarioCp('cc000000-0000-4000-8000-000000000016', $c['posto']->id, Role::Gerente, PapelNoPosto::Gerente);
    $corpo = corpoCp($c, ['itens.0.compra' => ['quantidade_litros' => '0.001', 'valor_total' => '1000000.00']]);

    withToken(tokenCp((string) $gerente->auth_user_id))
        ->postJson(urlCp($c['posto']->id), $corpo)
        ->assertStatus(422)->assertJsonPath('erro.codigo', 'custo_fora_do_limite');
});

it('forma: número JSON, BR, litros zero, combustível repetido e tanque sem volume_livro são 422 corpo_invalido', function (string $caminho, mixed $valor): void {
    $c = cenarioCp();
    $gerente = usuarioCp('cc000000-0000-4000-8000-000000000017', $c['posto']->id, Role::Gerente, PapelNoPosto::Gerente);

    withToken(tokenCp((string) $gerente->auth_user_id))
        ->postJson(urlCp($c['posto']->id), corpoCp($c, [$caminho => $valor === 'GC' ? $c['gc']->id : $valor]))
        ->assertStatus(422)
        ->assertJsonPath('erro.codigo', 'corpo_invalido')
        ->assertJsonStructure(['erro' => ['campos' => [$caminho]]]);

    expect(DB::table('Compra')->count())->toBe(0);
})->with([
    'valor em número' => ['itens.0.compra.valor_total', 29175.5],
    'valor em BR' => ['itens.0.compra.valor_total', '29.175,50'],
    'litros zero' => ['itens.0.compra.quantidade_litros', '0.00'],
    'combustível repetido' => ['itens.1.combustivel_id', 'GC'],
    'tanque sem volume_livro' => ['itens.0.volume_livro', null],
    'chave que não é uuid' => ['chave', 'abc'],
]);
it('o modelo Compra é escopado pelo posto atual', function (): void {
    $c = cenarioCp();
    $gerente = usuarioCp('cc000000-0000-4000-8000-000000000018', $c['posto']->id, Role::Gerente, PapelNoPosto::Gerente);
    withToken(tokenCp((string) $gerente->auth_user_id))->postJson(urlCp($c['posto']->id), corpoCp($c))->assertCreated();

    app(PostoAtual::class)->definir(Posto::factory()->create()->id);
    expect(Compra::query()->count())->toBe(0);
    app(PostoAtual::class)->definir($c['posto']->id);
    expect(Compra::query()->count())->toBe(2);
});

it('a mesma chave com um combustível a menos: 409 chave_reutilizada', function (): void {
    $c = cenarioCp();
    $gerente = usuarioCp('cc000000-0000-4000-8000-000000000019', $c['posto']->id, Role::Gerente, PapelNoPosto::Gerente);
    $token = tokenCp((string) $gerente->auth_user_id);

    withToken($token)->postJson(urlCp($c['posto']->id), corpoCp($c))->assertCreated();
    withToken($token)->postJson(urlCp($c['posto']->id), corpoCp($c, ['itens.1.compra' => null]))
        ->assertStatus(409)->assertJsonPath('erro.codigo', 'chave_reutilizada');
});

it('tanque de OUTRO posto apontando para combustível deste: 422 tanque_invalido (o filtro de posto do tanque)', function (): void {
    $c = cenarioCp();
    $vizinho = Posto::factory()->create();
    $tanqueAlheio = Tanque::factory()->create(['posto_id' => $vizinho->id, 'combustivel_id' => $c['et']->id, 'estoque_atual' => '500.00']);
    $gerente = usuarioCp('cc000000-0000-4000-8000-000000000020', $c['posto']->id, Role::Gerente, PapelNoPosto::Gerente);

    withToken(tokenCp((string) $gerente->auth_user_id))
        ->postJson(urlCp($c['posto']->id), corpoCp($c, ['itens.1.tanque_id' => $tanqueAlheio->id]))
        ->assertStatus(422)->assertJsonPath('erro.codigo', 'tanque_invalido');

    expect(textoCp(DB::table('Tanque')->where('id', $tanqueAlheio->id)->value('estoque_atual')))->toBe('500.00');
});
