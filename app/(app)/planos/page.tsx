import { PlanChooser } from "@/components/billing/PlanChooser";

export default function PlanosPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 pb-6 lg:px-6">
      <PlanChooser />
    </div>
  );
}
