<?php

declare(strict_types=1);

use App\Cadastro\Domain\Frentista;
use App\Compartilhado\Enums\PapelNoPosto;
use App\Compartilhado\Enums\Role;
use App\Compartilhado\Posto;
use App\Pessoas\Domain\Usuario;
use App\Pessoas\Domain\UsuarioPosto;
use Illuminate\Support\Facades\DB;

use function Pest\Laravel\getJson;
use function Pest\Laravel\withToken;

/*
| Presença dos frentistas pela API (card "quem está no posto" do Dashboard). Cada posto da rede vê
| só os seus frentistas, e a foto só sai com login — o catálogo público continua sem ela.
*/

function tokenDeGerenteDoJorro(): string
{
    $usuario = Usuario::factory()->create(['role' => Role::Gerente]);
    UsuarioPosto::factory()->create(['usuario_id' => $usuario->id, 'posto_id' => 1, 'role' => PapelNoPosto::Gerente]);

    return $usuario->createToken('teste')->plainTextToken;
}

// O trigger `carimba_visto_em` força a hora do servidor em todo INSERT/UPDATE — é o que impede o
// celular de escolher o próprio horário. Para fixar horários no teste, ele sai DENTRO da transação
// do teste (DatabaseTransactions), e volta sozinho no rollback.
beforeEach(fn () => DB::statement('ALTER TABLE "PresencaFrentista" DISABLE TRIGGER carimba_visto_em'));

function presente(Frentista $frentista, int $postoId, string $vistoEm): void
{
    // updateOrInsert: o esquema já cria a linha de presença junto com o frentista.
    DB::table('PresencaFrentista')->updateOrInsert(['frentista_id' => $frentista->id], ['posto_id' => $postoId, 'visto_em' => $vistoEm]);
}

it('lista quem deu sinal no posto, com nome, foto e horário em UTC, do mais recente ao mais antigo', function (): void {
    $ana = Frentista::factory()->create(['posto_id' => 1, 'nome' => 'Ana', 'foto' => 'data:image/jpeg;base64,AAA']);
    $beto = Frentista::factory()->create(['posto_id' => 1, 'nome' => 'Beto', 'foto' => null]);
    presente($ana, 1, '2026-09-24 10:00:00+00');
    presente($beto, 1, '2026-09-24 11:30:00+00');

    withToken(tokenDeGerenteDoJorro())->getJson('/api/postos/1/presencas')
        ->assertOk()
        ->assertExactJson(['data' => [
            ['frentista_id' => $beto->id, 'nome' => 'Beto', 'foto' => null, 'visto_em' => '2026-09-24T11:30:00Z'],
            ['frentista_id' => $ana->id, 'nome' => 'Ana', 'foto' => 'data:image/jpeg;base64,AAA', 'visto_em' => '2026-09-24T10:00:00Z'],
        ]]);
});

it('ISOLAMENTO: a presença de outro posto da rede não aparece, e o gerente do Jorro não abre a do BR', function (): void {
    $postoBr = Posto::factory()->create(['nome' => 'Posto BR', 'ativo' => true]);
    $doBr = Frentista::factory()->create(['posto_id' => $postoBr->id, 'nome' => 'Do BR']);
    presente($doBr, $postoBr->id, '2026-09-24 10:00:00+00');
    $token = tokenDeGerenteDoJorro();

    withToken($token)->getJson('/api/postos/1/presencas')->assertOk()->assertExactJson(['data' => []]);
    withToken($token)->getJson("/api/postos/{$postoBr->id}/presencas")->assertForbidden();
});

it('sem login não há presença (a rota leva foto)', function (): void {
    getJson('/api/postos/1/presencas')->assertUnauthorized();
});
