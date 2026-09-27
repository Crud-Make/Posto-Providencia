<?php

declare(strict_types=1);

use App\Pessoas\Application\EntrarComoFrentista;
use App\Pessoas\Domain\AcessoFrentista;
use App\Pessoas\Domain\TokenDeAcesso;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Testing\TestResponse;

use function Pest\Laravel\getJson;
use function Pest\Laravel\postJson;
use function Pest\Laravel\withToken;

require_once __DIR__.'/Cenario.php';

/*
|--------------------------------------------------------------------------
| Primeiro acesso: o próprio frentista cria a chave (#101, decisão do dono de 27/09/2026)
|--------------------------------------------------------------------------
| `POST /api/postos/{posto}/frentistas/primeiro-acesso` grava o PIN só de frentista DESTE posto,
| ativo, que ainda não tem chave. Já tem → 409 e o PIN antigo continua valendo (zerar é do gerente,
| `frentista:pin`). Outro posto, inativo ou inexistente → a MESMA 404. Sucesso já devolve a sessão.
*/

/** @return TestResponse<JsonResponse> */
function criarChave(int $postoId, int $frentistaId, string $pin = '2468', ?string $confirmacao = null): TestResponse
{
    return postJson("/api/postos/{$postoId}/frentistas/primeiro-acesso", [
        'frentista_id' => $frentistaId,
        'pin' => $pin,
        'pin_confirmacao' => $confirmacao ?? $pin,
    ]);
}

/** O valor de texto da resposta, estreitado (o `json()` do TestResponse é `mixed`). */
function textoDaResposta(mixed $valor): string
{
    return is_string($valor) ? $valor : throw new RuntimeException('a resposta não trouxe texto onde devia');
}

function hashDoPin(int $frentistaId): ?string
{
    $hash = DB::table('AcessoFrentista')->where('frentista_id', $frentistaId)->value('pin_hash');

    return is_string($hash) ? $hash : null;
}

it('cria a chave de quem não tem, em hash, e já devolve a sessão do turno', function (): void {
    ['posto' => $posto] = postoDoPwa();
    $novo = frentistaDoPwa($posto, pin: null);

    $resposta = criarChave($posto->id, $novo->id, '2468')
        ->assertCreated()
        ->assertJsonPath('frentista', ['id' => $novo->id, 'nome' => $novo->nome]);

    $hash = hashDoPin($novo->id);
    expect($hash)->toBeString()->toStartWith('$2y$')
        ->and(Hash::check('2468', (string) $hash))->toBeTrue();

    $token = textoDaResposta($resposta->json('token'));
    withToken($token)->getJson("/api/postos/{$posto->id}/frentistas/eu")->assertOk()->assertJsonPath('data.id', $novo->id);

    // A chave criada é a chave do login de todo dia.
    postJson("/api/postos/{$posto->id}/frentistas/entrar", ['frentista_id' => $novo->id, 'pin' => '2468'])->assertOk();
});

it('quem já tem chave recebe 409 e o PIN antigo continua valendo', function (): void {
    ['posto' => $posto, 'frentista' => $comChave] = postoDoPwa();
    $antes = hashDoPin($comChave->id);

    criarChave($posto->id, $comChave->id, '1357')
        ->assertStatus(409)
        ->assertExactJson(['erro' => ['codigo' => 'ja_tem_chave', 'mensagem' => 'Este frentista já tem chave. Peça ao gerente para zerar.']]);

    expect(hashDoPin($comChave->id))->toBe($antes);
    postJson("/api/postos/{$posto->id}/frentistas/entrar", ['frentista_id' => $comChave->id, 'pin' => PIN_PWA])->assertOk();
    postJson("/api/postos/{$posto->id}/frentistas/entrar", ['frentista_id' => $comChave->id, 'pin' => '1357'])->assertUnauthorized();
});

it('a segunda criação para o mesmo frentista não troca o hash (a primeira vence)', function (): void {
    ['posto' => $posto] = postoDoPwa();
    $novo = frentistaDoPwa($posto, pin: null);

    criarChave($posto->id, $novo->id, '1111')->assertCreated();
    $primeiro = hashDoPin($novo->id);
    criarChave($posto->id, $novo->id, '2222')->assertStatus(409);

    expect(hashDoPin($novo->id))->toBe($primeiro)
        ->and(Hash::check('1111', (string) $primeiro))->toBeTrue()
        ->and(AcessoFrentista::query()->whereKey($novo->id)->count())->toBe(1);
});

it('frentista de OUTRO posto, inativo ou inexistente: a MESMA 404, e nada é gravado', function (): void {
    ['posto' => $posto] = postoDoPwa();
    ['posto' => $outro] = postoDoPwa();
    $doOutro = frentistaDoPwa($outro, pin: null);
    $inativo = frentistaDoPwa($posto, ativo: false, pin: null);

    foreach ([$doOutro->id, $inativo->id, 999999] as $frentistaId) {
        criarChave($posto->id, $frentistaId)->assertNotFound()->assertExactJson(['message' => 'Frentista não encontrado.']);
    }

    expect(hashDoPin($doOutro->id))->toBeNull()
        ->and(hashDoPin($inativo->id))->toBeNull()
        ->and(TokenDeAcesso::query()->count())->toBe(0);
});

it('confirmação diferente é 422 e nada é gravado', function (): void {
    ['posto' => $posto] = postoDoPwa();
    $novo = frentistaDoPwa($posto, pin: null);

    criarChave($posto->id, $novo->id, '2468', '2469')->assertUnprocessable()->assertJsonValidationErrors(['pin_confirmacao']);

    expect(hashDoPin($novo->id))->toBeNull();
});

it('PIN fora do formato é 422 (texto de 4 a 6 dígitos)', function (mixed $pin): void {
    ['posto' => $posto] = postoDoPwa();
    $novo = frentistaDoPwa($posto, pin: null);

    postJson("/api/postos/{$posto->id}/frentistas/primeiro-acesso", ['frentista_id' => $novo->id, 'pin' => $pin, 'pin_confirmacao' => $pin])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['pin']);

    expect(hashDoPin($novo->id))->toBeNull();
})->with(['123', '1234567', 'abcd', 4821]);

it('a sessão do primeiro acesso é a do login: mesma validade de turno', function (): void {
    ['posto' => $posto] = postoDoPwa();
    $novo = frentistaDoPwa($posto, pin: null);

    $vence = textoDaResposta(criarChave($posto->id, $novo->id)->assertCreated()->json('vence_em'));

    $esperado = CarbonImmutable::now()->addHours(EntrarComoFrentista::HORAS_DO_TURNO);
    expect(CarbonImmutable::parse($vence)->isBetween($esperado->subMinutes(2), $esperado->addMinutes(2)))->toBeTrue();
});

it('a lista de escolha passa a dizer tem_chave depois do primeiro acesso', function (): void {
    ['posto' => $posto] = postoDoPwa();
    $novo = frentistaDoPwa($posto, pin: null);
    $lista = fn () => getJson("/api/postos/{$posto->id}/frentistas/escolha")->assertOk();

    $lista()->assertJsonFragment(['id' => $novo->id, 'nome' => $novo->nome, 'tem_chave' => false]);
    criarChave($posto->id, $novo->id)->assertCreated();
    $lista()->assertJsonFragment(['id' => $novo->id, 'nome' => $novo->nome, 'tem_chave' => true]);
});
