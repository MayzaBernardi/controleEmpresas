import type { ReactNode } from "react";

type Variante = "secondary" | "warning" | "danger" | "neutral";

const ESTILOS: Record<Variante, string> = {
  secondary: "bg-secondary-subtle text-secondary-foreground border-secondary-subtle-border",
  warning: "bg-warning/15 text-neutral-800 border-warning/30",
  danger: "bg-danger/10 text-danger border-danger/20",
  neutral: "bg-neutral-100 text-neutral-600 border-neutral-100",
};

export function Badge({ children, variante = "neutral" }: { children: ReactNode; variante?: Variante }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${ESTILOS[variante]}`}>
      {children}
    </span>
  );
}
