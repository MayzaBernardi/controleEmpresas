"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/Badge";
import { PageHeader } from "@/components/PageHeader";
import { DangerButton, ErrorText, Field, Input, PrimaryButton, SecondaryButton, TextArea } from "@/components/form";
import { formatarData } from "@/lib/format";
import { apiFetch, ApiError } from "@/lib/api";
import { useApiResource } from "@/lib/useApiResource";
import { sugerirCorpoEmail } from "@/lib/sugestaoEmail";

interface ComunicacaoEmail {
  id: number;
  assunto: string;
  corpo_html: string;
  gerado_por_ia: boolean;
  status: "rascunho" | "aprovado" | "enviado" | "falha";
  data_envio: string | null;
  destinatarios: { empresa_id: string }[];
}

interface Empresa {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
}

const STATUS_VARIANTE = {
  rascunho: "warning",
  aprovado: "warning",
  enviado: "secondary",
  falha: "danger",
} as const;

function LinhaComunicacao({
  comunicacao,
  token,
  onSalvo,
}: {
  comunicacao: ComunicacaoEmail;
  token: string | null;
  onSalvo: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [assunto, setAssunto] = useState(comunicacao.assunto);
  const [corpoHtml, setCorpoHtml] = useState(comunicacao.corpo_html);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvarEdicao() {
    setProcessando(true);
    setErro(null);
    try {
      await apiFetch(`/comunicacoes-email/${comunicacao.id}`, {
        method: "PATCH",
        token,
        body: { assunto, corpo_html: corpoHtml },
      });
      setEditando(false);
      onSalvo();
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível salvar.");
    } finally {
      setProcessando(false);
    }
  }

  async function aprovar() {
    setProcessando(true);
    setErro(null);
    try {
      await apiFetch(`/comunicacoes-email/${comunicacao.id}/aprovar`, { method: "POST", token });
      onSalvo();
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível aprovar.");
    } finally {
      setProcessando(false);
    }
  }

  async function enviar() {
    setProcessando(true);
    setErro(null);
    try {
      await apiFetch(`/comunicacoes-email/${comunicacao.id}/enviar`, { method: "POST", token });
      onSalvo();
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível enviar.");
    } finally {
      setProcessando(false);
    }
  }

  async function excluir() {
    if (!window.confirm(`Excluir a comunicação "${comunicacao.assunto}"?`)) return;
    setProcessando(true);
    try {
      await apiFetch(`/comunicacoes-email/${comunicacao.id}`, { method: "PATCH", token, body: { ativo: false } });
      onSalvo();
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível excluir.");
    } finally {
      setProcessando(false);
    }
  }

  return (
    <>
      <tr className="border-b border-neutral-100 last:border-0">
        <td className="px-4 py-3">
          <p className="font-medium text-foreground">{comunicacao.assunto}</p>
          <p className="text-xs text-neutral-600">{comunicacao.destinatarios.length} destinatário(s)</p>
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-col gap-1">
            <Badge variante={STATUS_VARIANTE[comunicacao.status]}>{comunicacao.status}</Badge>
            {comunicacao.gerado_por_ia && <Badge variante="neutral">Rascunho assistido</Badge>}
          </div>
        </td>
        <td className="px-4 py-3 text-neutral-800">{formatarData(comunicacao.data_envio)}</td>
        <td className="px-4 py-3 text-right">
          <div className="flex flex-wrap justify-end gap-2">
            {comunicacao.status === "rascunho" && (
              <>
                <SecondaryButton type="button" onClick={() => setEditando((v) => !v)} className="px-3 py-1.5 text-xs">
                  {editando ? "Cancelar" : "Editar"}
                </SecondaryButton>
                <PrimaryButton type="button" onClick={aprovar} disabled={processando} className="px-3 py-1.5 text-xs">
                  Aprovar
                </PrimaryButton>
              </>
            )}
            {comunicacao.status === "aprovado" && (
              <PrimaryButton type="button" onClick={enviar} disabled={processando} className="px-3 py-1.5 text-xs">
                Enviar
              </PrimaryButton>
            )}
            <DangerButton type="button" onClick={excluir} disabled={processando}>
              Excluir
            </DangerButton>
          </div>
        </td>
      </tr>
      {editando && (
        <tr className="border-b border-neutral-100 bg-neutral-100/30">
          <td colSpan={4} className="px-4 py-4">
            <Field label="Assunto" htmlFor={`assunto-${comunicacao.id}`}>
              <Input id={`assunto-${comunicacao.id}`} value={assunto} onChange={(e) => setAssunto(e.target.value)} />
            </Field>
            <Field label="Corpo (HTML)" htmlFor={`corpo-${comunicacao.id}`} className="mt-3">
              <TextArea
                id={`corpo-${comunicacao.id}`}
                rows={6}
                value={corpoHtml}
                onChange={(e) => setCorpoHtml(e.target.value)}
              />
            </Field>
            {erro && (
              <div className="mt-3">
                <ErrorText>{erro}</ErrorText>
              </div>
            )}
            <PrimaryButton type="button" onClick={salvarEdicao} disabled={processando} className="mt-3">
              {processando ? "Salvando…" : "Salvar edição"}
            </PrimaryButton>
          </td>
        </tr>
      )}
    </>
  );
}

function ComunicacoesConteudo() {
  const searchParams = useSearchParams();
  const { dados: comunicacoes, erro, recarregar, token } = useApiResource<ComunicacaoEmail[]>("/comunicacoes-email");
  const { dados: empresas } = useApiResource<Empresa[]>("/empresas");

  const empresaIdPreenchida = searchParams.get("empresaId");
  const [formAberto, setFormAberto] = useState(Boolean(searchParams.get("assunto")));
  const [assunto, setAssunto] = useState(searchParams.get("assunto") ?? "");
  const [corpoHtml, setCorpoHtml] = useState(searchParams.get("corpo") ?? "");
  const [corpoTocadoManualmente, setCorpoTocadoManualmente] = useState(Boolean(searchParams.get("corpo")));
  const [empresaIds, setEmpresaIds] = useState<string[]>(empresaIdPreenchida ? [empresaIdPreenchida] : []);
  const [destinatariosAbertos, setDestinatariosAbertos] = useState(Boolean(empresaIdPreenchida));
  const [enviando, setEnviando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);

  function alternarDestinatario(id: string) {
    setEmpresaIds((atual) => (atual.includes(id) ? atual.filter((e) => e !== id) : [...atual, id]));
  }

  function handleAssuntoBlur() {
    // Sugere o corpo automaticamente na primeira vez que o título é preenchido — nunca
    // sobrescreve texto que a pessoa já editou manualmente.
    if (assunto.trim() && !corpoTocadoManualmente) {
      setCorpoHtml(sugerirCorpoEmail(assunto));
    }
  }

  function resetarFormulario() {
    setAssunto("");
    setCorpoHtml("");
    setCorpoTocadoManualmente(false);
    setEmpresaIds([]);
    setDestinatariosAbertos(false);
    setFormAberto(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEnviando(true);
    setErroForm(null);
    try {
      await apiFetch("/comunicacoes-email/rascunho", {
        method: "POST",
        token,
        body: { assunto, corpo_html: corpoHtml, empresaIds },
      });
      resetarFormulario();
      recarregar();
    } catch (error) {
      setErroForm(error instanceof ApiError ? error.message : "Não foi possível criar o rascunho.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Comunicações"
        subtitle="Rascunho → aprovação humana → envio. Nenhum e-mail sai sem revisão (RN-28)."
        action={
          <SecondaryButton type="button" onClick={() => setFormAberto((v) => !v)}>
            {formAberto ? "Cancelar" : "Novo rascunho"}
          </SecondaryButton>
        }
      />

      {formAberto && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-brand border border-neutral-100 p-5">
          <Field label="Assunto" htmlFor="assunto">
            <Input
              id="assunto"
              required
              value={assunto}
              onChange={(e) => setAssunto(e.target.value)}
              onBlur={handleAssuntoBlur}
            />
          </Field>
          <Field label="Corpo (HTML)" htmlFor="corpo_html" className="mt-4">
            <TextArea
              id="corpo_html"
              rows={6}
              required
              value={corpoHtml}
              onChange={(e) => {
                setCorpoHtml(e.target.value);
                setCorpoTocadoManualmente(true);
              }}
            />
          </Field>
          <button
            type="button"
            onClick={() => setCorpoHtml(sugerirCorpoEmail(assunto || "assunto do e-mail"))}
            className="mt-1.5 text-xs font-medium text-secondary-foreground hover:underline"
          >
            Sugerir corpo a partir do assunto
          </button>

          <div className="mt-4">
            <SecondaryButton type="button" onClick={() => setDestinatariosAbertos((v) => !v)}>
              {destinatariosAbertos ? "Ocultar destinatários" : "Selecionar destinatários"}
              {empresaIds.length > 0 ? ` (${empresaIds.length})` : ""}
            </SecondaryButton>
            {destinatariosAbertos && (
              <div className="mt-3 max-h-40 overflow-y-auto rounded-brand border border-neutral-100 p-2">
                {(empresas ?? []).map((empresa) => (
                  <label key={empresa.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-neutral-100">
                    <input
                      type="checkbox"
                      checked={empresaIds.includes(empresa.id)}
                      onChange={() => alternarDestinatario(empresa.id)}
                    />
                    {empresa.nome_fantasia || empresa.razao_social}
                  </label>
                ))}
              </div>
            )}
          </div>

          {erroForm && (
            <div className="mt-4">
              <ErrorText>{erroForm}</ErrorText>
            </div>
          )}

          <PrimaryButton type="submit" disabled={enviando} className="mt-4">
            {enviando ? "Salvando…" : "Criar rascunho"}
          </PrimaryButton>
        </form>
      )}

      {erro && <ErrorText>{erro}</ErrorText>}
      {!comunicacoes && !erro && <p className="text-sm text-neutral-600">Carregando…</p>}
      {comunicacoes && comunicacoes.length === 0 && (
        <p className="text-sm text-neutral-600">Nenhuma comunicação registrada ainda.</p>
      )}

      {comunicacoes && comunicacoes.length > 0 && (
        <div className="overflow-x-auto rounded-brand border border-neutral-100">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-100/50 text-neutral-600">
                <th className="px-4 py-3 font-medium">Assunto</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Enviado em</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {comunicacoes.map((comunicacao) => (
                <LinhaComunicacao key={comunicacao.id} comunicacao={comunicacao} token={token} onSalvo={recarregar} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function ComunicacoesEmailPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-600">Carregando…</p>}>
      <ComunicacoesConteudo />
    </Suspense>
  );
}
