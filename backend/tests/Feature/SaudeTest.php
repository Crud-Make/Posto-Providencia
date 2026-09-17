<?php

use Illuminate\Support\Facades\DB;

use function Pest\Laravel\getJson;

it('responde ok com o nome do banco quando o Postgres está de pé', function (): void {
    DB::shouldReceive('selectOne')->once()->andReturn((object) ['nome' => 'posto']);

    getJson('/api/saude')
        ->assertOk()
        ->assertJson(['status' => 'ok', 'banco' => 'posto']);
});

it('responde 503 degradado quando o banco não responde', function (): void {
    DB::shouldReceive('selectOne')->once()->andThrow(new RuntimeException('sem banco'));

    getJson('/api/saude')
        ->assertStatus(503)
        ->assertJson(['status' => 'degradado', 'banco' => 'indisponivel']);
});
