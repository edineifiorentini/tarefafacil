import { act, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useAsOf } from "./useAsOf";

function Sonda({ updatedAt }: { updatedAt: number }) {
  const asOf = useAsOf(updatedAt);
  return <span data-testid="asof">{asOf.toISOString()}</span>;
}

const T1 = Date.parse("2026-08-18T12:00:00.000Z");
const T2 = Date.parse("2026-08-18T12:05:00.000Z");

describe("useAsOf", () => {
  it("usa o instante em que o dado chegou", () => {
    const { getByTestId } = render(<Sonda updatedAt={T1} />);
    expect(getByTestId("asof").textContent).toBe("2026-08-18T12:00:00.000Z");
  });

  it("avança quando o dado é atualizado", () => {
    // Este é o defeito que o hook existe para evitar: com o relógio preso na
    // montagem, concluir uma demanda não mexia em nenhum indicador.
    const { getByTestId, rerender } = render(<Sonda updatedAt={T1} />);
    act(() => rerender(<Sonda updatedAt={T2} />));
    expect(getByTestId("asof").textContent).toBe("2026-08-18T12:05:00.000Z");
  });

  it("não muda quando o dado não muda", () => {
    const { getByTestId, rerender } = render(<Sonda updatedAt={T1} />);
    const antes = getByTestId("asof").textContent;
    act(() => rerender(<Sonda updatedAt={T1} />));
    expect(getByTestId("asof").textContent).toBe(antes);
  });

  it("antes da primeira resposta cai no instante da montagem, não em 1970", () => {
    const { getByTestId } = render(<Sonda updatedAt={0} />);
    const ano = new Date(
      getByTestId("asof").textContent as string
    ).getFullYear();
    expect(ano).toBeGreaterThan(2000);
  });
});
