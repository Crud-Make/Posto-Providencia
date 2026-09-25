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
| Relatório Diário pela API: GET /api/postos/{posto}/relatorio-diario?data=
|--------------------------------------------------------------------------
| Substitui `fechamentoService.getByDate` e `despesaService.getAll` da tela. Prova-se:
| (1) o contrato — TODAS as linhas de Fechamento do dia, com o nome de quem gravou, `null` onde o
|     banco tem `null`, e só as despesas de competência no dia;
| (2) o isolamento — gerente do Jorro leva 403 no BR, operador leva 403 (é dado de proprietário),
|     sem token 401, e nenhuma linha do BR aparece na resposta do Jorro.
|
| Cenário (20/09/2026), posto JORRO: dois fechamentos no dia (turno null FECHADO 1234.56/-10.25,
| gravado por "Gerente Jorro"; turno 2 ABERTO com total e diferença nulos), um no dia 19 e um no
| dia 21 (fora); despesas 150.00 e 49.90 no dia 20, 300.00 no dia 21 (fora). Posto BR: fechamento
| e despesa no MESMO dia, que não podem vazar.
*/

const SEGREDO_RELATORIO = 'segredo-de-teste-do-relatorio-diario';

function b64urlRelatorio(string $cru): string
{
    return rtrim(strtr(base64_encode($cru), '+/', '-_'), '=');
}

/** Usuário como o sistema cria (trigger em auth.users), com o papel pedido no posto; devolve o token. */
function acessoRelatorio(string $sub, ?int $postoId, Role $role, ?PapelNoPosto $papel): string
{
    DB::table('auth.users')->insert(['id' => $sub, 'email' => $sub.'@teste.local']);
    $usuario = Usuario::query()->where('auth_user_id', $sub)->sole();
    $usuario->forceFill(['role' => $role, 'ativo' => true])->save();

    if ($postoId !== null && $papel !== null) {
        UsuarioPosto::factory()->create(['usuario_id' => $usuario->id, 'posto_id' => $postoId, 'role' => $papel, 'ativo' => true]);
    }

    $cabecalho = b64urlRelatorio((string) json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $corpo = b64urlRelatorio((string) json_encode(['sub' => $sub, 'aud' => 'authenticated', 'exp' => time() + 3600]));

    return $cabecalho.'.'.$corpo.'.'.b64urlRelatorio(hash_hmac('sha256', $cabecalho.'.'.$corpo, SEGREDO_RELATORIO, binary: true));
}

/** @return array{jorro: int, br: int, fechadoId: int, abertoId: int} */
function cenarioRelatorio(): array
{
    $jorro = Posto::factory()->create(['nome' => 'Posto Jorro'])->id;
    $br = Posto::factory()->create(['nome' => 'Posto BR'])->id;
    $gerente = DB::table('Usuario')->insertGetId(['email' => fake()->unique()->safeEmail(), 'nome' => 'Gerente Jorro']);
    $gerenteBr = DB::table('Usuario')->insertGetId(['email' => fake()->unique()->safeEmail(), 'nome' => 'Gerente BR']);

    $fechamento = static fn (int $posto, int $usuario, string $dia, ?int $turno, string $status, ?string $vendas, ?string $diferenca): int => DB::table('Fechamento')->insertGetId([
        'posto_id' => $posto, 'usuario_id' => $usuario, 'data' => "{$dia} 00:00:00+00", 'turno_id' => $turno,
        'status' => $status, 'total_vendas' => $vendas, 'total_recebido' => '0', 'diferenca' => $diferenca,
    ]);
    $turno = DB::table('Turno')->insertGetId(['posto_id' => $jorro, 'nome' => 'Tarde', 'horario_inicio' => '14:00', 'horario_fim' => '22:00']);

    $fechadoId = $fechamento($jorro, $gerente, '2026-09-20', null, 'FECHADO', '1234.56', '-10.25');
    $abertoId = $fechamento($jorro, $gerente, '2026-09-20', $turno, 'ABERTO', null, null);
    $fechamento($jorro, $gerente, '2026-09-19', null, 'FECHADO', '1.00', '0.00');
    $fechamento($jorro, $gerente, '2026-09-21', null, 'FECHADO', '2.00', '0.00');
    $fechamento($br, $gerenteBr, '2026-09-20', null, 'FECHADO', '9999.99', '99.99');

    DB::table('Despesa')->insert([
        ['posto_id' => $jorro, 'descricao' => 'Energia', 'categoria' => 'Energia Elétrica', 'valor' => '150.00', 'data' => '2026-09-20', 'status' => 'pago', 'data_pagamento' => '2026-09-20', 'observacoes' => 'conta de agosto'],
        ['posto_id' => $jorro, 'descricao' => 'Lanche', 'categoria' => null, 'valor' => '49.90', 'data' => '2026-09-20', 'status' => 'pendente', 'data_pagamento' => null, 'observacoes' => null],
        ['posto_id' => $jorro, 'descricao' => 'Amanhã', 'categoria' => 'Outros', 'valor' => '300.00', 'data' => '2026-09-21', 'status' => 'pendente', 'data_pagamento' => null, 'observacoes' => null],
        ['posto_id' => $br, 'descricao' => 'Do BR', 'categoria' => 'Outros', 'valor' => '8888.00', 'data' => '2026-09-20', 'status' => 'pendente', 'data_pagamento' => null, 'observacoes' => null],
    ]);

    return ['jorro' => $jorro, 'br' => $br, 'fechadoId' => $fechadoId, 'abertoId' => $abertoId];
}

function urlRelatorio(int|string $posto, string $dia = '2026-09-20'): string
{
    return "/api/postos/{$posto}/relatorio-diario?data={$dia}";
}

beforeEach(function (): void {
    config(['supabase.jwt_secret' => SEGREDO_RELATORIO]);
    app()->forgetInstance(VerificaTokenDoSupabase::class);
});

it('devolve todas as linhas de Fechamento do dia, com o nome de quem gravou e null onde é null', function (): void {
    $c = cenarioRelatorio();
    $token = acessoRelatorio('c1c10000-0000-4000-8000-000000000001', $c['jorro'], Role::Gerente, PapelNoPosto::Gerente);

    $resposta = withToken($token)->getJson(urlRelatorio($c['jorro']))->assertOk();

    $resposta->assertJsonPath('data', '2026-09-20');
    expect($resposta->json('fechamentos'))->toBe([
        [
            'id' => $c['fechadoId'], 'data' => '2026-09-20T00:00:00Z', 'status' => 'FECHADO',
            'total_vendas' => '1234.56', 'diferenca' => '-10.25', 'turno_id' => null, 'usuario_nome' => 'Gerente Jorro',
        ],
        [
            'id' => $c['abertoId'], 'data' => '2026-09-20T00:00:00Z', 'status' => 'ABERTO',
            'total_vendas' => null, 'diferenca' => null, 'turno_id' => $resposta->json('fechamentos.1.turno_id'), 'usuario_nome' => 'Gerente Jorro',
        ],
    ]);
    expect($resposta->json('fechamentos.1.turno_id'))->toBeInt();
});

it('devolve só as despesas de competência no dia, dinheiro em string', function (): void {
    $c = cenarioRelatorio();
    $token = acessoRelatorio('c2c20000-0000-4000-8000-000000000001', $c['jorro'], Role::Gerente, PapelNoPosto::Gerente);

    withToken($token)->getJson(urlRelatorio($c['jorro']))
        ->assertOk()
        ->assertJsonCount(2, 'despesas')
        ->assertJsonPath('despesas.0.valor', '150.00')
        ->assertJsonPath('despesas.1.valor', '49.90')
        ->assertJsonPath('despesas.0.descricao', 'Energia')
        ->assertJsonPath('despesas.0.categoria', 'Energia Elétrica')
        ->assertJsonPath('despesas.0.data', '2026-09-20')
        ->assertJsonPath('despesas.0.status', 'pago')
        ->assertJsonPath('despesas.0.data_pagamento', '2026-09-20')
        ->assertJsonPath('despesas.0.observacoes', 'conta de agosto')
        ->assertJsonPath('despesas.1.categoria', null)
        ->assertJsonPath('despesas.1.data_pagamento', null)
        ->assertJsonPath('despesas.1.observacoes', null);
});

it('dia sem movimento: 200 com listas vazias, nunca 404', function (): void {
    $c = cenarioRelatorio();
    $token = acessoRelatorio('c3c30000-0000-4000-8000-000000000001', $c['jorro'], Role::Gerente, PapelNoPosto::Gerente);

    withToken($token)->getJson(urlRelatorio($c['jorro'], '2026-01-05'))
        ->assertOk()
        ->assertExactJson(['data' => '2026-01-05', 'fechamentos' => [], 'despesas' => []]);
});

it('isolamento: nada do BR vaza na resposta do Jorro, e o gerente do Jorro leva 403 no BR', function (): void {
    $c = cenarioRelatorio();
    $token = acessoRelatorio('c4c40000-0000-4000-8000-000000000001', $c['jorro'], Role::Gerente, PapelNoPosto::Gerente);

    $corpo = (string) withToken($token)->getJson(urlRelatorio($c['jorro']))->assertOk()->getContent();
    foreach (['9999.99', '8888.00', 'Gerente BR', 'Do BR'] as $doBr) {
        expect(str_contains($corpo, $doBr))->toBeFalse();
    }

    withToken($token)->getJson(urlRelatorio($c['br']))->assertForbidden();
});

it('sem token: 401, antes de olhar posto ou dia', function (): void {
    $c = cenarioRelatorio();

    getJson(urlRelatorio($c['jorro']))->assertUnauthorized();
    getJson(urlRelatorio(999999, 'lixo'))->assertUnauthorized();
});

it('operador vinculado ao posto: 403 — o relatório traz despesa e lucro, dado de proprietário', function (): void {
    $c = cenarioRelatorio();
    $token = acessoRelatorio('c5c50000-0000-4000-8000-000000000001', $c['jorro'], Role::Operador, PapelNoPosto::Operador);

    withToken($token)->getJson("/api/postos/{$c['jorro']}/leituras?data=2026-09-20")->assertOk();
    withToken($token)->getJson(urlRelatorio($c['jorro']))->assertForbidden();
});

it('dia inválido: 422 depois de passar pela porta', function (): void {
    $c = cenarioRelatorio();
    $token = acessoRelatorio('c6c60000-0000-4000-8000-000000000001', $c['jorro'], Role::Gerente, PapelNoPosto::Gerente);

    withToken($token)->getJson(urlRelatorio($c['jorro'], '20-09-2026'))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['data']);
    withToken($token)->getJson("/api/postos/{$c['jorro']}/relatorio-diario")
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['data']);
});
