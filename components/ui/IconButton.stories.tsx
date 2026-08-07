import { IconDotsVertical, IconTrash, IconX } from "@tabler/icons-react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { IconButton } from "./IconButton";

const row = { display: "flex", gap: 12, alignItems: "center" };
const note = { fontSize: 12, color: "var(--text-secondary)", maxWidth: 320 };

const meta: Meta<typeof IconButton> = {
  title: "Átomos/IconButton",
  component: IconButton,
  parameters: { layout: "centered" },
  args: { icon: IconDotsVertical, label: "Mais ações", variant: "ghost", size: "md" },
  argTypes: {
    variant: { control: "radio", options: ["ghost", "subtle"] },
    size: { control: "radio", options: ["sm", "md"] },
    disabled: { control: "boolean" },
  },
};
export default meta;
type Story = StoryObj<typeof IconButton>;

export const Default: Story = {};

export const AllVariants: Story = {
  render: () => (
    <div style={row}>
      <IconButton icon={IconDotsVertical} label="Ghost" variant="ghost" />
      <IconButton icon={IconDotsVertical} label="Subtle" variant="subtle" />
    </div>
  ),
};

export const AllStates: Story = {
  render: () => (
    <div style={row}>
      <IconButton icon={IconTrash} label="Padrão" />
      <IconButton icon={IconTrash} label="Desabilitado" disabled />
    </div>
  ),
};

export const Responsive: Story = {
  render: () => (
    <div style={row}>
      <IconButton icon={IconX} label="Pequeno" size="sm" />
      <IconButton icon={IconX} label="Médio" size="md" />
    </div>
  ),
};

export const Accessibility: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <IconButton icon={IconX} label="Fechar" />
      <p style={note}>
        `label` vira aria-label (obrigatório, pois não há texto visível). Alvo de
        toque de 40px no tamanho md; foco visível por teclado.
      </p>
    </div>
  ),
};
