import { DealBoard } from "@/components/crm/DealBoard";

export default function FunilPage() {
  // Sem espaço no topo: a barra superior já respira acima do conteúdo.
  return (
    <div className="flex h-full flex-col px-4 pb-6 lg:px-6">
      <DealBoard />
    </div>
  );
}
