"use client";

import { useState, type FormEvent } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ErrorText, Input, SecondaryButton } from "@/components/form";
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
  created_at: string;
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
      <PageHeader title="Auditoria" subtitle="Histórico de alterações registrado pelos services." />

      <form
        onSubmit={handleSubmit}
        className="mb-6 flex flex-wrap items-center gap-3 rounded-brand bg-[#5EB65C] p-2 text-sm [&_input::placeholder]:text-white [&_input::placeholder]:font-bold [&_input]:border-secondary-foreground"
      >
        <div className="min-w-[220px] flex-1">
          <Input
            id="entidade"
            placeholder="Entidade (empresa, contrato…)"
            value={entidade}
            onChange={(e) => setEntidade(e.target.value)}
          />
        </div>
        <div className="w-auto min-w-[200px]">
          <Input
            id="entidade_id"
            placeholder="ID da entidade"
            value={entidadeId}
            onChange={(e) => setEntidadeId(e.target.value)}
          />
        </div>
        <SecondaryButton type="submit">Filtrar</SecondaryButton>
      </form>

      {erro && <ErrorText>{erro}</ErrorText>}
      {!logs && !erro && <p className="text-sm text-neutral-600">Carregando…</p>}
      {logs && logs.length === 0 && <p className="text-sm text-neutral-600">Nenhum registro encontrado.</p>}

      {logs && logs.length > 0 && (
        <div className="overflow-x-auto rounded-brand border border-secondary-subtle-border bg-neutral-100">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-secondary-subtle-border bg-[#66B95D] text-white">
                <th className="px-4 py-3 text-left font-bold">Quando</th>
                <th className="px-4 py-3 text-left font-bold">Entidade</th>
                <th className="px-4 py-3 text-left font-bold">Ação</th>
                <th className="px-4 py-3 text-left font-bold">Usuário</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-secondary-subtle-border last:border-0">
                  <td className="px-4 py-3 text-foreground">{formatarData(log.created_at)}</td>
                  <td className="px-4 py-3 text-foreground">
                    {log.entidade} <span className="text-neutral-600">#{log.entidade_id}</span>
                  </td>
                  <td className="px-4 py-3 text-foreground">{ACAO_ROTULO[log.acao] ?? log.acao}</td>
                  <td className="px-4 py-3 text-foreground">{log.usuario_id ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
