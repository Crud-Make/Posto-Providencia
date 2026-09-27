/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            // Marca nova (27/09/2026): Sora nos títulos, Manrope no texto — só na tela de escolha do posto.
            fontFamily: {
                display: ['Sora', 'ui-sans-serif', 'system-ui', 'sans-serif'],
                marca: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
