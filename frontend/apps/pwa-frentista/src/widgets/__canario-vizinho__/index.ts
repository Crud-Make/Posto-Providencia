// Slice VIZINHO do canário do FSD (mesma camada widgets). Mora fora de __canarios__ porque o
// boundaries só acusa import entre elementos diferentes: dentro do mesmo slice é permitido.
// Está em `ignores` do eslint (**/__canario-vizinho__/**); só o teste o alcança, com --no-ignore.
export { interno } from './interno';
