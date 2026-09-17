"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/Badge";
import { PageHeader } from "@/components/PageHeader";
import { ErrorText } from "@/components/form";
import { useApiResource } from "@/lib/useApiResource";
import { formatarCnpj } from "@/lib/format";

interface Empresa {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string | null;
  identificador_estrangeiro: string | null;
  tipo_empresa: "nacional" | "internacional";
  tipo_caso_especial: "nenhum" | "grande_porte" | "internacional" | "outro";
  descricao_caso_especial: string | null;
  status_processo: string;
  observacoes: string | null;
  telefone: string | null;
  cidade: string | null;
  uf: string | null;
  representante_legal: string | null;
}

// Mesmos rótulos/cores usados em /empresas (ver RN-06 lá: nomes/transições de
// status_processo ainda não confirmados com o negócio — o que não está no seed cai no
// fallback genérico em vez de quebrar).
const STATUS_INFO: Record<string, { rotulo: string; variante: "secondary" | "warning" | "neutral" }> = {
  inscricao_pendente: { rotulo: "Inscrição pendente", variante: "warning" },
  contrato_elaboracao: { rotulo: "Contrato em elaboração", variante: "warning" },
  aguardando_assinatura: { rotulo: "Aguardando assinatura", variante: "warning" },
  ativa: { rotulo: "Ativa", variante: "secondary" },
  encerrada: { rotulo: "Encerrada", variante: "neutral" },
};

const CASO_ESPECIAL_ROTULOS: Record<string, string> = {
  grande_porte: "Grande porte",
  internacional: "Internacional",
  outro: "Outro",
};

function formatarDocumento(empresa: Empresa) {
  if (empresa.tipo_empresa === "internacional") {
    return empresa.identificador_estrangeiro ?? "—";
  }
  return formatarCnpj(empresa.cnpj);
}

function CampoInfo({ label, valor }: { label: string; valor: ReactNode }) {
  return (
    <div>
      <p className="text-sm font-medium text-neutral-600">{label}</p>
      <p className="mt-1 text-foreground">{valor}</p>
    </div>
  );
}

export default function MinhaEmpresaPage() {
  const { dados: empresa, erro } = useApiResource<Empresa>("/empresas/me");

  const status = empresa ? STATUS_INFO[empresa.status_processo] : undefined;

  return (
    <div>
      <PageHeader title="Minha Empresa" subtitle="Dados cadastrais da sua empresa no Pollen Parque." />

      {erro && <ErrorText>{erro}</ErrorText>}
      {!empresa && !erro && <p className="text-sm text-neutral-600">Carregando…</p>}

      {empresa && (
        <div className="rounded-brand border border-neutral-100 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-100 pb-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold text-foreground">
                  {empresa.nome_fantasia || empresa.razao_social}
                </h2>
                {empresa.tipo_empresa === "internacional" && <Badge variante="neutral">Internacional</Badge>}
              </div>
              {empresa.nome_fantasia && <p className="mt-1 text-sm text-neutral-600">{empresa.razao_social}</p>}
            </div>
            <Badge variante={status?.variante ?? "warning"}>{status?.rotulo ?? empresa.status_processo}</Badge>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <CampoInfo
              label={empresa.tipo_empresa === "internacional" ? "Identificador estrangeiro" : "CNPJ"}
              valor={formatarDocumento(empresa)}
            />
            <CampoInfo label="Cidade/UF" valor={empresa.cidade ? `${empresa.cidade}/${empresa.uf ?? "—"}` : "—"} />
            <CampoInfo label="Telefone" valor={empresa.telefone ?? "—"} />
            <CampoInfo label="Representante legal" valor={empresa.representante_legal ?? "—"} />
            {empresa.tipo_caso_especial !== "nenhum" && (
              <CampoInfo
                label="Caso especial"
                valor={CASO_ESPECIAL_ROTULOS[empresa.tipo_caso_especial] ?? empresa.tipo_caso_especial}
              />
            )}
          </div>

          {empresa.tipo_caso_especial !== "nenhum" && empresa.descricao_caso_especial && (
            <div className="mt-4">
              <CampoInfo label="Descrição do caso especial" valor={empresa.descricao_caso_especial} />
            </div>
          )}

          <div className="mt-4">
            <CampoInfo label="Observações" valor={empresa.observacoes || "—"} />
          </div>
        </div>
      )}
    </div>
  );
}
