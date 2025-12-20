// Template para Netlify Serverless Function
// ==========================================
// Este arquivo serve como exemplo de como criar uma função serverless segura.
// Use-o para operações que precisam de chaves de API ou lógica de backend.
//
// Para usar, remova o ".example" do nome do arquivo e configure as 
// variáveis de ambiente no painel do Netlify.

import type { Context } from "@netlify/functions";

// Exemplo: Proxy para API do Gemini
export default async (request: Request, context: Context) => {
    // A chave de API é lida das variáveis de ambiente do Netlify
    // NUNCA é exposta ao cliente
    const apiKey = Netlify.env.get("GEMINI_API_KEY");

    if (!apiKey) {
        return new Response(JSON.stringify({ error: "API Key não configurada" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }

    try {
        // Exemplo de chamada ao Gemini
        const body = await request.json();

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: body.prompt }] }],
                }),
            }
        );

        const data = await response.json();

        return new Response(JSON.stringify(data), {
            status: response.status,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: "Erro ao processar requisição" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
};

// Configuração da função
export const config = {
    // Path onde a função ficará acessível: /.netlify/functions/gemini-proxy
    path: "/api/gemini",
};
