"use client";

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { FaArrowAltCircleDown } from "react-icons/fa";
import { GrStatusGood } from "react-icons/gr";
import { Badge } from "@/components/Badge";
import { PageHeader } from "@/components/PageHeader";
import { DangerButton, EditButton, ErrorText, Field, Input, PrimaryButton, Select, SecondaryButton, TextArea } from "@/components/form";
import { apiFetch, ApiError } from "@/lib/api";
import { useApiResource } from "@/lib/useApiResource";
import { abrirArquivoBase64, lerArquivoComoBase64 } from "@/lib/arquivo";

interface Documento {
  id: number;
  empresa_id: string;
  tipo_documento: string;
  nome_arquivo: string;
  url_arquivo: string | null;
  arquivo_mimetype: string | null;
  arquivo_base64: string | null;
  status: "pendente" | "aprovado" | "rejeitado";
  observacoes: string | null;
}

interface Empresa {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
}

const TIPOS_DOCUMENTO = [
  { valor: "estatuto_social", rotulo: "Estatuto social" },
  { valor: "cnpj", rotulo: "CNPJ" },
  { valor: "certidao_negativa", rotulo: "Certidão negativa" },
  { valor: "procuracao", rotulo: "Procuração" },
  { valor: "comprovante_endereco", rotulo: "Comprovante de endereço" },
  { valor: "minuta_contrato", rotulo: "Minuta de contrato" },
  { valor: "outro", rotulo: "Outro" },
];

const STATUS_VARIANTE = {
  pendente: "warning",
  aprovado: "secondary",
  rejeitado: "danger",
} as const;

const CAMPOS_INICIAIS = { empresa_id: "", tipo_documento: "", nome_arquivo: "", url_arquivo: "", observacoes: "" };

function UploadArquivo({
  arquivoNome,
  onSelecionar,
  erro,
}: {
  arquivoNome: string | null;
  onSelecionar: (file: File) => void;
  erro: string | null;
}) {
  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) onSelecionar(file);
  }

  return (
    <div>
      <input type="file" accept=".png,image/png,.pdf,application/pdf" onChange={handleChange} className="text-sm" />
      {arquivoNome && <p className="mt-1 text-xs text-secondary-foreground">Selecionado: {arquivoNome}</p>}
      {erro && <p className="mt-1 text-xs text-danger">{erro}</p>}
    </div>
  );
}

function LinhaDocumento({
  documento,
  nomeEmpresa,
  token,
  onSalvo,
}: {
  documento: Documento;
  nomeEmpresa: (id: string) => string;
  token: string | null;
  onSalvo: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [campos, setCampos] = useState({
    tipo_documento: documento.tipo_documento,
    nome_arquivo: documento.nome_arquivo,
    url_arquivo: documento.url_arquivo ?? "",
    observacoes: documento.observacoes ?? "",
  });
  const [arquivo, setArquivo] = useState<{ nome: string; mimetype: string; base64: string } | null>(null);
  const [erroArquivo, setErroArquivo] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function atualizarCampo<K extends keyof typeof campos>(campo: K, valor: string) {
    setCampos((atual) => ({ ...atual, [campo]: valor }));
  }

  async function selecionarArquivo(file: File) {
    setErroArquivo(null);
    try {
      const lido = await lerArquivoComoBase64(file);
      setArquivo(lido);
    } catch (error) {
      setErroArquivo(error instanceof Error ? error.message : "Não foi possível ler o arquivo.");
    }
  }

  async function salvar() {
    setProcessando(true);
    setErro(null);
    try {
      const body: Record<string, unknown> = { ...campos };
      if (arquivo) {
        body.nome_arquivo = arquivo.nome;
        body.arquivo_mimetype = arquivo.mimetype;
        body.arquivo_base64 = arquivo.base64;
      }
      await apiFetch(`/documentos/${documento.id}`, { method: "PATCH", token, body });
      setEditando(false);
      setArquivo(null);
      onSalvo();
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível salvar.");
    } finally {
      setProcessando(false);
    }
  }

  async function avaliar(status: "aprovado" | "rejeitado") {
    setProcessando(true);
    try {
      await apiFetch(`/documentos/${documento.id}`, { method: "PATCH", token, body: { status } });
      onSalvo();
    } catch {
      // erro pontual — a lista permanece como está
    } finally {
      setProcessando(false);
    }
  }

  async function excluir() {
    if (!window.confirm(`Excluir o documento "${documento.nome_arquivo}"?`)) return;
    setProcessando(true);
    try {
      await apiFetch(`/documentos/${documento.id}`, { method: "PATCH", token, body: { ativo: false } });
      onSalvo();
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível excluir.");
    } finally {
      setProcessando(false);
    }
  }

  const temArquivo = Boolean(documento.arquivo_base64 || documento.url_arquivo);

  return (
    <>
      <tr className="border-b border-secondary-subtle-border last:border-0">
        <td className="px-4 py-3 font-medium text-foreground">{nomeEmpresa(documento.empresa_id)}</td>
        <td className="px-4 py-3 text-foreground">
          {TIPOS_DOCUMENTO.find((t) => t.valor === documento.tipo_documento)?.rotulo ?? documento.tipo_documento}
        </td>
        <td className="px-4 py-3">
          {!temArquivo && <span className="text-neutral-600">{documento.nome_arquivo}</span>}
          {documento.arquivo_base64 && (
            <button
              type="button"
              onClick={() => abrirArquivoBase64(documento.arquivo_base64!, documento.arquivo_mimetype || "application/pdf")}
              className="text-secondary-foreground hover:underline"
            >
              {documento.nome_arquivo}
            </button>
          )}
          {!documento.arquivo_base64 && documento.url_arquivo && (
            <a href={documento.url_arquivo} target="_blank" rel="noreferrer" className="text-secondary-foreground hover:underline">
              {documento.nome_arquivo}
            </a>
          )}
        </td>
        <td className="px-4 py-3">
          <Badge variante={STATUS_VARIANTE[documento.status]}>
            {documento.status.charAt(0).toUpperCase() + documento.status.slice(1)}
          </Badge>
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex flex-wrap justify-end gap-2">
            {documento.status === "pendente" && (
              <>
                <button
                  type="button"
                  onClick={() => avaliar("aprovado")}
                  disabled={processando}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#F58F1B] px-3 py-1.5 text-xs font-medium text-[#0a151f] transition-colors hover:bg-[#d97b0f] disabled:opacity-60"
                >
                  <GrStatusGood className="h-3.5 w-3.5" />
                  Aprovar
                </button>
                <button
                  type="button"
                  onClick={() => avaliar("rejeitado")}
                  disabled={processando}
                  className="inline-flex items-center gap-1.5 rounded-full bg-danger px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-60"
                >
                  <FaArrowAltCircleDown className="h-3.5 w-3.5" />
                  Rejeitar
                </button>
              </>
            )}
            <EditButton type="button" onClick={() => setEditando((v) => !v)} className="px-3 py-1.5 text-xs">
              {editando ? "Cancelar" : "Editar"}
            </EditButton>
            <DangerButton type="button" onClick={excluir} disabled={processando}>
              Excluir
            </DangerButton>
          </div>
        </td>
      </tr>
      {editando && (
        <tr className="border-b border-secondary-subtle-border bg-secondary-subtle">
          <td colSpan={5} className="px-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Tipo de documento" htmlFor={`tipo-${documento.id}`}>
                <Select
                  id={`tipo-${documento.id}`}
                  value={campos.tipo_documento}
                  onChange={(e) => atualizarCampo("tipo_documento", e.target.value)}
                >
                  {TIPOS_DOCUMENTO.map((tipo) => (
                    <option key={tipo.valor} value={tipo.valor}>
                      {tipo.rotulo}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Nome do arquivo" htmlFor={`nome-${documento.id}`}>
                <Input
                  id={`nome-${documento.id}`}
                  value={campos.nome_arquivo}
                  onChange={(e) => atualizarCampo("nome_arquivo", e.target.value)}
                />
              </Field>
              <Field label="URL do arquivo (opcional)" htmlFor={`url-${documento.id}`} className="md:col-span-2">
                <Input
                  id={`url-${documento.id}`}
                  type="url"
                  value={campos.url_arquivo}
                  onChange={(e) => atualizarCampo("url_arquivo", e.target.value)}
                />
              </Field>
            </div>
            <Field label="Observações" htmlFor={`obs-${documento.id}`} className="mt-4">
              <TextArea
                id={`obs-${documento.id}`}
                rows={3}
                value={campos.observacoes}
                onChange={(e) => atualizarCampo("observacoes", e.target.value)}
              />
            </Field>
            <div className="mt-4">
              <p className="mb-1.5 text-sm font-medium text-foreground">Substituir arquivo enviado (PNG ou PDF)</p>
              <UploadArquivo arquivoNome={arquivo?.nome ?? null} onSelecionar={selecionarArquivo} erro={erroArquivo} />
            </div>
            {erro && (
              <div className="mt-3">
                <ErrorText>{erro}</ErrorText>
              </div>
            )}
            <PrimaryButton type="button" onClick={salvar} disabled={processando} className="mt-4">
              {processando ? "Salvando…" : "Salvar alterações"}
            </PrimaryButton>
          </td>
        </tr>
      )}
    </>
  );
}

export default function DocumentosPage() {
  const { dados: documentos, erro, recarregar, token } = useApiResource<Documento[]>("/documentos");
  const { dados: empresas } = useApiResource<Empresa[]>("/empresas");

  const [formAberto, setFormAberto] = useState(false);
  const [campos, setCampos] = useState(CAMPOS_INICIAIS);
  const [arquivo, setArquivo] = useState<{ nome: string; mimetype: string; base64: string } | null>(null);
  const [erroArquivo, setErroArquivo] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);

  const nomeEmpresa = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const empresa of empresas ?? []) {
      mapa.set(empresa.id, empresa.nome_fantasia || empresa.razao_social);
    }
    return (id: string) => mapa.get(id) ?? id;
  }, [empresas]);

  function atualizarCampo<K extends keyof typeof CAMPOS_INICIAIS>(campo: K, valor: string) {
    setCampos((atual) => ({ ...atual, [campo]: valor }));
  }

  async function selecionarArquivo(file: File) {
    setErroArquivo(null);
    try {
      const lido = await lerArquivoComoBase64(file);
      setArquivo(lido);
      if (!campos.nome_arquivo) atualizarCampo("nome_arquivo", lido.nome);
    } catch (error) {
      setErroArquivo(error instanceof Error ? error.message : "Não foi possível ler o arquivo.");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEnviando(true);
    setErroForm(null);
    try {
      await apiFetch("/documentos", {
        method: "POST",
        token,
        body: {
          empresa_id: campos.empresa_id,
          tipo_documento: campos.tipo_documento,
          nome_arquivo: campos.nome_arquivo,
          url_arquivo: campos.url_arquivo || undefined,
          arquivo_mimetype: arquivo?.mimetype,
          arquivo_base64: arquivo?.base64,
          observacoes: campos.observacoes || undefined,
        },
      });
      setCampos(CAMPOS_INICIAIS);
      setArquivo(null);
      setFormAberto(false);
      recarregar();
    } catch (error) {
      setErroForm(error instanceof ApiError ? error.message : "Não foi possível registrar o documento.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Documentos"
        subtitle="Documentos exigidos pelo edital, vinculados às empresas."
        action={
          <SecondaryButton type="button" onClick={() => setFormAberto((v) => !v)}>
            {formAberto ? "Cancelar" : "Registrar documento"}
          </SecondaryButton>
        }
      />

      {formAberto && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-brand border border-neutral-100 p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Empresa" htmlFor="empresa_id">
              <Select
                id="empresa_id"
                required
                value={campos.empresa_id}
                onChange={(e) => atualizarCampo("empresa_id", e.target.value)}
              >
                <option value="">Selecione…</option>
                {(empresas ?? []).map((empresa) => (
                  <option key={empresa.id} value={empresa.id}>
                    {empresa.nome_fantasia || empresa.razao_social}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Tipo de documento" htmlFor="tipo_documento">
              <Select
                id="tipo_documento"
                required
                value={campos.tipo_documento}
                onChange={(e) => atualizarCampo("tipo_documento", e.target.value)}
              >
                <option value="">Selecione…</option>
                {TIPOS_DOCUMENTO.map((tipo) => (
                  <option key={tipo.valor} value={tipo.valor}>
                    {tipo.rotulo}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Nome do arquivo" htmlFor="nome_arquivo">
              <Input
                id="nome_arquivo"
                required
                value={campos.nome_arquivo}
                onChange={(e) => atualizarCampo("nome_arquivo", e.target.value)}
              />
            </Field>
            <Field label="URL do arquivo (opcional, se não for anexar)" htmlFor="url_arquivo">
              <Input
                id="url_arquivo"
                type="url"
                placeholder="https://…"
                value={campos.url_arquivo}
                onChange={(e) => atualizarCampo("url_arquivo", e.target.value)}
              />
            </Field>
          </div>

          <div className="mt-4">
            <p className="mb-1.5 text-sm font-medium text-foreground">Ou anexar o arquivo (PNG ou PDF)</p>
            <UploadArquivo arquivoNome={arquivo?.nome ?? null} onSelecionar={selecionarArquivo} erro={erroArquivo} />
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
            {enviando ? "Salvando…" : "Registrar documento"}
          </PrimaryButton>
        </form>
      )}

      {erro && <ErrorText>{erro}</ErrorText>}
      {!documentos && !erro && <p className="text-sm text-neutral-600">Carregando…</p>}
      {documentos && documentos.length === 0 && (
        <p className="text-sm text-neutral-600">Nenhum documento registrado ainda.</p>
      )}

      {documentos && documentos.length > 0 && (
        <div className="overflow-x-auto rounded-brand border border-secondary-subtle-border bg-neutral-100">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-secondary-subtle-border bg-[#66B95D] text-white">
                <th className="px-4 py-3 font-bold">Empresa</th>
                <th className="px-4 py-3 font-bold">Tipo</th>
                <th className="px-4 py-3 font-bold">Arquivo</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 font-bold" />
              </tr>
            </thead>
            <tbody>
              {documentos.map((documento) => (
                <LinhaDocumento
                  key={documento.id}
                  documento={documento}
                  nomeEmpresa={nomeEmpresa}
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
