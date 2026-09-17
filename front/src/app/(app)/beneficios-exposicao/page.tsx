"use client";

import { Badge } from "@/components/Badge";
import { PageHeader } from "@/components/PageHeader";
import { ErrorText } from "@/components/form";
import { useAuth } from "@/lib/auth";
import { useApiResource } from "@/lib/useApiResource";

interface BeneficioExposicao {
  empresa_id: string;
  telao_ativo: boolean;
  marca_site_ativo: boolean;
  observacoes: string | null;
  atualizado_em: string | null;
}

function ItemBeneficio({ titulo, ativo }: { titulo: string; ativo: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="text-sm font-medium text-foreground">{titulo}</span>
      <Badge variante={ativo ? "secondary" : "neutral"}>{ativo ? "Ativo" : "Inativo"}</Badge>
    </div>
  );
}

export default function BeneficiosExposicaoPage() {
  const { usuario } = useAuth();
  const { dados, erro } = useApiResource<BeneficioExposicao>(
    usuario?.empresaId ? `/empresas/${usuario.empresaId}/beneficios-exposicao` : null
  );

  return (
    <div>
      <PageHeader
        title="Benefícios de Exposição"
        subtitle="Exposição da marca da empresa nos espaços institucionais do Pollen Parque."
      />

      {erro && <ErrorText>{erro}</ErrorText>}
      {!dados && !erro && <p className="text-sm text-neutral-600">Carregando…</p>}

      {dados && (
        <div className="rounded-brand border border-neutral-100 p-5">
          <div className="divide-y divide-neutral-100">
            <ItemBeneficio titulo="Telão da recepção" ativo={dados.telao_ativo} />
            <ItemBeneficio titulo="Marca no site institucional" ativo={dados.marca_site_ativo} />
          </div>

          {dados.observacoes && (
            <div className="mt-4 border-t border-neutral-100 pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-600">Observações</p>
              <p className="mt-1 text-sm text-foreground">{dados.observacoes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
