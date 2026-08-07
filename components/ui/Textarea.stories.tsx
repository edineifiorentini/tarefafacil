import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Textarea } from "./Textarea";

const meta: Meta<typeof Textarea> = {
  title: "Átomos/Textarea",
  component: Textarea,
  parameters: { layout: "centered" },
  args: { placeholder: "Escreva…", autogrow: false, error: false },
  argTypes: {
    autogrow: { control: "boolean" },
    error: { control: "boolean" },
    disabled: { control: "boolean" },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 320 }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof Textarea>;

export const Default: Story = {};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, width: 320 }}>
      <Textarea placeholder="Fixo (3 linhas)" />
      <Textarea autogrow placeholder="Autogrow — cresce conforme você digita" />
    </div>
  ),
};

export const AllStates: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, width: 320 }}>
      <Textarea placeholder="Padrão" />
      <Textarea defaultValue="Com conteúdo" />
      <Textarea placeholder="Desabilitado" disabled />
      <Textarea placeholder="Erro" error />
    </div>
  ),
};

export const Responsive: Story = {
  render: () => (
    <div style={{ width: "100%" }}>
      <Textarea placeholder="Largura do contêiner" />
    </div>
  ),
};

export const Accessibility: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, width: 320 }}>
      <label htmlFor="a11y-ta" style={{ fontSize: 14, color: "var(--text-secondary)" }}>
        Descrição
      </label>
      <Textarea id="a11y-ta" autogrow placeholder="Conte o contexto…" />
      <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
        Associe sempre um &lt;label&gt;. Erro usa aria-invalid.
      </p>
    </div>
  ),
};
