<?php

declare(strict_types=1);

use App\Compartilhado\Enums\PapelNoPosto;
use App\Compartilhado\Enums\Role;
use App\Compartilhado\Posto;
use App\Pessoas\Application\VerificaTokenDoSupabase;
use App\Pessoas\Domain\Usuario;
use App\Pessoas\Domain\UsuarioPosto;
use Illuminate\Support\Facades\DB;

use function Pest\Laravel\getJson;
use function Pest\Laravel\withToken;

/*
|--------------------------------------------------------------------------
| Quem alcança GET /api/postos/{posto}/dashboard (#103, fecha a rota do dashboard)
|--------------------------------------------------------------------------
| Custo e despesa do posto são dado de proprietário (decisão do dono, 22/09/2026): a rota exige
| `posto.acesso:gerir`, como o PUT /fechamento da P11. Operador vinculado VÊ o dia (GET /leituras)
| e NÃO vê o dashboard. Ordem dos códigos: sem token 401 antes de tudo; token válido e posto
| inexistente 404; sem gerir 403; período inválido 422 só depois de passar pela porta.
*/

const SEGREDO_AGREGACAO = 'segredo-de-teste-do-dashboard';

const PERIODO_ACESSO = 'inicio=2026-01-01&fim=2026-01-31';

function b64urlAgregacao(string $cru): string
{
    return rtrim(strtr(base64_encode($cru), '+/', '-_'), '=');
}

function tokenAgregacao(string $sub): string
{
    $cabecalho = b64urlAgregacao((string) json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $corpo = b64urlAgregacao((string) json_encode(['sub' => $sub, 'aud' => 'authenticated', 'exp' => time() + 3600]));

    return $cabecalho.'.'.$corpo.'.'.b64urlAgregacao(hash_hmac('sha256', $cabecalho.'.'.$corpo, SEGREDO_AGREGACAO, binary: true));
}

/** Identidade como o sistema cria (trigger em auth.users), com o papel pedido no posto. */
function usuarioAgregacao(string $sub, ?int $postoId, Role $role, ?PapelNoPosto $papel, bool $vinculoAtivo = true): Usuario
{
    DB::table('auth.users')->insert(['id' => $sub, 'email' => $sub.'@teste.local']);
    $usuario = Usuario::query()->where('auth_user_id', $sub)->sole();
    $usuario->forceFill(['role' => $role, 'ativo' => true])->save();

    if ($postoId !== null && $papel !== null) {
        UsuarioPosto::factory()->create([
            'usuario_id' => $usuario->id, 'posto_id' => $postoId, 'role' => $papel, 'ativo' => $vinculoAtivo,
        ]);
    }

    return $usuario->refresh();
}

function urlDashboard(int|string $posto, string $consulta = PERIODO_ACESSO): string
{
    return "/api/postos/{$posto}/dashboard?{$consulta}";
}

beforeEach(function (): void {
    config(['supabase.jwt_secret' => SEGREDO_AGREGACAO]);
    app()->forgetInstance(VerificaTokenDoSupabase::class);
});

it('sem token: 401, antes de olhar posto ou período', function (): void {
    $posto = Posto::factory()->create();

    getJson(urlDashboard($posto->id))->assertUnauthorized();
    getJson('/api/postos/999999/dashboard')->assertUnauthorized();
});

it('token cujo sub não tem Usuario: 401', function (): void {
    $posto = Posto::factory()->create();

    withToken(tokenAgregacao('a0a00000-0000-4000-8000-000000000001'))
        ->getJson(urlDashboard($posto->id))->assertUnauthorized();
});

it('operador vinculado ao posto: 403 — ver sim, gerir não (custo e despesa são do proprietário)', function (): void {
    $posto = Posto::factory()->create();
    $operador = usuarioAgregacao('a1a10000-0000-4000-8000-000000000001', $posto->id, Role::Operador, PapelNoPosto::Operador);
    $token = tokenAgregacao((string) $operador->auth_user_id);

    // O vínculo vale: o mesmo operador VÊ as leituras do dia do mesmo posto.
    withToken($token)->getJson("/api/postos/{$posto->id}/leituras?data=2026-01-05")->assertOk();
    withToken($token)->getJson(urlDashboard($posto->id))->assertForbidden();
});

it('gerente vinculado ao posto: 200 com o contrato do dashboard', function (): void {
    $posto = Posto::factory()->create();
    $gerente = usuarioAgregacao('a2a20000-0000-4000-8000-000000000001', $posto->id, Role::Gerente, PapelNoPosto::Gerente);

    withToken(tokenAgregacao((string) $gerente->auth_user_id))
        ->getJson(urlDashboard($posto->id))
        ->assertOk()
        ->assertJsonPath('periodo', ['inicio' => '2026-01-01', 'fim' => '2026-01-31'])
        ->assertJsonPath('produtos', []);
});

it('gerente vinculado só ao posto B pedindo o A: 403 (isolamento por usuário)', function (): void {
    $postoA = Posto::factory()->create();
    $postoB = Posto::factory()->create();
    $gerente = usuarioAgregacao('a3a30000-0000-4000-8000-000000000001', $postoB->id, Role::Gerente, PapelNoPosto::Gerente);
    $token = tokenAgregacao((string) $gerente->auth_user_id);

    withToken($token)->getJson(urlDashboard($postoB->id))->assertOk();
    withToken($token)->getJson(urlDashboard($postoA->id))->assertForbidden();
});

it('gerente com vínculo desligado: 403', function (): void {
    $posto = Posto::factory()->create();
    $gerente = usuarioAgregacao('a4a40000-0000-4000-8000-000000000001', $posto->id, Role::Gerente, PapelNoPosto::Gerente, vinculoAtivo: false);

    withToken(tokenAgregacao((string) $gerente->auth_user_id))
        ->getJson(urlDashboard($posto->id))->assertForbidden();
});

it('Admin sem vínculo nenhum: 200 em qualquer posto', function (): void {
    $posto = Posto::factory()->create();
    $admin = usuarioAgregacao('a5a50000-0000-4000-8000-000000000001', null, Role::Admin, null);

    withToken(tokenAgregacao((string) $admin->auth_user_id))
        ->getJson(urlDashboard($posto->id))->assertOk();
});

it('token válido e posto inexistente: 404', function (): void {
    $admin = usuarioAgregacao('a6a60000-0000-4000-8000-000000000001', null, Role::Admin, null);
    $token = tokenAgregacao((string) $admin->auth_user_id);

    withToken($token)->getJson(urlDashboard(999999))->assertNotFound();
    withToken($token)->getJson(urlDashboard('abc'))->assertNotFound();
});

it('token válido e período inválido: 422 depois de passar pela porta', function (): void {
    $posto = Posto::factory()->create();
    $gerente = usuarioAgregacao('a7a70000-0000-4000-8000-000000000001', $posto->id, Role::Gerente, PapelNoPosto::Gerente);

    withToken(tokenAgregacao((string) $gerente->auth_user_id))
        ->getJson(urlDashboard($posto->id, 'inicio=2026-01-31&fim=2026-01-01'))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['fim']);
});
