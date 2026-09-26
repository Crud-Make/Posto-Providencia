<?php

declare(strict_types=1);

use App\Cadastro\Domain\Bico;
use App\Cadastro\Domain\Combustivel;
use App\Cadastro\Domain\Turno;
use App\Compartilhado\Enums\PapelNoPosto;
use App\Compartilhado\Enums\Role;
use App\Compartilhado\Enums\StatusFechamento;
use App\Compartilhado\Posto;
use App\Fechamento\Domain\Fechamento;
use App\Fechamento\Domain\Leitura;
use App\Pessoas\Application\VerificaTokenDoSupabase;
use App\Pessoas\Domain\Usuario;
use App\Pessoas\Domain\UsuarioPosto;
use Illuminate\Support\Facades\DB;

use function Pest\Laravel\getJson;
use function Pest\Laravel\putJson;
use function Pest\Laravel\withToken;

/*
|--------------------------------------------------------------------------
| Fechamento de Caixa 100% pela API (25/09/2026)
|--------------------------------------------------------------------------
| As três leituras que a tela ainda fazia no Supabase:
|  - GET /leituras/ultimas?antes_de=  → encerrante inicial de um dia novo (`getLastReading`);
|  - GET /leituras?data=&ate=         → as leituras do mês (encerrantes da aba Fechamento Mensal);
|  - GET /fechamento-mensal/{ano}/{mes} → a venda de cada dia do mês (a RPC get_fechamento_mensal,
|    sem o lucro).
| E o isolamento que as três herdam do grupo protegido: sem token 401, gerente de OUTRO posto 403,
| operador não grava o dia.
*/

const SEGREDO_CAIXA = 'segredo-de-teste-do-fechamento-de-caixa';

function b64urlCaixa(string $cru): string
{
    return rtrim(strtr(base64_encode($cru), '+/', '-_'), '=');
}

function tokenCaixa(string $sub): string
{
    $cabecalho = b64urlCaixa((string) json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $corpo = b64urlCaixa((string) json_encode(['sub' => $sub, 'aud' => 'authenticated', 'exp' => time() + 3600]));

    return $cabecalho.'.'.$corpo.'.'.b64urlCaixa(hash_hmac('sha256', $cabecalho.'.'.$corpo, SEGREDO_CAIXA, binary: true));
}

/** Identidade como o sistema cria (trigger em auth.users), com o papel pedido no posto. */
function usuarioCaixa(string $sub, int $postoId, Role $role, PapelNoPosto $papel): Usuario
{
    DB::table('auth.users')->insert(['id' => $sub, 'email' => $sub.'@teste.local']);
    $usuario = Usuario::query()->where('auth_user_id', $sub)->sole();
    $usuario->forceFill(['role' => $role, 'ativo' => true])->save();
    UsuarioPosto::factory()->create(['usuario_id' => $usuario->id, 'posto_id' => $postoId, 'role' => $papel, 'ativo' => true]);

    return $usuario->refresh();
}

function gerenteCaixa(string $sub, int $postoId): string
{
    usuarioCaixa($sub, $postoId, Role::Gerente, PapelNoPosto::Gerente);

    return tokenCaixa($sub);
}

/**
 * Leitura com `data` fixada como INSTANTE, sem o cast do Eloquent (que grava sem offset e deixa o
 * Postgres ler no fuso da sessão — ver LeiturasDoDiaTest).
 *
 * @param  array<string, mixed>  $campos
 */
function leituraCaixa(Posto $posto, Bico $bico, string $instante, array $campos = []): Leitura
{
    $leitura = Leitura::factory()->create([
        'posto_id' => $posto->id, 'bico_id' => $bico->id, 'combustivel_id' => $bico->combustivel_id, 'data' => $instante, ...$campos,
    ]);
    DB::table('Leitura')->where('id', $leitura->id)->update(['data' => $instante]);

    return $leitura;
}

function fechamentoCaixa(Posto $posto, string $instante, StatusFechamento $status, ?int $turnoId = null): Fechamento
{
    $fechamento = Fechamento::factory()->create(['posto_id' => $posto->id, 'data' => $instante, 'status' => $status, 'turno_id' => $turnoId]);
    DB::table('Fechamento')->where('id', $fechamento->id)->update(['data' => $instante]);

    return $fechamento;
}

beforeEach(function (): void {
    config(['supabase.jwt_secret' => SEGREDO_CAIXA]);
    app()->forgetInstance(VerificaTokenDoSupabase::class);
});

/* ---------------------------------------------------------------- isolamento ------------------ */

it('sem token: 401 nas três rotas novas', function (): void {
    $posto = Posto::factory()->create();

    getJson("/api/postos/{$posto->id}/leituras/ultimas?antes_de=2026-09-20")->assertUnauthorized();
    getJson("/api/postos/{$posto->id}/leituras?data=2026-09-01&ate=2026-09-30")->assertUnauthorized();
    getJson("/api/postos/{$posto->id}/fechamento-mensal/2026/9")->assertUnauthorized();
});

it('gerente do Jorro recebe 403 no posto BR — nas três rotas novas e no PUT do dia', function (): void {
    $jorro = Posto::factory()->create();
    $br = Posto::factory()->create();
    $token = gerenteCaixa('ca1a0000-0000-4000-8000-000000000001', $jorro->id);

    // O vínculo vale no posto dele…
    withToken($token)->getJson("/api/postos/{$jorro->id}/leituras/ultimas?antes_de=2026-09-20")->assertOk();
    withToken($token)->getJson("/api/postos/{$jorro->id}/fechamento-mensal/2026/9")->assertOk();

    // …e não atravessa para o vizinho.
    withToken($token)->getJson("/api/postos/{$br->id}/leituras/ultimas?antes_de=2026-09-20")->assertForbidden();
    withToken($token)->getJson("/api/postos/{$br->id}/leituras?data=2026-09-01&ate=2026-09-30")->assertForbidden();
    withToken($token)->getJson("/api/postos/{$br->id}/fechamento-mensal/2026/9")->assertForbidden();
    withToken($token)->putJson("/api/postos/{$br->id}/fechamento?data=2026-09-20", [])->assertForbidden();
});

it('operador vinculado VÊ as rotas novas e NÃO grava o dia', function (): void {
    $posto = Posto::factory()->create();
    usuarioCaixa('ca2a0000-0000-4000-8000-000000000001', $posto->id, Role::Operador, PapelNoPosto::Operador);
    $token = tokenCaixa('ca2a0000-0000-4000-8000-000000000001');

    withToken($token)->getJson("/api/postos/{$posto->id}/leituras/ultimas?antes_de=2026-09-20")->assertOk();
    withToken($token)->getJson("/api/postos/{$posto->id}/fechamento-mensal/2026/9")->assertOk();
    withToken($token)->putJson("/api/postos/{$posto->id}/fechamento?data=2026-09-20", [])->assertForbidden();
});

it('sem token o PUT do dia é 401', function (): void {
    $posto = Posto::factory()->create();

    putJson("/api/postos/{$posto->id}/fechamento?data=2026-09-20", [])->assertUnauthorized();
});

/* ------------------------------------------------------ GET /leituras/ultimas ----------------- */

it('ultimas: uma linha por bico, a mais nova ESTRITAMENTE antes do dia', function (): void {
    $posto = Posto::factory()->create();
    $bicoA = Bico::factory()->create(['posto_id' => $posto->id]);
    $bicoB = Bico::factory()->create(['posto_id' => $posto->id]);
    $token = gerenteCaixa('ca3a0000-0000-4000-8000-000000000001', $posto->id);

    leituraCaixa($posto, $bicoA, '2026-09-17 00:00:00+00');
    $ultimaA = leituraCaixa($posto, $bicoA, '2026-09-19 00:00:00+00');
    leituraCaixa($posto, $bicoA, '2026-09-20 00:00:00+00');   // o próprio dia: fora
    leituraCaixa($posto, $bicoA, '2026-09-21 00:00:00+00');   // depois: fora
    $ultimaB = leituraCaixa($posto, $bicoB, '2026-08-02 00:00:00+00');

    $ids = withToken($token)->getJson("/api/postos/{$posto->id}/leituras/ultimas?antes_de=2026-09-20")
        ->assertOk()->json('data.*.id');

    expect($ids)->toBe([$ultimaA->id, $ultimaB->id]);
});

it('ultimas: sem o teto de 200 linhas do Supabase — o bico antigo não some', function (): void {
    $posto = Posto::factory()->create();
    $movimentado = Bico::factory()->create(['posto_id' => $posto->id]);
    $parado = Bico::factory()->create(['posto_id' => $posto->id]);
    $token = gerenteCaixa('ca4a0000-0000-4000-8000-000000000001', $posto->id);

    $antiga = leituraCaixa($posto, $parado, '2025-01-01 00:00:00+00');
    $usuario = Usuario::factory()->create();
    $inicio = new DateTimeImmutable('2025-02-01 00:00:00+00:00');
    DB::table('Leitura')->insert(array_map(static fn (int $n): array => [
        'posto_id' => $posto->id, 'bico_id' => $movimentado->id, 'combustivel_id' => $movimentado->combustivel_id,
        'data' => $inicio->modify("+{$n} days")->format('Y-m-d H:i:sP'), 'leitura_inicial' => '1.000', 'leitura_final' => '2.000',
        'litros_vendidos' => '1.000', 'preco_litro' => '6.00', 'valor_total' => '6.00', 'usuario_id' => $usuario->id,
    ], range(0, 210)));

    $bicos = withToken($token)->getJson("/api/postos/{$posto->id}/leituras/ultimas?antes_de=2026-09-20")
        ->assertOk()->json('data.*.bico_id');

    expect($bicos)->toBe([$movimentado->id, $parado->id])
        ->and($antiga->id)->toBeInt();
});

it('ultimas: exige antes_de e não devolve leitura de outro posto', function (): void {
    $meu = Posto::factory()->create();
    $alheio = Posto::factory()->create();
    leituraCaixa($alheio, Bico::factory()->create(['posto_id' => $alheio->id]), '2026-09-01 00:00:00+00');
    $token = gerenteCaixa('ca5a0000-0000-4000-8000-000000000001', $meu->id);

    withToken($token)->getJson("/api/postos/{$meu->id}/leituras/ultimas")->assertStatus(422);
    withToken($token)->getJson("/api/postos/{$meu->id}/leituras/ultimas?antes_de=20-09-2026")->assertStatus(422);
    withToken($token)->getJson("/api/postos/{$meu->id}/leituras/ultimas?antes_de=2026-09-20")
        ->assertOk()->assertJsonCount(0, 'data');
});

/* ------------------------------------------------------ GET /leituras?ate= -------------------- */

it('leituras com ate: o período inteiro, e só ele', function (): void {
    $posto = Posto::factory()->create();
    $bico = Bico::factory()->create(['posto_id' => $posto->id]);
    $token = gerenteCaixa('ca6a0000-0000-4000-8000-000000000001', $posto->id);

    leituraCaixa($posto, $bico, '2026-08-31 00:00:00+00');
    $primeira = leituraCaixa($posto, $bico, '2026-09-01 00:00:00+00');
    $ultima = leituraCaixa($posto, $bico, '2026-09-30 00:00:00+00');
    leituraCaixa($posto, $bico, '2026-10-01 00:00:00+00');

    $ids = withToken($token)->getJson("/api/postos/{$posto->id}/leituras?data=2026-09-01&ate=2026-09-30")
        ->assertOk()->json('data.*.id');

    expect($ids)->toBe([$primeira->id, $ultima->id]);

    withToken($token)->getJson("/api/postos/{$posto->id}/leituras?data=2026-09-01&ate=2026-08-01")->assertStatus(422);
});

/* ------------------------------------------------ GET /fechamento-mensal/{ano}/{mes} ---------- */

/**
 * Setembro/2026 no posto: dois dias com venda, dois combustíveis, dois fechamentos no dia 01 (vale o
 * mais recente) e dia 02 sem fechamento (ABERTO, como o COALESCE da RPC).
 *
 * @return array{posto: Posto, gasolina: Combustivel, diesel: Combustivel}
 */
function setembroCaixa(): array
{
    $posto = Posto::factory()->create();
    $gasolina = Combustivel::factory()->create(['posto_id' => $posto->id, 'nome' => 'Gasolina Comum']);
    $diesel = Combustivel::factory()->create(['posto_id' => $posto->id, 'nome' => 'Diesel S10']);
    $bicoGc = Bico::factory()->create(['posto_id' => $posto->id, 'combustivel_id' => $gasolina->id]);
    $bicoGc2 = Bico::factory()->create(['posto_id' => $posto->id, 'combustivel_id' => $gasolina->id]);
    $bicoDs = Bico::factory()->create(['posto_id' => $posto->id, 'combustivel_id' => $diesel->id]);

    leituraCaixa($posto, $bicoGc, '2026-09-01 00:00:00+00', ['litros_vendidos' => '100.125', 'valor_total' => '638.30']);
    leituraCaixa($posto, $bicoGc2, '2026-09-01 00:00:00+00', ['litros_vendidos' => '50.001', 'valor_total' => '319.01']);
    leituraCaixa($posto, $bicoDs, '2026-09-01 00:00:00+00', ['litros_vendidos' => '20.000', 'valor_total' => '130.00']);
    leituraCaixa($posto, $bicoGc, '2026-09-02 00:00:00+00', ['litros_vendidos' => '10.500', 'valor_total' => '66.99']);
    // Fora do mês: não entra.
    leituraCaixa($posto, $bicoGc, '2026-08-31 00:00:00+00', ['litros_vendidos' => '999.000', 'valor_total' => '9999.00']);

    fechamentoCaixa($posto, '2026-09-01 00:00:00+00', StatusFechamento::Rascunho, Turno::factory()->create(['posto_id' => $posto->id])->id);
    fechamentoCaixa($posto, '2026-09-01 00:00:00+00', StatusFechamento::Fechado, Turno::factory()->create(['posto_id' => $posto->id])->id);

    return ['posto' => $posto, 'gasolina' => $gasolina, 'diesel' => $diesel];
}

it('fechamento-mensal: soma do dia, litros por combustível e status, em string decimal', function (): void {
    $c = setembroCaixa();
    $token = gerenteCaixa('ca7a0000-0000-4000-8000-000000000001', $c['posto']->id);

    $resposta = withToken($token)->getJson("/api/postos/{$c['posto']->id}/fechamento-mensal/2026/9")->assertOk();

    expect($resposta->json())->toBe([
        'periodo' => ['inicio' => '2026-09-01', 'fim' => '2026-09-30'],
        'dias' => [
            [
                'data' => '2026-09-01', 'volume_total' => '170.126', 'faturamento_bruto' => '1087.31',
                'volumes_por_combustivel' => [(string) $c['gasolina']->id => '150.126', (string) $c['diesel']->id => '20.000'],
                'status' => 'FECHADO',
            ],
            [
                'data' => '2026-09-02', 'volume_total' => '10.500', 'faturamento_bruto' => '66.99',
                'volumes_por_combustivel' => [(string) $c['gasolina']->id => '10.500'],
                'status' => 'ABERTO',
            ],
        ],
    ]);
    // As aspas são a asserção: dinheiro e litros nunca saem float.
    $cru = (string) $resposta->getContent();
    expect($cru)->toContain('"faturamento_bruto":"1087.31"')
        ->and(str_contains($cru, '"lucro'))->toBeFalse();
});

it('fechamento-mensal: paridade com a RPC get_fechamento_mensal em volume, faturamento e status', function (): void {
    $c = setembroCaixa();
    $token = gerenteCaixa('ca8a0000-0000-4000-8000-000000000001', $c['posto']->id);
    $gasolina = (string) $c['gasolina']->id;
    $diesel = (string) $c['diesel']->id;

    $api = withToken($token)->getJson("/api/postos/{$c['posto']->id}/fechamento-mensal/2026/9")->assertOk();
    $rpc = DB::select('SELECT dia::text AS dia, volume_total::text AS volume, faturamento_bruto::text AS faturamento, status::text AS status, vol_gasolina::text AS gas, vol_diesel::text AS die FROM get_fechamento_mensal(?, 9, 2026) ORDER BY dia, status', [$c['posto']->id]);

    // A RPC repete o dia 01 uma vez por fechamento (LEFT JOIN no status: RASCUNHO e FECHADO); a API
    // devolve o dia uma vez, com o status do MAIS RECENTE. Fora a repetição, os números são os mesmos.
    $linhas = array_map(static fn (stdClass $l): array => (array) $l, $rpc);
    expect(array_column($linhas, 'dia'))->toBe(['2026-09-01', '2026-09-01', '2026-09-02'])
        ->and(array_column($linhas, 'status'))->toBe(['FECHADO', 'RASCUNHO', 'ABERTO']);

    // Linha 0 da RPC é o dia 01 com o status FECHADO (o do fechamento mais recente); linha 2 é o dia 02.
    foreach ([0 => 0, 1 => 2] as $posicao => $linhaDaRpc) {
        $linha = $linhas[$linhaDaRpc];
        $api->assertJsonPath("dias.{$posicao}.data", $linha['dia'])
            ->assertJsonPath("dias.{$posicao}.volume_total", $linha['volume'])
            ->assertJsonPath("dias.{$posicao}.faturamento_bruto", $linha['faturamento'])
            ->assertJsonPath("dias.{$posicao}.status", $linha['status'])
            ->assertJsonPath("dias.{$posicao}.volumes_por_combustivel.{$gasolina}", $linha['gas']);
    }
    // A RPC dá diesel 20.000 no dia 01 e 0 no dia 02; a API manda a chave só onde há litros.
    $api->assertJsonPath("dias.0.volumes_por_combustivel.{$diesel}", $linhas[0]['die'])
        ->assertJsonMissingPath("dias.1.volumes_por_combustivel.{$diesel}");
    expect($linhas[2]['die'])->toBe('0');
});

it('fechamento-mensal: mês fora do intervalo é 422 e o vizinho não vaza', function (): void {
    $c = setembroCaixa();
    $meu = Posto::factory()->create();
    $token = gerenteCaixa('ca9a0000-0000-4000-8000-000000000001', $meu->id);

    withToken($token)->getJson("/api/postos/{$meu->id}/fechamento-mensal/2026/13")->assertStatus(422);
    withToken($token)->getJson("/api/postos/{$meu->id}/fechamento-mensal/1999/1")->assertStatus(422);
    withToken($token)->getJson("/api/postos/{$meu->id}/fechamento-mensal/2026/9")
        ->assertOk()->assertJsonPath('dias', []);
    expect($c['posto']->id)->not->toBe($meu->id);
});
