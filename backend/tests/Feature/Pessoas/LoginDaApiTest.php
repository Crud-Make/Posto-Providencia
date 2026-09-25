<?php

declare(strict_types=1);

use App\Compartilhado\Enums\PapelNoPosto;
use App\Compartilhado\Enums\Role;
use App\Compartilhado\Posto;
use App\Pessoas\Domain\TokenDeAcesso;
use App\Pessoas\Domain\Usuario;
use App\Pessoas\Domain\UsuarioPosto;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Testing\PendingCommand;
use Laravel\Sanctum\PersonalAccessToken;

use function Pest\Laravel\artisan;
use function Pest\Laravel\getJson;
use function Pest\Laravel\postJson;
use function Pest\Laravel\withToken;

/*
| Login próprio da API (#102). A rede Providência tem vários postos e cada um vê só o seu dado:
| o que estes testes prendem é o login (quem entra), a lista de postos (onde pode entrar) e o
| isolamento (o token de um posto não abre o outro).
*/

const SENHA_LOGIN = 'senha-do-teste-123';

/** @param  array<string, mixed>  $atributos */
function gerenteDoJorro(array $atributos = []): Usuario
{
    $usuario = Usuario::factory()->create(array_merge([
        'email' => 'gerente.login@teste.com',
        'nome' => 'Gerente do Jorro',
        'role' => Role::Gerente,
        'senha' => SENHA_LOGIN,
    ], $atributos));
    UsuarioPosto::factory()->create(['usuario_id' => $usuario->id, 'posto_id' => 1, 'role' => PapelNoPosto::Gerente]);

    return $usuario;
}

function tokenDoLogin(string $email = 'gerente.login@teste.com'): string
{
    $token = postJson('/api/login', ['email' => $email, 'senha' => SENHA_LOGIN])->assertOk()->json('token');

    return is_string($token) ? $token : throw new RuntimeException('login sem token');
}

/** @param  array<string, mixed>  $argumentos */
function comandoDefinir(array $argumentos): PendingCommand
{
    $comando = artisan('usuario:definir', $argumentos);

    return $comando instanceof PendingCommand ? $comando : throw new RuntimeException('artisan sem PendingCommand');
}

beforeEach(fn () => RateLimiter::clear(sha1('127.0.0.1')));

it('entra com e-mail e senha e devolve token e os postos em que pode entrar', function (): void {
    gerenteDoJorro();

    $resposta = postJson('/api/login', ['email' => 'Gerente.Login@teste.com ', 'senha' => SENHA_LOGIN, 'dispositivo' => 'painel']);

    $resposta->assertOk()
        ->assertJsonPath('usuario.email', 'gerente.login@teste.com')
        ->assertJsonPath('usuario.role', 'GERENTE')
        ->assertJsonPath('usuario.postos', [['id' => 1, 'nome' => Posto::query()->findOrFail(1)->nome, 'papel' => 'gerente']])
        ->assertJsonMissingPath('usuario.senha');
    $idDoToken = PersonalAccessToken::query()->latest('id')->firstOrFail()->id;
    expect($resposta->json('token'))->toStartWith($idDoToken.'|posto_');
});

it('a senha é gravada como hash, nunca em claro', function (): void {
    $usuario = gerenteDoJorro();

    $gravada = DB::table('Usuario')->where('id', $usuario->id)->value('senha');

    expect($gravada === SENHA_LOGIN)->toBeFalse()
        ->and(is_string($gravada) && Hash::check(SENHA_LOGIN, $gravada))->toBeTrue();
});

it('senha errada, e-mail inexistente, usuário inativo e usuário sem senha recebem a MESMA resposta', function (): void {
    gerenteDoJorro();
    gerenteDoJorro(['email' => 'inativo@teste.com', 'ativo' => false]);
    Usuario::factory()->create(['email' => 'semsenha@teste.com', 'senha' => null]);

    $tentativas = [
        ['gerente.login@teste.com', 'senha-errada'],
        ['ninguem@teste.com', SENHA_LOGIN],
        ['inativo@teste.com', SENHA_LOGIN],
        ['semsenha@teste.com', SENHA_LOGIN],
    ];

    foreach ($tentativas as [$email, $senha]) {
        postJson('/api/login', ['email' => $email, 'senha' => $senha])
            ->assertUnauthorized()
            ->assertExactJson(['message' => 'E-mail ou senha incorretos.']);
    }
    expect(PersonalAccessToken::query()->count())->toBe(0);
});

it('o token do login abre as rotas do posto dele', function (): void {
    gerenteDoJorro();
    $token = tokenDoLogin();

    withToken($token)->getJson('/api/eu')->assertOk()->assertJsonPath('usuario.postos.0.id', 1);
    withToken($token)->getJson('/api/postos/1/leituras?data=2026-01-05')->assertOk();
});

it('ISOLAMENTO: o gerente do Jorro não entra em outro posto da rede', function (): void {
    gerenteDoJorro();
    $postoBr = Posto::factory()->create(['nome' => 'Posto BR', 'ativo' => true]);
    $token = tokenDoLogin();

    withToken($token)->getJson("/api/postos/{$postoBr->id}/leituras?data=2026-01-05")->assertForbidden();
    withToken($token)->getJson('/api/eu')->assertJsonCount(1, 'usuario.postos');
});

it('uma conta com vínculo em dois postos lista os dois e entra nos dois', function (): void {
    $elias = gerenteDoJorro();
    $postoBr = Posto::factory()->create(['nome' => 'Posto BR', 'ativo' => true]);
    UsuarioPosto::factory()->create(['usuario_id' => $elias->id, 'posto_id' => $postoBr->id, 'role' => PapelNoPosto::Gerente]);
    $token = tokenDoLogin();

    withToken($token)->getJson('/api/eu')
        ->assertJsonPath('usuario.postos.*.id', [1, $postoBr->id]);
    withToken($token)->getJson("/api/postos/{$postoBr->id}/leituras?data=2026-01-05")->assertOk();
});

it('ADMIN lista todos os postos ativos, e posto desativado some da lista', function (): void {
    Usuario::factory()->create(['email' => 'admin.login@teste.com', 'role' => Role::Admin, 'senha' => SENHA_LOGIN]);
    $postoBr = Posto::factory()->create(['nome' => 'Posto BR', 'ativo' => true]);
    Posto::factory()->create(['nome' => 'Posto Fechado', 'ativo' => false]);

    withToken(tokenDoLogin('admin.login@teste.com'))->getJson('/api/eu')
        ->assertJsonPath('usuario.postos.*.id', [1, $postoBr->id]);
});

it('sair apaga só o token desta sessão', function (): void {
    gerenteDoJorro();
    $painel = tokenDoLogin();
    $celular = tokenDoLogin();

    withToken($painel)->postJson('/api/sair')->assertNoContent();

    app('auth')->forgetGuards();
    withToken($painel)->getJson('/api/eu')->assertUnauthorized();
    withToken($celular)->getJson('/api/eu')->assertOk();
});

it('token vencido não entra', function (): void {
    gerenteDoJorro();
    $token = tokenDoLogin();
    PersonalAccessToken::query()->update(['expires_at' => now()->subMinute()]);

    withToken($token)->getJson('/api/eu')->assertUnauthorized();
});

it('o login emite token com vencimento (7 dias por padrão)', function (): void {
    gerenteDoJorro();
    tokenDoLogin();

    $vence = TokenDeAcesso::query()->latest('id')->firstOrFail()->expires_at;
    $dias = $vence === null ? 0.0 : now()->diffInDays($vence);
    expect($dias)->toBeGreaterThan(6.9)->toBeLessThan(7.1);
});

it('desativar o usuário corta o acesso na hora, mesmo com o token válido', function (): void {
    $usuario = gerenteDoJorro();
    $token = tokenDoLogin();

    $usuario->update(['ativo' => false]);

    withToken($token)->getJson('/api/eu')->assertUnauthorized();
});

it('token inventado com o formato do Sanctum não entra', function (): void {
    gerenteDoJorro();
    tokenDoLogin();

    withToken('1|segredo-que-ninguem-emitiu')->getJson('/api/eu')->assertUnauthorized();
    getJson('/api/eu')->assertUnauthorized();
});

it('o login trava depois de seis tentativas no mesmo minuto', function (): void {
    foreach (range(1, 6) as $_) {
        postJson('/api/login', ['email' => 'x@teste.com', 'senha' => 'errada'])->assertUnauthorized();
    }

    postJson('/api/login', ['email' => 'x@teste.com', 'senha' => 'errada'])->assertTooManyRequests();
});

it('o comando usuario:definir cria a conta com hash e vínculo, e rodar de novo só redefine a senha', function (): void {
    comandoDefinir(['email' => 'Elias@Teste.com', 'nome' => 'Elias', '--role' => 'gerente', '--posto' => ['1:gerente']])
        ->expectsQuestion('Senha (mínimo 8 caracteres)', SENHA_LOGIN)
        ->expectsQuestion('Repita a senha', SENHA_LOGIN)
        ->assertSuccessful();

    comandoDefinir(['email' => 'elias@teste.com', 'nome' => 'Elias', '--role' => 'GERENTE', '--posto' => ['1:gerente']])
        ->expectsQuestion('Senha (mínimo 8 caracteres)', 'outra-senha-456')
        ->expectsQuestion('Repita a senha', 'outra-senha-456')
        ->assertSuccessful();

    $elias = Usuario::query()->where('email', 'elias@teste.com')->sole();
    expect($elias->role)->toBe(Role::Gerente)
        ->and(Hash::check('outra-senha-456', (string) $elias->senha))->toBeTrue()
        ->and($elias->vinculos()->count())->toBe(1);
});

it('o comando recusa senha curta e não grava nada', function (): void {
    comandoDefinir(['email' => 'curta@teste.com', 'nome' => 'Curta'])
        ->expectsQuestion('Senha (mínimo 8 caracteres)', '123')
        ->assertFailed();

    expect(Usuario::query()->where('email', 'curta@teste.com')->exists())->toBeFalse();
});
