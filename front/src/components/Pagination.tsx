"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "./icons";

export function Pagination({
  paginaAtual,
  totalPaginas,
  totalItens,
  porPagina,
  rotuloItens,
  onMudarPagina,
}: {
  paginaAtual: number;
  totalPaginas: number;
  totalItens: number;
  porPagina: number;
  rotuloItens: string;
  onMudarPagina: (pagina: number) => void;
}) {
  if (totalItens === 0 || totalPaginas <= 1) return null;

  const inicio = (paginaAtual - 1) * porPagina + 1;
  const fim = Math.min(paginaAtual * porPagina, totalItens);

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-neutral-600">
      <p>
        Mostrando {inicio}–{fim} de {totalItens} {rotuloItens}
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onMudarPagina(paginaAtual - 1)}
          disabled={paginaAtual === 1}
          aria-label="Página anterior"
          className="rounded-full border border-neutral-100 p-1.5 text-foreground transition-colors hover:bg-neutral-100 disabled:opacity-40"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        {Array.from({ length: totalPaginas }, (_, indice) => indice + 1).map((pagina) => (
          <button
            key={pagina}
            type="button"
            onClick={() => onMudarPagina(pagina)}
            aria-current={pagina === paginaAtual ? "page" : undefined}
            className={`h-8 w-8 rounded-full text-sm font-medium transition-colors ${
              pagina === paginaAtual
                ? "bg-secondary text-on-secondary"
                : "text-foreground hover:bg-neutral-100"
            }`}
          >
            {pagina}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onMudarPagina(paginaAtual + 1)}
          disabled={paginaAtual === totalPaginas}
          aria-label="Próxima página"
          className="rounded-full border border-neutral-100 p-1.5 text-foreground transition-colors hover:bg-neutral-100 disabled:opacity-40"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
