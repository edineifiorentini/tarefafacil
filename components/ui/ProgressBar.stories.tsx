import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ProgressBar } from "./ProgressBar";

const meta: Meta<typeof ProgressBar> = {
  title: "Átomos/ProgressBar",
  component: ProgressBar,
  parameters: { layout: "padded" },
  args: { value: 60, label: "Progresso do projeto" },
  argTypes: { value: { control: { type: "range", min: 0, max: 100 } } },
  decorators: [
    (Story) => (
      <div style={{ width: 280 }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof ProgressBar>;

export const Default: Story = {};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, width: 280 }}>
      <ProgressBar value={0} label="0%" />
      <ProgressBar value={35} label="35%" />
      <ProgressBar value={100} label="100%" />
    </div>
  ),
};

export const AllStates: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, width: 280 }}>
      <ProgressBar value={-20} label="abaixo do mínimo (clamp 0)" />
      <ProgressBar value={140} label="acima do máximo (clamp 100)" />
    </div>
  ),
};

export const Responsive: Story = {
  render: () => (
    <div style={{ width: "100%" }}>
      <ProgressBar value={50} label="largura total" />
    </div>
  ),
};

export const Accessibility: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: 280 }}>
      <ProgressBar value={60} label="6 de 10 tarefas concluídas" />
      <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
        role=progressbar com aria-valuenow/min/max e aria-label descritivo.
      </p>
    </div>
  ),
};
