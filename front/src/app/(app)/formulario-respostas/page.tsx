"use client";

import { useState } from "react";
import Link from "next/link";
import { CgDetailsMore } from "react-icons/cg";
import { Badge } from "@/components/Badge";
import { PageHeader } from "@/components/PageHeader";
import { ErrorText, Field, Input, PrimaryButton, SecondaryButton, Select } from "@/components/form";
import { apiFetch, ApiError } from "@/lib/api";
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

function valorPayload(payload: Record<string, unknown> | undefined, chave: string): string {
  const valor = payload?.[chave];
  return typeof valor === "string" ? valor : "";
}

// Campos aceitos por POST /formulario-respostas/:id/criar-empresa — pré-preenchidos a partir
// do payload_respostas quando existirem, editáveis antes de confirmar a criação da empresa.
function ModalDetalhesFormulario({
  formulario,
  token,
  onFechar,
  onCriado,
}: {
  formulario: FormularioResposta;
  token: string | null;
  onFechar: () => void;
  onCriado: () => void;
}) {
  const [campos, setCampos] = useState(() => ({
    razao_social: valorPayload(formulario.payload_respostas, "razao_social"),
    nome_fantasia: valorPayload(formulario.payload_respostas, "nome_fantasia"),
    tipo_empresa: "nacional" as "nacional" | "internacional",
    cnpj: "",
    identificador_estrangeiro: "",
    telefone: valorPayload(formulario.payload_respostas, "telefone"),
    cidade: valorPayload(formulario.payload_respostas, "cidade"),
    uf: valorPayload(formulario.payload_respostas, "uf"),
  }));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function atualizarCampo<K extends keyof typeof campos>(campo: K, valor: string) {
    setCampos((atual) => ({ ...atual, [campo]: valor }));
  }

  async function criarEmpresa() {
    setSalvando(true);
    setErro(null);
    try {
      await apiFetch(`/formulario-respostas/${formulario.id}/criar-empresa`, {
        method: "POST",
        token,
        body: {
          razao_social: campos.razao_social,
          nome_fantasia: campos.nome_fantasia || undefined,
          tipo_empresa: campos.tipo_empresa,
          cnpj: campos.tipo_empresa === "nacional" ? campos.cnpj : undefined,
          identificador_estrangeiro:
            campos.tipo_empresa === "internacional" ? campos.identificador_estrangeiro : undefined,
          telefone: campos.telefone || undefined,
          cidade: campos.cidade || undefined,
          uf: campos.uf || undefined,
        },
      });
      onCriado();
      onFechar();
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível criar a empresa.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onFechar}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(evento) => evento.stopPropagation()}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-brand border border-neutral-100 bg-neutral-100 p-6 shadow-lg shadow-black/40"
      >
        <p className="text-center font-display text-lg font-semibold text-foreground">Detalhes da submissão</p>
        <p className="mt-1 text-center text-sm text-neutral-800">
          Respostas enviadas pelo formulário público de inscrição.
        </p>

        <dl className="mt-4 space-y-2 text-sm">
          <div>
            <dt className="text-neutral-600">E-mail de contato</dt>
            <dd className="text-foreground">{formulario.email_contato}</dd>
          </div>
          {Object.entries(formulario.payload_respostas ?? {}).map(([chave, valor]) => (
            <div key={chave}>
              <dt className="text-neutral-600">{chave}</dt>
              <dd className="text-foreground">{String(valor)}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 border-t border-neutral-100 pt-4">
          {formulario.empresa_id ? (
            <p className="text-center text-sm font-medium text-secondary-foreground">
              Já vinculado a uma empresa.
            </p>
          ) : (
            <>
              <p className="text-center font-display text-base font-semibold text-foreground">
                Criar empresa a partir desta inscrição
              </p>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Razão social" htmlFor="nova-empresa-razao_social">
                  <Input
                    id="nova-empresa-razao_social"
                    required
                    value={campos.razao_social}
                    onChange={(e) => atualizarCampo("razao_social", e.target.value)}
                  />
                </Field>
                <Field label="Nome fantasia" htmlFor="nova-empresa-nome_fantasia">
                  <Input
                    id="nova-empresa-nome_fantasia"
                    value={campos.nome_fantasia}
                    onChange={(e) => atualizarCampo("nome_fantasia", e.target.value)}
                  />
                </Field>
                <Field label="Tipo" htmlFor="nova-empresa-tipo_empresa">
                  <Select
                    id="nova-empresa-tipo_empresa"
                    value={campos.tipo_empresa}
                    onChange={(e) => atualizarCampo("tipo_empresa", e.target.value)}
                  >
                    <option value="nacional">Nacional</option>
                    <option value="internacional">Internacional</option>
                  </Select>
                </Field>
                {campos.tipo_empresa === "nacional" ? (
                  <Field label="CNPJ" htmlFor="nova-empresa-cnpj">
                    <Input
                      id="nova-empresa-cnpj"
                      required
                      value={campos.cnpj}
                      onChange={(e) => atualizarCampo("cnpj", e.target.value)}
                    />
                  </Field>
                ) : (
                  <Field
                    label="Identificador estrangeiro"
                    htmlFor="nova-empresa-identificador_estrangeiro"
                  >
                    <Input
                      id="nova-empresa-identificador_estrangeiro"
                      required
                      value={campos.identificador_estrangeiro}
                      onChange={(e) => atualizarCampo("identificador_estrangeiro", e.target.value)}
                    />
                  </Field>
                )}
                <Field label="Telefone" htmlFor="nova-empresa-telefone">
                  <Input
                    id="nova-empresa-telefone"
                    value={campos.telefone}
                    onChange={(e) => atualizarCampo("telefone", e.target.value)}
                  />
                </Field>
                <Field label="Cidade" htmlFor="nova-empresa-cidade">
                  <Input
                    id="nova-empresa-cidade"
                    value={campos.cidade}
                    onChange={(e) => atualizarCampo("cidade", e.target.value)}
                  />
                </Field>
                <Field label="UF" htmlFor="nova-empresa-uf">
                  <Input
                    id="nova-empresa-uf"
                    maxLength={2}
                    value={campos.uf}
                    onChange={(e) => atualizarCampo("uf", e.target.value.toUpperCase())}
                  />
                </Field>
              </div>

              {erro && (
                <div className="mt-4">
                  <ErrorText>{erro}</ErrorText>
                </div>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onFechar}
                  disabled={salvando}
                  className="rounded-full border border-neutral-100 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background disabled:opacity-60"
                >
                  Cancelar
                </button>
                <PrimaryButton type="button" onClick={criarEmpresa} disabled={salvando}>
                  {salvando ? "Criando…" : "Criar nova empresa"}
                </PrimaryButton>
              </div>
            </>
          )}
        </div>

        {formulario.empresa_id && (
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onFechar}
              className="rounded-full border border-neutral-100 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background"
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function FormularioRespostasPage() {
  // RN-42: o back já remove da resposta os formulários cuja empresa (por CNPJ) tem
  // contrato vigente dentro da data de validade — não precisa refiltrar aqui.
  const { dados: formularios, erro, recarregar, token } = useApiResource<FormularioResposta[]>(
    "/formulario-respostas"
  );
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [formularioDetalhe, setFormularioDetalhe] = useState<FormularioResposta | null>(null);

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
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-secondary-subtle-border bg-[#66B95D] text-white">
                <th className="px-4 py-3 text-left font-bold">Empresa</th>
                <th className="px-4 py-3 text-left font-bold">E-mail de contato</th>
                <th className="px-4 py-3 text-left font-bold">Recebido em</th>
                <th className="px-4 py-3 text-left font-bold">Triagem</th>
                <th className="px-4 py-3 font-bold text-right">Ações</th>
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
                  <td className="px-4 py-3 text-right">
                    <SecondaryButton
                      type="button"
                      onClick={() => setFormularioDetalhe(formulario)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
                    >
                      <CgDetailsMore className="h-3.5 w-3.5" />
                      Detalhes
                    </SecondaryButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formularioDetalhe && (
        <ModalDetalhesFormulario
          formulario={formularioDetalhe}
          token={token}
          onFechar={() => setFormularioDetalhe(null)}
          onCriado={recarregar}
        />
      )}
    </div>
  );
}
