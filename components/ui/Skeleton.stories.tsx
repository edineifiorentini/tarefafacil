import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Skeleton } from "./Skeleton";

const meta: Meta<typeof Skeleton> = {
  title: "Átomos/Skeleton",
  component: Skeleton,
  parameters: { layout: "padded" },
  args: { variant: "text" },
  argTypes: { variant: { control: "radio", options: ["text", "block"] } },
  decorators: [
    (Story) => (
      <div style={{ width: 280 }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof Skeleton>;

export const Default: Story = {};

export const AllVariants: Story = {
  render: () => (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 12, width: 280 }}
    >
      <Skeleton variant="text" />
      <Skeleton variant="block" className="h-24" />
    </div>
  ),
};

export const AllStates: Story = {
  render: () => (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 8, width: 280 }}
    >
      <Skeleton variant="text" className="w-1/2" />
      <Skeleton variant="text" />
      <Skeleton variant="text" className="w-3/4" />
    </div>
  ),
};

export const Responsive: Story = {
  render: () => (
    <div style={{ width: "100%" }}>
      <Skeleton variant="block" className="h-16" />
    </div>
  ),
};

export const Accessibility: Story = {
  render: () => (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 8, width: 280 }}
    >
      <Skeleton variant="text" />
      <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
        aria-hidden (é placeholder visual); a animação some com
        prefers-reduced-motion.
      </p>
    </div>
  ),
};
