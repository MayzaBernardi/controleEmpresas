"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/Badge";
import { PageHeader } from "@/components/PageHeader";
import { ErrorText, SecondaryButton } from "@/components/form";
import { formatarData, formatarMoeda } from "@/lib/format";
import { useApiResource } from "@/lib/useApiResource";

interface FinanceiroLancamento {
  id: number;
  empresa_id: string;
  valor: string;
  forma_pagamento: string;
  data_vencimento: string;
  data_pagamento: string | null;
  estaAtrasado: boolean;
}

interface Empresa {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
}

// RN-16: equipe do programa só visualiza — lançar e confirmar pagamento é exclusivo da
// contabilidade (checado no back via requireRole). Por isso esta tela não tem ações de escrita.
export default function FinanceiroPage() {
  const [somenteAtrasados, setSomenteAtrasados] = useState(false);
  const path = somenteAtrasados ? "/financeiro-lancamentos/atrasados" : "/financeiro-lancamentos";
  const { dados: lancamentos, erro } = useApiResource<FinanceiroLancamento[]>(path);
  const { dados: empresas } = useApiResource<Empresa[]>("/empresas");

  const nomeEmpresa = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const empresa of empresas ?? []) {
      mapa.set(empresa.id, empresa.nome_fantasia || empresa.razao_social);
    }
    return (id: string) => mapa.get(id) ?? id;
  }, [empresas]);

  return (
    <div>
      <PageHeader
        title="Financeiro"
        subtitle="Leitura dos lançamentos — NF, boleto e confirmação de pagamento são feitos pela contabilidade (RN-16)."
        action={
          <SecondaryButton type="button" onClick={() => setSomenteAtrasados((v) => !v)}>
            {somenteAtrasados ? "Ver todos" : "Só atrasados"}
          </SecondaryButton>
        }
      />

      {erro && <ErrorText>{erro}</ErrorText>}
      {!lancamentos && !erro && <p className="text-sm text-neutral-600">Carregando…</p>}
      {lancamentos && lancamentos.length === 0 && (
        <p className="text-sm text-neutral-600">
          {somenteAtrasados ? "Nenhum lançamento atrasado." : "Nenhum lançamento registrado ainda."}
        </p>
      )}

      {lancamentos && lancamentos.length > 0 && (
        <div className="overflow-x-auto rounded-brand border border-neutral-100">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-100/50 text-neutral-600">
                <th className="px-4 py-3 font-medium">Empresa</th>
                <th className="px-4 py-3 font-medium">Valor</th>
                <th className="px-4 py-3 font-medium">Vencimento</th>
                <th className="px-4 py-3 font-medium">Forma</th>
                <th className="px-4 py-3 font-medium">Situação</th>
              </tr>
            </thead>
            <tbody>
              {lancamentos.map((lancamento) => (
                <tr key={lancamento.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground">{nomeEmpresa(lancamento.empresa_id)}</td>
                  <td className="px-4 py-3 text-neutral-800">{formatarMoeda(lancamento.valor)}</td>
                  <td className="px-4 py-3 text-neutral-800">{formatarData(lancamento.data_vencimento)}</td>
                  <td className="px-4 py-3 text-neutral-800 capitalize">{lancamento.forma_pagamento}</td>
                  <td className="px-4 py-3">
                    {lancamento.data_pagamento ? (
                      <Badge variante="secondary">Pago em {formatarData(lancamento.data_pagamento)}</Badge>
                    ) : lancamento.estaAtrasado ? (
                      <Badge variante="danger">Atrasado</Badge>
                    ) : (
                      <Badge variante="warning">Pendente</Badge>
                    )}
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
