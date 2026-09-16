"use client";

import { useState, type FormEvent } from "react";
import { Badge } from "@/components/Badge";
import { PageHeader } from "@/components/PageHeader";
import {
  DangerButton,
  EditButton,
  ErrorText,
  Field,
  Input,
  PrimaryButton,
  Select,
  SecondaryButton,
  TextArea,
} from "@/components/form";
import { apiFetch, ApiError } from "@/lib/api";
import { useApiResource } from "@/lib/useApiResource";

interface StatusProspeccao {
  id: number;
  codigo: string;
  descricao: string | null;
}

interface Prospeccao {
  id: string;
  nome_empresa: string;
  cidade: string | null;
  uf: string | null;
  email_contato: string | null;
  telefone_contato: string | null;
  responsavel_interno: string | null;
  observacoes: string | null;
  status_prospeccao_id: number;
  statusProspeccao: StatusProspeccao | null;
}

const STATUS_ROTULO: Record<string, string> = {
  em_contato: "Em contato",
  nao_constatada: "Não constatada",
  proposta_rejeitada: "Proposta rejeitada",
};

const STATUS_VARIANTE: Record<string, "secondary" | "warning" | "neutral"> = {
  em_contato: "secondary",
  nao_constatada: "warning",
  proposta_rejeitada: "neutral",
};

const CAMPOS_INICIAIS = {
  nome_empresa: "",
  cidade: "",
  uf: "",
  email_contato: "",
  telefone_contato: "",
  responsavel_interno: "",
  observacoes: "",
};

function LinhaProspeccao({
  prospeccao,
  statusDisponiveis,
  token,
  onSalvo,
}: {
  prospeccao: Prospeccao;
  statusDisponiveis: StatusProspeccao[];
  token: string | null;
  onSalvo: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [campos, setCampos] = useState({
    nome_empresa: prospeccao.nome_empresa,
    cidade: prospeccao.cidade ?? "",
    uf: prospeccao.uf ?? "",
    email_contato: prospeccao.email_contato ?? "",
    telefone_contato: prospeccao.telefone_contato ?? "",
    responsavel_interno: prospeccao.responsavel_interno ?? "",
    status_prospeccao_id: String(prospeccao.status_prospeccao_id),
    observacoes: prospeccao.observacoes ?? "",
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
      await apiFetch(`/prospeccoes/${prospeccao.id}`, {
        method: "PATCH",
        token,
        body: { ...campos, status_prospeccao_id: Number(campos.status_prospeccao_id) },
      });
      setEditando(false);
      onSalvo();
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!window.confirm(`Excluir a prospecção de "${prospeccao.nome_empresa}"?`)) return;
    setSalvando(true);
    try {
      await apiFetch(`/prospeccoes/${prospeccao.id}`, { method: "PATCH", token, body: { ativo: false } });
      onSalvo();
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível excluir.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <tr className="border-b border-secondary-subtle-border last:border-0">
        <td className="px-4 py-3 font-medium text-foreground">{prospeccao.nome_empresa}</td>
        <td className="px-4 py-3 text-foreground">
          {prospeccao.cidade ? `${prospeccao.cidade}/${prospeccao.uf ?? "—"}` : "—"}
        </td>
        <td className="px-4 py-3 text-foreground">
          {prospeccao.email_contato || prospeccao.telefone_contato || "—"}
        </td>
        <td className="px-4 py-3 text-foreground">{prospeccao.responsavel_interno || "—"}</td>
        <td className="px-4 py-3">
          {prospeccao.statusProspeccao ? (
            <Badge variante={STATUS_VARIANTE[prospeccao.statusProspeccao.codigo] ?? "neutral"}>
              {STATUS_ROTULO[prospeccao.statusProspeccao.codigo] ?? prospeccao.statusProspeccao.codigo}
            </Badge>
          ) : (
            "—"
          )}
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex justify-end gap-2">
            <EditButton type="button" onClick={() => setEditando((v) => !v)} className="px-3 py-1.5 text-xs">
              {editando ? "Cancelar" : "Editar"}
            </EditButton>
            <DangerButton type="button" onClick={excluir} disabled={salvando}>
              Excluir
            </DangerButton>
          </div>
        </td>
      </tr>
      {editando && (
        <tr className="border-b border-secondary-subtle-border bg-secondary-subtle">
          <td colSpan={6} className="px-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nome da empresa" htmlFor={`nome-${prospeccao.id}`}>
                <Input
                  id={`nome-${prospeccao.id}`}
                  value={campos.nome_empresa}
                  onChange={(e) => atualizarCampo("nome_empresa", e.target.value)}
                />
              </Field>
              <Field label="Responsável interno" htmlFor={`resp-${prospeccao.id}`}>
                <Input
                  id={`resp-${prospeccao.id}`}
                  value={campos.responsavel_interno}
                  onChange={(e) => atualizarCampo("responsavel_interno", e.target.value)}
                />
              </Field>
              <Field label="Cidade" htmlFor={`cidade-${prospeccao.id}`}>
                <Input
                  id={`cidade-${prospeccao.id}`}
                  value={campos.cidade}
                  onChange={(e) => atualizarCampo("cidade", e.target.value)}
                />
              </Field>
              <Field label="UF" htmlFor={`uf-${prospeccao.id}`}>
                <Input
                  id={`uf-${prospeccao.id}`}
                  maxLength={2}
                  value={campos.uf}
                  onChange={(e) => atualizarCampo("uf", e.target.value.toUpperCase())}
                />
              </Field>
              <Field label="E-mail de contato" htmlFor={`email-${prospeccao.id}`}>
                <Input
                  id={`email-${prospeccao.id}`}
                  type="email"
                  value={campos.email_contato}
                  onChange={(e) => atualizarCampo("email_contato", e.target.value)}
                />
              </Field>
              <Field label="Telefone de contato" htmlFor={`tel-${prospeccao.id}`}>
                <Input
                  id={`tel-${prospeccao.id}`}
                  value={campos.telefone_contato}
                  onChange={(e) => atualizarCampo("telefone_contato", e.target.value)}
                />
              </Field>
              <Field label="Status" htmlFor={`status-${prospeccao.id}`}>
                <Select
                  id={`status-${prospeccao.id}`}
                  value={campos.status_prospeccao_id}
                  onChange={(e) => atualizarCampo("status_prospeccao_id", e.target.value)}
                >
                  {statusDisponiveis.map((status) => (
                    <option key={status.id} value={status.id}>
                      {STATUS_ROTULO[status.codigo] ?? status.codigo}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Observações" htmlFor={`obs-${prospeccao.id}`} className="mt-4">
              <TextArea
                id={`obs-${prospeccao.id}`}
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

export default function ProspeccoesPage() {
  const { dados: prospeccoes, erro, recarregar, token } = useApiResource<Prospeccao[]>("/prospeccoes");
  const { dados: statusDisponiveis } = useApiResource<StatusProspeccao[]>("/prospeccoes/status-disponiveis");
  const [formAberto, setFormAberto] = useState(false);
  const [campos, setCampos] = useState(CAMPOS_INICIAIS);
  const [enviando, setEnviando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);

  function atualizarCampo<K extends keyof typeof CAMPOS_INICIAIS>(campo: K, valor: string) {
    setCampos((atual) => ({ ...atual, [campo]: valor }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEnviando(true);
    setErroForm(null);

    try {
      const body = Object.fromEntries(Object.entries(campos).filter(([, valor]) => valor.trim() !== ""));
      await apiFetch("/prospeccoes", { method: "POST", token, body });
      setCampos(CAMPOS_INICIAIS);
      setFormAberto(false);
      recarregar();
    } catch (error) {
      setErroForm(error instanceof ApiError ? error.message : "Não foi possível criar a prospecção.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Prospecção"
        subtitle="Empresas em contato, antes de existir cadastro formal."
        action={
          <SecondaryButton type="button" onClick={() => setFormAberto((v) => !v)}>
            {formAberto ? "Cancelar" : "Nova prospecção"}
          </SecondaryButton>
        }
      />

      {formAberto && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-brand border border-neutral-100 p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nome da empresa" htmlFor="nome_empresa">
              <Input
                id="nome_empresa"
                required
                value={campos.nome_empresa}
                onChange={(e) => atualizarCampo("nome_empresa", e.target.value)}
              />
            </Field>
            <Field label="Responsável interno" htmlFor="responsavel_interno">
              <Input
                id="responsavel_interno"
                value={campos.responsavel_interno}
                onChange={(e) => atualizarCampo("responsavel_interno", e.target.value)}
              />
            </Field>
            <Field label="Cidade" htmlFor="cidade">
              <Input id="cidade" value={campos.cidade} onChange={(e) => atualizarCampo("cidade", e.target.value)} />
            </Field>
            <Field label="UF" htmlFor="uf">
              <Input id="uf" maxLength={2} value={campos.uf} onChange={(e) => atualizarCampo("uf", e.target.value.toUpperCase())} />
            </Field>
            <Field label="E-mail de contato" htmlFor="email_contato">
              <Input
                id="email_contato"
                type="email"
                value={campos.email_contato}
                onChange={(e) => atualizarCampo("email_contato", e.target.value)}
              />
            </Field>
            <Field label="Telefone de contato" htmlFor="telefone_contato">
              <Input
                id="telefone_contato"
                value={campos.telefone_contato}
                onChange={(e) => atualizarCampo("telefone_contato", e.target.value)}
              />
            </Field>
          </div>
          <Field label="Observações" htmlFor="observacoes" className="mt-4">
            <TextArea
              id="observacoes"
              rows={3}
              value={campos.observacoes}
              onChange={(e) => atualizarCampo("observacoes", e.target.value)}
            />
          </Field>

          {erroForm && (
            <div className="mt-4">
              <ErrorText>{erroForm}</ErrorText>
            </div>
          )}

          <PrimaryButton type="submit" disabled={enviando} className="mt-4">
            {enviando ? "Salvando…" : "Criar prospecção"}
          </PrimaryButton>
        </form>
      )}

      {erro && <ErrorText>{erro}</ErrorText>}
      {!prospeccoes && !erro && <p className="text-sm text-neutral-600">Carregando…</p>}
      {prospeccoes && prospeccoes.length === 0 && (
        <p className="text-sm text-neutral-600">Nenhuma prospecção registrada ainda.</p>
      )}

      {prospeccoes && prospeccoes.length > 0 && (
        <div className="overflow-x-auto rounded-brand border border-secondary-subtle-border bg-neutral-100">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-secondary-subtle-border bg-[#66B95D] text-white">
                <th className="px-4 py-3 font-bold">Empresa</th>
                <th className="px-4 py-3 font-bold">Cidade/UF</th>
                <th className="px-4 py-3 font-bold">Contato</th>
                <th className="px-4 py-3 font-bold">Responsável</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 font-bold" />
              </tr>
            </thead>
            <tbody>
              {prospeccoes.map((prospeccao) => (
                <LinhaProspeccao
                  key={prospeccao.id}
                  prospeccao={prospeccao}
                  statusDisponiveis={statusDisponiveis ?? []}
                  token={token}
                  onSalvo={recarregar}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
