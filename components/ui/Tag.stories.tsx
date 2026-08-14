import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Tag } from "./Tag";

const row = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  flexWrap: "wrap" as const,
};

const meta: Meta<typeof Tag> = {
  title: "Átomos/Tag",
  component: Tag,
  parameters: { layout: "centered" },
  args: { children: "urgente", color: "neutral" },
  argTypes: {
    color: {
      control: "select",
      options: ["neutral", "violeta", "azul", "coral", "rosa", "grafite"],
    },
  },
};
export default meta;
type Story = StoryObj<typeof Tag>;

export const Default: Story = {};

export const AllVariants: Story = {
  render: () => (
    <div style={row}>
      <Tag>neutro</Tag>
      <Tag color="violeta">violeta</Tag>
      <Tag color="azul">azul</Tag>
      <Tag color="coral">coral</Tag>
      <Tag color="rosa">rosa</Tag>
      <Tag color="grafite">grafite</Tag>
    </div>
  ),
};

export const AllStates: Story = {
  render: () => (
    <div style={row}>
      <Tag color="coral">sem remover</Tag>
      <Tag color="coral" onRemove={() => {}}>
        com remover
      </Tag>
    </div>
  ),
};

export const Responsive: Story = {
  render: () => (
    <div style={{ ...row, maxWidth: 200 }}>
      <Tag color="azul">design</Tag>
      <Tag color="violeta">marketing</Tag>
      <Tag color="coral">cliente</Tag>
      <Tag>+2</Tag>
    </div>
  ),
};

export const Accessibility: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <Tag color="rosa" onRemove={() => {}}>
        removível
      </Tag>
      <p
        style={{ fontSize: 12, color: "var(--text-secondary)", maxWidth: 320 }}
      >
        O botão de remover tem aria-label e foco visível. As cores de setor
        foram escolhidas para contraste do texto sobre o preenchimento.
      </p>
    </div>
  ),
};
