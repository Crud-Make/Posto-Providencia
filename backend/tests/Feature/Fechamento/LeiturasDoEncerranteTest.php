<?php

declare(strict_types=1);

use App\Cadastro\Domain\Bico;
use App\Cadastro\Domain\Bomba;
use App\Cadastro\Domain\Combustivel;
use App\Compartilhado\Enums\PapelNoPosto;
use App\Compartilhado\Enums\Role;
use App\Compartilhado\Enums\StatusFechamento;
use App\Compartilhado\Posto;
use App\Compartilhado\PostoAtual;
use App\Fechamento\Domain\Fechamento;
use App\Pessoas\Application\VerificaTokenDoSupabase;
use App\Pessoas\Domain\Usuario;
use App\Pessoas\Domain\UsuarioPosto;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

use function Pest\Laravel\putJson;
use function Pest\Laravel\withToken;

/*
|--------------------------------------------------------------------------
| PUT /api/postos/{posto}/leituras — o PWA do dono grava SÓ o encerrante (#102)
|--------------------------------------------------------------------------
| As travas são as do PUT /fechamento (gerir, janela, item de outro posto, forma do corpo), mas a
| rota não fecha o dia: não cria Fechamento, não muda o status do que existe e só reconsolida os
| totais do pai quando ele já existe. Helpers com sufixo LDE: função global do Pest é única no projeto.
*/

const SEGREDO_LDE = 'segredo-de-teste-das-leituras-do-dono';

const DIA_LDE = '2026-01-05';

const INSTANTE_LDE = '2026-01-05 00:00:00+00';

function b64urlLDE(string $cru): string
{
    return rtrim(strtr(base64_encode($cru), '+/', '-_'), '=');
}

function tokenLDE(Usuario $usuario): string
{
    $c = b64urlLDE((string) json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $p = b64urlLDE((string) json_encode(['sub' => $usuario->auth_user_id, 'aud' => 'authenticated', 'exp' => time() + 3600]));

    return $c.'.'.$p.'.'.b64urlLDE(hash_hmac('sha256', $c.'.'.$p, SEGREDO_LDE, binary: true));
}

/** Identidade como o sistema cria (trigger em auth.users), com o papel pedido no posto. */
function usuarioLDE(int $postoId, Role $role, PapelNoPosto $papel): Usuario
{
    $sub = (string) Str::uuid();
    DB::table('auth.users')->insert(['id' => $sub, 'email' => $sub.'@teste.local']);
    $u = Usuario::query()->where('auth_user_id', $sub)->sole();
    $u->forceFill(['role' => $role, 'ativo' => true])->save();
    UsuarioPosto::factory()->create(['usuario_id' => $u->id, 'posto_id' => $postoId, 'role' => $papel, 'ativo' => true]);

    return $u->refresh();
}

/**
 * Um posto com três bicos do mesmo combustível — os três ativos, então o dia só está apurado com
 * as três leituras (ConsolidacaoDoDia).
 *
 * @return array{posto: Posto, combustivel: Combustivel, bicos: list<Bico>}
 */
function cenarioLDE(): array
{
    $posto = Posto::factory()->create();
    app(PostoAtual::class)->definir($posto->id);   // as factories ganham posto_id pelo trait

    $combustivel = Combustivel::factory()->create();
    $bomba = Bomba::factory()->create();
    $bicos = [];
    for ($i = 0; $i < 3; $i++) {
        $bicos[] = Bico::factory()->create(['bomba_id' => $bomba->id, 'combustivel_id' => $combustivel->id, 'ativo' => true]);
    }

    return ['posto' => $posto, 'combustivel' => $combustivel, 'bicos' => $bicos];
}

/** @return array<string, mixed> */
function leituraLDE(Bico $bico, Combustivel $combustivel, string $inicial = '1000.000', string $final = '1100.000', string $litros = '100.000', string $valor = '600.00'): array
{
    return [
        'bico_id' => $bico->id, 'combustivel_id' => $combustivel->id,
        'leitura_inicial' => $inicial, 'leitura_final' => $final, 'litros_vendidos' => $litros,
        'preco_litro' => '6.00', 'valor_total' => $valor,
    ];
}

/**
 * Leitura já gravada no banco (outro escritor), direto na tabela.
 *
 * @param  numeric-string  $inicial
 */
function gravaLeituraLDE(int $postoId, Bico $bico, Combustivel $combustivel, string $inicial, string $valor): void
{
    DB::table('Leitura')->insert([
        'bico_id' => $bico->id, 'combustivel_id' => $combustivel->id, 'data' => INSTANTE_LDE,
        'leitura_inicial' => $inicial, 'leitura_final' => bcadd($inicial, '50.000', 3), 'litros_vendidos' => '50.000',
        'preco_litro' => '6.00', 'valor_total' => $valor, 'usuario_id' => Usuario::factory()->create()->id, 'posto_id' => $postoId,
    ]);
}

function urlLDE(int $postoId, string $dia = DIA_LDE): string
{
    return "/api/postos/{$postoId}/leituras?data={$dia}";
}

function leiturasDoPostoLDE(int $postoId): int
{
    return DB::table('Leitura')->where('posto_id', $postoId)->count();
}

beforeEach(function (): void {
    config(['supabase.jwt_secret' => SEGREDO_LDE]);
    app()->forgetInstance(VerificaTokenDoSupabase::class);
});

it('sem token: 401 e nada gravado', function (): void {
    $c = cenarioLDE();

    putJson(urlLDE($c['posto']->id), ['leituras' => [leituraLDE($c['bicos'][0], $c['combustivel'])]])->assertUnauthorized();

    expect(leiturasDoPostoLDE($c['posto']->id))->toBe(0);
});

it('operador com vínculo: 403 — ver não basta, a escrita exige gerir', function (): void {
    $c = cenarioLDE();
    $operador = usuarioLDE($c['posto']->id, Role::Operador, PapelNoPosto::Operador);

    withToken(tokenLDE($operador))->getJson(urlLDE($c['posto']->id))->assertOk();
    withToken(tokenLDE($operador))
        ->putJson(urlLDE($c['posto']->id), ['leituras' => [leituraLDE($c['bicos'][0], $c['combustivel'])]])
        ->assertForbidden();

    expect(leiturasDoPostoLDE($c['posto']->id))->toBe(0);
});

it('gerente de OUTRO posto: 403 e nada gravado', function (): void {
    $c = cenarioLDE();
    $outro = cenarioLDE();
    $gerenteDoOutro = usuarioLDE($outro['posto']->id, Role::Gerente, PapelNoPosto::Gerente);

    withToken(tokenLDE($gerenteDoOutro))
        ->putJson(urlLDE($c['posto']->id), ['leituras' => [leituraLDE($c['bicos'][0], $c['combustivel'])]])
        ->assertForbidden();

    expect(leiturasDoPostoLDE($c['posto']->id))->toBe(0);
});

it('gerente grava 2 bicos: 200, linhas no posto da rota, a resposta é o dia e o 3º bico fica intacto', function (): void {
    $c = cenarioLDE();
    [$b1, $b2, $b3] = $c['bicos'];
    gravaLeituraLDE($c['posto']->id, $b3, $c['combustivel'], '7000.000', '300.00');
    $gerente = usuarioLDE($c['posto']->id, Role::Gerente, PapelNoPosto::Gerente);

    $resposta = withToken(tokenLDE($gerente))
        ->putJson(urlLDE($c['posto']->id), ['leituras' => [
            leituraLDE($b1, $c['combustivel']),
            leituraLDE($b2, $c['combustivel'], '2000.000', '2050.000', '50.000', '300.00'),
        ]])
        ->assertOk()
        ->assertJsonCount(3, 'data')
        ->assertJsonPath('data.0.bico_id', $b1->id)
        ->assertJsonPath('data.0.valor_total', '600.00')
        ->assertJsonPath('data.0.litros_vendidos', '100.000')
        ->assertJsonPath('data.0.data', '2026-01-05T00:00:00Z')
        ->assertJsonPath('data.2.bico_id', $b3->id);

    // Decimal em STRING no JSON cru, como o GET /leituras — nunca número.
    expect($resposta->getContent())->toContain('"valor_total":"600.00"');

    $gravadas = DB::table('Leitura')->whereIn('bico_id', [$b1->id, $b2->id])->get();
    expect($gravadas)->toHaveCount(2)
        ->and($gravadas->pluck('posto_id')->unique()->all())->toBe([$c['posto']->id])
        ->and($gravadas->pluck('usuario_id')->unique()->all())->toBe([$gerente->id])
        ->and(DB::table('Leitura')->where('bico_id', $b3->id)->value('leitura_inicial'))->toBe('7000.000')
        ->and(leiturasDoPostoLDE($c['posto']->id))->toBe(3);
});

it('reenviar o mesmo bico atualiza (UPSERT), sem linha duplicada', function (): void {
    $c = cenarioLDE();
    $gerente = usuarioLDE($c['posto']->id, Role::Gerente, PapelNoPosto::Gerente);
    $url = urlLDE($c['posto']->id);

    withToken(tokenLDE($gerente))->putJson($url, ['leituras' => [leituraLDE($c['bicos'][0], $c['combustivel'])]])->assertOk();
    withToken(tokenLDE($gerente))
        ->putJson($url, ['leituras' => [leituraLDE($c['bicos'][0], $c['combustivel'], '1000.000', '1200.000', '200.000', '1200.00')]])
        ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.valor_total', '1200.00');

    expect(DB::table('Leitura')->where('bico_id', $c['bicos'][0]->id)->count())->toBe(1)
        ->and(DB::table('Leitura')->where('bico_id', $c['bicos'][0]->id)->value('leitura_final'))->toBe('1200.000');
});

it('bico ou combustível de OUTRO posto: 422 item_de_outro_posto e a leitura do vizinho fica intacta', function (string $tipo): void {
    $jorro = cenarioLDE();
    gravaLeituraLDE($jorro['posto']->id, $jorro['bicos'][0], $jorro['combustivel'], '5000.000', '300.00');
    $br = cenarioLDE();
    $gerente = usuarioLDE($br['posto']->id, Role::Gerente, PapelNoPosto::Gerente);
    $leitura = $tipo === 'bico'
        ? leituraLDE($jorro['bicos'][0], $br['combustivel'])
        : leituraLDE($br['bicos'][0], $jorro['combustivel']);

    withToken(tokenLDE($gerente))->putJson(urlLDE($br['posto']->id), ['leituras' => [$leitura]])
        ->assertUnprocessable()->assertJsonPath('erro.codigo', 'item_de_outro_posto');

    expect(DB::table('Leitura')->where('bico_id', $jorro['bicos'][0]->id)->value('leitura_inicial'))->toBe('5000.000')
        ->and(leiturasDoPostoLDE($br['posto']->id))->toBe(0);
})->with(['bico', 'combustivel']);

it('fora da janela: 422 fora_da_janela e nada gravado', function (): void {
    $c = cenarioLDE();
    $gerente = usuarioLDE($c['posto']->id, Role::Gerente, PapelNoPosto::Gerente);

    withToken(tokenLDE($gerente))
        ->putJson(urlLDE($c['posto']->id, '2025-12-30'), ['leituras' => [leituraLDE($c['bicos'][0], $c['combustivel'])]])
        ->assertStatus(422)
        ->assertJsonPath('erro.codigo', 'fora_da_janela');

    expect(leiturasDoPostoLDE($c['posto']->id))->toBe(0);
});

it('dia com Fechamento: o pai é reconsolidado pelo encerrante e o status não vira FECHADO', function (): void {
    $c = cenarioLDE();
    [$b1, $b2, $b3] = $c['bicos'];
    $pai = Fechamento::factory()->create([
        'posto_id' => $c['posto']->id, 'status' => StatusFechamento::Rascunho,
        'total_vendas' => '999.00', 'total_recebido' => '0.00', 'diferenca' => '999.00',
    ]);
    DB::table('Fechamento')->where('id', $pai->id)->update(['data' => INSTANTE_LDE]);
    $gerente = usuarioLDE($c['posto']->id, Role::Gerente, PapelNoPosto::Gerente);
    $url = urlLDE($c['posto']->id);

    // Dois de três bicos ativos: o dia fica INCOMPLETO — venda e diferença voltam a null.
    withToken(tokenLDE($gerente))->putJson($url, ['leituras' => [
        leituraLDE($b1, $c['combustivel']),
        leituraLDE($b2, $c['combustivel'], '2000.000', '2050.000', '50.000', '300.00'),
    ]])->assertOk();

    $depois = DB::table('Fechamento')->where('id', $pai->id)->first();
    expect($depois?->total_vendas)->toBeNull()
        ->and($depois?->diferenca)->toBeNull()
        ->and($depois?->status)->toBe('RASCUNHO');

    // O terceiro bico completa o dia: venda = 600 + 300 + 150, sem sessão, diferença = venda.
    withToken(tokenLDE($gerente))->putJson($url, ['leituras' => [
        leituraLDE($b3, $c['combustivel'], '3000.000', '3025.000', '25.000', '150.00'),
    ]])->assertOk()->assertJsonCount(3, 'data');

    $depois = DB::table('Fechamento')->where('id', $pai->id)->first();
    expect($depois?->total_vendas)->toBe('1050.00')
        ->and($depois?->total_recebido)->toBe('0.00')
        ->and($depois?->diferenca)->toBe('1050.00')
        ->and($depois?->status)->toBe('RASCUNHO')
        ->and(DB::table('Fechamento')->where('posto_id', $c['posto']->id)->count())->toBe(1);
});

it('dia sem Fechamento: grava as leituras e NÃO cria o pai', function (): void {
    $c = cenarioLDE();
    $gerente = usuarioLDE($c['posto']->id, Role::Gerente, PapelNoPosto::Gerente);

    withToken(tokenLDE($gerente))
        ->putJson(urlLDE($c['posto']->id), ['leituras' => array_map(
            static fn (Bico $bico): array => leituraLDE($bico, $c['combustivel']),
            $c['bicos'],
        )])
        ->assertOk()->assertJsonCount(3, 'data');

    expect(leiturasDoPostoLDE($c['posto']->id))->toBe(3)
        ->and(DB::table('Fechamento')->where('posto_id', $c['posto']->id)->count())->toBe(0);
});

it('dinheiro em número JSON: 422 corpo_invalido apontando o campo', function (): void {
    $c = cenarioLDE();
    $gerente = usuarioLDE($c['posto']->id, Role::Gerente, PapelNoPosto::Gerente);
    $leitura = array_merge(leituraLDE($c['bicos'][0], $c['combustivel']), ['valor_total' => 600.0]);

    withToken(tokenLDE($gerente))->putJson(urlLDE($c['posto']->id), ['leituras' => [$leitura]])
        ->assertStatus(422)
        ->assertJsonPath('erro.codigo', 'corpo_invalido')
        ->assertJsonValidationErrors(['leituras.0.valor_total'], 'erro.campos');

    expect(leiturasDoPostoLDE($c['posto']->id))->toBe(0);
});

it('lista de leituras vazia: 422 corpo_invalido', function (): void {
    $c = cenarioLDE();
    $gerente = usuarioLDE($c['posto']->id, Role::Gerente, PapelNoPosto::Gerente);

    withToken(tokenLDE($gerente))->putJson(urlLDE($c['posto']->id), ['leituras' => []])
        ->assertStatus(422)
        ->assertJsonPath('erro.codigo', 'corpo_invalido')
        ->assertJsonValidationErrors(['leituras'], 'erro.campos');
});
