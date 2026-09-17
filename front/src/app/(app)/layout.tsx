"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { PollenLogo } from "@/components/PollenLogo";

interface ModuloNav {
  label: string;
  href?: string;
}

// Módulos acessíveis pela equipe do programa (docs/api/mapeamento-geral.md).
const MODULOS_EQUIPE_PROGRAMA: ModuloNav[] = [
  { label: "Empresas", href: "/empresas" },
  { label: "Formulários de inscrição", href: "/formulario-respostas" },
  { label: "Prospecção", href: "/prospeccoes" },
  { label: "Contratos", href: "/contratos" },
  { label: "Documentos", href: "/documentos" },
  { label: "Financeiro", href: "/financeiro-lancamentos" },
  { label: "Planos de afiliação", href: "/planos-afiliacao" },
  { label: "Espaços & reservas", href: "/reservas-espaco" },
  { label: "Comunicações", href: "/comunicacoes-email" },
  { label: "Auditoria", href: "/log-auditoria" },
  { label: "Usuários", href: "/usuarios" },
];

// Contabilidade lança boleto/nota e confirma pagamento em Financeiro (RN-16) — os demais
// itens, incluindo Documentos, são leitura (o back já libera GET sem exigir isolamento por
// empresa pra esse papel; cadastrar/editar/aprovar/rejeitar/excluir documento continua
// bloqueado no back e a tela já esconde essas ações pra quem não pode usá-las).
const MODULOS_CONTABILIDADE: ModuloNav[] = [
  { label: "Financeiro", href: "/financeiro-lancamentos" },
  { label: "Empresas", href: "/empresas" },
  { label: "Documentos", href: "/documentos" },
  { label: "Contratos", href: "/contratos" },
  { label: "Planos de afiliação", href: "/planos-afiliacao" },
];

// Empresa afiliada só enxerga os próprios dados (RN-33, isolamento por empresa_id aplicado
// no back) — nenhum item aqui tem ação de criar/editar/aprovar, são as mesmas telas das
// outras personas com o conteúdo restrito pelo próprio componente de página.
const MODULOS_EMPRESA_AFILIADA: ModuloNav[] = [
  { label: "Minha Empresa", href: "/minha-empresa" },
  { label: "Financeiro", href: "/financeiro-lancamentos" },
  { label: "Meus Contratos", href: "/contratos" },
  { label: "Documentos", href: "/documentos" },
  { label: "Reservas de Espaço", href: "/reservas-espaco" },
  { label: "Benefícios de Exposição", href: "/beneficios-exposicao" },
];

function NavItem({ modulo }: { modulo: ModuloNav }) {
  const pathname = usePathname();

  if (!modulo.href) {
    return (
      <span className="flex cursor-not-allowed items-center justify-between rounded-brand px-3 py-2 text-sm text-neutral-600/60">
        {modulo.label}
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
          em breve
        </span>
      </span>
    );
  }

  const ativo = pathname === modulo.href || pathname.startsWith(`${modulo.href}/`);

  return (
    <Link
      href={modulo.href}
      className={`block rounded-brand border-l-[3px] px-4 py-3 text-base font-medium transition-colors ${
        ativo
          ? "border-secondary bg-secondary-subtle text-secondary-foreground"
          : "border-transparent text-foreground hover:bg-neutral-100"
      }`}
    >
      {modulo.label}
    </Link>
  );
}

const PAPEL_LABEL: Record<string, string> = {
  equipe_programa: "Equipe do programa",
  empresa_afiliada: "Empresa afiliada",
  contabilidade: "Contabilidade",
};

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { usuario, carregando, logout } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    if (!carregando && !usuario) {
      router.replace("/login");
    }
  }, [carregando, usuario, router]);

  // Cada papel só navega dentro do próprio menu — fora dele (ex.: o redirect padrão de
  // login para /empresas, pra quem não é equipe_programa) manda de volta pro primeiro item.
  useEffect(() => {
    if (
      usuario?.papel === "contabilidade" &&
      !MODULOS_CONTABILIDADE.some((modulo) => modulo.href && pathname.startsWith(modulo.href))
    ) {
      router.replace("/financeiro-lancamentos");
    }
    if (
      usuario?.papel === "empresa_afiliada" &&
      !MODULOS_EMPRESA_AFILIADA.some((modulo) => modulo.href && pathname.startsWith(modulo.href))
    ) {
      router.replace("/minha-empresa");
    }
  }, [usuario, pathname, router]);

  if (carregando || !usuario) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-neutral-600">
        Carregando…
      </div>
    );
  }

  // Papel desconhecido (fora dos 3 previstos no model) — placeholder defensivo, não deve
  // acontecer hoje já que equipe_programa/contabilidade/empresa_afiliada têm painel próprio.
  if (
    usuario.papel !== "equipe_programa" &&
    usuario.papel !== "contabilidade" &&
    usuario.papel !== "empresa_afiliada"
  ) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
        <p className="font-display text-lg font-semibold text-foreground">
          Painel ainda não disponível para o seu perfil
        </p>
        <p className="max-w-sm text-sm text-neutral-600">
          Você está logado como <strong>{PAPEL_LABEL[usuario.papel] ?? usuario.papel}</strong>.
          As telas para esse perfil ainda estão sendo construídas.
        </p>
        <button
          type="button"
          onClick={() => {
            logout();
            router.replace("/login");
          }}
          className="mt-4 rounded-full border border-neutral-100 px-4 py-2 text-sm font-medium text-foreground hover:bg-neutral-100"
        >
          Sair
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <header className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 md:hidden">
        <PollenLogo textClassName="text-xl text-foreground" />
        <button
          type="button"
          onClick={() => setMenuAberto((v) => !v)}
          className="rounded-brand border border-neutral-100 px-3 py-1.5 text-sm"
        >
          Menu
        </button>
      </header>

      <aside
        className={`w-full shrink-0 flex-col border-b border-neutral-100 bg-background px-4 py-6 md:flex md:w-72 md:border-b-0 md:border-r md:px-4 ${
          menuAberto ? "flex" : "hidden"
        }`}
      >
        <div className="mb-6 hidden px-2 md:block">
          <PollenLogo textClassName="text-5xl text-foreground" />
        </div>

        <nav className="flex flex-col gap-1.5">
          {(usuario.papel === "contabilidade"
            ? MODULOS_CONTABILIDADE
            : usuario.papel === "empresa_afiliada"
              ? MODULOS_EMPRESA_AFILIADA
              : MODULOS_EQUIPE_PROGRAMA
          ).map((modulo) => (
            <NavItem key={modulo.label} modulo={modulo} />
          ))}
        </nav>

        <div className="mt-8 border-t border-neutral-100 pt-4 md:mt-auto">
          <p className="px-2 text-sm font-medium text-foreground">{usuario.nome}</p>
          <p className="px-2 text-xs text-neutral-600">
            {PAPEL_LABEL[usuario.papel] ?? usuario.papel}
          </p>
          <button
            type="button"
            onClick={() => {
              logout();
              router.replace("/login");
            }}
            className="mt-3 w-full rounded-brand px-2 py-2 text-left text-sm text-neutral-600 hover:bg-neutral-100 hover:text-foreground"
          >
            Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>
  );
}
