import { z } from "zod";

// Presets de cor (atalhos). Nenhum é verde-marca, mas o picker é livre.
export const sectorColorPresets = [
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#F97316",
  "#EF4444",
  "#14B8A6",
  "#EAB308",
  "#64748B",
] as const;

export const sectorSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe um nome")
    .max(60, "No máximo 60 caracteres"),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use um hexadecimal, ex.: #3B82F6"),
  icon: z.string().min(1, "Escolha um ícone"),
});

export type SectorInput = z.infer<typeof sectorSchema>;
