"use client";

import { useState } from "react";
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

const STATUS_ROTULO: Record<string, string> = {
  aguardando: "Enviado",
  finalizado: "Preenchimento finalizado",
};

function nomeDaEmpresa(formulario: FormularioResposta) {
  const valor = formulario.payload_respostas?.razao_social;
  return typeof valor === "string" && valor ? valor : "—";
}

export default function FormularioRespostasPage() {
  // RN-42: o back já remove da resposta os formulários cuja empresa (por CNPJ) tem
  // contrato vigente dentro da data de validade — não precisa refiltrar aqui.
  const { dados: formularios, erro } = useApiResource<FormularioResposta[]>("/formulario-respostas");
  const [linkCopiado, setLinkCopiado] = useState(false);

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
        subtitle="Submissões do formulário público de afiliação, para triagem."
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
        <div className="overflow-x-auto rounded-brand border border-secondary-subtle-border bg-neutral-100">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-secondary-subtle-border bg-[#66B95D] text-white">
                <th className="px-4 py-3 font-bold">Empresa</th>
                <th className="px-4 py-3 font-bold">E-mail de contato</th>
                <th className="px-4 py-3 font-bold">Recebido em</th>
                <th className="px-4 py-3 font-bold">Triagem</th>
              </tr>
            </thead>
            <tbody>
              {formularios.map((formulario) => (
                <tr key={formulario.id} className="border-b border-secondary-subtle-border last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/formulario-respostas/${formulario.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {nomeDaEmpresa(formulario)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-foreground">{formulario.email_contato}</td>
                  <td className="px-4 py-3 text-foreground">{formatarData(formulario.createdAt)}</td>
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
