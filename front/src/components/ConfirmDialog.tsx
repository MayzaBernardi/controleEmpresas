"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { DangerButton, SecondaryButton } from "./form";

interface ConfirmOptions {
  titulo?: string;
  mensagem: ReactNode;
  confirmarLabel?: string;
  cancelarLabel?: string;
  // "danger" pras exclusões (DangerButton, mesma pílula vermelha das linhas de tabela);
  // "default" pras confirmações não-destrutivas (ex.: confirmar pagamento).
  tone?: "danger" | "default";
}

interface PedidoConfirmacao extends ConfirmOptions {
  resolver: (confirmado: boolean) => void;
}

type PedirConfirmacao = (opcoes: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<PedirConfirmacao | null>(null);

// Provider único montado no layout raiz — troca o window.confirm() nativo (sem estilo, sem
// suporte a botão de destaque) por um diálogo no padrão visual do painel (mesmo cartão
// escuro + pílulas dos outros componentes de src/components/form.tsx). Uso:
//   const pedirConfirmacao = useConfirm();
//   if (!(await pedirConfirmacao({ mensagem: "Excluir X?", tone: "danger" }))) return;
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pedido, setPedido] = useState<PedidoConfirmacao | null>(null);

  const pedirConfirmacao = useCallback<PedirConfirmacao>((opcoes) => {
    return new Promise<boolean>((resolve) => {
      setPedido({ ...opcoes, resolver: resolve });
    });
  }, []);

  const responder = useCallback(
    (confirmado: boolean) => {
      pedido?.resolver(confirmado);
      setPedido(null);
    },
    [pedido]
  );

  useEffect(() => {
    if (!pedido) return;
    function aoTeclarEsc(evento: KeyboardEvent) {
      if (evento.key === "Escape") responder(false);
    }
    document.addEventListener("keydown", aoTeclarEsc);
    return () => document.removeEventListener("keydown", aoTeclarEsc);
  }, [pedido, responder]);

  return (
    <ConfirmContext.Provider value={pedirConfirmacao}>
      {children}
      {pedido && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={() => responder(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            onClick={(evento) => evento.stopPropagation()}
            className="w-full max-w-sm rounded-brand border border-neutral-100 bg-neutral-100 p-6 shadow-lg shadow-black/40"
          >
            <p className="font-display text-lg font-semibold text-foreground">
              {pedido.titulo ?? (pedido.tone === "danger" ? "Confirmar exclusão" : "Confirmar ação")}
            </p>
            <p className="mt-2 text-sm text-neutral-800">{pedido.mensagem}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                autoFocus
                onClick={() => responder(false)}
                className="rounded-full border border-neutral-100 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background"
              >
                {pedido.cancelarLabel ?? "Cancelar"}
              </button>
              {pedido.tone === "danger" ? (
                <DangerButton type="button" onClick={() => responder(true)}>
                  {pedido.confirmarLabel ?? "Excluir"}
                </DangerButton>
              ) : (
                <SecondaryButton type="button" onClick={() => responder(true)}>
                  {pedido.confirmarLabel ?? "Confirmar"}
                </SecondaryButton>
              )}
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): PedirConfirmacao {
  const contexto = useContext(ConfirmContext);
  if (!contexto) {
    throw new Error("useConfirm precisa ser usado dentro de <ConfirmProvider>.");
  }
  return contexto;
}
