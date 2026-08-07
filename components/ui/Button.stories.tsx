import { IconPlus, IconTrash } from "@tabler/icons-react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Button } from "./Button";

const meta: Meta<typeof Button> = {
  title: "Átomos/Button",
  component: Button,
  parameters: { layout: "centered" },
  args: { children: "Ação", variant: "secondary", size: "md" },
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "ghost", "danger"],
    },
    size: { control: "radio", options: ["sm", "md"] },
    isLoading: { control: "boolean" },
    disabled: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      <Button variant="primary">Primária</Button>
      <Button variant="secondary">Secundária</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Excluir</Button>
    </div>
  ),
};

export const AllStates: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Button variant="primary">Padrão</Button>
        <Button variant="primary" leadingIcon={IconPlus}>
          Com ícone
        </Button>
        <Button variant="primary" isLoading>
          Carregando
        </Button>
        <Button variant="primary" disabled>
          Desabilitado
        </Button>
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Button size="sm">Pequeno</Button>
        <Button size="md">Médio</Button>
        <Button size="sm" trailingIcon={IconTrash} variant="danger">
          Remover
        </Button>
      </div>
      <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
        Hover, foco e active são interativos — passe o mouse ou use Tab.
      </p>
    </div>
  ),
};

export const Responsive: Story = {
  render: () => (
    <div style={{ width: "100%", maxWidth: 320 }}>
      <Button variant="primary" leadingIcon={IconPlus} className="w-full">
        Botão de largura total
      </Button>
    </div>
  ),
};

export const Accessibility: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Button variant="primary">Foco visível (Tab)</Button>
      <p style={{ fontSize: 12, color: "var(--text-secondary)", maxWidth: 320 }}>
        Foco por teclado mostra o anel de 2px (token de foco). O botão primário
        usa brand-600 com texto branco (≥ 4.5:1). Estado de carregamento usa
        aria-busy; desabilitado bloqueia interação.
      </p>
    </div>
  ),
};
