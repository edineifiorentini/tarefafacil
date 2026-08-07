import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { TextInput } from "./TextInput";

const meta: Meta<typeof TextInput> = {
  title: "Átomos/TextInput",
  component: TextInput,
  parameters: { layout: "centered" },
  args: { placeholder: "Digite aqui…", size: "md", error: false },
  argTypes: {
    size: { control: "radio", options: ["sm", "md"] },
    error: { control: "boolean" },
    disabled: { control: "boolean" },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 280 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TextInput>;

export const Default: Story = {};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <TextInput placeholder="Padrão" />
      <TextInput placeholder="Erro" error defaultValue="valor inválido" />
    </div>
  ),
};

export const AllStates: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <TextInput placeholder="Padrão" />
      <TextInput defaultValue="Com valor" />
      <TextInput placeholder="Desabilitado" disabled />
      <TextInput placeholder="Erro" error />
      <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
        Hover e foco são interativos.
      </p>
    </div>
  ),
};

export const Responsive: Story = {
  render: () => (
    <div style={{ width: "100%" }}>
      <TextInput placeholder="Ocupa a largura do contêiner" />
    </div>
  ),
};

export const Accessibility: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label
        htmlFor="a11y-input"
        style={{ fontSize: 14, color: "var(--text-secondary)" }}
      >
        E-mail
      </label>
      <TextInput id="a11y-input" type="email" placeholder="voce@exemplo.com" />
      <p style={{ fontSize: 12, color: "var(--text-secondary)", maxWidth: 280 }}>
        Sempre associe um &lt;label&gt; (nunca só placeholder). O estado de erro
        usa aria-invalid.
      </p>
    </div>
  ),
};
