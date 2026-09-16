"use client";

import { use, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import { formatarData } from "@/lib/format";
import { useApiResource } from "@/lib/useApiResource";
import { PageHeader } from "@/components/PageHeader";
import { ErrorText, Field, PrimaryButton, Select, TextArea } from "@/components/form";

interface FormularioResposta {
  id: number;
  empresa_id: string | null;
  email_contato: string;
  payload_respostas: Record<string, unknown>;
  status_triagem: string;
  observacoes_triagem: string | null;
  createdAt: string;
}

export default function FormularioRespostaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { dados: formulario, erro, recarregar, token } = useApiResource<FormularioResposta>(
    `/formulario-respostas/${id}`
  );

  const [statusTriagem, setStatusTriagem] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    if (formulario) {
      // Sincroniza o form local só quando os dados chegam do fetch assíncrono — não dá
      // pra usar valor inicial do useState porque `formulario` ainda não existe no 1º render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatusTriagem(formulario.status_triagem);
      setObservacoes(formulario.observacoes_triagem ?? "");
    }
  }, [formulario]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSalvando(true);
    setErroSalvar(null);
    setSucesso(false);

    try {
      await apiFetch(`/formulario-respostas/${id}/triagem`, {
        method: "PATCH",
        token,
        body: { status_triagem: statusTriagem, observacoes_triagem: observacoes },
      });
      setSucesso(true);
      recarregar();
    } catch (error) {
      setErroSalvar(error instanceof ApiError ? error.message : "Não foi possível salvar a triagem.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div>
      <Link href="/formulario-respostas" className="text-sm text-neutral-600 hover:underline">
        ← Formulários de inscrição
      </Link>
      <PageHeader title="Triagem de inscrição" subtitle={formulario ? `Recebido em ${formatarData(formulario.createdAt)}` : undefined} />

      {erro && <ErrorText>{erro}</ErrorText>}
      {!formulario && !erro && <p className="text-sm text-neutral-600">Carregando…</p>}

      {formulario && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-brand border border-neutral-100 p-5">
            <h2 className="font-display text-base font-semibold text-foreground">Respostas do formulário</h2>
            <dl className="mt-3 space-y-2 text-sm">
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
          </div>

          <form onSubmit={handleSubmit} className="rounded-brand border border-neutral-100 p-5">
            <h2 className="font-display text-base font-semibold text-foreground">Triagem</h2>

            <Field label="Status da triagem" htmlFor="status_triagem" className="mt-4">
              <Select
                id="status_triagem"
                value={statusTriagem}
                onChange={(e) => setStatusTriagem(e.target.value)}
                required
              >
                <option value="aguardando">Enviado</option>
                <option value="finalizado">Preenchimento finalizado</option>
              </Select>
            </Field>

            <Field label="Observações" htmlFor="observacoes_triagem" className="mt-4">
              <TextArea
                id="observacoes_triagem"
                rows={5}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
              />
            </Field>

            {erroSalvar && (
              <div className="mt-4">
                <ErrorText>{erroSalvar}</ErrorText>
              </div>
            )}
            {sucesso && !erroSalvar && (
              <p className="mt-4 rounded-brand bg-secondary-subtle px-4 py-2.5 text-sm text-secondary-foreground">
                Triagem salva.
              </p>
            )}

            <PrimaryButton type="submit" disabled={salvando} className="mt-4">
              {salvando ? "Salvando…" : "Salvar triagem"}
            </PrimaryButton>
          </form>
        </div>
      )}
    </div>
  );
}
