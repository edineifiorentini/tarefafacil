import "@testing-library/jest-dom/vitest";

/**
 * jsdom não tem ResizeObserver, e vários componentes do Radix (Select,
 * Checkbox, Popover) o chamam no primeiro efeito. Sem este remendo, testar
 * QUALQUER tela que use um deles morre em `ResizeObserver is not defined` —
 * um erro de ambiente que não diz nada sobre o produto.
 *
 * A implementação é vazia de propósito: em jsdom nada tem tamanho, então
 * medir seria mentira. O que se ganha é a árvore renderizar.
 */
if (!("ResizeObserver" in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
