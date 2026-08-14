import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Checkbox } from "./Checkbox";

const row = { display: "flex", gap: 16, alignItems: "center" };
const label = {
  display: "inline-flex",
  gap: 8,
  alignItems: "center",
  color: "var(--text-primary)",
};

const meta: Meta<typeof Checkbox> = {
  title: "Átomos/Checkbox",
  component: Checkbox,
  parameters: { layout: "centered" },
  args: { variant: "default", "aria-label": "Exemplo" },
  argTypes: {
    variant: { control: "radio", options: ["default", "round"] },
    disabled: { control: "boolean" },
  },
};
export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Default: Story = { args: { defaultChecked: false } };

export const AllVariants: Story = {
  render: () => (
    <div style={row}>
      <label style={label}>
        <Checkbox variant="default" defaultChecked aria-label="Quadrado" />
        Quadrado
      </label>
      <label style={label}>
        <Checkbox
          variant="round"
          defaultChecked
          aria-label="Redondo (subtarefa)"
        />
        Redondo
      </label>
    </div>
  ),
};

export const AllStates: Story = {
  render: () => (
    <div style={row}>
      <Checkbox aria-label="Desmarcado" />
      <Checkbox checked aria-label="Marcado" />
      <Checkbox checked="indeterminate" aria-label="Indeterminado" />
      <Checkbox disabled aria-label="Desabilitado" />
    </div>
  ),
};

export const Responsive: Story = {
  render: () => (
    <div style={row}>
      <Checkbox defaultChecked aria-label="Um" />
      <Checkbox variant="round" defaultChecked aria-label="Dois" />
    </div>
  ),
};

export const Accessibility: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label style={label}>
        <Checkbox defaultChecked aria-label="Concluir etapa" />
        Concluir etapa
      </label>
      <p
        style={{ fontSize: 12, color: "var(--text-secondary)", maxWidth: 320 }}
      >
        Radix cuida de role/estado e teclado (Espaço). Associe um &lt;label&gt;
        ou passe aria-label. Foco visível por teclado.
      </p>
    </div>
  ),
};
