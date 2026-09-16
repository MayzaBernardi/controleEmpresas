"use client";

import { useState, type FormEvent } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ErrorText, Field, Input, SecondaryButton } from "@/components/form";
import { formatarData } from "@/lib/format";
import { useApiResource } from "@/lib/useApiResource";

interface LogAuditoria {
  id: number;
  entidade: string;
  entidade_id: string;
  acao: "create" | "update" | "delete";
  usuario_id: number | null;
  dados_anteriores: Record<string, unknown> | null;
  dados_novos: Record<string, unknown> | null;
  createdAt: string;
}

const ACAO_ROTULO: Record<string, string> = { create: "Criação", update: "Atualização", delete: "Remoção" };

export default function LogAuditoriaPage() {
  const [entidade, setEntidade] = useState("");
  const [entidadeId, setEntidadeId] = useState("");
  const [filtro, setFiltro] = useState({ entidade: "", entidadeId: "" });

  const params = new URLSearchParams();
  if (filtro.entidade) params.set("entidade", filtro.entidade);
  if (filtro.entidadeId) params.set("entidade_id", filtro.entidadeId);
  const query = params.toString();

  const { dados: logs, erro } = useApiResource<LogAuditoria[]>(`/log-auditoria${query ? `?${query}` : ""}`);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFiltro({ entidade, entidadeId });
  }

  return (
    <div>
      <PageHeader title="Auditoria" subtitle="Histórico de alterações registrado pelos services (RN-25, leitura)." />

      <form onSubmit={handleSubmit} className="mb-6 flex flex-wrap items-end gap-3">
        <Field label="Entidade" htmlFor="entidade">
          <Input id="entidade" placeholder="Empresa, Contrato…" value={entidade} onChange={(e) => setEntidade(e.target.value)} />
        </Field>
        <Field label="ID da entidade" htmlFor="entidade_id">
          <Input id="entidade_id" value={entidadeId} onChange={(e) => setEntidadeId(e.target.value)} />
        </Field>
        <SecondaryButton type="submit">Filtrar</SecondaryButton>
      </form>

      {erro && <ErrorText>{erro}</ErrorText>}
      {!logs && !erro && <p className="text-sm text-neutral-600">Carregando…</p>}
      {logs && logs.length === 0 && <p className="text-sm text-neutral-600">Nenhum registro encontrado.</p>}

      {logs && logs.length > 0 && (
        <div className="overflow-x-auto rounded-brand border border-neutral-100">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-100/50 text-neutral-600">
                <th className="px-4 py-3 font-medium">Quando</th>
                <th className="px-4 py-3 font-medium">Entidade</th>
                <th className="px-4 py-3 font-medium">Ação</th>
                <th className="px-4 py-3 font-medium">Usuário</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-3 text-neutral-800">{formatarData(log.createdAt)}</td>
                  <td className="px-4 py-3 text-foreground">
                    {log.entidade} <span className="text-neutral-600">#{log.entidade_id}</span>
                  </td>
                  <td className="px-4 py-3 text-neutral-800">{ACAO_ROTULO[log.acao] ?? log.acao}</td>
                  <td className="px-4 py-3 text-neutral-800">{log.usuario_id ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
