<?php

declare(strict_types=1);

use App\Agregacao\Application\DadosDoPeriodo;
use App\Agregacao\Application\Periodo;
use App\Compartilhado\Posto;
use App\Compartilhado\PostoAtual;
use Illuminate\Support\Facades\DB;

/*
|--------------------------------------------------------------------------
| O recorte de dia não pode depender do fuso da SESSÃO do Postgres
|--------------------------------------------------------------------------
| A conexão desta aplicação está em America/Sao_Paulo (`show timezone`, medido em 20/09/2026),
| não em UTC. Todo escritor do sistema grava MEIA-NOITE UTC (useSubmissaoFechamento.ts:145,
| api-core/encerrante.ts:497). Um recorte de dia que compare `timestamptz` com valor SEM fuso
| explícito é reinterpretado como horário de Brasília e escorrega — perdendo o primeiro dia do
| período e puxando o primeiro dia do mês seguinte.
|
| `DadosDoPeriodo` alimenta o dashboard do dono: aqui é dinheiro na tela, não teste. Estes casos
| existem para que uma regressão que troque `(data AT TIME ZONE 'UTC')::date` por qualquer forma
| ingênua REPROVE, em vez de passar verde no fuso de hoje e errar o mês.
*/

/**
 * Cenário mínimo nas DUAS BORDAS: 01/01 e 31/01 em 00:00 UTC, mais 01/02 que não pode entrar.
 *
 * As linhas entram por `DB::table` com `+00` EXPLÍCITO de propósito. O cast `datetime` do Eloquent
 * formata sem offset também na ESCRITA, então uma factory com `'data' => '2026-01-01 00:00:00'`
 * gravaria 03:00 UTC e o teste mediria outra coisa.
 *
 * @return array{posto: int, litrosDeJaneiro: string, receitaDeJaneiro: string}
 */
function cenarioRecorteDeDia(): array
{
    $posto = Posto::factory()->create()->id;
    $usuario = DB::table('Usuario')->insertGetId(['email' => fake()->unique()->safeEmail(), 'nome' => 'Teste Recorte']);
    $combustivel = DB::table('Combustivel')->insertGetId([
        'posto_id' => $posto, 'nome' => 'Gasolina Comum', 'codigo' => 'GC', 'preco_venda' => '6.00', 'preco_custo' => '5.10',
    ]);
    $bomba = DB::table('Bomba')->insertGetId(['posto_id' => $posto, 'nome' => 'Bomba 1']);
    $bico = DB::table('Bico')->insertGetId([
        'posto_id' => $posto, 'bomba_id' => $bomba, 'combustivel_id' => $combustivel, 'numero' => 1,
    ]);
    $fornecedor = DB::table('Fornecedor')->insertGetId([
        'posto_id' => $posto, 'nome' => 'Distribuidora', 'cnpj' => fake()->unique()->numerify('##.###.###/0001-##'),
    ]);

    $leitura = static fn (string $dia, string $litros, string $valor): array => [
        'posto_id' => $posto, 'bico_id' => $bico, 'combustivel_id' => $combustivel, 'usuario_id' => $usuario,
        'data' => "{$dia} 00:00:00+00", 'leitura_inicial' => '0.000', 'leitura_final' => $litros,
        'litros_vendidos' => $litros, 'preco_litro' => '6.00', 'valor_total' => $valor,
    ];
    DB::table('Leitura')->insert([
        $leitura('2026-01-01', '1000.000', '6000.00'),  // borda de baixo — a que a forma ingênua PERDE
        $leitura('2026-01-31', '500.500', '3003.00'),   // borda de cima
        $leitura('2026-02-01', '9999.000', '59994.00'), // fevereiro — a que a forma ingênua GANHA
    ]);

    DB::table('Compra')->insert([[
        'posto_id' => $posto, 'combustivel_id' => $combustivel, 'fornecedor_id' => $fornecedor,
        'data' => '2026-01-01 00:00:00+00', 'quantidade_litros' => '2000.00', 'valor_total' => '11000.00',
        'custo_por_litro' => '5.5000',
    ]]);

    // `Despesa.data` é `date` puro no esquema — não tem instante, logo não sofre o problema.
    DB::table('Despesa')->insert([
        ['posto_id' => $posto, 'descricao' => 'Despesa de borda', 'valor' => '1500.00', 'data' => '2026-01-01', 'data_pagamento' => null],
        ['posto_id' => $posto, 'descricao' => 'Despesa de borda', 'valor' => '250.50', 'data' => '2026-01-31', 'data_pagamento' => null],
        ['posto_id' => $posto, 'descricao' => 'Fora do mês', 'valor' => '999.00', 'data' => '2026-02-01', 'data_pagamento' => null],
    ]);

    return ['posto' => $posto, 'litrosDeJaneiro' => '1500.500', 'receitaDeJaneiro' => '9003.00'];
}

/**
 * Roda `DadosDoPeriodo` com a SESSÃO do Postgres num fuso escolhido.
 *
 * `SET LOCAL` morre com a transação do `DatabaseTransactions`: não vaza para o próximo teste.
 *
 * @return array{litros: string, receita: string, comprasLitros: string, despesas: string, litrosDoRateio: string}
 */
function agregadoSobFuso(int $posto, string $fuso): array
{
    DB::statement("SET LOCAL TIME ZONE '{$fuso}'");
    app(PostoAtual::class)->definir($posto);

    $agregado = app(DadosDoPeriodo::class)(new Periodo('2026-01-01', '2026-01-31'));
    $produto = $agregado->produtos[0] ?? throw new UnexpectedValueException('Cenário sem produto agregado.');

    return [
        'litros' => $produto->litrosVendidos,
        'receita' => $produto->receita,
        'comprasLitros' => $produto->comprasLitros,
        'despesas' => $agregado->rateio->despesasTotal,
        'litrosDoRateio' => $agregado->rateio->litrosVendidos,
    ];
}

/** Lê um campo de texto da linha crua do PDO, falhando alto se o contrato mudar. */
function textoDaLinhaCrua(mixed $linha, string $campo): string
{
    $campos = is_object($linha) ? get_object_vars($linha) : [];
    $valor = $campos[$campo] ?? null;
    if (! is_string($valor)) {
        throw new UnexpectedValueException("Coluna {$campo}: esperava texto do Postgres, veio ".get_debug_type($valor).'.');
    }

    return $valor;
}

/**
 * Σ de litros do mesmo cenário, com o WHERE escrito à mão — a régua de sensibilidade.
 *
 * @param  literal-string  $where
 */
function somaLitrosComWhere(int $posto, string $fuso, string $where): string
{
    DB::statement("SET LOCAL TIME ZONE '{$fuso}'");
    $linha = DB::selectOne(
        'SELECT COALESCE(SUM(litros_vendidos), 0)::numeric(18,3) AS litros FROM "Leitura" WHERE posto_id = ? AND '.$where,
        [$posto, '2026-01-01', '2026-01-31']
    );

    return textoDaLinhaCrua($linha, 'litros');
}

it('DadosDoPeriodo devolve o MESMO número em America/Sao_Paulo, em UTC e em Pacific/Kiritimati (UTC+14)', function (): void {
    $c = cenarioRecorteDeDia();

    $saoPaulo = agregadoSobFuso($c['posto'], 'America/Sao_Paulo');  // o fuso real do compose
    $utc = agregadoSobFuso($c['posto'], 'UTC');                     // o fuso do Supabase
    $kiritimati = agregadoSobFuso($c['posto'], 'Pacific/Kiritimati'); // o extremo oposto, +14

    // Se o recorte dependesse da sessão, estes três seriam diferentes.
    expect($saoPaulo)->toBe($utc)
        ->and($saoPaulo)->toBe($kiritimati);

    // E o valor certo é o das duas bordas somadas, sem fevereiro.
    expect($saoPaulo['litros'])->toBe($c['litrosDeJaneiro'])
        ->and($saoPaulo['receita'])->toBe($c['receitaDeJaneiro'])
        ->and($saoPaulo['litrosDoRateio'])->toBe($c['litrosDeJaneiro'])
        ->and($saoPaulo['comprasLitros'])->toBe('2000.000')   // a compra de 01/01 00:00 UTC entra
        ->and($saoPaulo['despesas'])->toBe('1750.50');        // 1500,00 + 250,50; a de 01/02 fica fora
});

it('CANÁRIO: no mesmo cenário e no mesmo fuso, a forma INGÊNUA erra por um dia inteiro em cada borda', function (): void {
    $c = cenarioRecorteDeDia();
    $certo = $c['litrosDeJaneiro'];

    // A expressão de produção (DadosDoPeriodo::DIA_UTC) nomeia o fuso e acerta.
    expect(somaLitrosComWhere($c['posto'], 'America/Sao_Paulo', "(data AT TIME ZONE 'UTC')::date BETWEEN ? AND ?"))->toBe($certo);

    // As formas ingênuas: `data::date` (o que `whereDate` gera) e `BETWEEN` direto no timestamptz.
    // Sob America/Sao_Paulo as duas PERDEM a leitura de 01/01 (1000,000 L) e GANHAM a de 01/02
    // (9999,000 L) — 1500,500 vira 10499,500. Não é erro de borda de 3 horas: é um dia inteiro
    // fora em cada ponta. Se este canário ficar verde com `toBe($certo)`, a régua morreu.
    $ingenuaCastDate = somaLitrosComWhere($c['posto'], 'America/Sao_Paulo', 'data::date BETWEEN ? AND ?');
    expect($ingenuaCastDate)->toBe('10499.500');
    expect($ingenuaCastDate === $certo)->toBeFalse();

    $ingenuaBetween = somaLitrosComWhere($c['posto'], 'America/Sao_Paulo', 'data BETWEEN ? AND ?');
    expect($ingenuaBetween === $certo)->toBeFalse();

    // Em UTC a forma ingênua acertaria — é exatamente por isso que ela passa despercebida.
    expect(somaLitrosComWhere($c['posto'], 'UTC', 'data::date BETWEEN ? AND ?'))->toBe($certo);
});

it('Despesa.data é `date` puro no esquema, e por isso o recorte dela não pode depender de fuso', function (): void {
    $c = cenarioRecorteDeDia();

    $tipo = DB::selectOne(
        'SELECT data_type FROM information_schema.columns WHERE table_schema = ? AND table_name = ? AND column_name = ?',
        ['public', 'Despesa', 'data']
    );
    expect(textoDaLinhaCrua($tipo, 'data_type'))->toBe('date');

    expect(agregadoSobFuso($c['posto'], 'America/Sao_Paulo')['despesas'])
        ->toBe(agregadoSobFuso($c['posto'], 'Pacific/Kiritimati')['despesas'])
        ->toBe('1750.50');
});
