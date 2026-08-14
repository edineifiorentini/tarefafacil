import {
  IconCalendarMonth,
  IconHome,
  IconLayoutKanban,
  IconSettings,
} from "@tabler/icons-react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Icon } from "./Icon";

const row = {
  display: "flex",
  gap: 16,
  alignItems: "center",
  color: "var(--text-primary)",
};

const meta: Meta<typeof Icon> = {
  title: "Átomos/Icon",
  component: Icon,
  parameters: { layout: "centered" },
  args: { icon: IconHome, size: 20 },
};
export default meta;
type Story = StoryObj<typeof Icon>;

export const Default: Story = {};

export const AllVariants: Story = {
  render: () => (
    <div style={row}>
      <Icon icon={IconHome} />
      <Icon icon={IconLayoutKanban} />
      <Icon icon={IconCalendarMonth} />
      <Icon icon={IconSettings} />
    </div>
  ),
};

export const AllStates: Story = {
  render: () => (
    <div style={row}>
      <Icon icon={IconHome} size={16} />
      <Icon icon={IconHome} size={20} />
      <Icon icon={IconHome} size={24} />
    </div>
  ),
};

export const Responsive: Story = {
  render: () => (
    <div style={row}>
      <Icon icon={IconHome} size={20} />
    </div>
  ),
};

export const Accessibility: Story = {
  render: () => (
    <div
      style={{
        ...row,
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 8,
      }}
    >
      <Icon icon={IconSettings} label="Configurações" />
      <p
        style={{ fontSize: 12, color: "var(--text-secondary)", maxWidth: 320 }}
      >
        Sem `label`, o ícone é decorativo (aria-hidden). Com `label`, é
        anunciado pelo leitor de tela.
      </p>
    </div>
  ),
};
