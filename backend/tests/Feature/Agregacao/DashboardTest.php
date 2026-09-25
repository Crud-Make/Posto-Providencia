<?php

declare(strict_types=1);

use App\Agregacao\Application\DadosDoPeriodo;
use App\Agregacao\Application\Periodo;
use App\Compartilhado\Enums\Role;
use App\Compartilhado\Posto;
use App\Compartilhado\PostoAtual;
use App\Pessoas\Application\VerificaTokenDoSupabase;
use App\Pessoas\Domain\Usuario;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

use function Pest\Laravel\getJson;

/*
| A rota exige token e `posto.acesso:gerir` (#103; quem alcança o quê está em
| AcessoAoDashboardTest). Aqui só se prova O QUE o dashboard devolve: toda chamada vai como um
| Admin, que gere qualquer posto — inclusive o inexistente do 404 e o do 422, que só chegam ao
| DefinePostoAtual e ao DashboardRequest depois de passar pela porta.
*/

const SEGREDO_DASHBOARD = 'segredo-de-teste-do-conteudo-do-dashboard';

function b64urlDashboard(string $cru): string
{
    return rtrim(strtr(base64_encode($cru), '+/', '-_'), '=');
}

function tokenDoAdminDoDashboard(): string
{
    $sub = 'd0d00000-0000-4000-8000-000000000001';
    DB::table('auth.users')->insert(['id' => $sub, 'email' => $sub.'@teste.local']);
    Usuario::query()->where('auth_user_id', $sub)->sole()->forceFill(['role' => Role::Admin, 'ativo' => true])->save();

    $cabecalho = b64urlDashboard((string) json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $corpo = b64urlDashboard((string) json_encode(['sub' => $sub, 'aud' => 'authenticated', 'exp' => time() + 3600]));

    return $cabecalho.'.'.$corpo.'.'.b64urlDashboard(hash_hmac('sha256', $cabecalho.'.'.$corpo, SEGREDO_DASHBOARD, binary: true));
}

beforeEach(function (): void {
    config(['supabase.jwt_secret' => SEGREDO_DASHBOARD]);
    app()->forgetInstance(VerificaTokenDoSupabase::class);

    /** @var TestCase $this */
    $this->withToken(tokenDoAdminDoDashboard());
});

/**
 * `GET /api/postos/{posto}/dashboard?inicio&fim` contra o Postgres real do compose, em transação
 * que reverte no fim de cada teste. Dado sintético inserido por `DB::table` — o módulo não tem
 * model, e o teste também não depende de model de outro módulo.
 *
 * Cenário (período 2026-01-01..2026-01-31, posto A):
 *  - Gasolina Comum: 2 leituras (1000,000 L em 01/01 e 500,500 L em 31/01 — as duas bordas),
 *    2 compras em janeiro (05/01 e 20/01: 3000,00 L / R$ 16.800,00) e 1 em fevereiro (03/02:
 *    5000 L / R$ 30.000,00). Leitura em fevereiro (01/02, 100 L) também.
 *  - Diesel S10: vendido (300,000 L) SEM compra em janeiro; a única compra é de dez/2025 e o
 *    cadastro tem preco_custo 5,90 — o fallback que a DECISÃO 2 proíbe.
 *  - Etanol: compra no período, nenhuma venda.
 *  - Despesas: 1.500,00 (10/01) e 250,50 (31/01) dentro; 999,00 (01/02) e 777,00 (31/12) fora;
 *    a de 31/12 tem `data_pagamento` dentro do período — competência manda, não entra.
 *  - Posto B com o mesmo tipo de movimento, para provar que nada vaza.
 *
 * @return array{postoA: int, postoB: int, gc: int, s10: int, et: int, bicoGc: int, bicoS10: int, bicoGcB: int}
 */
function cenarioAgregacao(): array
{
    $postoA = Posto::factory()->create()->id;
    $postoB = Posto::factory()->create()->id;
    $usuario = DB::table('Usuario')->insertGetId(['email' => fake()->unique()->safeEmail(), 'nome' => 'Teste Agregação']);

    $combustivel = static fn (int $posto, string $nome, string $codigo, string $precoCusto): int => DB::table('Combustivel')->insertGetId([
        'posto_id' => $posto, 'nome' => $nome, 'codigo' => $codigo, 'preco_venda' => '6.00', 'preco_custo' => $precoCusto,
    ]);
    $gc = $combustivel($postoA, 'Gasolina Comum', 'GC', '5.10');
    $s10 = $combustivel($postoA, 'Diesel S10', 'S10', '5.90');
    $et = $combustivel($postoA, 'Etanol', 'ET', '4.00');
    $gcB = $combustivel($postoB, 'Gasolina Comum', 'GC', '5.10');

    $bomba = static fn (int $posto): int => DB::table('Bomba')->insertGetId(['posto_id' => $posto, 'nome' => 'Bomba 1']);
    $bombaA = $bomba($postoA);
    $bombaB = $bomba($postoB);
    $bico = static fn (int $posto, int $bomba, int $combustivel, int $numero): int => DB::table('Bico')->insertGetId([
        'posto_id' => $posto, 'bomba_id' => $bomba, 'combustivel_id' => $combustivel, 'numero' => $numero,
    ]);
    $bicoGc = $bico($postoA, $bombaA, $gc, 1);
    $bicoS10 = $bico($postoA, $bombaA, $s10, 2);
    $bicoGcB = $bico($postoB, $bombaB, $gcB, 1);

    $fornecedor = static fn (int $posto): int => DB::table('Fornecedor')->insertGetId([
        'posto_id' => $posto, 'nome' => 'Distribuidora', 'cnpj' => fake()->unique()->numerify('##.###.###/0001-##'),
    ]);
    $fornecedorA = $fornecedor($postoA);
    $fornecedorB = $fornecedor($postoB);

    // Leitura.data é timestamptz gravado em 00:00 UTC, como as 1.230 linhas reais.
    $leitura = static fn (int $posto, int $bico, int $combustivel, string $dia, string $litros, string $preco, string $valor): array => [
        'posto_id' => $posto, 'bico_id' => $bico, 'combustivel_id' => $combustivel, 'usuario_id' => $usuario,
        'data' => "{$dia} 00:00:00+00", 'leitura_inicial' => '0.000', 'leitura_final' => $litros,
        'litros_vendidos' => $litros, 'preco_litro' => $preco, 'valor_total' => $valor,
    ];
    DB::table('Leitura')->insert([
        $leitura($postoA, $bicoGc, $gc, '2026-01-01', '1000.000', '6.00', '6000.00'),
        $leitura($postoA, $bicoGc, $gc, '2026-01-31', '500.500', '6.00', '3003.00'),
        $leitura($postoA, $bicoGc, $gc, '2026-02-01', '100.000', '6.00', '600.00'),
        $leitura($postoA, $bicoS10, $s10, '2026-01-15', '300.000', '6.50', '1950.00'),
        $leitura($postoB, $bicoGcB, $gcB, '2026-01-15', '100.000', '6.00', '600.00'),
    ]);

    $compra = static fn (int $posto, int $combustivel, int $fornecedor, string $dia, string $litros, string $valor, string $custo): array => [
        'posto_id' => $posto, 'combustivel_id' => $combustivel, 'fornecedor_id' => $fornecedor, 'data' => "{$dia} 00:00:00+00",
        'quantidade_litros' => $litros, 'valor_total' => $valor, 'custo_por_litro' => $custo,
    ];
    DB::table('Compra')->insert([
        $compra($postoA, $gc, $fornecedorA, '2026-01-05', '2000.00', '11000.00', '5.5000'),
        $compra($postoA, $gc, $fornecedorA, '2026-01-20', '1000.00', '5800.00', '5.8000'),
        $compra($postoA, $gc, $fornecedorA, '2026-02-03', '5000.00', '30000.00', '6.0000'),
        $compra($postoA, $s10, $fornecedorA, '2025-12-20', '1000.00', '5000.00', '5.0000'),
        $compra($postoA, $et, $fornecedorA, '2026-01-10', '500.00', '2000.00', '4.0000'),
        $compra($postoB, $gcB, $fornecedorB, '2026-01-10', '900.00', '4500.00', '5.0000'),
    ]);

    $despesa = static fn (int $posto, string $data, string $valor, ?string $pagamento = null): array => [
        'posto_id' => $posto, 'descricao' => 'Despesa de teste', 'valor' => $valor, 'data' => $data, 'data_pagamento' => $pagamento,
    ];
    DB::table('Despesa')->insert([
        $despesa($postoA, '2026-01-10', '1500.00'),
        $despesa($postoA, '2026-01-31', '250.50'),
        $despesa($postoA, '2026-02-01', '999.00'),
        $despesa($postoA, '2025-12-31', '777.00', '2026-01-05'),
        $despesa($postoB, '2026-01-10', '333.00'),
    ]);

    return ['postoA' => $postoA, 'postoB' => $postoB, 'gc' => $gc, 's10' => $s10, 'et' => $et, 'bicoGc' => $bicoGc, 'bicoS10' => $bicoS10, 'bicoGcB' => $bicoGcB];
}

const PERIODO_JANEIRO = 'inicio=2026-01-01&fim=2026-01-31';

/*
| Estreitamento do JSON: o PHPStan 9 dos testes não aceita `mixed` em bcmath nem em offset.
| Cada leitor falha alto se o contrato não vier como prometido — é asserção, não conveniência.
*/

/** @return array<array-key, mixed> */
function comoArray(mixed $valor): array
{
    if (! is_array($valor)) {
        throw new UnexpectedValueException('Esperava array no JSON.');
    }

    return $valor;
}

function comoInteiro(mixed $valor): int
{
    if (! is_int($valor)) {
        throw new UnexpectedValueException('Esperava inteiro no JSON.');
    }

    return $valor;
}

function comoTexto(mixed $valor): string
{
    if (! is_string($valor)) {
        throw new UnexpectedValueException('Esperava texto no JSON.');
    }

    return $valor;
}

/** @return numeric-string */
function comoDecimal(mixed $valor): string
{
    if (! is_string($valor) || ! is_numeric($valor)) {
        throw new UnexpectedValueException('Esperava string decimal no JSON, veio '.get_debug_type($valor).'.');
    }

    return $valor;
}

/**
 * Corpo do endpoint, tipado campo a campo.
 *
 * @return array{produtos: list<array{combustivel_id: int, produto: string, litros_vendidos: numeric-string, receita: numeric-string, compras: array{litros: numeric-string, valor_total: numeric-string}}>, rateio: array{mes_civil: array{inicio: string, fim: string}, despesas_total: numeric-string, litros_vendidos: numeric-string}}
 */
function corpoDashboard(int $posto, string $consulta = PERIODO_JANEIRO): array
{
    $corpo = comoArray(getJson("/api/postos/{$posto}/dashboard?{$consulta}")->assertOk()->json());

    $produtos = [];
    foreach (comoArray($corpo['produtos'] ?? null) as $item) {
        $produto = comoArray($item);
        $compras = comoArray($produto['compras'] ?? null);
        $produtos[] = [
            'combustivel_id' => comoInteiro($produto['combustivel_id'] ?? null),
            'produto' => comoTexto($produto['produto'] ?? null),
            'litros_vendidos' => comoDecimal($produto['litros_vendidos'] ?? null),
            'receita' => comoDecimal($produto['receita'] ?? null),
            'compras' => [
                'litros' => comoDecimal($compras['litros'] ?? null),
                'valor_total' => comoDecimal($compras['valor_total'] ?? null),
            ],
        ];
    }

    $rateio = comoArray($corpo['rateio'] ?? null);
    $mesCivil = comoArray($rateio['mes_civil'] ?? null);

    return [
        'produtos' => $produtos,
        'rateio' => [
            'mes_civil' => [
                'inicio' => comoTexto($mesCivil['inicio'] ?? null),
                'fim' => comoTexto($mesCivil['fim'] ?? null),
            ],
            'despesas_total' => comoDecimal($rateio['despesas_total'] ?? null),
            'litros_vendidos' => comoDecimal($rateio['litros_vendidos'] ?? null),
        ],
    ];
}

/**
 * Soma de string decimal sem passar por float.
 *
 * @param  list<numeric-string>  $valores
 * @return numeric-string
 */
function somaDecimal(array $valores, int $escala): string
{
    return array_reduce($valores, static fn (string $acumulado, string $valor): string => bcadd($acumulado, $valor, $escala), '0');
}

it('devolve o contrato do §5 na raiz do JSON, sem envelope data, sem lucro e sem custo_taxas', function (): void {
    $c = cenarioAgregacao();

    getJson("/api/postos/{$c['postoA']}/dashboard?".PERIODO_JANEIRO)
        ->assertOk()
        ->assertExactJsonStructure([
            'periodo' => ['inicio', 'fim'],
            'produtos' => ['*' => ['combustivel_id', 'produto', 'litros_vendidos', 'receita', 'compras' => ['litros', 'valor_total']]],
            'rateio' => ['mes_civil' => ['inicio', 'fim'], 'despesas_total', 'litros_vendidos'],
            'leituras' => ['*' => ['bico_id', 'data', 'leitura_inicial', 'leitura_final']],
        ])
        ->assertJsonPath('periodo', ['inicio' => '2026-01-01', 'fim' => '2026-01-31'])
        ->assertJsonMissingPath('data')
        // `despesas_total` na raiz morreu: despesa e litros do rateio andam juntos, colados à janela
        // (decisões 1 e 2 do dono, 18/09/2026) — mesmo nome com janela nova seria armadilha.
        ->assertJsonMissingPath('despesas_total')
        ->assertJsonMissingPath('custo_taxas')
        ->assertJsonMissingPath('lucro_bruto')
        ->assertJsonMissingPath('lucro_liquido');
});

it('agrega venda e compra por produto, só do período, nas duas bordas, em ordem de nome', function (): void {
    $c = cenarioAgregacao();

    getJson("/api/postos/{$c['postoA']}/dashboard?".PERIODO_JANEIRO)
        ->assertOk()
        ->assertJsonCount(3, 'produtos')
        ->assertJsonPath('produtos.2', [
            'combustivel_id' => $c['gc'],
            'produto' => 'Gasolina Comum',
            'litros_vendidos' => '1500.500',
            'receita' => '9003.00',
            'compras' => ['litros' => '3000.000', 'valor_total' => '16800.00'],
        ])
        ->assertJsonPath('produtos.*.produto', ['Diesel S10', 'Etanol', 'Gasolina Comum']);
});

it('produto vendido sem compra no período sai com compras zeradas — sem fallback para preco_custo (DECISÃO 2)', function (): void {
    $c = cenarioAgregacao();

    getJson("/api/postos/{$c['postoA']}/dashboard?".PERIODO_JANEIRO)
        ->assertOk()
        ->assertJsonPath('produtos.0', [
            'combustivel_id' => $c['s10'],
            'produto' => 'Diesel S10',
            'litros_vendidos' => '300.000',
            'receita' => '1950.00',
            'compras' => ['litros' => '0.000', 'valor_total' => '0.00'],
        ]);
});

it('produto comprado sem venda no período aparece com venda zerada', function (): void {
    $c = cenarioAgregacao();

    getJson("/api/postos/{$c['postoA']}/dashboard?".PERIODO_JANEIRO)
        ->assertOk()
        ->assertJsonPath('produtos.1', [
            'combustivel_id' => $c['et'],
            'produto' => 'Etanol',
            'litros_vendidos' => '0.000',
            'receita' => '0.00',
            'compras' => ['litros' => '500.000', 'valor_total' => '2000.00'],
        ]);
});

it('rateio: despesa pela data de competência e litros de TODOS os combustíveis, no mês civil; data_pagamento não conta (DECISÃO 3: taxa já está aqui)', function (): void {
    $c = cenarioAgregacao();

    getJson("/api/postos/{$c['postoA']}/dashboard?".PERIODO_JANEIRO)
        ->assertOk()
        ->assertJsonPath('rateio.mes_civil', ['inicio' => '2026-01-01', 'fim' => '2026-01-31'])
        // 1.500,00 (10/01) + 250,50 (31/01); a de 31/12 paga em 05/01 fica fora (competência)
        ->assertJsonPath('rateio.despesas_total', '1750.50')
        // 1000 + 500,5 (Gasolina Comum) + 300 (Diesel S10, que não tem compra e entra mesmo assim)
        ->assertJsonPath('rateio.litros_vendidos', '1800.500');
});

it('rateio não vaza entre postos: o posto B (333,00 e 100 L) não entra no A, nem o A no B; data_pagamento dentro do mês não puxa a despesa de 31/12', function (): void {
    $c = cenarioAgregacao();

    $rateioA = corpoDashboard($c['postoA'])['rateio'];
    $rateioB = corpoDashboard($c['postoB'])['rateio'];

    // Posto A: sem os 333,00 e os 100 L do B; sem os 777,00 de 31/12 (pagos em 05/01).
    expect($rateioA['despesas_total'])->toBe('1750.50')
        ->and($rateioA['litros_vendidos'])->toBe('1800.500')
        ->and(bccomp($rateioA['despesas_total'], bcadd('1750.50', '333.00', 2), 2))->not->toBe(0)
        ->and(bccomp($rateioA['despesas_total'], bcadd('1750.50', '777.00', 2), 2))->not->toBe(0)
        ->and(bccomp($rateioA['litros_vendidos'], bcadd('1800.500', '100.000', 3), 3))->not->toBe(0)
        // Posto B: só o próprio movimento.
        ->and($rateioB['despesas_total'])->toBe('333.00')
        ->and($rateioB['litros_vendidos'])->toBe('100.000');
});

it('período sem movimento devolve lista vazia e rateio zerado, nunca null', function (): void {
    $c = cenarioAgregacao();

    getJson("/api/postos/{$c['postoA']}/dashboard?inicio=2027-06-01&fim=2027-06-30")
        ->assertOk()
        ->assertJsonPath('produtos', [])
        ->assertJsonPath('rateio', [
            'mes_civil' => ['inicio' => '2027-06-01', 'fim' => '2027-06-30'],
            'despesas_total' => '0.00',
            'litros_vendidos' => '0.000',
        ]);
});

it('outro posto não vaza: o posto B só vê o próprio movimento', function (): void {
    $c = cenarioAgregacao();

    getJson("/api/postos/{$c['postoB']}/dashboard?".PERIODO_JANEIRO)
        ->assertOk()
        ->assertJsonCount(1, 'produtos')
        ->assertJsonPath('produtos.0.litros_vendidos', '100.000')
        ->assertJsonPath('produtos.0.receita', '600.00')
        ->assertJsonPath('produtos.0.compras', ['litros' => '900.000', 'valor_total' => '4500.00'])
        ->assertJsonPath('rateio.despesas_total', '333.00')
        ->assertJsonPath('rateio.litros_vendidos', '100.000');
});

it('volume e dinheiro são string decimal com a escala do banco (3 para litros, 2 para reais), nunca float', function (): void {
    $c = cenarioAgregacao();

    $corpo = corpoDashboard($c['postoA']);

    expect($corpo['produtos'])->toHaveCount(3)
        ->and($corpo['rateio']['despesas_total'])->toMatch('/^\d+\.\d{2}$/')
        ->and($corpo['rateio']['litros_vendidos'])->toMatch('/^\d+\.\d{3}$/');
    foreach ($corpo['produtos'] as $produto) {
        expect($produto['litros_vendidos'])->toMatch('/^\d+\.\d{3}$/')
            ->and($produto['receita'])->toMatch('/^\d+\.\d{2}$/')
            ->and($produto['compras']['litros'])->toMatch('/^\d+\.\d{3}$/')
            ->and($produto['compras']['valor_total'])->toMatch('/^\d+\.\d{2}$/');
    }
});

it('responde 404 para posto que não existe, antes de validar as datas', function (): void {
    getJson('/api/postos/999999/dashboard?'.PERIODO_JANEIRO)->assertNotFound();
    getJson('/api/postos/abc/dashboard?'.PERIODO_JANEIRO)->assertNotFound();
    getJson('/api/postos/999999/dashboard')->assertNotFound();
});

/** @param list<string> $campos */
it('responde 422 para datas ausentes, fora do formato ou com fim antes do início', function (string $consulta, array $campos): void {
    $posto = Posto::factory()->create();

    getJson("/api/postos/{$posto->id}/dashboard{$consulta}")
        ->assertUnprocessable()
        ->assertJsonValidationErrors($campos);
})->with([
    'sem parâmetros' => ['', ['inicio', 'fim']],
    'só início' => ['?inicio=2026-01-01', ['fim']],
    'fim antes do início' => ['?inicio=2026-01-31&fim=2026-01-01', ['fim']],
    'formato brasileiro' => ['?inicio=01/01/2026&fim=31/01/2026', ['inicio', 'fim']],
    'dia inexistente' => ['?inicio=2026-02-30&fim=2026-03-01', ['inicio']],
    'com hora' => ['?inicio=2026-01-01T00:00:00&fim=2026-01-31', ['inicio']],
]);

it('inicio igual a fim é um dia só para a venda; a compra continua sendo a do mês civil', function (): void {
    $c = cenarioAgregacao();

    getJson("/api/postos/{$c['postoA']}/dashboard?inicio=2026-01-01&fim=2026-01-01")
        ->assertOk()
        ->assertJsonCount(2, 'produtos')
        ->assertJsonPath('produtos.*.produto', ['Etanol', 'Gasolina Comum'])
        ->assertJsonPath('produtos.1.litros_vendidos', '1000.000')
        ->assertJsonPath('produtos.1.compras.litros', '3000.000');
});

/*
| Janela da compra E do rateio = MÊS CIVIL que contém o período (decisões 1 e 2 do dono,
| 18/09/2026): a planilha faz despesa do mês ÷ litros do mês (H22 = H19/F11) e o
| aggregator.service.ts:43-61 e :256-264 fazem o mesmo hoje com `mesCivil(dataInicio)`. Só a
| VENDA POR PRODUTO fica no período exato. A divisão não acontece aqui — é do cliente
| (`despesaOperacionalPorLitro`, lucro.ts:36-41).
*/

it('compra e rateio do mês civil entram mesmo fora do período exato: 01–15/01 puxa compra de 20/01, despesa e litros de 31/01', function (): void {
    $c = cenarioAgregacao();

    getJson("/api/postos/{$c['postoA']}/dashboard?inicio=2026-01-01&fim=2026-01-15")
        ->assertOk()
        ->assertJsonPath('produtos.*.produto', ['Diesel S10', 'Etanol', 'Gasolina Comum'])
        // venda POR PRODUTO no período exato: só a leitura de 01/01; compra: 05/01 E 20/01 (fora do período, dentro do mês)
        ->assertJsonPath('produtos.2.litros_vendidos', '1000.000')
        ->assertJsonPath('produtos.2.receita', '6000.00')
        ->assertJsonPath('produtos.2.compras', ['litros' => '3000.000', 'valor_total' => '16800.00'])
        // S10 vendeu 15/01 e segue sem compra em janeiro (a de dez/2025 não é do mês civil)
        ->assertJsonPath('produtos.0.compras', ['litros' => '0.000', 'valor_total' => '0.00'])
        // rateio ALARGA para o mês civil: a despesa de 31/01 ENTRA (1.500 + 250,50), e os litros são
        // os do mês inteiro (1000 + 500,5 + 300), não os 1000 do período.
        ->assertJsonPath('rateio.mes_civil', ['inicio' => '2026-01-01', 'fim' => '2026-01-31'])
        ->assertJsonPath('rateio.despesas_total', '1750.50')
        ->assertJsonPath('rateio.litros_vendidos', '1800.500');
});

/**
 * O `/dashboard` do painel escolhe o período com `Calendario` em `modoIntervalo` (dois cliques
 * livres, sem trava de mês — shared/ui/calendario/modos.ts:100-110), então um período que atravessa
 * meses é possível. Regra decidida pelo dono em 18/09/2026: compra e rateio vêm de TODOS os meses
 * civis que o período toca (do dia 1 do mês de `inicio` ao último dia do mês de `fim`). O aggregator
 * de hoje usa só o mês de `dataInicio` (aggregator.service.ts:251/:256/:263-264) — em período que
 * atravessa meses, a troca do call site VAI mudar número na tela, por decisão, não por regressão.
 */
it('período que atravessa meses: compra e rateio vêm de TODOS os meses civis do período (decisões 1 e 2 do dono, 18/09/2026)', function (): void {
    $c = cenarioAgregacao();

    $corpo = corpoDashboard($c['postoA'], 'inicio=2026-01-15&fim=2026-02-15');

    $gc = $corpo['produtos'][2] ?? throw new UnexpectedValueException('Faltou o terceiro produto.');
    expect($gc['produto'])->toBe('Gasolina Comum')
        // venda no período exato: 31/01 (500,500) + 01/02 (100,000); a de 01/01 fica fora
        ->and($gc['litros_vendidos'])->toBe('600.500')
        ->and($gc['receita'])->toBe('3603.00')
        // compra: janeiro (3000 / 16.800) + fevereiro (5000 / 30.000). Só o mês de inicio daria 3000.000.
        ->and($gc['compras'])->toBe(['litros' => '8000.000', 'valor_total' => '46800.00'])
        ->and($gc['compras']['litros'])->not->toBe('3000.000')
        // rateio nos dois meses civis: despesa 1.500 + 250,50 (jan) + 999 (fev); a de 31/12 fica fora.
        // Litros: 1800,5 (jan, todos os combustíveis) + 100 (01/02).
        ->and($corpo['rateio']['mes_civil'])->toBe(['inicio' => '2026-01-01', 'fim' => '2026-02-28'])
        ->and($corpo['rateio']['despesas_total'])->toBe('2749.50')
        ->and($corpo['rateio']['litros_vendidos'])->toBe('1900.500');
});

it('Periodo::mesCivil() cruza o ano: 15/12/2025–10/01/2026 vira 01/12/2025–31/01/2026', function (): void {
    expect((new Periodo('2025-12-15', '2026-01-10'))->mesCivil())
        ->toEqual(new Periodo('2025-12-01', '2026-01-31'));
});

it('DadosDoPeriodo sem PostoAtual definido falha alto em vez de agregar o banco inteiro', function (): void {
    app(PostoAtual::class)->limpar();

    expect(fn () => app(DadosDoPeriodo::class)(new Periodo('2026-01-01', '2026-01-31')))
        ->toThrow(LogicException::class, 'PostoAtual');
});

/*
|--------------------------------------------------------------------------
| Paridade contra a RPC get_dashboard_proprietario (Design Doc agregacao.md, Testes)
|--------------------------------------------------------------------------
| Mesmo dado, mesmo Postgres. A RPC devolve os totais já calculados; o endpoint devolve os
| insumos. Onde a conta da RPC bate com os insumos, tem de bater ao centavo. Onde a RPC
| diverge POR DECISÃO do doc, a divergência entra nomeada, nunca tolerada em silêncio.
*/

/** @return array{total_vendas: numeric-string, lucro_bruto: numeric-string, lucro_liquido: numeric-string, volume_total: numeric-string, custo_taxas: numeric-string} */
function rpcDashboard(int $posto, string $fuso): array
{
    // SET LOCAL morre com a transação do DatabaseTransactions: não vaza para o próximo teste.
    DB::statement("SET LOCAL TIME ZONE '{$fuso}'");
    $linha = DB::selectOne('SELECT * FROM get_dashboard_proprietario(?, ?::date, ?::date)', [$posto, '2026-01-01', '2026-01-31']);
    if (! is_object($linha)) {
        throw new UnexpectedValueException('A RPC get_dashboard_proprietario não devolveu linha.');
    }
    $campos = get_object_vars($linha);

    return [
        'total_vendas' => comoDecimal($campos['total_vendas'] ?? null),
        'lucro_bruto' => comoDecimal($campos['lucro_bruto'] ?? null),
        'lucro_liquido' => comoDecimal($campos['lucro_liquido'] ?? null),
        'volume_total' => comoDecimal($campos['volume_total'] ?? null),
        'custo_taxas' => comoDecimal($campos['custo_taxas'] ?? null),
    ];
}

it('paridade: receita e volume do endpoint somam exatamente total_vendas e volume_total da RPC (sessão em UTC, como o Supabase)', function (): void {
    $c = cenarioAgregacao();
    $corpo = corpoDashboard($c['postoA']);
    $rpc = rpcDashboard($c['postoA'], 'UTC');

    expect(bccomp($rpc['total_vendas'], somaDecimal(array_column($corpo['produtos'], 'receita'), 2), 2))->toBe(0)
        ->and(bccomp($rpc['volume_total'], somaDecimal(array_column($corpo['produtos'], 'litros_vendidos'), 3), 3))->toBe(0)
        ->and(bccomp($rpc['total_vendas'], '10953.00', 2))->toBe(0)
        ->and(bccomp($rpc['volume_total'], '1800.500', 3))->toBe(0);
});

it('paridade: rateio.despesas_total do endpoint é exatamente o que a RPC desconta (lucro_bruto − lucro_liquido); custo_taxas é 0 e morre (DECISÃO 3)', function (): void {
    $c = cenarioAgregacao();
    $corpo = corpoDashboard($c['postoA']);
    $rpc = rpcDashboard($c['postoA'], 'UTC');

    // A igualdade só vale porque PERIODO_JANEIRO é mês cheio: a RPC filtra a despesa no PERÍODO
    // EXATO (banco/init/01-esquema-base.sql:1166-1167) e o endpoint, no MÊS CIVIL (decisão do dono,
    // 18/09/2026). Para período menor que um mês os dois divergem por decisão — não "conserte" o
    // endpoint de volta para o período exato.
    expect(bccomp(bcsub($rpc['lucro_bruto'], $rpc['lucro_liquido'], 2), $corpo['rateio']['despesas_total'], 2))->toBe(0)
        ->and(bccomp($rpc['custo_taxas'], '0', 2))->toBe(0)
        ->and($corpo)->not->toHaveKey('custo_taxas');
});

it('paridade: lucro_bruto da RPC = conta canônica sobre os insumos do endpoint + DIVERGÊNCIA NOMEADA do fallback preco_custo no produto sem compra (DECISÃO 2)', function (): void {
    $c = cenarioAgregacao();
    $corpo = corpoDashboard($c['postoA']);
    $rpc = rpcDashboard($c['postoA'], 'UTC');

    // Gasolina Comum tem compra: custo médio = valor_total / litros das compras do período,
    // lucro = receita − litros × custo_médio. É a conta de lucro.ts (custoMedioCompra +
    // lucroCombustivel) refeita em decimal só para conferir a RPC — a autoridade segue lá.
    $gc = $corpo['produtos'][2] ?? throw new UnexpectedValueException('Faltou o terceiro produto.');
    expect($gc['produto'])->toBe('Gasolina Comum');
    $custoMedioGc = bcdiv($gc['compras']['valor_total'], $gc['compras']['litros'], 8);           // 16800/3000 = 5.60
    $lucroApuravel = bcsub($gc['receita'], bcmul($gc['litros_vendidos'], $custoMedioGc, 8), 2);  // 9003.00 − 1500.5×5.60 = 600.20
    expect($lucroApuravel)->toBe('600.20');

    // Diesel S10 vendeu 300 L sem compra em janeiro. O endpoint entrega compras 0/0 e lucro.ts
    // devolve null (não apurável). A RPC cai em Combustivel.preco_custo = 5,90 EM SILÊNCIO:
    // 300 × (6,50 − 5,90) = 180,00. Esta parcela é a divergência por decisão — nomeada aqui.
    $s10 = $corpo['produtos'][0];
    expect($s10['produto'])->toBe('Diesel S10')
        ->and($s10['compras'])->toBe(['litros' => '0.000', 'valor_total' => '0.00']);
    $divergenciaFallbackPrecoCusto = '180.00';

    expect(bccomp($rpc['lucro_bruto'], bcadd($lucroApuravel, $divergenciaFallbackPrecoCusto, 2), 2))->toBe(0)
        ->and(bccomp($rpc['lucro_bruto'], $lucroApuravel, 2))->not->toBe(0);
});

it('paridade: sob o fuso do compose (America/Sao_Paulo) a RPC perde a leitura do dia 1; o endpoint compara o dia em UTC e não perde', function (): void {
    $c = cenarioAgregacao();
    $corpo = corpoDashboard($c['postoA']);
    $rpc = rpcDashboard($c['postoA'], 'America/Sao_Paulo');

    // `timestamptz >= date` vira `>= '2026-01-01 00:00-03'` = 03:00 UTC, e a leitura de 01/01
    // (1000,000 L, R$ 6.000,00, gravada em 00:00 UTC) fica de fora. Divergência da RPC, não do endpoint.
    expect(bccomp($rpc['volume_total'], '800.500', 3))->toBe(0)
        ->and(bccomp($rpc['total_vendas'], '4953.00', 2))->toBe(0)
        ->and(somaDecimal(array_column($corpo['produtos'], 'litros_vendidos'), 3))->toBe('1800.500');
});

/*
|--------------------------------------------------------------------------
| `leituras`: o campo aditivo da #103 P9 (decisão do dono, 22/09/2026, Q1 opção a)
|--------------------------------------------------------------------------
| O cliente roda `encerranteMensal` (packages/utils/src/encerrante-mensal.ts) sobre estas linhas para
| os litros do rateio. O servidor só lê e devolve cru: nenhum salto do encerrante em PHP
| (DECISÃO 1). `rateio.litros_vendidos` e `produtos[].litros_vendidos` continuam sendo Σ.
*/

it('leituras: devolve as linhas cruas do período exato (bico, dia em UTC, encerrantes em string de escala 3), sem a de fevereiro', function (): void {
    $c = cenarioAgregacao();

    getJson("/api/postos/{$c['postoA']}/dashboard?".PERIODO_JANEIRO)
        ->assertOk()
        ->assertJsonPath('leituras', [
            ['bico_id' => $c['bicoGc'], 'data' => '2026-01-01', 'leitura_inicial' => '0.000', 'leitura_final' => '1000.000'],
            ['bico_id' => $c['bicoGc'], 'data' => '2026-01-31', 'leitura_inicial' => '0.000', 'leitura_final' => '500.500'],
            ['bico_id' => $c['bicoS10'], 'data' => '2026-01-15', 'leitura_inicial' => '0.000', 'leitura_final' => '300.000'],
        ])
        // aditivo: os campos que já existiam não mudam de significado
        ->assertJsonPath('rateio.litros_vendidos', '1800.500')
        ->assertJsonPath('produtos.2.litros_vendidos', '1500.500');
});

it('leituras não vazam entre postos: o B só vê a própria, o A nunca vê o bico do B', function (): void {
    $c = cenarioAgregacao();

    getJson("/api/postos/{$c['postoB']}/dashboard?".PERIODO_JANEIRO)
        ->assertOk()
        ->assertJsonPath('leituras', [
            ['bico_id' => $c['bicoGcB'], 'data' => '2026-01-15', 'leitura_inicial' => '0.000', 'leitura_final' => '100.000'],
        ]);

    $bicosDoA = array_column(comoArray(getJson("/api/postos/{$c['postoA']}/dashboard?".PERIODO_JANEIRO)->json('leituras')), 'bico_id');
    expect($bicosDoA)->not->toContain($c['bicoGcB']);
});

it('leituras em ordem determinística por bico e por dia, mesmo gravadas fora de ordem (a D5 não chega pela API)', function (): void {
    $c = cenarioAgregacao();
    $usuario = DB::table('Usuario')->insertGetId(['email' => fake()->unique()->safeEmail(), 'nome' => 'Teste Ordem']);
    $bomba = DB::table('Bomba')->insertGetId(['posto_id' => $c['postoA'], 'nome' => 'Bomba 2']);
    $bico = DB::table('Bico')->insertGetId(['posto_id' => $c['postoA'], 'bomba_id' => $bomba, 'combustivel_id' => $c['gc'], 'numero' => 3]);

    // Gravadas 20 → 03 → 10: sem ORDER BY o Postgres tende a devolver na ordem de inserção, e o
    // `encerranteMensal` pegaria a abertura errada se o cliente não reordenasse.
    $linha = static fn (string $dia, string $inicial, string $final, string $litros): array => [
        'posto_id' => $c['postoA'], 'bico_id' => $bico, 'combustivel_id' => $c['gc'], 'usuario_id' => $usuario,
        'data' => "{$dia} 00:00:00+00", 'leitura_inicial' => $inicial, 'leitura_final' => $final,
        'litros_vendidos' => $litros, 'preco_litro' => '6.00', 'valor_total' => '0.00',
    ];
    DB::table('Leitura')->insert([
        $linha('2026-01-20', '1300.000', '1400.000', '100.000'),
        $linha('2026-01-03', '1000.000', '1100.000', '100.000'),
        $linha('2026-01-10', '1100.000', '1250.000', '150.000'),
    ]);

    $leituras = array_values(array_filter(
        comoArray(getJson("/api/postos/{$c['postoA']}/dashboard?".PERIODO_JANEIRO)->json('leituras')),
        static fn (mixed $l): bool => comoArray($l)['bico_id'] === $bico,
    ));

    expect(array_column($leituras, 'data'))->toBe(['2026-01-03', '2026-01-10', '2026-01-20'])
        ->and(array_column($leituras, 'leitura_inicial'))->toBe(['1000.000', '1100.000', '1300.000']);
});

it('leituras vazias quando o período não tem movimento — lista, nunca null', function (): void {
    $c = cenarioAgregacao();

    getJson("/api/postos/{$c['postoA']}/dashboard?inicio=2027-06-01&fim=2027-06-30")
        ->assertOk()
        ->assertJsonPath('leituras', []);
});
