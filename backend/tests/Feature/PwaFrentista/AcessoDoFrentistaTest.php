<?php

declare(strict_types=1);

use App\Compartilhado\Enums\PapelNoPosto;
use App\Compartilhado\Enums\Role;
use App\Pessoas\Application\DefinePinDoFrentista;
use App\Pessoas\Domain\AcessoFrentista;
use App\Pessoas\Domain\TokenDeAcesso;
use App\Pessoas\Domain\Usuario;
use App\Pessoas\Domain\UsuarioPosto;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\PendingCommand;
use Illuminate\Testing\TestResponse;

use function Pest\Laravel\artisan;
use function Pest\Laravel\getJson;
use function Pest\Laravel\postJson;
use function Pest\Laravel\travel;
use function Pest\Laravel\withToken;

require_once __DIR__.'/Cenario.php';

/*
|--------------------------------------------------------------------------
| Login do frentista por PIN (#101) e as fronteiras do token
|--------------------------------------------------------------------------
| PIN por frentista (decisão do dono, 19/09/2026): o PIN fica em hash, o login devolve um token
| curto de frentista, e a falha é UMA resposta só. O token do frentista não abre rota de gerente e
| o do gerente não abre rota de frentista.
*/

/** @return TestResponse<JsonResponse> */
function entrarNoPwa(int $postoId, int $frentistaId, string $pin): TestResponse
{
    return postJson("/api/postos/{$postoId}/frentistas/entrar", ['frentista_id' => $frentistaId, 'pin' => $pin]);
}

it('entra com o PIN certo e recebe token de frentista que vence no fim do turno (14 h)', function (): void {
    ['posto' => $posto, 'frentista' => $frentista] = postoDoPwa();

    $resposta = entrarNoPwa($posto->id, $frentista->id, PIN_PWA)
        ->assertOk()
        ->assertJsonPath('frentista', ['id' => $frentista->id, 'nome' => $frentista->nome]);

    $acesso = TokenDeAcesso::query()->latest('id')->firstOrFail();
    expect($resposta->json('token'))->toStartWith($acesso->id.'|posto_');
    expect($acesso->tokenable_type)->toBe(AcessoFrentista::class);
    expect($acesso->getAttribute('abilities'))->toBe([AcessoFrentista::ABILITY]);
    expect($acesso->expires_at?->diffInMinutes(now()->addHours(14), absolute: true))->toBeLessThan(2.0);
    expect($resposta->json('vence_em'))->toEndWith('Z');
});

it('o PIN é gravado como hash, nunca em claro', function (): void {
    ['frentista' => $frentista] = postoDoPwa();

    $gravado = DB::table('AcessoFrentista')->where('frentista_id', $frentista->id)->value('pin_hash');

    expect($gravado)->toBeString()->toStartWith('$2y$');
    expect($gravado === PIN_PWA)->toBeFalse();
});

it('PIN errado, frentista inativo, sem PIN ou de outro posto: a MESMA resposta 401', function (): void {
    ['posto' => $posto, 'frentista' => $frentista] = postoDoPwa();
    ['posto' => $outro] = postoDoPwa();
    $inativo = frentistaDoPwa($posto, ativo: false);
    $semPin = frentistaDoPwa($posto, pin: null);

    $respostas = [
        entrarNoPwa($posto->id, $frentista->id, '0000'),
        entrarNoPwa($posto->id, $inativo->id, PIN_PWA),
        entrarNoPwa($posto->id, $semPin->id, PIN_PWA),
        entrarNoPwa($outro->id, $frentista->id, PIN_PWA),
        entrarNoPwa($posto->id, 999999, PIN_PWA),
    ];

    foreach ($respostas as $resposta) {
        $resposta->assertUnauthorized()->assertExactJson(['message' => 'Frentista ou PIN incorretos.']);
    }
    expect(TokenDeAcesso::query()->count())->toBe(0);
});

it('PIN fora do formato é 422 (o PIN vai como texto: "0123" não vira 123)', function (mixed $pin): void {
    ['posto' => $posto, 'frentista' => $frentista] = postoDoPwa();

    postJson("/api/postos/{$posto->id}/frentistas/entrar", ['frentista_id' => $frentista->id, 'pin' => $pin])
        ->assertUnprocessable();
})->with(['123', '1234567', 'abcd', 4821]);

it('token vencido é 401 nas rotas do frentista', function (): void {
    ['posto' => $posto, 'frentista' => $frentista] = postoDoPwa();
    $token = tokenDoFrentista($posto, $frentista);

    travel(14)->hours();
    travel(1)->minutes();

    withToken($token)->postJson("/api/postos/{$posto->id}/presenca")->assertUnauthorized();
});

it('frentista desativado depois do login perde o acesso na hora', function (): void {
    ['posto' => $posto, 'frentista' => $frentista] = postoDoPwa();
    $token = tokenDoFrentista($posto, $frentista);

    DB::table('Frentista')->where('id', $frentista->id)->update(['ativo' => false]);

    withToken($token)->postJson("/api/postos/{$posto->id}/presenca")->assertUnauthorized();
});

it('o token do frentista não abre rota de gerente', function (): void {
    ['posto' => $posto, 'frentista' => $frentista] = postoDoPwa();
    $token = tokenDoFrentista($posto, $frentista);

    withToken($token)->getJson('/api/eu')->assertUnauthorized();
    withToken($token)->getJson("/api/postos/{$posto->id}/sessoes?data=".DIA_PWA)->assertUnauthorized();
});

it('o token do gerente (ability *) não abre rota de frentista', function (): void {
    ['posto' => $posto, 'frentista' => $frentista] = postoDoPwa();
    // O pior caso: o gerente tem o MESMO id do frentista deste posto. Só a classe do dono do token
    // separa os dois — `tokenable_id` sozinho apontaria para o frentista.
    expect(Usuario::query()->find($frentista->id))->toBeNull();
    $gerente = Usuario::factory()->create([
        'id' => $frentista->id, 'email' => 'gerente.pwa@teste.com', 'role' => Role::Gerente, 'senha' => 'senha-do-gerente-1',
    ]);
    UsuarioPosto::factory()->create(['usuario_id' => $gerente->id, 'posto_id' => $posto->id, 'role' => PapelNoPosto::Gerente]);
    $token = postJson('/api/login', ['email' => 'gerente.pwa@teste.com', 'senha' => 'senha-do-gerente-1'])->assertOk()->json('token');
    $token = is_string($token) ? $token : '';

    expect($token)->not->toBe('');
    withToken($token)->postJson("/api/postos/{$posto->id}/presenca")->assertUnauthorized();
    withToken($token)->postJson("/api/postos/{$posto->id}/envios", corpoDoEnvio())->assertUnauthorized();
});

it('trocar o PIN derruba as sessões abertas do frentista', function (): void {
    ['posto' => $posto, 'frentista' => $frentista] = postoDoPwa();
    $token = tokenDoFrentista($posto, $frentista);

    frentistaDoPwaTrocaPin($frentista->id, '5555');

    withToken($token)->postJson("/api/postos/{$posto->id}/presenca")->assertUnauthorized();
    entrarNoPwa($posto->id, $frentista->id, PIN_PWA)->assertUnauthorized();
    entrarNoPwa($posto->id, $frentista->id, '5555')->assertOk();
});

it('o login por PIN é limitado: a 6ª tentativa no mesmo frentista em um minuto é 429', function (): void {
    ['posto' => $posto, 'frentista' => $frentista] = postoDoPwa();

    foreach (range(1, 5) as $_) {
        entrarNoPwa($posto->id, $frentista->id, '0000')->assertUnauthorized();
    }

    entrarNoPwa($posto->id, $frentista->id, PIN_PWA)->assertTooManyRequests();
});

it('frentista:pin pede o PIN duas vezes e grava o hash', function (): void {
    ['posto' => $posto, 'frentista' => $frentista] = postoDoPwa();

    $comando = artisan('frentista:pin', ['frentista_id' => (string) $frentista->id]);
    expect($comando)->toBeInstanceOf(PendingCommand::class);
    if ($comando instanceof PendingCommand) {
        $comando->expectsQuestion('PIN (4 a 6 dígitos)', '9090')
            ->expectsQuestion('Repita o PIN', '9090')
            ->assertSuccessful()
            ->run();
    }

    entrarNoPwa($posto->id, $frentista->id, '9090')->assertOk();
});

it('frentista:pin recusa PIN fora do formato, PINs que não conferem e frentista inexistente', function (string $id, string $pin, string $repetido): void {
    $comando = artisan('frentista:pin', ['frentista_id' => $id]);
    expect($comando)->toBeInstanceOf(PendingCommand::class);
    if ($comando instanceof PendingCommand) {
        $comando->expectsQuestion('PIN (4 a 6 dígitos)', $pin)->expectsQuestion('Repita o PIN', $repetido)->assertFailed()->run();
    }
})->with([
    'curto' => ['1', '12', '12'],
    'não conferem' => ['1', '1234', '4321'],
    'inexistente' => ['999999', '1234', '1234'],
]);

it('GET de rota do frentista não existe (só POST)', function (): void {
    ['posto' => $posto] = postoDoPwa();

    getJson("/api/postos/{$posto->id}/envios")->assertStatus(405);
});

function frentistaDoPwaTrocaPin(int $frentistaId, string $pin): void
{
    expect(app(DefinePinDoFrentista::class)($frentistaId, $pin))->toBeTrue();
}
