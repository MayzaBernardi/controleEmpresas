import type { ReactNode } from "react";

type Variante = "secondary" | "warning" | "danger" | "neutral";

// Pílulas com fundo/borda em baixa opacidade sobre o fundo escuro do painel — a cor do
// texto também é a cor do "dot" (bg-current), pra não duplicar a cor em dois lugares.
const ESTILOS: Record<Variante, string> = {
  secondary: "bg-secondary-subtle text-secondary-foreground border-secondary-subtle-border",
  warning: "bg-warning/10 text-warning border-warning/30",
  danger: "bg-danger/10 text-danger border-danger/25",
  neutral: "bg-slate-400/10 text-slate-400 border-slate-400/25",
};

export function Badge({ children, variante = "neutral" }: { children: ReactNode; variante?: Variante }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${ESTILOS[variante]}`}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      {children}
    </span>
  );
}
