import { describe, expect, it } from "vitest";

import {
  closedAreaPath,
  makeXScale,
  makeYScale,
  niceTicks,
  polylineLength,
  smoothLinePath,
  type Point,
} from "./path";

describe("smoothLinePath", () => {
  it("lista vazia não gera caminho", () => {
    expect(smoothLinePath([])).toBe("");
  });

  it("um ponto vira só o move", () => {
    expect(smoothLinePath([{ x: 5, y: 10 }])).toBe("M 5 10");
  });

  it("começa no primeiro ponto e termina exatamente no último", () => {
    const pts: Point[] = [
      { x: 0, y: 100 },
      { x: 50, y: 40 },
      { x: 100, y: 70 },
    ];
    const d = smoothLinePath(pts);
    expect(d.startsWith("M 0 100")).toBe(true);
    expect(d.endsWith("L 100 70")).toBe(true);
  });
});

describe("closedAreaPath", () => {
  it("fecha a curva na linha de base", () => {
    const pts: Point[] = [
      { x: 0, y: 20 },
      { x: 10, y: 5 },
    ];
    const d = closedAreaPath(pts, 100);
    expect(d.endsWith("L 10 100 L 0 100 Z")).toBe(true);
  });
});

describe("makeYScale", () => {
  it("mapeia mínimo no fundo e máximo no topo (y invertido no SVG)", () => {
    const y = makeYScale(0, 100, 0, 200);
    expect(y(0)).toBe(200);
    expect(y(100)).toBe(0);
    expect(y(50)).toBe(100);
  });

  it("domínio degenerado não divide por zero", () => {
    const y = makeYScale(5, 5, 0, 100);
    expect(Number.isFinite(y(5))).toBe(true);
  });
});

describe("makeXScale", () => {
  it("distribui os índices entre as bordas", () => {
    const x = makeXScale(3, 0, 100);
    expect(x(0)).toBe(0);
    expect(x(1)).toBe(50);
    expect(x(2)).toBe(100);
  });

  it("um ponto só fica na borda esquerda", () => {
    expect(makeXScale(1, 12, 90)(0)).toBe(12);
  });
});

describe("niceTicks", () => {
  it("escolhe passos legíveis cobrindo o máximo", () => {
    expect(niceTicks(57, 4)).toEqual([0, 15, 30, 45, 60]);
    expect(niceTicks(100, 4)).toEqual([0, 25, 50, 75, 100]);
  });

  it("máximo inválido ou zero devolve só a origem", () => {
    expect(niceTicks(0)).toEqual([0]);
    expect(niceTicks(Number.NaN)).toEqual([0]);
  });

  it("não deixa resíduo de ponto flutuante nas marcas", () => {
    for (const tick of niceTicks(3, 4)) {
      expect(String(tick)).not.toMatch(/\d{6,}/);
    }
  });
});

describe("polylineLength", () => {
  it("soma os segmentos com folga para a curvatura", () => {
    const len = polylineLength([
      { x: 0, y: 0 },
      { x: 3, y: 4 },
    ]);
    expect(len).toBeGreaterThanOrEqual(5);
    expect(len).toBeLessThanOrEqual(7);
  });
});
