"use client";

import { Children, isValidElement, useEffect, useRef, useState } from "react";
import type {
  InputHTMLAttributes,
  ReactElement,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { ChevronDownIcon, PencilIcon, SearchIcon, TrashIcon } from "./icons";

const CAMPO_CLASSES =
  "w-full rounded-brand border border-neutral-100 px-3 py-2 text-sm text-foreground outline-none focus:border-secondary-foreground focus:ring-2 focus:ring-secondary disabled:opacity-60";

export function Field({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${CAMPO_CLASSES} ${props.className ?? ""}`} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${CAMPO_CLASSES} ${props.className ?? ""}`} />;
}

// <select> nativo depende do navegador desenhar o popup de opções — em algumas combinações
// de SO/navegador (ex.: Chromium em Linux com tema GTK claro) esse popup ignora
// `color-scheme: dark` e sai ilegível (texto claro sobre fundo branco do SO, ver
// investigação de 2026-09-16). Por isso o dropdown é desenhado inteiramente por nós (botão +
// lista posicionada), sem depender de nenhum chrome nativo — a API pública continua igual
// (value/onChange/<option> como children), então nenhuma tela que já usa <Select> mudou.
export function Select({ value, onChange, children, className, id, disabled }: SelectHTMLAttributes<HTMLSelectElement>) {
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function aoClicarFora(evento: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(evento.target as Node)) {
        setAberto(false);
      }
    }
    function aoTeclarEsc(evento: KeyboardEvent) {
      if (evento.key === "Escape") setAberto(false);
    }
    document.addEventListener("mousedown", aoClicarFora);
    document.addEventListener("keydown", aoTeclarEsc);
    return () => {
      document.removeEventListener("mousedown", aoClicarFora);
      document.removeEventListener("keydown", aoTeclarEsc);
    };
  }, []);

  const opcoes = Children.toArray(children).filter(isValidElement) as ReactElement<{
    value?: string;
    children?: ReactNode;
  }>[];
  const selecionada = opcoes.find((opcao) => (opcao.props.value ?? "") === (value ?? ""));

  function selecionar(valorOpcao: string) {
    setAberto(false);
    onChange?.({ target: { value: valorOpcao } } as unknown as React.ChangeEvent<HTMLSelectElement>);
  }

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setAberto((v) => !v)}
        className={`${CAMPO_CLASSES} flex items-center justify-between gap-2 text-left`}
      >
        <span className="truncate">{selecionada?.props.children ?? "Selecione…"}</span>
        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 text-neutral-600 transition-transform ${aberto ? "rotate-180" : ""}`}
        />
      </button>
      {aberto && (
        <ul className="absolute z-20 mt-1.5 max-h-60 w-full overflow-auto rounded-brand border border-secondary-subtle-border bg-neutral-100 py-1 shadow-lg shadow-black/40">
          {opcoes.map((opcao, indice) => {
            const valorOpcao = opcao.props.value ?? "";
            const ativa = valorOpcao === (value ?? "");
            return (
              <li key={valorOpcao || indice}>
                <button
                  type="button"
                  onClick={() => selecionar(valorOpcao)}
                  className={`block w-full px-3 py-2 text-left text-sm transition-colors ${
                    ativa ? "bg-secondary-subtle text-secondary-foreground" : "text-foreground hover:bg-secondary/15"
                  }`}
                >
                  {opcao.props.children}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// Input de busca com ícone de lupa fixo à esquerda — usado nas barras de filtro no topo das
// listagens (padrão do redesenho de 2026-09-16).
export function SearchInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={`relative ${className ?? ""}`}>
      <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-600" />
      <input {...props} className={`${CAMPO_CLASSES} pl-10`} />
    </div>
  );
}

interface BotaoProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
}

export function PrimaryButton({ className, icon, children, ...props }: BotaoProps) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-secondary hover:text-on-secondary disabled:opacity-60 ${className ?? ""}`}
    >
      {icon}
      {children}
    </button>
  );
}

// Preenchido com a cor que antes só aparecia no hover — o hover agora escurece um pouco
// mais a partir dela, em vez de "acender" a partir de transparente.
export function SecondaryButton({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`rounded-full bg-secondary px-5 py-2.5 text-sm font-medium text-on-secondary transition-colors hover:bg-[#15803d] disabled:opacity-60 ${className ?? ""}`}
    />
  );
}

// Ação de editar — pílula verde preenchida com ícone de lápis (linhas de tabela em toda a
// listagem), mesmo padrão preenchido dos botões Aprovar/Enviar.
export function EditButton({ className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-secondary hover:text-on-secondary disabled:opacity-60 ${className ?? ""}`}
    >
      <PencilIcon className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}

// Ação destrutiva — 100% dos usos hoje são "Excluir", por isso o ícone já vem embutido.
// Preenchido (mesmo padrão dos botões Aprovar/Enviar), não mais outline.
export function DangerButton({ className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`inline-flex items-center gap-1.5 rounded-full bg-danger px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-60 ${className ?? ""}`}
    >
      <TrashIcon className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  return <p className="rounded-brand bg-danger/10 px-4 py-2.5 text-sm text-danger">{children}</p>;
}
