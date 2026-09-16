"use client";

import { useState } from "react";
import { Badge } from "@/components/Badge";
import { PageHeader } from "@/components/PageHeader";
import { useApiResource } from "@/lib/useApiResource";
import { DangerButton, ErrorText, Field, Input, PrimaryButton, SecondaryButton, TextArea } from "@/components/form";
import { apiFetch, ApiError } from "@/lib/api";
import { formatarCnpj } from "@/lib/format";

interface Empresa {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string | null;
  identificador_estrangeiro: string | null;
  tipo_empresa: "nacional" | "internacional";
  status_processo: string;
  cidade: string | null;
  uf: string | null;
  telefone: string | null;
  representante_legal: string | null;
  observacoes: string | null;
}

// RN-06 ⚠️: nomes/transições de status_processo ainda não confirmados com o negócio — só
// os valores conhecidos do seed (back/src/seeders) têm rótulo/cor; o resto cai no formatador
// genérico em vez de quebrar.
const STATUS_INFO: Record<string, { rotulo: string; variante: "secondary" | "warning" | "neutral" }> = {
  inscricao_pendente: { rotulo: "Inscrição pendente", variante: "warning" },
  contrato_elaboracao: { rotulo: "Contrato em elaboração", variante: "warning" },
  aguardando_assinatura: { rotulo: "Aguardando assinatura", variante: "warning" },
  ativa: { rotulo: "Ativa", variante: "secondary" },
  encerrada: { rotulo: "Encerrada", variante: "neutral" },
};

function formatarDocumento(empresa: Empresa) {
  if (empresa.tipo_empresa === "internacional") {
    return empresa.identificador_estrangeiro ?? "—";
  }
  return formatarCnpj(empresa.cnpj);
}

function LinhaEmpresa({
  empresa,
  token,
  onSalvo,
}: {
  empresa: Empresa;
  token: string | null;
  onSalvo: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [campos, setCampos] = useState({
    razao_social: empresa.razao_social,
    nome_fantasia: empresa.nome_fantasia ?? "",
    cidade: empresa.cidade ?? "",
    uf: empresa.uf ?? "",
    telefone: empresa.telefone ?? "",
    representante_legal: empresa.representante_legal ?? "",
    observacoes: empresa.observacoes ?? "",
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function atualizarCampo<K extends keyof typeof campos>(campo: K, valor: string) {
    setCampos((atual) => ({ ...atual, [campo]: valor }));
  }

  async function salvar() {
    setSalvando(true);
    setErro(null);
    try {
      await apiFetch(`/empresas/${empresa.id}`, { method: "PATCH", token, body: campos });
      setEditando(false);
      onSalvo();
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!window.confirm(`Excluir "${empresa.razao_social}"? Ela sai das listagens, mas o histórico é mantido.`)) {
      return;
    }
    setSalvando(true);
    try {
      await apiFetch(`/empresas/${empresa.id}`, { method: "PATCH", token, body: { ativo: false } });
      onSalvo();
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível excluir.");
    } finally {
      setSalvando(false);
    }
  }

  const status = STATUS_INFO[empresa.status_processo];

  return (
    <>
      <tr className="border-b border-neutral-100 last:border-0">
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <p className="font-medium text-foreground">{empresa.nome_fantasia || empresa.razao_social}</p>
            {empresa.tipo_empresa === "internacional" && <Badge variante="neutral">Internacional</Badge>}
          </div>
          {empresa.nome_fantasia && <p className="text-xs text-neutral-600">{empresa.razao_social}</p>}
        </td>
        <td className="px-4 py-3 text-neutral-800">{formatarDocumento(empresa)}</td>
        <td className="px-4 py-3 text-neutral-800">
          {empresa.cidade ? `${empresa.cidade}/${empresa.uf ?? "—"}` : "—"}
        </td>
        <td className="px-4 py-3">
          <Badge variante={status?.variante ?? "warning"}>{status?.rotulo ?? empresa.status_processo}</Badge>
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex justify-end gap-2">
            <SecondaryButton
              type="button"
              onClick={() => setEditando((v) => !v)}
              className="px-3 py-1.5 text-xs"
            >
              {editando ? "Cancelar" : "Editar"}
            </SecondaryButton>
            <DangerButton type="button" onClick={excluir} disabled={salvando}>
              Excluir
            </DangerButton>
          </div>
        </td>
      </tr>
      {editando && (
        <tr className="border-b border-neutral-100 bg-neutral-100/30">
          <td colSpan={5} className="px-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Razão social" htmlFor={`razao-${empresa.id}`}>
                <Input
                  id={`razao-${empresa.id}`}
                  value={campos.razao_social}
                  onChange={(e) => atualizarCampo("razao_social", e.target.value)}
                />
              </Field>
              <Field label="Nome fantasia" htmlFor={`fantasia-${empresa.id}`}>
                <Input
                  id={`fantasia-${empresa.id}`}
                  value={campos.nome_fantasia}
                  onChange={(e) => atualizarCampo("nome_fantasia", e.target.value)}
                />
              </Field>
              <Field label="Cidade" htmlFor={`cidade-${empresa.id}`}>
                <Input
                  id={`cidade-${empresa.id}`}
                  value={campos.cidade}
                  onChange={(e) => atualizarCampo("cidade", e.target.value)}
                />
              </Field>
              <Field label="UF" htmlFor={`uf-${empresa.id}`}>
                <Input
                  id={`uf-${empresa.id}`}
                  maxLength={2}
                  value={campos.uf}
                  onChange={(e) => atualizarCampo("uf", e.target.value.toUpperCase())}
                />
              </Field>
              <Field label="Telefone" htmlFor={`telefone-${empresa.id}`}>
                <Input
                  id={`telefone-${empresa.id}`}
                  value={campos.telefone}
                  onChange={(e) => atualizarCampo("telefone", e.target.value)}
                />
              </Field>
              <Field label="Representante legal" htmlFor={`repr-${empresa.id}`}>
                <Input
                  id={`repr-${empresa.id}`}
                  value={campos.representante_legal}
                  onChange={(e) => atualizarCampo("representante_legal", e.target.value)}
                />
              </Field>
            </div>
            <Field label="Observações" htmlFor={`obs-${empresa.id}`} className="mt-4">
              <TextArea
                id={`obs-${empresa.id}`}
                rows={3}
                value={campos.observacoes}
                onChange={(e) => atualizarCampo("observacoes", e.target.value)}
              />
            </Field>
            {erro && (
              <div className="mt-3">
                <ErrorText>{erro}</ErrorText>
              </div>
            )}
            <PrimaryButton type="button" onClick={salvar} disabled={salvando} className="mt-4">
              {salvando ? "Salvando…" : "Salvar alterações"}
            </PrimaryButton>
          </td>
        </tr>
      )}
    </>
  );
}

export default function EmpresasPage() {
  const { dados: empresas, erro, recarregar, token } = useApiResource<Empresa[]>("/empresas");

  return (
    <div>
      <PageHeader
        title="Empresas"
        subtitle="Empresas afiliadas cadastradas no Pollen Parque."
        action={
          empresas && (
            <Badge variante="neutral">
              {empresas.length} {empresas.length === 1 ? "empresa" : "empresas"}
            </Badge>
          )
        }
      />

      {erro && <ErrorText>{erro}</ErrorText>}
      {!empresas && !erro && <p className="text-sm text-neutral-600">Carregando empresas…</p>}
      {empresas && empresas.length === 0 && (
        <p className="text-sm text-neutral-600">Nenhuma empresa cadastrada ainda.</p>
      )}

      {empresas && empresas.length > 0 && (
        <div className="overflow-x-auto rounded-brand border border-neutral-100">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-100/50 text-neutral-600">
                <th className="px-4 py-3 font-medium">Empresa</th>
                <th className="px-4 py-3 font-medium">CNPJ / Identificador</th>
                <th className="px-4 py-3 font-medium">Cidade/UF</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {empresas.map((empresa) => (
                <LinhaEmpresa key={empresa.id} empresa={empresa} token={token} onSalvo={recarregar} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
