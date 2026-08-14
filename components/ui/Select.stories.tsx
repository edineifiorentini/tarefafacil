import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Select } from "./Select";

const options = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
];

const meta: Meta<typeof Select> = {
  title: "Átomos/Select",
  component: Select,
  parameters: { layout: "centered" },
  args: { options, placeholder: "Prioridade", error: false },
  argTypes: {
    error: { control: "boolean" },
    disabled: { control: "boolean" },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 240 }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = {};

export const AllVariants: Story = {
  render: () => (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 12, width: 240 }}
    >
      <Select
        options={options}
        placeholder="Sem valor"
        aria-label="Sem valor"
      />
      <Select options={options} defaultValue="alta" aria-label="Com valor" />
    </div>
  ),
};

export const AllStates: Story = {
  render: () => (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 12, width: 240 }}
    >
      <Select options={options} placeholder="Padrão" aria-label="Padrão" />
      <Select options={options} placeholder="Erro" error aria-label="Erro" />
      <Select
        options={options}
        placeholder="Desabilitado"
        disabled
        aria-label="Desabilitado"
      />
    </div>
  ),
};

export const Responsive: Story = {
  render: () => (
    <div style={{ width: "100%" }}>
      <Select
        options={options}
        placeholder="Largura total"
        aria-label="Largura total"
      />
    </div>
  ),
};

export const Accessibility: Story = {
  render: () => (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 6, width: 240 }}
    >
      <label
        htmlFor="a11y-select"
        style={{ fontSize: 14, color: "var(--text-secondary)" }}
      >
        Prioridade
      </label>
      <Select id="a11y-select" options={options} placeholder="Selecione" />
      <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
        Radix Select: teclado, foco e leitor de tela embutidos.
      </p>
    </div>
  ),
};
