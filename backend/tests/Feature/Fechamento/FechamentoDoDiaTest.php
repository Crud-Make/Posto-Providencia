<?php

declare(strict_types=1);

use App\Compartilhado\Enums\PapelNoPosto;
use App\Compartilhado\Enums\Role;
use App\Compartilhado\Posto;
use App\Fechamento\Domain\Fechamento;
use App\Fechamento\Domain\Recebimento;
use App\Pessoas\Application\VerificaTokenDoSupabase;
use App\Pessoas\Domain\Usuario;
use App\Pessoas\Domain\UsuarioPosto;
use Illuminate\Support\Facades\DB;

use function Pest\Laravel\getJson;
use function Pest\Laravel\withToken;

const SEGREDO_P7 = 'segredo-de-teste-do-fechamento';

function b64urlP7(string $cru): string
{
    return rtrim(strtr(base64_encode($cru), '+/', '-_'), '=');
}

function tokenP7(string $sub): string
{
    $c = b64urlP7((string) json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $p = b64urlP7((string) json_encode(['sub' => $sub, 'aud' => 'authenticated', 'exp' => time() + 3600]));

    return $c.'.'.$p.'.'.b64urlP7(hash_hmac('sha256', $c.'.'.$p, SEGREDO_P7, binary: true));
}

function usuarioP7(string $sub, int $postoId): Usuario
{
    DB::table('auth.users')->insert(['id' => $sub, 'email' => $sub.'@teste.local']);
    $u = Usuario::query()->where('auth_user_id', $sub)->sole();
    $u->forceFill(['role' => Role::Operador, 'ativo' => true])->save();
    UsuarioPosto::factory()->create(['usuario_id' => $u->id, 'posto_id' => $postoId, 'role' => PapelNoPosto::Operador, 'ativo' => true]);

    return $u->refresh();
}

/** Fixa `data` como INSTANTE, fora do cast do Eloquent, que formata sem offset. */
function fixaInstanteF(int $id, string $instante): void
{
    DB::table('Fechamento')->where('id', $id)->update(['data' => $instante]);
}

beforeEach(function (): void {
    config(['supabase.jwt_secret' => SEGREDO_P7]);
    app()->forgetInstance(VerificaTokenDoSupabase::class);
});

it('nega sem token e sem vínculo', function (): void {
    $posto = Posto::factory()->create();
    $outro = Posto::factory()->create();

    getJson("/api/postos/{$posto->id}/fechamento?data=2026-09-20")->assertUnauthorized();

    usuarioP7('b1110000-0000-4000-8000-000000000001', $outro->id);
    withToken(tokenP7('b1110000-0000-4000-8000-000000000001'))
        ->getJson("/api/postos/{$posto->id}/fechamento?data=2026-09-20")->assertForbidden();
});

it('dia sem fechamento é 200 com data null, e NÃO 404', function (): void {
    // "Ainda não fecharam este dia" é resposta normal do domínio, não recurso inexistente.
    // O painel abre em dia vazio o tempo todo; 404 viraria erro na tela sem motivo.
    $posto = Posto::factory()->create();
    usuarioP7('b2220000-0000-4000-8000-000000000001', $posto->id);

    withToken(tokenP7('b2220000-0000-4000-8000-000000000001'))
        ->getJson("/api/postos/{$posto->id}/fechamento?data=2026-09-20")
        ->assertOk()->assertJsonPath('data', null);
});

it('devolve o fechamento do dia com os recebimentos aninhados', function (): void {
    $posto = Posto::factory()->create();
    usuarioP7('b3330000-0000-4000-8000-000000000001', $posto->id);

    $fechamento = Fechamento::factory()->create(['posto_id' => $posto->id, 'total_recebido' => '4500.00']);
    fixaInstanteF($fechamento->id, '2026-09-20 00:00:00+00');
    Recebimento::factory()->count(2)->create(['fechamento_id' => $fechamento->id]);

    withToken(tokenP7('b3330000-0000-4000-8000-000000000001'))
        ->getJson("/api/postos/{$posto->id}/fechamento?data=2026-09-20")
        ->assertOk()
        ->assertJsonPath('data.id', $fechamento->id)
        ->assertJsonPath('data.total_recebido', '4500.00')
        ->assertJsonCount(2, 'data.recebimentos');
});

it('dia com mais de um fechamento devolve o MAIS RECENTE, como o painel faz', function (): void {
    // O unique é (data, turno_id) e em Postgres NULL não colide com NULL, então o dia PODE ter
    // mais de uma linha. `fechamento.service.ts:45-60` ordena por id desc e pega 1, com o porquê
    // escrito lá desde 16/08: ler de um jeito e gravar de outro já acertou linhas diferentes no
    // mesmo dia neste sistema. Devolver a lista, ou a primeira, mudaria o número da tela.
    $posto = Posto::factory()->create();
    usuarioP7('b4440000-0000-4000-8000-000000000001', $posto->id);

    $velho = Fechamento::factory()->create(['posto_id' => $posto->id, 'total_recebido' => '100.00']);
    $novo = Fechamento::factory()->create(['posto_id' => $posto->id, 'total_recebido' => '999.00']);
    fixaInstanteF($velho->id, '2026-09-20 00:00:00+00');
    fixaInstanteF($novo->id, '2026-09-20 00:00:00+00');

    withToken(tokenP7('b4440000-0000-4000-8000-000000000001'))
        ->getJson("/api/postos/{$posto->id}/fechamento?data=2026-09-20")
        ->assertOk()
        ->assertJsonPath('data.id', $novo->id)
        ->assertJsonPath('data.total_recebido', '999.00');
});

it('não devolve o fechamento de outro posto — nem os recebimentos dele', function (): void {
    // Recebimento NÃO tem posto_id (TEN-3): só existe escopado pelo pai. Se o fechamento vazar,
    // os recebimentos vão junto — por isso o canário de tenant aqui cobre os dois.
    $meu = Posto::factory()->create();
    $alheio = Posto::factory()->create();
    usuarioP7('b5550000-0000-4000-8000-000000000001', $meu->id);

    $doAlheio = Fechamento::factory()->create(['posto_id' => $alheio->id]);
    fixaInstanteF($doAlheio->id, '2026-09-20 00:00:00+00');
    Recebimento::factory()->create(['fechamento_id' => $doAlheio->id, 'valor' => '7777.00']);

    $resposta = withToken(tokenP7('b5550000-0000-4000-8000-000000000001'))
        ->getJson("/api/postos/{$meu->id}/fechamento?data=2026-09-20")->assertOk();

    $resposta->assertJsonPath('data', null);
    expect($resposta->getContent())->not->toContain('7777.00');
});

it('dia não apurado: total_vendas e diferenca ficam null, NUNCA 0.00 — invariante I8', function (): void {
    // null é "ninguém fechou/apurou"; '0.00' é "apurou e deu zero". O segundo é uma afirmação
    // sobre o dinheiro do posto que ninguém fez. Já houve bug: o painel gravava 0 em dia sem
    // encerrante, e foi por isso que a coluna virou nullable.
    $posto = Posto::factory()->create();
    usuarioP7('b6660000-0000-4000-8000-000000000001', $posto->id);

    $fechamento = Fechamento::factory()->create([
        'posto_id' => $posto->id, 'total_vendas' => null, 'diferenca' => null, 'total_recebido' => '0.00',
    ]);
    fixaInstanteF($fechamento->id, '2026-09-20 00:00:00+00');

    $resposta = withToken(tokenP7('b6660000-0000-4000-8000-000000000001'))
        ->getJson("/api/postos/{$posto->id}/fechamento?data=2026-09-20")->assertOk();

    expect($resposta->getContent())
        ->toContain('"total_vendas":null')
        ->toContain('"diferenca":null')
        ->toContain('"total_recebido":"0.00"');

    expect($resposta->getContent())->not->toContain('"total_vendas":"0.00"');
});
