<?php

declare(strict_types=1);

use App\Cadastro\Domain\Bico;
use App\Compartilhado\Enums\PapelNoPosto;
use App\Compartilhado\Enums\Role;
use App\Compartilhado\Posto;
use App\Fechamento\Domain\Leitura;
use App\Pessoas\Application\VerificaTokenDoSupabase;
use App\Pessoas\Domain\Usuario;
use App\Pessoas\Domain\UsuarioPosto;
use Illuminate\Support\Facades\DB;

use function Pest\Laravel\getJson;
use function Pest\Laravel\withToken;

const SEGREDO_P5 = 'segredo-de-teste-das-leituras';

function b64urlP5(string $cru): string
{
    return rtrim(strtr(base64_encode($cru), '+/', '-_'), '=');
}

function tokenP5(string $sub): string
{
    $cabecalho = b64urlP5((string) json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $corpo = b64urlP5((string) json_encode(['sub' => $sub, 'aud' => 'authenticated', 'exp' => time() + 3600]));

    return $cabecalho.'.'.$corpo.'.'.b64urlP5(hash_hmac('sha256', $cabecalho.'.'.$corpo, SEGREDO_P5, binary: true));
}

/** Cria a identidade como o sistema cria: o trigger `handle_new_user()` insere o Usuario. */
function usuarioP5(string $sub, int $postoId, Role $role = Role::Operador): Usuario
{
    DB::table('auth.users')->insert(['id' => $sub, 'email' => $sub.'@teste.local']);
    $usuario = Usuario::query()->where('auth_user_id', $sub)->sole();
    $usuario->forceFill(['role' => $role, 'ativo' => true])->save();
    UsuarioPosto::factory()->create([
        'usuario_id' => $usuario->id, 'posto_id' => $postoId,
        'role' => PapelNoPosto::Operador, 'ativo' => true,
    ]);

    return $usuario->refresh();
}

beforeEach(function (): void {
    config(['supabase.jwt_secret' => SEGREDO_P5]);
    app()->forgetInstance(VerificaTokenDoSupabase::class);
});

it('nega sem token, antes de olhar qualquer dado', function (): void {
    $posto = Posto::factory()->create();

    getJson("/api/postos/{$posto->id}/leituras?data=2026-09-20")->assertUnauthorized();
});

it('nega usuário sem vínculo com o posto', function (): void {
    $posto = Posto::factory()->create();
    $outro = Posto::factory()->create();
    usuarioP5('11110000-0000-4000-8000-000000000001', $outro->id);

    withToken(tokenP5('11110000-0000-4000-8000-000000000001'))
        ->getJson("/api/postos/{$posto->id}/leituras?data=2026-09-20")->assertForbidden();
});

it('exige a data e recusa formato errado', function (): void {
    $posto = Posto::factory()->create();
    usuarioP5('22220000-0000-4000-8000-000000000001', $posto->id);
    $tok = tokenP5('22220000-0000-4000-8000-000000000001');

    withToken($tok)->getJson("/api/postos/{$posto->id}/leituras")->assertStatus(422);
    withToken($tok)->getJson("/api/postos/{$posto->id}/leituras?data=20-09-2026")->assertStatus(422);
    withToken($tok)->getJson("/api/postos/{$posto->id}/leituras?data=nao-e-data")->assertStatus(422);
});

it('devolve só as leituras do dia pedido, e o dia é UTC', function (): void {
    $posto = Posto::factory()->create();
    $bico = Bico::factory()->create(['posto_id' => $posto->id]);
    usuarioP5('33330000-0000-4000-8000-000000000001', $posto->id);

    // 23:30 UTC de 20/09 é 20:30 do dia 20 no horário de Brasília: continua sendo dia 20.
    // Se alguém trocar a janela por whereDate com fuso local, este caso cai para o dia 19.
    $doDia = Leitura::factory()->create(['posto_id' => $posto->id, 'bico_id' => $bico->id, 'data' => '2026-09-20 23:30:00']);
    $daVespera = Leitura::factory()->create(['posto_id' => $posto->id, 'bico_id' => $bico->id, 'data' => '2026-09-19 23:30:00']);
    $doDiaSeguinte = Leitura::factory()->create(['posto_id' => $posto->id, 'bico_id' => $bico->id, 'data' => '2026-09-21 00:30:00']);

    $ids = withToken(tokenP5('33330000-0000-4000-8000-000000000001'))
        ->getJson("/api/postos/{$posto->id}/leituras?data=2026-09-20")
        ->assertOk()
        ->json('data.*.id');

    // Só `toBe` já prova os três casos: a lista tem exatamente a leitura do dia, então véspera e
    // dia seguinte ficaram de fora. Encadear `->not->toContain` depois de `toBe` não roda.
    expect($ids)->toBe([$doDia->id]);
});

it('não devolve leitura de outro posto, mesmo com o id na rota', function (): void {
    // O escopo é do trait PertenceAoPosto, não do controller. Este é o canário de tenant da rota.
    $meu = Posto::factory()->create();
    $alheio = Posto::factory()->create();
    $bicoAlheio = Bico::factory()->create(['posto_id' => $alheio->id]);
    Leitura::factory()->create(['posto_id' => $alheio->id, 'bico_id' => $bicoAlheio->id, 'data' => '2026-09-20 12:00:00']);
    usuarioP5('44440000-0000-4000-8000-000000000001', $meu->id);

    withToken(tokenP5('44440000-0000-4000-8000-000000000001'))
        ->getJson("/api/postos/{$meu->id}/leituras?data=2026-09-20")
        ->assertOk()
        ->assertJsonCount(0, 'data');
});

it('devolve dinheiro e litros como string decimal, nunca float', function (): void {
    $posto = Posto::factory()->create();
    $bico = Bico::factory()->create(['posto_id' => $posto->id]);
    usuarioP5('55550000-0000-4000-8000-000000000001', $posto->id);
    Leitura::factory()->create([
        'posto_id' => $posto->id, 'bico_id' => $bico->id, 'data' => '2026-09-20 12:00:00',
        'litros_vendidos' => '123.456', 'preco_litro' => '6.38', 'valor_total' => '787.65',
    ]);

    $resposta = withToken(tokenP5('55550000-0000-4000-8000-000000000001'))
        ->getJson("/api/postos/{$posto->id}/leituras?data=2026-09-20")
        ->assertOk();

    // Conferir no JSON CRU, e não no array decodificado: `json()` já converteria 787.65 numérico
    // em float e o teste passaria com o bug na rede. As aspas são a asserção.
    expect($resposta->getContent())
        ->toContain('"valor_total":"787.65"')
        ->toContain('"preco_litro":"6.38"')
        ->toContain('"litros_vendidos":"123.456"');

    // E a régua de sempre: o valor exato, pelo caminho do framework.
    $resposta->assertJsonPath('data.0.valor_total', '787.65');
});
