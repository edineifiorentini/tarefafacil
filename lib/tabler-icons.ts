import type { IconComponent } from "@/components/ui/types";

export type IconsModule = Record<string, IconComponent>;

// Carrega a biblioteca Tabler sob demanda (code-split). A promise é criada só
// na primeira chamada (no render de quem usa), então o chunk gigante de ícones
// não entra no bundle principal. Compatível com o hook use() do React 19.
let promise: Promise<IconsModule> | undefined;

export function loadTablerIcons(): Promise<IconsModule> {
  promise ??= import("@tabler/icons-react") as unknown as Promise<IconsModule>;
  return promise;
}
