"use client";

import { useState } from "react";
import { Badge } from "@/components/Badge";
import { PageHeader } from "@/components/PageHeader";
import { EditButton, ErrorText, Input, PrimaryButton, SecondaryButton } from "@/components/form";
import { apiFetch, ApiError } from "@/lib/api";
import { formatarMoeda } from "@/lib/format";
import { useApiResource } from "@/lib/useApiResource";

interface PlanoAfiliacao {
  id: number;
  nome: string;
  valor: string;
  ativo: boolean;
}

function LinhaPlano({ plano, token, onSalvo }: { plano: PlanoAfiliacao; token: string | null; onSalvo: () => void }) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(plano.valor);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    setSalvando(true);
    setErro(null);
    try {
      await apiFetch(`/planos-afiliacao/${plano.id}`, { method: "PATCH", token, body: { valor: Number(valor) } });
      setEditando(false);
      onSalvo();
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  async function alternarAtivo() {
    setSalvando(true);
    setErro(null);
    try {
      await apiFetch(`/planos-afiliacao/${plano.id}`, { method: "PATCH", token, body: { ativo: !plano.ativo } });
      onSalvo();
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <tr className="border-b border-secondary-subtle-border last:border-0 align-top">
      <td className="px-4 py-3 font-medium text-foreground">{plano.nome}</td>
      <td className="px-4 py-3 text-foreground">
        {editando ? (
          <Input
            type="number"
            step="0.01"
            min="0"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="max-w-[140px]"
          />
        ) : (
          formatarMoeda(plano.valor)
        )}
        {erro && <p className="mt-1 text-xs text-danger">{erro}</p>}
      </td>
      <td className="px-4 py-3">
        <button type="button" onClick={alternarAtivo} disabled={salvando}>
          <Badge variante={plano.ativo ? "secondary" : "neutral"}>{plano.ativo ? "Ativo" : "Inativo"}</Badge>
        </button>
      </td>
      <td className="px-4 py-3 text-right">
        {editando ? (
          <div className="flex justify-end gap-2">
            <SecondaryButton type="button" onClick={() => setEditando(false)} className="px-3 py-1.5 text-xs">
              Cancelar
            </SecondaryButton>
            <PrimaryButton type="button" onClick={salvar} disabled={salvando} className="px-3 py-1.5 text-xs">
              {salvando ? "Salvando…" : "Salvar"}
            </PrimaryButton>
          </div>
        ) : (
          <EditButton type="button" onClick={() => setEditando(true)} className="px-3 py-1.5 text-xs">
            Editar valor
          </EditButton>
        )}
      </td>
    </tr>
  );
}

export default function PlanosAfiliacaoPage() {
  const { dados: planos, erro, recarregar, token } = useApiResource<PlanoAfiliacao[]>("/planos-afiliacao");

  return (
    <div>
      <PageHeader title="Planos de afiliação" subtitle="Catálogo de planos usados na geração de contratos." />

      {erro && <ErrorText>{erro}</ErrorText>}
      {!planos && !erro && <p className="text-sm text-neutral-600">Carregando…</p>}
      {planos && planos.length === 0 && <p className="text-sm text-neutral-600">Nenhum plano cadastrado.</p>}

      {planos && planos.length > 0 && (
        <div className="overflow-x-auto rounded-brand border border-secondary-subtle-border bg-neutral-100">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-secondary-subtle-border bg-[#66B95D] text-white">
                <th className="px-4 py-3 font-bold">Plano</th>
                <th className="px-4 py-3 font-bold">Valor</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 font-bold" />
              </tr>
            </thead>
            <tbody>
              {planos.map((plano) => (
                <LinhaPlano key={plano.id} plano={plano} token={token} onSalvo={recarregar} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
