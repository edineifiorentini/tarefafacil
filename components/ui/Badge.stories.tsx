import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Badge } from "./Badge";

const row = { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" as const };

const meta: Meta<typeof Badge> = {
  title: "Átomos/Badge",
  component: Badge,
  parameters: { layout: "centered" },
  args: { children: "Badge", variant: "neutral" },
  argTypes: {
    variant: { control: "select", options: ["neutral", "brand", "overdue", "due-soon"] },
  },
};
export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {};

export const AllVariants: Story = {
  render: () => (
    <div style={row}>
      <Badge variant="neutral">Neutro</Badge>
      <Badge variant="brand">Marca</Badge>
      <Badge variant="overdue">Atrasado</Badge>
      <Badge variant="due-soon">Em 48h</Badge>
    </div>
  ),
};

export const AllStates: Story = {
  render: () => (
    <div style={row}>
      <Badge variant="neutral">3</Badge>
      <Badge variant="brand">Pro</Badge>
      <Badge variant="overdue">2 atrasadas</Badge>
    </div>
  ),
};

export const Responsive: Story = {
  render: () => (
    <div style={{ maxWidth: 160 }}>
      <Badge variant="brand">Rótulo um pouco maior</Badge>
    </div>
  ),
};

export const Accessibility: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={row}>
        <Badge variant="overdue">Atrasado</Badge>
        <Badge variant="due-soon">Em 48h</Badge>
      </div>
      <p style={{ fontSize: 12, color: "var(--text-secondary)", maxWidth: 320 }}>
        Todas as combinações texto/fundo atingem ≥ 4.5:1. Cor nunca é o único
        sinal — o texto sempre descreve o estado.
      </p>
    </div>
  ),
};
