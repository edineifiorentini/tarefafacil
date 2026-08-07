import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Avatar } from "./Avatar";

const row = { display: "flex", gap: 12, alignItems: "center" };
const img =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect width='64' height='64' fill='%237F77DD'/%3E%3C/svg%3E";

const meta: Meta<typeof Avatar> = {
  title: "Átomos/Avatar",
  component: Avatar,
  parameters: { layout: "centered" },
  args: { name: "Edinei Fiorentini", size: "md" },
  argTypes: { size: { control: "radio", options: ["sm", "md"] } },
};
export default meta;
type Story = StoryObj<typeof Avatar>;

export const Default: Story = {};

export const AllVariants: Story = {
  render: () => (
    <div style={row}>
      <Avatar name="Edinei Fiorentini" />
      <Avatar name="Ana" src={img} />
    </div>
  ),
};

export const AllStates: Story = {
  render: () => (
    <div style={row}>
      <Avatar name="Um Nome" size="sm" />
      <Avatar name="Dois Nomes" size="md" />
      <Avatar name="Sem Sobrenome" size="md" />
    </div>
  ),
};

export const Responsive: Story = {
  render: () => (
    <div style={row}>
      <Avatar name="Edinei Fiorentini" size="sm" />
      <Avatar name="Edinei Fiorentini" size="md" />
    </div>
  ),
};

export const Accessibility: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <Avatar name="Edinei Fiorentini" />
      <p style={{ fontSize: 12, color: "var(--text-secondary)", maxWidth: 320 }}>
        Imagem usa alt com o nome; iniciais usam aria-label. Contraste
        texto/fundo ≥ 4.5:1.
      </p>
    </div>
  ),
};
