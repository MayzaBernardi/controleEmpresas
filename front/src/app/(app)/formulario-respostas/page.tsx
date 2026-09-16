"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/Badge";
import { PageHeader } from "@/components/PageHeader";
import { ErrorText, SecondaryButton } from "@/components/form";
import { formatarData } from "@/lib/format";
import { useApiResource } from "@/lib/useApiResource";

interface FormularioResposta {
  id: number;
  empresa_id: string | null;
  email_contato: string;
  payload_respostas: Record<string, unknown>;
  status_triagem: string;
  observacoes_triagem: string | null;
  createdAt: string;
}

interface Contrato {
  empresa_id: string;
  estaVencido: boolean;
}

const STATUS_ROTULO: Record<string, string> = {
  aguardando: "Aguardando preenchimento",
  finalizado: "Finalizado",
};

function nomeDaEmpresa(formulario: FormularioResposta) {
  const valor = formulario.payload_respostas?.razao_social;
  return typeof valor === "string" && valor ? valor : "—";
}

export default function FormularioRespostasPage() {
  const { dados: formulariosTodos, erro } = useApiResource<FormularioResposta[]>("/formulario-respostas");
  const { dados: contratos } = useApiResource<Contrato[]>("/contratos");
  const [linkCopiado, setLinkCopiado] = useState(false);

  // Uma vez que a empresa vinculada tem contrato ativo (vigente, não vencido), o formulário
  // sai daqui — a empresa passa a aparecer na listagem de Empresas normalmente.
  const empresasComContratoAtivo = useMemo(() => {
    const set = new Set<string>();
    for (const contrato of contratos ?? []) {
      if (!contrato.estaVencido) set.add(contrato.empresa_id);
    }
    return set;
  }, [contratos]);

  const formularios = useMemo(() => {
    if (!formulariosTodos) return null;
    return formulariosTodos.filter(
      (formulario) => !formulario.empresa_id || !empresasComContratoAtivo.has(formulario.empresa_id)
    );
  }, [formulariosTodos, empresasComContratoAtivo]);

  async function copiarLink() {
    const link = `${window.location.origin}/inscricao`;
    try {
      await navigator.clipboard.writeText(link);
      setLinkCopiado(true);
      setTimeout(() => setLinkCopiado(false), 2500);
    } catch {
      window.prompt("Copie o link abaixo:", link);
    }
  }

  return (
    <div>
      <PageHeader
        title="Formulários de inscrição"
        subtitle="Submissões do formulário público de afiliação, para triagem (RF-01)."
        action={
          <div className="flex items-center gap-2">
            {formularios && (
              <Badge variante="neutral">
                {formularios.length} {formularios.length === 1 ? "submissão" : "submissões"}
              </Badge>
            )}
            <SecondaryButton type="button" onClick={copiarLink}>
              {linkCopiado ? "Link copiado!" : "Copiar link do formulário"}
            </SecondaryButton>
          </div>
        }
      />

      {erro && <ErrorText>{erro}</ErrorText>}
      {!formularios && !erro && <p className="text-sm text-neutral-600">Carregando…</p>}
      {formularios && formularios.length === 0 && (
        <p className="text-sm text-neutral-600">Nenhuma submissão pendente no momento.</p>
      )}

      {formularios && formularios.length > 0 && (
        <div className="overflow-x-auto rounded-brand border border-neutral-100">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-100/50 text-neutral-600">
                <th className="px-4 py-3 font-medium">Empresa</th>
                <th className="px-4 py-3 font-medium">E-mail de contato</th>
                <th className="px-4 py-3 font-medium">Recebido em</th>
                <th className="px-4 py-3 font-medium">Triagem</th>
              </tr>
            </thead>
            <tbody>
              {formularios.map((formulario) => (
                <tr key={formulario.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/formulario-respostas/${formulario.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {nomeDaEmpresa(formulario)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-neutral-800">{formulario.email_contato}</td>
                  <td className="px-4 py-3 text-neutral-800">{formatarData(formulario.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Badge variante={formulario.status_triagem === "aguardando" ? "warning" : "secondary"}>
                      {STATUS_ROTULO[formulario.status_triagem] ?? formulario.status_triagem}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
