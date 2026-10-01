<?php

declare(strict_types=1);

use App\Compartilhado\Enums\PapelNoPosto;
use App\Compartilhado\Enums\Role;
use App\Compartilhado\Posto;
use App\Pessoas\Domain\Usuario;
use App\Pessoas\Domain\UsuarioPosto;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Testing\PendingCommand;
use Laravel\Sanctum\PersonalAccessToken;

use function Pest\Laravel\artisan;
use function Pest\Laravel\postJson;

/*
| Login por nome de usuário no cartão do posto (banco/init/15-login-por-usuario.sql). As contas são
| separadas por posto: o Elias do Jorro e o Elias do BR se chamam os dois "elias", e é o cartão
| escolhido (posto_id) que decide qual conta abre. O nome mora no vínculo UsuarioPosto.
*/

const SENHA_DO_USUARIO = 'senha-do-usuario-123';

function contaNoPosto(string $email, string $nome, int $postoId, ?string $login, bool $vinculoAtivo = true): Usuario
{
    $usuario = Usuario::factory()->create([
        'email' => $email,
        'nome' => $nome,
        'role' => Role::Gerente,
        'senha' => SENHA_DO_USUARIO,
    ]);
    UsuarioPosto::factory()->create([
        'usuario_id' => $usuario->id,
        'posto_id' => $postoId,
        'role' => PapelNoPosto::Gerente,
        'ativo' => $vinculoAtivo,
        'usuario' => $login,
    ]);

    return $usuario;
}

/**
 * Posto novo em folha. Os testes locais rodam no banco do compose, que pode já ter "elias" no posto 1
 * (o seed do ensaio): posto de fábrica não tem vínculo nenhum, então o índice único não colide.
 */
function postoNovo(string $nome): int
{
    return Posto::factory()->create(['nome' => $nome, 'ativo' => true])->id;
}

/** @param  array<string, mixed>  $corpo */
function recusaSemToken(array $corpo): void
{
    $antes = PersonalAccessToken::query()->count();

    postJson('/api/login', $corpo)
        ->assertUnauthorized()
        ->assertExactJson(['message' => 'Usuário ou senha incorretos.']);

    expect(PersonalAccessToken::query()->count())->toBe($antes);
}

beforeEach(fn () => RateLimiter::clear(sha1('127.0.0.1')));

it('entra com o usuário certo no posto certo e devolve token', function (): void {
    $jorro = postoNovo('Jorro do teste');
    contaNoPosto('elias.jorro@teste.com', 'Elias (Jorro)', $jorro, 'elias');

    postJson('/api/login', ['posto_id' => $jorro, 'usuario' => 'elias', 'senha' => SENHA_DO_USUARIO, 'dispositivo' => 'painel'])
        ->assertOk()
        ->assertJsonPath('usuario.email', 'elias.jorro@teste.com')
        ->assertJsonPath('usuario.postos.0.id', $jorro)
        ->assertJsonStructure(['token']);
});

it('o mesmo nome em dois postos abre a conta de cada posto', function (): void {
    $jorro = postoNovo('Jorro do teste');
    $br = postoNovo('BR do teste');
    contaNoPosto('elias.jorro@teste.com', 'Elias (Jorro)', $jorro, 'elias');
    contaNoPosto('elias.br@teste.com', 'Elias (BR)', $br, 'elias');

    postJson('/api/login', ['posto_id' => $br, 'usuario' => 'elias', 'senha' => SENHA_DO_USUARIO])
        ->assertOk()->assertJsonPath('usuario.nome', 'Elias (BR)');
    postJson('/api/login', ['posto_id' => $jorro, 'usuario' => 'elias', 'senha' => SENHA_DO_USUARIO])
        ->assertOk()->assertJsonPath('usuario.nome', 'Elias (Jorro)');
});

it('usuário certo no posto errado, senha errada e vínculo inativo recebem o mesmo 401', function (): void {
    $jorro = postoNovo('Jorro do teste');
    $br = postoNovo('BR do teste');
    contaNoPosto('elias.jorro@teste.com', 'Elias (Jorro)', $jorro, 'elias');
    contaNoPosto('inativo@teste.com', 'Inativo', $jorro, 'inativo', vinculoAtivo: false);

    recusaSemToken(['posto_id' => $br, 'usuario' => 'elias', 'senha' => SENHA_DO_USUARIO]);
    recusaSemToken(['posto_id' => $jorro, 'usuario' => 'elias', 'senha' => 'senha-errada']);
    recusaSemToken(['posto_id' => $jorro, 'usuario' => 'inativo', 'senha' => SENHA_DO_USUARIO]);
    recusaSemToken(['posto_id' => $jorro, 'usuario' => 'ninguem', 'senha' => SENHA_DO_USUARIO]);
});

it('o usuário não diferencia maiúscula nem espaço nas pontas', function (): void {
    $jorro = postoNovo('Jorro do teste');
    contaNoPosto('elias.jorro@teste.com', 'Elias (Jorro)', $jorro, 'Elias');

    postJson('/api/login', ['posto_id' => $jorro, 'usuario' => '  ELIAS ', 'senha' => SENHA_DO_USUARIO])
        ->assertOk()->assertJsonPath('usuario.nome', 'Elias (Jorro)');
});

it('com "@" no campo usuário, entra pelo e-mail (conta sem usuário, como o ADMIN)', function (): void {
    Usuario::factory()->create(['email' => 'admin.cartao@teste.com', 'role' => Role::Admin, 'senha' => SENHA_DO_USUARIO]);

    postJson('/api/login', ['posto_id' => 1, 'usuario' => 'Admin.Cartao@teste.com', 'senha' => SENHA_DO_USUARIO])
        ->assertOk()->assertJsonPath('usuario.email', 'admin.cartao@teste.com');
});

it('sem e-mail e sem usuário, ou usuário sem posto, é 422', function (): void {
    postJson('/api/login', ['senha' => SENHA_DO_USUARIO])->assertUnprocessable();
    postJson('/api/login', ['usuario' => 'elias', 'senha' => SENHA_DO_USUARIO])->assertUnprocessable()
        ->assertJsonValidationErrors('posto_id');
});

it('o índice único recusa o mesmo nome duas vezes no mesmo posto, sem olhar maiúscula', function (): void {
    $jorro = postoNovo('Jorro do teste');
    contaNoPosto('um@teste.com', 'Um', $jorro, 'elias');

    expect(fn () => contaNoPosto('dois@teste.com', 'Dois', $jorro, 'ELIAS'))->toThrow(QueryException::class);
});

it('o comando usuario:definir grava o --usuario nos vínculos passados', function (): void {
    $br = postoNovo('BR do teste');
    $comando = artisan('usuario:definir', [
        'email' => 'novo@teste.com', 'nome' => 'Novo', '--role' => 'gerente',
        '--posto' => ["{$br}:gerente"], '--usuario' => 'novo',
    ]);
    expect($comando)->toBeInstanceOf(PendingCommand::class);
    assert($comando instanceof PendingCommand);
    $comando->expectsQuestion('Senha (mínimo 8 caracteres)', SENHA_DO_USUARIO)
        ->expectsQuestion('Repita a senha', SENHA_DO_USUARIO)
        ->assertSuccessful()
        ->run();

    postJson('/api/login', ['posto_id' => $br, 'usuario' => 'novo', 'senha' => SENHA_DO_USUARIO])
        ->assertOk()->assertJsonPath('usuario.email', 'novo@teste.com');
});
