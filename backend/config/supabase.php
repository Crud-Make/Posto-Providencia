<?php

declare(strict_types=1);

/*
 * Emissor do token durante a transição (DECISÃO A, docs/design/fechamento-diario-api.md §6):
 * o Laravel aceita o JWT que o Supabase Auth emite para o painel hoje. O segredo é o "JWT Secret"
 * do projeto (painel do Supabase → Settings → API), com que o Supabase assina em HS256.
 *
 * Quando o Sanctum entrar como segundo emissor (#102), este arquivo continua valendo para o
 * primeiro: o guard é o mesmo, muda quem emite.
 */
return [
    'jwt_secret' => env('SUPABASE_JWT_SECRET'),

    // O Supabase carimba `aud: "authenticated"` em token de usuário logado. Token de service_role
    // ou anon tem outra audiência e não pode passar pelo guard do painel.
    'jwt_audiencia' => env('SUPABASE_JWT_AUDIENCIA', 'authenticated'),

    // Tolerância de relógio, em segundos, ao conferir `exp` e `nbf`.
    'jwt_folga_segundos' => (int) env('SUPABASE_JWT_FOLGA_SEGUNDOS', 10),
];
