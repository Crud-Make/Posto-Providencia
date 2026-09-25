<?php

declare(strict_types=1);

use App\Compartilhado\Enums\PapelNoPosto;
use App\Compartilhado\Enums\Role;
use App\Compartilhado\Posto;
use App\Fechamento\Domain\Fechamento;
use App\Pessoas\Application\VerificaTokenDoSupabase;
use App\Pessoas\Domain\Usuario;
use App\Pessoas\Domain\UsuarioPosto;
use Illuminate\Support\Facades\DB;

use function Pest\Laravel\getJson;
use function Pest\Laravel\withToken;

/*
|--------------------------------------------------------------------------
| Visão do Proprietário pela API (#100): GET /proprietario e GET /movimento
|--------------------------------------------------------------------------
| Substituem a RPC get_dashboard_proprietario e as leituras diretas do Supabase da tela. Aqui se
| prova: (1) o número — os insumos reproduzem a RPC ao centavo, com a única divergência (fallback
| preco_custo) NOMEADA; (2) o isolamento — gerente do Jorro não vê número do BR, sem token 401.
|
| Cenário (setembro/2026, "hoje" = 24/09), posto JORRO:
|  - Gasolina Comum: 1000,000 L a 6,00 em 01/09 (R$ 6.000,00) e 200,500 L a 6,10 em 24/09
|    (R$ 1.223,05). Compras em setembro: 3000 L / R$ 16.800,00 (05/09) e 1000 L / R$ 5.800,00
|    em 28/09 — DEPOIS de hoje, mas no mês da leitura: a RPC a conta (custo_epoca é o mês inteiro).
|    Custo do mês = 22.600,00 ÷ 4.000 = 5,65.
|  - Diesel S10: 300,000 L a 6,50 em 10/09 (R$ 1.950,00), SEM compra em setembro; cadastro com
|    preco_custo 5,90 — o fallback que a RPC usa e a DECISÃO 2 proíbe.
|  - Despesas: 1.500,00 (10/09, pendente), 250,50 (24/09, paga), 999,00 (25/09, depois de hoje),
|    777,00 (31/08, pendente).
|  - Fechamentos em 20/09 e 23/09. Régua do tanque de GC em 31/08 (abertura) e em 24/09; régua
|    NÃO medida (volume nulo) em 23/09.
| Posto BR: movimento parecido, com números distintos, para provar que nada vaza.
*/

const SEGREDO_PROPRIETARIO = 'segredo-de-teste-da-visao-do-proprietario';

const SETEMBRO_ATE_HOJE = 'inicio=2026-09-01&fim=2026-09-24';

function b64urlProprietario(string $cru): string
{
    return rtrim(strtr(base64_encode($cru), '+/', '-_'), '=');
}

function tokenProprietario(string $sub): string
{
    $cabecalho = b64urlProprietario((string) json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $corpo = b64urlProprietario((string) json_encode(['sub' => $sub, 'aud' => 'authenticated', 'exp' => time() + 3600]));

    return $cabecalho.'.'.$corpo.'.'.b64urlProprietario(hash_hmac('sha256', $cabecalho.'.'.$corpo, SEGREDO_PROPRIETARIO, binary: true));
}

/** Usuário como o sistema cria (trigger em auth.users), com o papel pedido no posto; devolve o token. */
function acessoProprietario(string $sub, ?int $postoId, Role $role, ?PapelNoPosto $papel): string
{
    DB::table('auth.users')->insert(['id' => $sub, 'email' => $sub.'@teste.local']);
    $usuario = Usuario::query()->where('auth_user_id', $sub)->sole();
    $usuario->forceFill(['role' => $role, 'ativo' => true])->save();

    if ($postoId !== null && $papel !== null) {
        UsuarioPosto::factory()->create(['usuario_id' => $usuario->id, 'posto_id' => $postoId, 'role' => $papel, 'ativo' => true]);
    }

    return tokenProprietario($sub);
}

/** @return array{jorro: int, br: int, gc: int, s10: int, bicoGc: int, bicoS10: int, tanqueGc: int} */
function cenarioProprietario(): array
{
    $jorro = Posto::factory()->create(['nome' => 'Posto Jorro'])->id;
    $br = Posto::factory()->create(['nome' => 'Posto BR'])->id;
    $usuario = DB::table('Usuario')->insertGetId(['email' => fake()->unique()->safeEmail(), 'nome' => 'Teste Proprietário']);

    $combustivel = static fn (int $posto, string $nome, string $codigo, string $custo): int => DB::table('Combustivel')->insertGetId([
        'posto_id' => $posto, 'nome' => $nome, 'codigo' => $codigo, 'preco_venda' => '6.00', 'preco_custo' => $custo,
    ]);
    $gc = $combustivel($jorro, 'Gasolina Comum', 'GC', '5.10');
    $s10 = $combustivel($jorro, 'Diesel S10', 'S10', '5.90');
    $gcBr = $combustivel($br, 'Gasolina Comum', 'GC', '5.00');

    $bomba = static fn (int $posto): int => DB::table('Bomba')->insertGetId(['posto_id' => $posto, 'nome' => 'Bomba 1']);
    $bico = static fn (int $posto, int $bomba, int $combustivel, int $numero): int => DB::table('Bico')->insertGetId([
        'posto_id' => $posto, 'bomba_id' => $bomba, 'combustivel_id' => $combustivel, 'numero' => $numero,
    ]);
    $bombaJorro = $bomba($jorro);
    $bicoGc = $bico($jorro, $bombaJorro, $gc, 1);
    $bicoS10 = $bico($jorro, $bombaJorro, $s10, 2);
    $bicoBr = $bico($br, $bomba($br), $gcBr, 1);

    $leitura = static fn (int $posto, int $bico, int $comb, string $dia, string $litros, string $preco, string $valor): array => [
        'posto_id' => $posto, 'bico_id' => $bico, 'combustivel_id' => $comb, 'usuario_id' => $usuario,
        'data' => "{$dia} 00:00:00+00", 'leitura_inicial' => '100.000', 'leitura_final' => bcadd('100', decimalProprietario($litros), 3),
        'litros_vendidos' => $litros, 'preco_litro' => $preco, 'valor_total' => $valor,
    ];
    DB::table('Leitura')->insert([
        $leitura($jorro, $bicoGc, $gc, '2026-09-01', '1000.000', '6.00', '6000.00'),
        $leitura($jorro, $bicoGc, $gc, '2026-09-24', '200.500', '6.10', '1223.05'),
        $leitura($jorro, $bicoS10, $s10, '2026-09-10', '300.000', '6.50', '1950.00'),
        $leitura($jorro, $bicoGc, $gc, '2026-08-31', '50.000', '5.90', '295.00'),
        $leitura($br, $bicoBr, $gcBr, '2026-09-24', '4444.000', '6.00', '26664.00'),
    ]);

    $fornecedor = static fn (int $posto): int => DB::table('Fornecedor')->insertGetId([
        'posto_id' => $posto, 'nome' => 'Distribuidora', 'cnpj' => fake()->unique()->numerify('##.###.###/0001-##'),
    ]);
    $compra = static fn (int $posto, int $comb, int $forn, string $dia, string $litros, string $valor): array => [
        'posto_id' => $posto, 'combustivel_id' => $comb, 'fornecedor_id' => $forn, 'data' => "{$dia} 00:00:00+00",
        'quantidade_litros' => $litros, 'valor_total' => $valor, 'custo_por_litro' => bcdiv($valor, $litros, 4),
    ];
    $fornJorro = $fornecedor($jorro);
    DB::table('Compra')->insert([
        $compra($jorro, $gc, $fornJorro, '2026-09-05', '3000.00', '16800.00'),
        $compra($jorro, $gc, $fornJorro, '2026-09-28', '1000.00', '5800.00'),
        $compra($jorro, $s10, $fornJorro, '2026-08-20', '1000.00', '5000.00'),
        $compra($br, $gcBr, $fornecedor($br), '2026-09-02', '9000.00', '45000.00'),
    ]);

    $despesa = static fn (int $posto, string $data, string $valor, string $status): array => [
        'posto_id' => $posto, 'descricao' => 'Despesa de teste', 'valor' => $valor, 'data' => $data, 'status' => $status,
    ];
    DB::table('Despesa')->insert([
        $despesa($jorro, '2026-09-10', '1500.00', 'pendente'),
        $despesa($jorro, '2026-09-24', '250.50', 'pago'),
        $despesa($jorro, '2026-09-25', '999.00', 'pago'),
        $despesa($jorro, '2026-08-31', '777.00', 'pendente'),
        $despesa($br, '2026-09-10', '8888.00', 'pendente'),
    ]);

    Fechamento::factory()->create(['posto_id' => $jorro, 'data' => '2026-09-20 00:00:00+00']);
    Fechamento::factory()->create(['posto_id' => $jorro, 'data' => '2026-09-23 00:00:00+00']);
    Fechamento::factory()->create(['posto_id' => $br, 'data' => '2026-09-24 00:00:00+00']);

    $tanque = static fn (int $posto, int $comb): int => DB::table('Tanque')->insertGetId([
        'posto_id' => $posto, 'nome' => 'Tanque', 'combustivel_id' => $comb,
    ]);
    $tanqueGc = $tanque($jorro, $gc);
    $tanqueBr = $tanque($br, $gcBr);
    DB::table('HistoricoTanque')->insert([
        ['tanque_id' => $tanqueGc, 'data' => '2026-08-31', 'volume_fisico' => '8000.00'],
        ['tanque_id' => $tanqueGc, 'data' => '2026-09-23', 'volume_fisico' => null],
        ['tanque_id' => $tanqueGc, 'data' => '2026-09-24', 'volume_fisico' => '9500.50'],
        ['tanque_id' => $tanqueGc, 'data' => '2026-09-25', 'volume_fisico' => '9000.00'],
        ['tanque_id' => $tanqueBr, 'data' => '2026-09-24', 'volume_fisico' => '1234.00'],
    ]);

    return ['jorro' => $jorro, 'br' => $br, 'gc' => $gc, 's10' => $s10, 'bicoGc' => $bicoGc, 'bicoS10' => $bicoS10, 'tanqueGc' => $tanqueGc];
}

beforeEach(function (): void {
    config(['supabase.jwt_secret' => SEGREDO_PROPRIETARIO]);
    app()->forgetInstance(VerificaTokenDoSupabase::class);
});

/** @return array<array-key, mixed> */
function jsonProprietario(string $token, string $url): array
{
    $corpo = withToken($token)->getJson($url)->assertOk()->json();
    if (! is_array($corpo)) {
        throw new UnexpectedValueException('Esperava objeto JSON.');
    }

    return $corpo;
}

/** @return numeric-string */
function decimalProprietario(mixed $valor): string
{
    if (! is_string($valor) || ! is_numeric($valor)) {
        throw new UnexpectedValueException('Esperava string decimal, veio '.get_debug_type($valor).'.');
    }

    return $valor;
}

/** @return array{total_vendas: numeric-string, lucro_bruto: numeric-string, volume_total: numeric-string} */
function rpcProprietario(int $posto, string $inicio, string $fim): array
{
    // Sessão em UTC, como o Supabase; SET LOCAL morre com a transação do teste.
    DB::statement("SET LOCAL TIME ZONE 'UTC'");
    $linha = DB::selectOne('SELECT * FROM get_dashboard_proprietario(?, ?::date, ?::date)', [$posto, $inicio, $fim]);
    if (! is_object($linha)) {
        throw new UnexpectedValueException('A RPC não devolveu linha.');
    }
    $campos = get_object_vars($linha);

    return [
        'total_vendas' => decimalProprietario($campos['total_vendas'] ?? null),
        'lucro_bruto' => decimalProprietario($campos['lucro_bruto'] ?? null),
        'volume_total' => decimalProprietario($campos['volume_total'] ?? null),
    ];
}

it('GET /proprietario do mês até hoje: o contrato exato, decimal em string', function (): void {
    $c = cenarioProprietario();
    $token = acessoProprietario('b1b10000-0000-4000-8000-000000000001', null, Role::Admin, null);

    withToken($token)->getJson("/api/postos/{$c['jorro']}/proprietario?".SETEMBRO_ATE_HOJE)
        ->assertOk()
        ->assertExactJson([
            'periodo' => ['inicio' => '2026-09-01', 'fim' => '2026-09-24'],
            'produtos' => [
                [
                    'combustivel_id' => $c['s10'], 'produto' => 'Diesel S10',
                    'litros_vendidos' => '300.000', 'receita' => '1950.00', 'receita_a_preco_litro' => '1950.00000',
                    // Sem compra em setembro: 0/0, nunca o preco_custo do cadastro (DECISÃO 2).
                    'compras' => ['litros' => '0.000', 'valor_total' => '0.00'],
                ],
                [
                    'combustivel_id' => $c['gc'], 'produto' => 'Gasolina Comum',
                    'litros_vendidos' => '1200.500', 'receita' => '7223.05', 'receita_a_preco_litro' => '7223.05000',
                    // A compra de 28/09 (depois de hoje) entra: é o mês civil da leitura, como na RPC.
                    'compras' => ['litros' => '4000.000', 'valor_total' => '22600.00'],
                ],
            ],
            'despesas' => ['1500.00', '250.50'],
            'despesas_pendentes' => ['777.00', '1500.00'],
            'ultimo_fechamento' => '2026-09-23',
        ]);
});

it('GET /proprietario de um dia só (a aba "Hoje"): venda do dia, compra do mês', function (): void {
    $c = cenarioProprietario();
    $token = acessoProprietario('b2b20000-0000-4000-8000-000000000001', null, Role::Admin, null);

    $corpo = jsonProprietario($token, "/api/postos/{$c['jorro']}/proprietario?inicio=2026-09-24&fim=2026-09-24");

    expect($corpo['produtos'])->toBe([[
        'combustivel_id' => $c['gc'], 'produto' => 'Gasolina Comum',
        'litros_vendidos' => '200.500', 'receita' => '1223.05', 'receita_a_preco_litro' => '1223.05000',
        'compras' => ['litros' => '4000.000', 'valor_total' => '22600.00'],
    ]])->and($corpo['despesas'])->toBe(['250.50']);
});

it('paridade com a RPC: vendas e litros exatos; lucro_bruto = conta sobre os insumos + fallback preco_custo NOMEADO no S10', function (): void {
    $c = cenarioProprietario();
    $token = acessoProprietario('b3b30000-0000-4000-8000-000000000001', null, Role::Admin, null);
    $corpo = jsonProprietario($token, "/api/postos/{$c['jorro']}/proprietario?".SETEMBRO_ATE_HOJE);
    $rpc = rpcProprietario($c['jorro'], '2026-09-01', '2026-09-24');

    $produtos = is_array($corpo['produtos']) ? $corpo['produtos'] : [];
    $receita = '0';
    $litros = '0';
    $lucroApuravel = '0';
    foreach ($produtos as $produto) {
        if (! is_array($produto) || ! is_array($produto['compras'])) {
            throw new UnexpectedValueException('produto fora do contrato');
        }
        $receita = bcadd($receita, decimalProprietario($produto['receita']), 2);
        $litrosDoProduto = decimalProprietario($produto['litros_vendidos']);
        $litros = bcadd($litros, $litrosDoProduto, 3);
        $comprados = decimalProprietario($produto['compras']['litros']);
        if (bccomp($comprados, '0', 3) === 0) {
            continue; // não apurável pela DECISÃO 2 — é a divergência nomeada abaixo
        }
        // Conta de conferência em bcmath (é teste, não fórmula de produção): litros × (preço − custo do mês).
        $custo = bcdiv(decimalProprietario($produto['compras']['valor_total']), $comprados, 10);
        $lucroApuravel = bcadd($lucroApuravel, bcsub(decimalProprietario($produto['receita_a_preco_litro']), bcmul($litrosDoProduto, $custo, 10), 10), 10);
    }

    // S10 na RPC: 300 L × (6,50 − 5,90 do cadastro) = 180,00. É a única diferença, e é por decisão.
    $fallbackDaRpc = '180.00';

    expect($rpc['total_vendas'])->toBe('9173.05')
        ->and(bccomp($rpc['total_vendas'], $receita, 2))->toBe(0)
        ->and(bccomp($rpc['volume_total'], $litros, 3))->toBe(0)
        // GC: 1.200,5 L × (preço − 5,65) = 7.223,05 − 6.782,825 = 440,225.
        ->and(bccomp($lucroApuravel, '440.225', 5))->toBe(0)
        ->and(bccomp($rpc['lucro_bruto'], bcadd($lucroApuravel, $fallbackDaRpc, 5), 5))->toBe(0);
});

it('período que atravessa meses: 422 (o custo é do mês da leitura)', function (): void {
    $c = cenarioProprietario();
    $token = acessoProprietario('b4b40000-0000-4000-8000-000000000001', null, Role::Admin, null);

    withToken($token)->getJson("/api/postos/{$c['jorro']}/proprietario?inicio=2026-08-31&fim=2026-09-01")
        ->assertUnprocessable()->assertJsonValidationErrors(['fim']);
    withToken($token)->getJson("/api/postos/{$c['jorro']}/proprietario?inicio=2026-09-10&fim=2026-09-01")
        ->assertUnprocessable()->assertJsonValidationErrors(['fim']);
});

it('posto sem movimento: listas vazias e último fechamento null', function (): void {
    $posto = Posto::factory()->create()->id;
    $token = acessoProprietario('b5b50000-0000-4000-8000-000000000001', null, Role::Admin, null);

    withToken($token)->getJson("/api/postos/{$posto}/proprietario?".SETEMBRO_ATE_HOJE)->assertOk()->assertExactJson([
        'periodo' => ['inicio' => '2026-09-01', 'fim' => '2026-09-24'],
        'produtos' => [], 'despesas' => [], 'despesas_pendentes' => [], 'ultimo_fechamento' => null,
    ]);
});

it('GET /movimento: linhas cruas do período, com o combustível do bico e a régua até o fim (nula continua nula)', function (): void {
    $c = cenarioProprietario();
    $token = acessoProprietario('b6b60000-0000-4000-8000-000000000001', null, Role::Admin, null);

    withToken($token)->getJson("/api/postos/{$c['jorro']}/movimento?".SETEMBRO_ATE_HOJE)
        ->assertOk()
        ->assertExactJson([
            'periodo' => ['inicio' => '2026-09-01', 'fim' => '2026-09-24'],
            'leituras' => [
                ['bico_id' => $c['bicoGc'], 'combustivel_id' => $c['gc'], 'data' => '2026-09-01', 'leitura_inicial' => '100.000', 'leitura_final' => '1100.000', 'litros_vendidos' => '1000.000', 'preco_litro' => '6.00', 'valor_total' => '6000.00'],
                ['bico_id' => $c['bicoS10'], 'combustivel_id' => $c['s10'], 'data' => '2026-09-10', 'leitura_inicial' => '100.000', 'leitura_final' => '400.000', 'litros_vendidos' => '300.000', 'preco_litro' => '6.50', 'valor_total' => '1950.00'],
                ['bico_id' => $c['bicoGc'], 'combustivel_id' => $c['gc'], 'data' => '2026-09-24', 'leitura_inicial' => '100.000', 'leitura_final' => '300.500', 'litros_vendidos' => '200.500', 'preco_litro' => '6.10', 'valor_total' => '1223.05'],
            ],
            'compras' => [
                ['combustivel_id' => $c['gc'], 'data' => '2026-09-05', 'quantidade_litros' => '3000.00', 'valor_total' => '16800.00'],
            ],
            'despesas' => [
                ['data' => '2026-09-10', 'valor' => '1500.00'],
                ['data' => '2026-09-24', 'valor' => '250.50'],
            ],
            'medicoes' => [
                ['tanque_id' => $c['tanqueGc'], 'data' => '2026-08-31', 'volume_fisico' => '8000.00'],
                ['tanque_id' => $c['tanqueGc'], 'data' => '2026-09-23', 'volume_fisico' => null],
                ['tanque_id' => $c['tanqueGc'], 'data' => '2026-09-24', 'volume_fisico' => '9500.50'],
            ],
        ]);
});

/*
| Isolamento — a trava principal. A tela é da REDE, mas cada posto responde só a quem o gere.
*/

it('sem token: 401 nas duas rotas, antes de olhar posto ou período', function (): void {
    $c = cenarioProprietario();

    getJson("/api/postos/{$c['jorro']}/proprietario?".SETEMBRO_ATE_HOJE)->assertUnauthorized();
    getJson("/api/postos/{$c['jorro']}/movimento?".SETEMBRO_ATE_HOJE)->assertUnauthorized();
});

it('gerente do Jorro: vê o Jorro, e o BR responde 403 nas duas rotas — nenhum número do BR sai', function (): void {
    $c = cenarioProprietario();
    $token = acessoProprietario('b7b70000-0000-4000-8000-000000000001', $c['jorro'], Role::Gerente, PapelNoPosto::Gerente);

    $doJorro = jsonProprietario($token, "/api/postos/{$c['jorro']}/proprietario?".SETEMBRO_ATE_HOJE);
    $movimento = jsonProprietario($token, "/api/postos/{$c['jorro']}/movimento?".SETEMBRO_ATE_HOJE);

    // Nenhum valor do BR (4.444 L, R$ 26.664,00, R$ 8.888,00, régua 1.234,00) aparece no Jorro.
    $tudo = (string) json_encode([$doJorro, $movimento]);
    foreach (['4444', '26664', '8888', '1234.00'] as $numeroDoBr) {
        expect(str_contains($tudo, $numeroDoBr))->toBeFalse();
    }
    expect($doJorro['ultimo_fechamento'])->toBe('2026-09-23');

    withToken($token)->getJson("/api/postos/{$c['br']}/proprietario?".SETEMBRO_ATE_HOJE)->assertForbidden();
    withToken($token)->getJson("/api/postos/{$c['br']}/movimento?".SETEMBRO_ATE_HOJE)->assertForbidden();
});

it('operador do Jorro: 403 — custo e despesa são dado de proprietário', function (): void {
    $c = cenarioProprietario();
    $token = acessoProprietario('b8b80000-0000-4000-8000-000000000001', $c['jorro'], Role::Operador, PapelNoPosto::Operador);

    withToken($token)->getJson("/api/postos/{$c['jorro']}/proprietario?".SETEMBRO_ATE_HOJE)->assertForbidden();
    withToken($token)->getJson("/api/postos/{$c['jorro']}/movimento?".SETEMBRO_ATE_HOJE)->assertForbidden();
});

it('Admin da rede: vê o BR com os números do BR', function (): void {
    $c = cenarioProprietario();
    $token = acessoProprietario('b9b90000-0000-4000-8000-000000000001', null, Role::Admin, null);

    $doBr = jsonProprietario($token, "/api/postos/{$c['br']}/proprietario?".SETEMBRO_ATE_HOJE);

    expect($doBr['despesas'])->toBe(['8888.00'])
        ->and($doBr['despesas_pendentes'])->toBe(['8888.00'])
        ->and($doBr['ultimo_fechamento'])->toBe('2026-09-24')
        ->and(json_encode($doBr['produtos']))->toContain('26664.00');
});
