<?php

declare(strict_types=1);

use App\Compartilhado\Enums\PapelNoPosto;
use App\Compartilhado\Enums\Role;
use App\Compartilhado\Posto;
use App\Estoque\Application\MovimentoDosTanques;
use App\Pessoas\Application\VerificaTokenDoSupabase;
use App\Pessoas\Domain\Usuario;
use App\Pessoas\Domain\UsuarioPosto;
use Illuminate\Support\Facades\DB;

use function Pest\Laravel\getJson;
use function Pest\Laravel\putJson;
use function Pest\Laravel\withToken;

/*
|--------------------------------------------------------------------------
| Tela "Tanques (Combustível)" do painel pela API (#103, painel-pela-api.md §11)
|--------------------------------------------------------------------------
| GET /tanques/painel — o que o `useDashboardEstoque` lia do Supabase (tanques ativos com o
| combustível, réguas medidas, compras e vendas, despesas do mês, histórico de 30 dias), sem conta.
| PUT /tanques/medicoes — a "Nova Medição (Régua)": o MESMO upsert da régua do PWA
| (`GravaMedicaoDeTanque`), agora para quem GERE o posto.
|
| Cenário do posto A (mês 2026-09, histórico desde 2026-08-27):
|   GC: tanque T-GC (ativo), réguas 2026-09-10 = 9000.00 e 2026-09-18 = 8000.50, e 2026-09-19 só com
|       volume_livro (não medido: fica fora das réguas, entra no histórico).
|   ET: tanque T-ET (ativo), régua 2026-08-20 = 3000.00 → é a última régua mais antiga, então o
|       movimento começa em 2026-08-20 (antes do 1º do mês).
|   T-VELHO (inativo): régua e histórico que NÃO aparecem.
|   Leituras: 2026-08-19 (fora, antes do corte), 2026-08-20 e 2026-09-20 (dentro); do posto B, fora.
|   Compras:  2026-08-19 (fora), 2026-09-12 (dentro); do posto B, fora.
|   Despesas: 2026-08-31 e 2026-10-01 (fora), 2026-09-01 e 2026-09-30 (dentro); do posto B, fora.
*/

const SEGREDO_TQ = 'segredo-de-teste-dos-tanques-do-painel';

const DIA_TQ = '2026-09-20';

function b64urlTq(string $cru): string
{
    return rtrim(strtr(base64_encode($cru), '+/', '-_'), '=');
}

function tokenTq(Usuario $usuario): string
{
    $c = b64urlTq((string) json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $p = b64urlTq((string) json_encode(['sub' => (string) $usuario->auth_user_id, 'aud' => 'authenticated', 'exp' => time() + 3600]));

    return $c.'.'.$p.'.'.b64urlTq(hash_hmac('sha256', $c.'.'.$p, SEGREDO_TQ, binary: true));
}

function usuarioTq(string $sub, int $postoId, Role $role, PapelNoPosto $papel): Usuario
{
    DB::table('auth.users')->insert(['id' => $sub, 'email' => $sub.'@teste.local']);
    $u = Usuario::query()->where('auth_user_id', $sub)->sole();
    $u->forceFill(['role' => $role, 'ativo' => true])->save();
    UsuarioPosto::factory()->create(['usuario_id' => $u->id, 'posto_id' => $postoId, 'role' => $papel, 'ativo' => true]);

    return $u->refresh();
}

function gerenteTq(int $postoId, string $sufixo = '1'): Usuario
{
    return usuarioTq("7a000000-0000-4000-8000-00000000000{$sufixo}", $postoId, Role::Gerente, PapelNoPosto::Gerente);
}

/** @return array{a: int, b: int, gc: int, et: int, tGc: int, tEt: int, tVelho: int, tB: int} */
function cenarioTq(): array
{
    $a = Posto::factory()->create()->id;
    $b = Posto::factory()->create()->id;
    $usuario = DB::table('Usuario')->insertGetId(['email' => fake()->unique()->safeEmail(), 'nome' => 'Teste Tanques']);
    $comb = static fn (int $posto, string $nome, string $codigo, string $venda, ?string $custo): int => DB::table('Combustivel')->insertGetId([
        'posto_id' => $posto, 'nome' => $nome, 'codigo' => $codigo, 'preco_venda' => $venda, 'preco_custo' => $custo,
    ]);
    $gc = $comb($a, 'Gasolina Comum', 'GC', '6.50', '5.1234');
    $et = $comb($a, 'Etanol', 'ET', '4.80', null);
    $gcB = $comb($b, 'Gasolina Comum', 'GC', '6.00', '5.00');
    $tanque = static fn (int $posto, string $nome, int $c, ?bool $ativo): int => DB::table('Tanque')->insertGetId([
        'posto_id' => $posto, 'nome' => $nome, 'combustivel_id' => $c, 'capacidade' => '15000.00', 'estoque_atual' => '123.00', 'ativo' => $ativo,
    ]);
    $tGc = $tanque($a, 'T-GC', $gc, true);
    $tEt = $tanque($a, 'T-ET', $et, true);
    $tVelho = $tanque($a, 'T-VELHO', $gc, false);
    $tB = $tanque($b, 'T-B', $gcB, true);

    $h = static fn (int $t, string $dia, ?string $livro, ?string $fisico): array => ['tanque_id' => $t, 'data' => $dia, 'volume_livro' => $livro, 'volume_fisico' => $fisico];
    DB::table('HistoricoTanque')->insert([
        $h($tGc, '2026-09-10', null, '9000.00'), $h($tGc, '2026-09-18', '8010.00', '8000.50'), $h($tGc, '2026-09-19', '7900.00', null),
        $h($tEt, '2026-08-20', null, '3000.00'), $h($tVelho, '2026-09-01', null, '1.00'), $h($tB, '2026-01-01', null, '5.00'),
    ]);

    $bomba = static fn (int $posto): int => DB::table('Bomba')->insertGetId(['posto_id' => $posto, 'nome' => 'Bomba 1']);
    $bicoGc = DB::table('Bico')->insertGetId(['posto_id' => $a, 'bomba_id' => $bomba($a), 'combustivel_id' => $gc, 'numero' => 1]);
    $bicoB = DB::table('Bico')->insertGetId(['posto_id' => $b, 'bomba_id' => $bomba($b), 'combustivel_id' => $gcB, 'numero' => 1]);
    // O combustivel_id da LEITURA é outro de propósito: a venda vale pelo combustível do BICO.
    $l = static fn (int $posto, int $bico, string $dia, string $litros): array => [
        'posto_id' => $posto, 'bico_id' => $bico, 'combustivel_id' => $et, 'usuario_id' => $usuario, 'data' => "{$dia} 00:00:00+00",
        'leitura_inicial' => '0.000', 'leitura_final' => $litros, 'litros_vendidos' => $litros, 'preco_litro' => '6.50', 'valor_total' => '1.00',
    ];
    DB::table('Leitura')->insert([
        $l($a, $bicoGc, '2026-08-19', '111.000'), $l($a, $bicoGc, '2026-08-20', '222.500'), $l($a, $bicoGc, '2026-09-20', '333.125'), $l($b, $bicoB, '2026-09-20', '999.000'),
    ]);

    $forn = static fn (int $posto): int => DB::table('Fornecedor')->insertGetId(['posto_id' => $posto, 'nome' => 'Distribuidora', 'cnpj' => fake()->unique()->numerify('##.###.###/0001-##')]);
    $fa = $forn($a);
    $cp = static fn (int $posto, int $c, int $f, string $dia, string $litros): array => [
        'posto_id' => $posto, 'combustivel_id' => $c, 'fornecedor_id' => $f, 'data' => "{$dia} 00:00:00+00",
        'quantidade_litros' => $litros, 'valor_total' => '1.00', 'custo_por_litro' => '1.0000',
    ];
    DB::table('Compra')->insert([$cp($a, $gc, $fa, '2026-08-19', '100.00'), $cp($a, $et, $fa, '2026-09-12', '5000.55'), $cp($b, $gcB, $forn($b), '2026-09-12', '7.00')]);

    $d = static fn (int $posto, string $dia, string $valor): array => ['posto_id' => $posto, 'descricao' => 'Despesa', 'valor' => $valor, 'data' => $dia];
    DB::table('Despesa')->insert([$d($a, '2026-08-31', '1.00'), $d($a, '2026-09-01', '1500.00'), $d($a, '2026-09-30', '250.55'), $d($a, '2026-10-01', '2.00'), $d($b, '2026-09-15', '3.00')]);

    return ['a' => $a, 'b' => $b, 'gc' => $gc, 'et' => $et, 'tGc' => $tGc, 'tEt' => $tEt, 'tVelho' => $tVelho, 'tB' => $tB];
}

function urlPainelTq(int $posto, string $consulta = '?mes=2026-09&historico_desde=2026-08-27'): string
{
    return "/api/postos/{$posto}/tanques/painel{$consulta}";
}

/** @return array<string, mixed> */
function medicaoTq(int $tanque, string $volume = '15000.555', string $dia = DIA_TQ): array
{
    return ['tanque_id' => $tanque, 'data' => $dia, 'volume_fisico' => $volume];
}

/** @return list<array{livro: ?string, fisico: ?string}> as linhas do dia do tanque, como o PDO as entrega */
function linhasTq(int $tanque, string $dia = DIA_TQ): array
{
    return array_values(DB::table('HistoricoTanque')->where('tanque_id', $tanque)->where('data', $dia)->get()
        ->map(static fn (object $r): array => ['livro' => is_string($r->volume_livro ?? null) ? $r->volume_livro : null, 'fisico' => is_string($r->volume_fisico ?? null) ? $r->volume_fisico : null])
        ->all());
}

beforeEach(function (): void {
    config(['supabase.jwt_secret' => SEGREDO_TQ]);
    app()->forgetInstance(VerificaTokenDoSupabase::class);
});

it('sem token: 401 na leitura e na medição, e nada gravado', function (): void {
    $c = cenarioTq();

    getJson(urlPainelTq($c['a']))->assertUnauthorized();
    putJson("/api/postos/{$c['a']}/tanques/medicoes", medicaoTq($c['tGc']))->assertUnauthorized();

    expect(linhasTq($c['tGc']))->toBe([]);
});

it('operador do posto: 403 — a tela traz custo e despesa, e a régua do painel é de quem gere', function (): void {
    $c = cenarioTq();
    $token = tokenTq(usuarioTq('7a000000-0000-4000-8000-000000000009', $c['a'], Role::Operador, PapelNoPosto::Operador));

    withToken($token)->getJson(urlPainelTq($c['a']))->assertForbidden();
    withToken($token)->putJson("/api/postos/{$c['a']}/tanques/medicoes", medicaoTq($c['tGc']))->assertForbidden();

    expect(linhasTq($c['tGc']))->toBe([]);
});

it('gerente do posto A no posto B: 403 na leitura e na medição, e nada muda no B', function (): void {
    $c = cenarioTq();
    $token = tokenTq(gerenteTq($c['a']));

    withToken($token)->getJson(urlPainelTq($c['b']))->assertForbidden();
    withToken($token)->putJson("/api/postos/{$c['b']}/tanques/medicoes", medicaoTq($c['tB']))->assertForbidden();

    expect(linhasTq($c['tB']))->toBe([]);
});

it('gerente: a tela inteira numa resposta, só do posto, só tanque ativo, movimento desde a régua mais antiga', function (): void {
    $c = cenarioTq();

    withToken(tokenTq(gerenteTq($c['a'])))->getJson(urlPainelTq($c['a']))
        ->assertOk()
        ->assertExactJson([
            'mes' => ['inicio' => '2026-09-01', 'fim' => '2026-09-30'],
            'movimento_desde' => '2026-08-20',
            'tanques' => [
                ['id' => $c['tEt'], 'nome' => 'T-ET', 'combustivel_id' => $c['et'], 'capacidade' => '15000.00',
                    'combustivel' => ['nome' => 'Etanol', 'codigo' => 'ET', 'preco_venda' => '4.80', 'preco_custo' => null]],
                ['id' => $c['tGc'], 'nome' => 'T-GC', 'combustivel_id' => $c['gc'], 'capacidade' => '15000.00',
                    'combustivel' => ['nome' => 'Gasolina Comum', 'codigo' => 'GC', 'preco_venda' => '6.50', 'preco_custo' => '5.1234']],
            ],
            'reguas' => [
                ['tanque_id' => $c['tEt'], 'data' => '2026-08-20', 'volume_fisico' => '3000.00'],
                ['tanque_id' => $c['tGc'], 'data' => '2026-09-10', 'volume_fisico' => '9000.00'],
                ['tanque_id' => $c['tGc'], 'data' => '2026-09-18', 'volume_fisico' => '8000.50'],
            ],
            'compras' => [['combustivel_id' => $c['et'], 'data' => '2026-09-12', 'quantidade_litros' => '5000.55']],
            'vendas' => [
                ['combustivel_id' => $c['gc'], 'data' => '2026-08-20', 'litros_vendidos' => '222.500'],
                ['combustivel_id' => $c['gc'], 'data' => '2026-09-20', 'litros_vendidos' => '333.125'],
            ],
            'despesas' => [['data' => '2026-09-01', 'valor' => '1500.00'], ['data' => '2026-09-30', 'valor' => '250.55']],
            'historico' => [
                ['id' => DB::table('HistoricoTanque')->where('tanque_id', $c['tGc'])->where('data', '2026-09-10')->value('id'), 'tanque_id' => $c['tGc'], 'data' => '2026-09-10', 'volume_livro' => null, 'volume_fisico' => '9000.00'],
                ['id' => DB::table('HistoricoTanque')->where('tanque_id', $c['tGc'])->where('data', '2026-09-18')->value('id'), 'tanque_id' => $c['tGc'], 'data' => '2026-09-18', 'volume_livro' => '8010.00', 'volume_fisico' => '8000.50'],
                ['id' => DB::table('HistoricoTanque')->where('tanque_id', $c['tGc'])->where('data', '2026-09-19')->value('id'), 'tanque_id' => $c['tGc'], 'data' => '2026-09-19', 'volume_livro' => '7900.00', 'volume_fisico' => null],
            ],
        ]);
});

it('mês ou histórico fora do formato: 422', function (string $consulta): void {
    $c = cenarioTq();

    withToken(tokenTq(gerenteTq($c['a'])))->getJson(urlPainelTq($c['a'], $consulta))->assertUnprocessable();
})->with(['sem mês' => ['?historico_desde=2026-08-27'], 'mês com dia' => ['?mes=2026-09-01&historico_desde=2026-08-27'], 'histórico BR' => ['?mes=2026-09&historico_desde=27/08/2026']]);

it('a medição grava o volume_fisico arredondado como o numeric(10,2) do Supabase, e repetir não duplica', function (): void {
    $c = cenarioTq();
    DB::table('HistoricoTanque')->insert(['tanque_id' => $c['tGc'], 'data' => DIA_TQ, 'volume_livro' => '14000.00']);
    $token = tokenTq(gerenteTq($c['a']));

    withToken($token)->putJson("/api/postos/{$c['a']}/tanques/medicoes", medicaoTq($c['tGc'], '15000.555'))
        ->assertOk()
        ->assertExactJson(['data' => ['tanque_id' => $c['tGc'], 'data' => DIA_TQ, 'volume_fisico' => '15000.56']]);
    withToken($token)->putJson("/api/postos/{$c['a']}/tanques/medicoes", medicaoTq($c['tGc'], '15000.555'))->assertOk();
    // O volume_livro do dia (o Registro de Compras grava) FICA: o upsert só toca o volume_fisico.
    expect(linhasTq($c['tGc']))->toBe([['livro' => '14000.00', 'fisico' => '15000.56']]);

    withToken($token)->putJson("/api/postos/{$c['a']}/tanques/medicoes", medicaoTq($c['tGc'], '1234.5649'))
        ->assertOk()->assertJsonPath('data.volume_fisico', '1234.56');
    withToken($token)->putJson("/api/postos/{$c['a']}/tanques/medicoes", medicaoTq($c['tEt'], '0'))
        ->assertOk()->assertJsonPath('data.volume_fisico', '0.00');
    expect(linhasTq($c['tGc']))->toBe([['livro' => '14000.00', 'fisico' => '1234.56']])
        ->and(linhasTq($c['tEt']))->toBe([['livro' => null, 'fisico' => '0.00']]);
});

it('tanque de OUTRO posto: 422 tanque_invalido, e a régua dele não muda', function (): void {
    $c = cenarioTq();

    withToken(tokenTq(gerenteTq($c['a'])))->putJson("/api/postos/{$c['a']}/tanques/medicoes", medicaoTq($c['tB']))
        ->assertUnprocessable()->assertJsonPath('erro.codigo', 'tanque_invalido');

    expect(linhasTq($c['tB']))->toBe([]);
});

it('fora da janela de escrita: 422 fora_da_janela', function (string $dia): void {
    $c = cenarioTq();

    withToken(tokenTq(gerenteTq($c['a'])))->putJson("/api/postos/{$c['a']}/tanques/medicoes", medicaoTq($c['tGc'], '100', $dia))
        ->assertUnprocessable()->assertJsonPath('erro.codigo', 'fora_da_janela');

    expect(linhasTq($c['tGc'], $dia))->toBe([]);
})->with(['antes da abertura' => ['2025-12-30'], 'depois de amanhã' => [now('UTC')->addDays(2)->format('Y-m-d')]]);

it('forma: número JSON, negativo, vírgula, expoente e 8 dígitos são 422 corpo_invalido', function (mixed $volume): void {
    $c = cenarioTq();

    withToken(tokenTq(gerenteTq($c['a'])))->putJson("/api/postos/{$c['a']}/tanques/medicoes", ['volume_fisico' => $volume] + medicaoTq($c['tGc'], '1'))
        ->assertUnprocessable()->assertJsonPath('erro.codigo', 'corpo_invalido');

    expect(linhasTq($c['tGc']))->toBe([]);
})->with([[15000], ['-1'], ['15000,5'], ['1e-7'], ['10000000']]);

it('o corte do movimento: a última régua mais antiga entre os tanques, ou o 1º do mês se vier antes', function (): void {
    $r = static fn (int $t, string $d): array => ['tanque_id' => $t, 'data' => $d, 'volume_fisico' => '1.00'];

    expect(MovimentoDosTanques::desde([], '2026-09-01'))->toBe('2026-09-01')
        ->and(MovimentoDosTanques::desde([$r(1, '2026-09-10'), $r(1, '2026-09-18')], '2026-09-01'))->toBe('2026-09-01')
        ->and(MovimentoDosTanques::desde([$r(1, '2026-07-01'), $r(1, '2026-08-25'), $r(2, '2026-08-20')], '2026-09-01'))->toBe('2026-08-20');
});
