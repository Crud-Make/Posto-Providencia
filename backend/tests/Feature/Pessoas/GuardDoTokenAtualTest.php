<?php

declare(strict_types=1);

use App\Cadastro\Http\Middleware\DefinePostoAtual;
use App\Compartilhado\Enums\PapelNoPosto;
use App\Compartilhado\Enums\Role;
use App\Compartilhado\Posto;
use App\Pessoas\Application\VerificaTokenDoSupabase;
use App\Pessoas\Domain\Usuario;
use App\Pessoas\Domain\UsuarioPosto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

use function Pest\Laravel\getJson;
use function Pest\Laravel\withToken;

// Nomes próprios (não `token`/`b64url`): o Pest carrega todos os arquivos de teste no mesmo
// processo, e função global repetida é erro fatal de redeclaração.
const SEGREDO_GUARD = 'segredo-de-teste-do-guard';

function b64urlGuard(string $cru): string
{
    return rtrim(strtr(base64_encode($cru), '+/', '-_'), '=');
}

function tokenGuard(string $sub, ?string $assinarCom = SEGREDO_GUARD): string
{
    $cabecalho = b64urlGuard((string) json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $corpo = b64urlGuard((string) json_encode(['sub' => $sub, 'aud' => 'authenticated', 'exp' => time() + 3600]));
    $assinatura = b64urlGuard(hash_hmac('sha256', $cabecalho.'.'.$corpo, (string) $assinarCom, binary: true));

    return $cabecalho.'.'.$corpo.'.'.$assinatura;
}

/**
 * Cria a identidade como o sistema real cria: insere em `auth.users` e deixa o trigger
 * `handle_new_user()` (banco/init) inserir o `Usuario` correspondente, já com `auth_user_id`
 * ligado e role FRENTISTA. Depois ajusta o que o teste precisa.
 *
 * Descoberto em 20/09 ao escrever este teste: inserir em `auth.users` SEM email quebra o
 * trigger (`Usuario.email` é NOT NULL). A migração dos 16 usuários da #102 esbarra no mesmo
 * trigger — ele não é opcional.
 */
/** @param array<string, mixed> $atributos */
function usuarioDoGuard(string $sub, array $atributos = []): Usuario
{
    DB::table('auth.users')->insert(['id' => $sub, 'email' => $sub.'@teste.local']);

    $usuario = Usuario::query()->where('auth_user_id', $sub)->sole();

    if ($atributos !== []) {
        $usuario->forceFill($atributos)->save();
    }

    return $usuario->refresh();
}

beforeEach(function (): void {
    config(['supabase.jwt_secret' => SEGREDO_GUARD]);
    // O verificador é singleton: sem esquecer a instância, ele nasceria com o segredo vazio do
    // .env de teste e todo caso daria 401 — inclusive os que deveriam passar.
    app()->forgetInstance(VerificaTokenDoSupabase::class);

    // Rotas só deste teste: provam o middleware e o alias sem mexer nas rotas de produção, que
    // seguem públicas até as fatias novas (P5–P7) nascerem já protegidas.
    Route::middleware('token.atual')->get('/teste/quem-sou', fn (Request $r) => ['id' => $r->user()?->id]);
    Route::middleware(['token.atual', DefinePostoAtual::class, 'posto.acesso'])
        ->get('/teste/postos/{posto}/coisa', fn () => ['ok' => true]);
    // A habilidade por parâmetro (#103 P11): é o que a rota PUT do fechamento usa.
    Route::middleware(['token.atual', DefinePostoAtual::class, 'posto.acesso:gerir'])
        ->get('/teste/postos/{posto}/gerir', fn () => ['ok' => true]);
});

it('recusa requisição sem token', function (): void {
    getJson('/teste/quem-sou')->assertUnauthorized();
});

it('recusa token assinado com outro segredo', function (): void {
    withToken(tokenGuard('qualquer-sub', assinarCom: 'outro-segredo'))
        ->getJson('/teste/quem-sou')->assertUnauthorized();
});

it('recusa token válido cujo sub não tem Usuario', function (): void {
    withToken(tokenGuard('b0000000-0000-4000-8000-00000000ffff'))
        ->getJson('/teste/quem-sou')->assertUnauthorized();
});

it('recusa usuário inativo, mesmo com token válido', function (): void {
    $usuario = usuarioDoGuard('c0000000-0000-4000-8000-000000000001', ['ativo' => false]);

    withToken(tokenGuard((string) $usuario->auth_user_id))
        ->getJson('/teste/quem-sou')->assertUnauthorized();
});

it('aceita token válido e põe o Usuario na requisição', function (): void {
    $usuario = usuarioDoGuard('d0000000-0000-4000-8000-000000000001', ['ativo' => true]);

    withToken(tokenGuard((string) $usuario->auth_user_id))
        ->getJson('/teste/quem-sou')
        ->assertOk()
        ->assertJson(['id' => $usuario->id]);
});

it('403 para usuário autenticado sem vínculo com o posto', function (): void {
    $posto = Posto::factory()->create();
    $usuario = usuarioDoGuard('e0000000-0000-4000-8000-000000000001', ['role' => Role::Operador, 'ativo' => true]);

    withToken(tokenGuard((string) $usuario->auth_user_id))
        ->getJson("/teste/postos/{$posto->id}/coisa")->assertForbidden();
});

it('200 para operador com vínculo ativo, e 403 quando o vínculo é desligado', function (): void {
    $posto = Posto::factory()->create();
    $usuario = usuarioDoGuard('f0000000-0000-4000-8000-000000000001', ['role' => Role::Operador, 'ativo' => true]);
    UsuarioPosto::factory()->create(['usuario_id' => $usuario->id, 'posto_id' => $posto->id, 'role' => PapelNoPosto::Operador, 'ativo' => true]);

    withToken(tokenGuard((string) $usuario->auth_user_id))
        ->getJson("/teste/postos/{$posto->id}/coisa")->assertOk();

    UsuarioPosto::query()->where('usuario_id', $usuario->id)->update(['ativo' => false]);

    withToken(tokenGuard((string) $usuario->auth_user_id))
        ->getJson("/teste/postos/{$posto->id}/coisa")->assertForbidden();
});

it('ADMIN entra em posto sem vínculo nenhum', function (): void {
    $posto = Posto::factory()->create();
    $admin = usuarioDoGuard('a0000000-0000-4000-8000-0000000000ad', ['role' => Role::Admin, 'ativo' => true]);

    withToken(tokenGuard((string) $admin->auth_user_id))
        ->getJson("/teste/postos/{$posto->id}/coisa")->assertOk();
});

/*
|--------------------------------------------------------------------------
| posto.acesso:gerir — a habilidade por parâmetro (#103 P11)
|--------------------------------------------------------------------------
| O padrão continua `ver`: os testes acima são o canário de que nada mudou nas rotas GET.
| Canário do gate, medido em 21/09/2026: trocar o padrão do middleware para 'gerir' deixa
| FechamentoDoDiaTest (usuarioP7 é Operador) vermelho.
*/

it('posto.acesso:gerir — operador com vínculo ativo VÊ o posto, mas não GERE: 403', function (): void {
    $posto = Posto::factory()->create();
    $operador = usuarioDoGuard('01000000-0000-4000-8000-000000000001', ['role' => Role::Operador, 'ativo' => true]);
    UsuarioPosto::factory()->create(['usuario_id' => $operador->id, 'posto_id' => $posto->id, 'role' => PapelNoPosto::Operador, 'ativo' => true]);

    withToken(tokenGuard((string) $operador->auth_user_id))
        ->getJson("/teste/postos/{$posto->id}/coisa")->assertOk();       // ver: passa
    withToken(tokenGuard((string) $operador->auth_user_id))
        ->getJson("/teste/postos/{$posto->id}/gerir")->assertForbidden(); // gerir: não
});

it('posto.acesso:gerir — gerente com vínculo ativo: 200', function (): void {
    $posto = Posto::factory()->create();
    $gerente = usuarioDoGuard('02000000-0000-4000-8000-000000000001', ['role' => Role::Gerente, 'ativo' => true]);
    UsuarioPosto::factory()->create(['usuario_id' => $gerente->id, 'posto_id' => $posto->id, 'role' => PapelNoPosto::Gerente, 'ativo' => true]);

    withToken(tokenGuard((string) $gerente->auth_user_id))
        ->getJson("/teste/postos/{$posto->id}/gerir")->assertOk();
});

it('posto.acesso:gerir — ADMIN sem vínculo: 200', function (): void {
    $posto = Posto::factory()->create();
    $admin = usuarioDoGuard('03000000-0000-4000-8000-0000000000ad', ['role' => Role::Admin, 'ativo' => true]);

    withToken(tokenGuard((string) $admin->auth_user_id))
        ->getJson("/teste/postos/{$posto->id}/gerir")->assertOk();
});

it('posto.acesso:gerir — sem token: 401, antes de qualquer policy', function (): void {
    $posto = Posto::factory()->create();

    getJson("/teste/postos/{$posto->id}/gerir")->assertUnauthorized();
});
