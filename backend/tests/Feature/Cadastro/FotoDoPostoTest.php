<?php

declare(strict_types=1);

use App\Compartilhado\Enums\PapelNoPosto;
use App\Compartilhado\Enums\Role;
use App\Compartilhado\Posto;
use App\Pessoas\Application\VerificaTokenDoSupabase;
use App\Pessoas\Domain\Usuario;
use App\Pessoas\Domain\UsuarioPosto;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

use function Pest\Laravel\get;
use function Pest\Laravel\getJson;
use function Pest\Laravel\putJson;
use function Pest\Laravel\withToken;

/*
|--------------------------------------------------------------------------
| Foto da fachada do posto (decisão do dono, 27/09/2026)
|--------------------------------------------------------------------------
| `PUT /api/postos/{posto}/foto` é do gerente/admin do posto (`posto.acesso:gerir`); `GET` da mesma
| URL é pública e devolve os bytes do JPEG com cache eterno; a lista pública `GET /api/postos`
| entrega o caminho versionado (`?v=`), nunca o data URL.
*/

const SEGREDO_FP = 'segredo-de-teste-da-foto-do-posto';

/** Um JPEG 1×1 de verdade (216 caracteres em base64). */
const JPEG_FP = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABALDA4MChAODQ4SERATGCgaGBYWGDEjJR0oOjM9PDkzODdASFxOQERXRTc4UG1RV19iZ2hnPk1xeXBkeFxlZ2P/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAAB//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AQH//2Q==';

function b64urlFp(string $cru): string
{
    return rtrim(strtr(base64_encode($cru), '+/', '-_'), '=');
}

function tokenFp(string $sub): string
{
    $c = b64urlFp((string) json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $p = b64urlFp((string) json_encode(['sub' => $sub, 'aud' => 'authenticated', 'exp' => time() + 3600]));

    return $c.'.'.$p.'.'.b64urlFp(hash_hmac('sha256', $c.'.'.$p, SEGREDO_FP, binary: true));
}

function usuarioFp(string $sub, int $postoId, Role $role, PapelNoPosto $papel): Usuario
{
    DB::table('auth.users')->insert(['id' => $sub, 'email' => $sub.'@teste.local']);
    $u = Usuario::query()->where('auth_user_id', $sub)->sole();
    $u->forceFill(['role' => $role, 'ativo' => true])->save();
    UsuarioPosto::factory()->create(['usuario_id' => $u->id, 'posto_id' => $postoId, 'role' => $papel, 'ativo' => true]);

    return $u->refresh();
}

function gerenteFp(Posto $posto, string $sub = 'fb000000-0000-4000-8000-000000000001'): string
{
    return tokenFp((string) usuarioFp($sub, $posto->id, Role::Gerente, PapelNoPosto::Gerente)->auth_user_id);
}

/** @return array{foto: string|null} */
function corpoFp(?string $foto = 'data:image/jpeg;base64,'.JPEG_FP): array
{
    return ['foto' => $foto];
}

function fotoNoBancoFp(Posto $posto): mixed
{
    return DB::table('Posto')->where('id', $posto->id)->value('foto');
}

beforeEach(function (): void {
    config(['supabase.jwt_secret' => SEGREDO_FP]);
    app()->forgetInstance(VerificaTokenDoSupabase::class);
    DB::table('Posto')->update(['ativo' => false]);
});

it('gerente do posto: 200 com o caminho versionado, a lista mostra e o GET devolve os bytes do JPEG', function (): void {
    $posto = Posto::factory()->create(['nome' => 'Posto BR']);

    $caminho = withToken(gerenteFp($posto))->putJson("/api/postos/{$posto->id}/foto", corpoFp())
        ->assertOk()
        ->json('data.foto');
    assert(is_string($caminho));

    expect($caminho)->toMatch('#^/api/postos/'.$posto->id.'/foto\?v=\d+$#')
        ->and(fotoNoBancoFp($posto))->toBe('data:image/jpeg;base64,'.JPEG_FP);

    getJson('/api/postos')->assertOk()
        ->assertExactJson(['data' => [['id' => $posto->id, 'nome' => 'Posto BR', 'foto' => $caminho]]]);

    $resposta = get($caminho)->assertOk()->assertHeader('Content-Type', 'image/jpeg');
    expect($resposta->getContent())->toBe(base64_decode(JPEG_FP, true));
    $cache = (string) $resposta->headers->get('Cache-Control');
    expect($cache)->toContain('public')->toContain('max-age=31536000')->toContain('immutable');
});

it('admin da rede também troca a foto', function (): void {
    $posto = Posto::factory()->create();
    $admin = usuarioFp('fb000000-0000-4000-8000-000000000002', $posto->id, Role::Admin, PapelNoPosto::Admin);

    withToken(tokenFp((string) $admin->auth_user_id))
        ->putJson("/api/postos/{$posto->id}/foto", corpoFp())->assertOk();

    expect(fotoNoBancoFp($posto))->toBeString();
});

it('null remove: a lista volta a null e o GET da foto é 404', function (): void {
    $posto = Posto::factory()->create(['nome' => 'Posto BR']);
    $token = gerenteFp($posto);
    withToken($token)->putJson("/api/postos/{$posto->id}/foto", corpoFp())->assertOk();

    withToken($token)->putJson("/api/postos/{$posto->id}/foto", corpoFp(null))
        ->assertOk()
        ->assertExactJson(['data' => ['foto' => null]]);

    expect(fotoNoBancoFp($posto))->toBeNull()
        ->and(DB::table('Posto')->where('id', $posto->id)->value('foto_atualizada_em'))->toBeNull();
    getJson('/api/postos')->assertOk()
        ->assertExactJson(['data' => [['id' => $posto->id, 'nome' => 'Posto BR', 'foto' => null]]]);
    getJson("/api/postos/{$posto->id}/foto")->assertNotFound();
});

it('GET da foto: 404 para posto inexistente e para posto inativo, mesmo com foto', function (): void {
    $inativo = Posto::factory()->create(['ativo' => false]);
    DB::table('Posto')->where('id', $inativo->id)
        ->update(['foto' => 'data:image/jpeg;base64,'.JPEG_FP, 'foto_atualizada_em' => now()]);

    getJson("/api/postos/{$inativo->id}/foto")->assertNotFound();
    getJson('/api/postos/999999999/foto')->assertNotFound();
});

it('sem token: 401 e nada gravado', function (): void {
    $posto = Posto::factory()->create();

    putJson("/api/postos/{$posto->id}/foto", corpoFp())->assertUnauthorized();

    expect(fotoNoBancoFp($posto))->toBeNull();
});

it('operador do posto: 403 — foto é escrita de quem gere', function (): void {
    $posto = Posto::factory()->create();
    $operador = usuarioFp('fb000000-0000-4000-8000-000000000003', $posto->id, Role::Operador, PapelNoPosto::Operador);

    withToken(tokenFp((string) $operador->auth_user_id))
        ->putJson("/api/postos/{$posto->id}/foto", corpoFp())->assertForbidden();

    expect(fotoNoBancoFp($posto))->toBeNull();
});

it('gerente de OUTRO posto: 403 no posto vizinho, e a foto de lá não muda', function (): void {
    $posto = Posto::factory()->create();
    $vizinho = Posto::factory()->create();

    withToken(gerenteFp($vizinho, 'fb000000-0000-4000-8000-000000000004'))
        ->putJson("/api/postos/{$posto->id}/foto", corpoFp())->assertForbidden();

    expect(fotoNoBancoFp($posto))->toBeNull();
});

it('422 para data URL que não é JPEG, para base64 inválido e acima de 300.000 caracteres', function (?string $foto): void {
    $posto = Posto::factory()->create();

    withToken(gerenteFp($posto))->putJson("/api/postos/{$posto->id}/foto", corpoFp($foto))
        ->assertUnprocessable()
        ->assertJsonValidationErrors('foto');

    expect(fotoNoBancoFp($posto))->toBeNull();
})->with([
    'png' => ['data:image/png;base64,'.JPEG_FP],
    'sem prefixo' => [JPEG_FP],
    'base64 inválido' => ['data:image/jpeg;base64,não é base64!'],
    'acima do teto' => ['data:image/jpeg;base64,'.str_repeat('A', 300000)],
]);

it('422 quando o campo foto não vem', function (): void {
    $posto = Posto::factory()->create();

    withToken(gerenteFp($posto))->putJson("/api/postos/{$posto->id}/foto", [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('foto');
});

it('a lista pública nunca carrega o data URL, só o caminho', function (): void {
    $posto = Posto::factory()->create();
    withToken(gerenteFp($posto))->putJson("/api/postos/{$posto->id}/foto", corpoFp())->assertOk();

    $corpo = (string) getJson('/api/postos')->assertOk()->getContent();

    foreach (['base64', 'data:image', substr(JPEG_FP, 0, 20)] as $blob) {
        expect($corpo)->not->toContain($blob);
    }
});

it('foto nova, URL nova: o `v` acompanha foto_atualizada_em', function (): void {
    $posto = Posto::factory()->create();
    $token = gerenteFp($posto);

    Carbon::setTestNow('2026-09-27 10:00:00');
    $primeira = withToken($token)->putJson("/api/postos/{$posto->id}/foto", corpoFp())->json('data.foto');
    Carbon::setTestNow('2026-09-27 10:01:00');
    $segunda = withToken($token)->putJson("/api/postos/{$posto->id}/foto", corpoFp())->json('data.foto');

    Carbon::setTestNow();

    expect($segunda)->toEndWith('?v='.Carbon::parse('2026-09-27 10:01:00')->getTimestamp())
        ->and($segunda)->not->toBe($primeira)
        ->and(getJson('/api/postos')->json('data.0.foto'))->toBe($segunda);
});
