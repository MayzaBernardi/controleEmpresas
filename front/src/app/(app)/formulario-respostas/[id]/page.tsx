"use client";

import { use, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import { formatarData } from "@/lib/format";
import { useApiResource } from "@/lib/useApiResource";
import { PageHeader } from "@/components/PageHeader";
import { ErrorText, Field, Input, PrimaryButton, Select, TextArea } from "@/components/form";

interface FormularioResposta {
  id: number;
  empresa_id: string | null;
  email_contato: string;
  payload_respostas: Record<string, unknown>;
  status_triagem: string;
  observacoes_triagem: string | null;
  createdAt: string;
}

function valorPayload(payload: Record<string, unknown> | undefined, chave: string): string {
  const valor = payload?.[chave];
  return typeof valor === "string" ? valor : "";
}

// Mesmos campos aceitos por POST /formulario-respostas/:id/criar-empresa que o modal de
// "Detalhes" da listagem (formulario-respostas/page.tsx) — repetido aqui em vez de
// compartilhado porque quem já está na tela de triagem detalhada não devia precisar voltar
// pra lista só pra achar o botão.
function FormularioCriarEmpresa({
  formulario,
  token,
  onCriado,
}: {
  formulario: FormularioResposta;
  token: string | null;
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
  const [sucesso, setSucesso] = useState(false);

  function atualizarCampo<K extends keyof typeof campos>(campo: K, valor: string) {
    setCampos((atual) => ({ ...atual, [campo]: valor }));
  }

  async function criarEmpresa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSalvando(true);
    setErro(null);
    setSucesso(false);
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
      setSucesso(true);
      onCriado();
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível criar a empresa.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={criarEmpresa}>
      <div className="grid gap-4 md:grid-cols-2">
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
          <Field label="Identificador estrangeiro" htmlFor="nova-empresa-identificador_estrangeiro">
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
      {sucesso && !erro && (
        <p className="mt-4 rounded-brand bg-secondary-subtle px-4 py-2.5 text-sm text-secondary-foreground">
          Empresa criada e vinculada a esta inscrição.
        </p>
      )}

      <PrimaryButton type="submit" disabled={salvando} className="mt-4">
        {salvando ? "Criando…" : "Criar nova empresa"}
      </PrimaryButton>
    </form>
  );
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

          <div className="rounded-brand border border-neutral-100 p-5 md:col-span-2">
            <h2 className="font-display text-base font-semibold text-foreground">Cadastro de empresa</h2>
            {formulario.empresa_id ? (
              <p className="mt-3 text-sm text-neutral-600">
                Esta inscrição já está vinculada a uma empresa.{" "}
                <Link href="/empresas" className="text-secondary-foreground hover:underline">
                  Ver empresas
                </Link>
              </p>
            ) : (
              <div className="mt-4">
                <FormularioCriarEmpresa formulario={formulario} token={token} onCriado={recarregar} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
