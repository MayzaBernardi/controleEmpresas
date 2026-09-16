"use client";

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { HiOutlineRefresh } from "react-icons/hi";
import { Badge } from "@/components/Badge";
import { PageHeader } from "@/components/PageHeader";
import { DangerButton, EditButton, ErrorText, Field, Input, PrimaryButton, Select, SecondaryButton, TextArea } from "@/components/form";
import { formatarData, formatarMoeda } from "@/lib/format";
import { apiFetch, ApiError } from "@/lib/api";
import { useApiResource } from "@/lib/useApiResource";
import { abrirArquivoBase64, lerArquivoComoBase64 } from "@/lib/arquivo";

interface Contrato {
  id: string;
  empresa_id: string;
  numero_termo: string | null;
  data_inicio_vigencia: string;
  data_termino_vigencia: string;
  valor_anuidade: string;
  observacoes: string | null;
  status_contrato_id: number;
  estaVencido: boolean;
  estaProximoVencimento: boolean;
  arquivo_nome: string | null;
  arquivo_mimetype: string | null;
  arquivo_base64: string | null;
}

interface Empresa {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
}

interface PlanoAfiliacao {
  id: number;
  nome: string;
  valor: string;
  ativo: boolean;
}

const CAMPOS_INICIAIS = {
  empresa_id: "",
  plano_id: "",
  valor_anuidade: "",
  data_inicio_vigencia: "",
  data_termino_vigencia: "",
  observacoes: "",
};

function MENSAGEM_RENOVACAO(empresaNome: string, vencido: boolean) {
  if (vencido) {
    return {
      assunto: `Seu contrato está vencido — vamos renovar? — Pollen Parque`,
      corpo: `<p>Olá! Identificamos que o contrato da <strong>${empresaNome}</strong> está vencido. Por gentileza, contate a nossa equipe para renovar e voltar a aproveitar dos benefícios de ser um afiliado Pollen Parque.</p>`,
    };
  }
  return {
    assunto: `Renovação do seu contrato — Pollen Parque`,
    corpo: `<p>Olá! O contrato da <strong>${empresaNome}</strong> encontra-se em período de renovação. Por gentileza, contate a nossa equipe para a renovação do mesmo.</p>`,
  };
}

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

function LinhaContrato({
  contrato,
  nomeEmpresa,
  token,
  onSalvo,
}: {
  contrato: Contrato;
  nomeEmpresa: (id: string) => string;
  token: string | null;
  onSalvo: () => void;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [campos, setCampos] = useState({
    numero_termo: contrato.numero_termo ?? "",
    data_inicio_vigencia: contrato.data_inicio_vigencia,
    data_termino_vigencia: contrato.data_termino_vigencia,
    valor_anuidade: contrato.valor_anuidade,
    observacoes: contrato.observacoes ?? "",
  });
  const [arquivo, setArquivo] = useState<{ nome: string; mimetype: string; base64: string } | null>(null);
  const [erroArquivo, setErroArquivo] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
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
    setSalvando(true);
    setErro(null);
    try {
      const body: Record<string, unknown> = { ...campos, valor_anuidade: Number(campos.valor_anuidade) };
      if (arquivo) {
        body.arquivo_nome = arquivo.nome;
        body.arquivo_mimetype = arquivo.mimetype;
        body.arquivo_base64 = arquivo.base64;
      }
      await apiFetch(`/contratos/${contrato.id}`, { method: "PATCH", token, body });
      setEditando(false);
      setArquivo(null);
      onSalvo();
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!window.confirm(`Excluir este contrato de "${nomeEmpresa(contrato.empresa_id)}"?`)) return;
    setSalvando(true);
    try {
      await apiFetch(`/contratos/${contrato.id}`, { method: "PATCH", token, body: { ativo: false } });
      onSalvo();
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível excluir.");
    } finally {
      setSalvando(false);
    }
  }

  function irParaRenovacao() {
    const { assunto, corpo } = MENSAGEM_RENOVACAO(nomeEmpresa(contrato.empresa_id), contrato.estaVencido);
    const params = new URLSearchParams({
      empresaId: contrato.empresa_id,
      assunto,
      corpo,
    });
    router.push(`/comunicacoes-email?${params.toString()}`);
  }

  return (
    <>
      <tr className="border-b border-secondary-subtle-border last:border-0">
        <td className="px-4 py-3 font-medium text-foreground">{nomeEmpresa(contrato.empresa_id)}</td>
        <td className="px-4 py-3 text-foreground">
          {formatarData(contrato.data_inicio_vigencia)} – {formatarData(contrato.data_termino_vigencia)}
        </td>
        <td className="px-4 py-3 text-foreground">{formatarMoeda(contrato.valor_anuidade)}</td>
        <td className="px-4 py-3">
          {contrato.estaVencido && <Badge variante="danger">Vencido</Badge>}
          {!contrato.estaVencido && contrato.estaProximoVencimento && <Badge variante="warning">Renovação próxima</Badge>}
          {!contrato.estaVencido && !contrato.estaProximoVencimento && <Badge variante="secondary">Em dia</Badge>}
        </td>
        <td className="px-4 py-3">
          {contrato.arquivo_base64 ? (
            <button
              type="button"
              onClick={() => abrirArquivoBase64(contrato.arquivo_base64!, contrato.arquivo_mimetype || "application/pdf")}
              className="text-xs font-medium text-secondary-foreground hover:underline"
            >
              Visualizar
            </button>
          ) : (
            <span className="text-xs text-neutral-600">—</span>
          )}
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex flex-wrap justify-end gap-2">
            {(contrato.estaVencido || contrato.estaProximoVencimento) && (
              <button
                type="button"
                onClick={irParaRenovacao}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#AAD6E1] px-3 py-1.5 text-xs font-medium text-[#0a151f] transition-colors hover:bg-[#8FC1D0]"
              >
                <HiOutlineRefresh className="h-3.5 w-3.5" />
                Renovar
              </button>
            )}
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
              <Field label="Número do termo" htmlFor={`termo-${contrato.id}`}>
                <Input
                  id={`termo-${contrato.id}`}
                  value={campos.numero_termo}
                  onChange={(e) => atualizarCampo("numero_termo", e.target.value)}
                />
              </Field>
              <Field label="Valor da anuidade" htmlFor={`valor-${contrato.id}`}>
                <Input
                  id={`valor-${contrato.id}`}
                  type="number"
                  step="0.01"
                  value={campos.valor_anuidade}
                  onChange={(e) => atualizarCampo("valor_anuidade", e.target.value)}
                />
              </Field>
              <Field label="Início da vigência" htmlFor={`inicio-${contrato.id}`}>
                <Input
                  id={`inicio-${contrato.id}`}
                  type="date"
                  value={campos.data_inicio_vigencia}
                  onChange={(e) => atualizarCampo("data_inicio_vigencia", e.target.value)}
                />
              </Field>
              <Field label="Término da vigência" htmlFor={`fim-${contrato.id}`}>
                <Input
                  id={`fim-${contrato.id}`}
                  type="date"
                  value={campos.data_termino_vigencia}
                  onChange={(e) => atualizarCampo("data_termino_vigencia", e.target.value)}
                />
              </Field>
            </div>
            <Field label="Observações" htmlFor={`obs-${contrato.id}`} className="mt-4">
              <TextArea
                id={`obs-${contrato.id}`}
                rows={3}
                value={campos.observacoes}
                onChange={(e) => atualizarCampo("observacoes", e.target.value)}
              />
            </Field>
            <div className="mt-4">
              <p className="mb-1.5 text-sm font-medium text-foreground">
                {contrato.arquivo_nome ? "Substituir arquivo do contrato" : "Anexar arquivo do contrato"}
              </p>
              <UploadArquivo
                arquivoNome={arquivo?.nome ?? null}
                onSelecionar={selecionarArquivo}
                erro={erroArquivo}
              />
            </div>
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

export default function ContratosPage() {
  const { dados: contratos, erro, recarregar, token } = useApiResource<Contrato[]>("/contratos");
  const { dados: empresas } = useApiResource<Empresa[]>("/empresas");
  const { dados: planos } = useApiResource<PlanoAfiliacao[]>("/planos-afiliacao");

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
    } catch (error) {
      setErroArquivo(error instanceof Error ? error.message : "Não foi possível ler o arquivo.");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEnviando(true);
    setErroForm(null);

    try {
      const body: Record<string, unknown> = {
        empresa_id: campos.empresa_id,
        data_inicio_vigencia: campos.data_inicio_vigencia,
        data_termino_vigencia: campos.data_termino_vigencia,
      };
      if (campos.plano_id) body.plano_id = Number(campos.plano_id);
      if (campos.valor_anuidade) body.valor_anuidade = Number(campos.valor_anuidade);
      if (campos.observacoes) body.observacoes = campos.observacoes;
      if (arquivo) {
        body.arquivo_nome = arquivo.nome;
        body.arquivo_mimetype = arquivo.mimetype;
        body.arquivo_base64 = arquivo.base64;
      }

      await apiFetch("/contratos", { method: "POST", token, body });
      setCampos(CAMPOS_INICIAIS);
      setArquivo(null);
      setFormAberto(false);
      recarregar();
    } catch (error) {
      setErroForm(error instanceof ApiError ? error.message : "Não foi possível gerar o contrato.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Contratos"
        subtitle="Cadastrados manualmente pela equipe, com o arquivo assinado anexado."
        action={
          <SecondaryButton type="button" onClick={() => setFormAberto((v) => !v)}>
            {formAberto ? "Cancelar" : "Cadastrar contrato"}
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
            <Field label="Plano de afiliação (opcional)" htmlFor="plano_id">
              <Select
                id="plano_id"
                value={campos.plano_id}
                onChange={(e) => atualizarCampo("plano_id", e.target.value)}
              >
                <option value="">Sem plano — informar valor manualmente</option>
                {(planos ?? [])
                  .filter((plano) => plano.ativo)
                  .map((plano) => (
                    <option key={plano.id} value={plano.id}>
                      {plano.nome} — {formatarMoeda(plano.valor)}
                    </option>
                  ))}
              </Select>
            </Field>
            <Field label="Valor da anuidade (se sem plano)" htmlFor="valor_anuidade">
              <Input
                id="valor_anuidade"
                type="number"
                step="0.01"
                min="0"
                value={campos.valor_anuidade}
                onChange={(e) => atualizarCampo("valor_anuidade", e.target.value)}
                disabled={!!campos.plano_id}
              />
            </Field>
            <div />
            <Field label="Início da vigência" htmlFor="data_inicio_vigencia">
              <Input
                id="data_inicio_vigencia"
                type="date"
                required
                value={campos.data_inicio_vigencia}
                onChange={(e) => atualizarCampo("data_inicio_vigencia", e.target.value)}
              />
            </Field>
            <Field label="Término da vigência" htmlFor="data_termino_vigencia">
              <Input
                id="data_termino_vigencia"
                type="date"
                required
                value={campos.data_termino_vigencia}
                onChange={(e) => atualizarCampo("data_termino_vigencia", e.target.value)}
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

          <div className="mt-4">
            <p className="mb-1.5 text-sm font-medium text-foreground">Arquivo do contrato (PNG ou PDF)</p>
            <UploadArquivo arquivoNome={arquivo?.nome ?? null} onSelecionar={selecionarArquivo} erro={erroArquivo} />
          </div>

          {erroForm && (
            <div className="mt-4">
              <ErrorText>{erroForm}</ErrorText>
            </div>
          )}

          <PrimaryButton type="submit" disabled={enviando} className="mt-4">
            {enviando ? "Salvando…" : "Cadastrar contrato"}
          </PrimaryButton>
        </form>
      )}

      {erro && <ErrorText>{erro}</ErrorText>}
      {!contratos && !erro && <p className="text-sm text-neutral-600">Carregando…</p>}
      {contratos && contratos.length === 0 && (
        <p className="text-sm text-neutral-600">Nenhum contrato cadastrado ainda.</p>
      )}

      {contratos && contratos.length > 0 && (
        <div className="overflow-x-auto rounded-brand border border-secondary-subtle-border bg-neutral-100">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-secondary-subtle-border bg-[#66B95D] text-white">
                <th className="px-4 py-3 font-bold">Empresa</th>
                <th className="px-4 py-3 font-bold">Vigência</th>
                <th className="px-4 py-3 font-bold">Anuidade</th>
                <th className="px-4 py-3 font-bold">Situação</th>
                <th className="px-4 py-3 font-bold">Arquivo</th>
                <th className="px-4 py-3 font-bold" />
              </tr>
            </thead>
            <tbody>
              {contratos.map((contrato) => (
                <LinhaContrato
                  key={contrato.id}
                  contrato={contrato}
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
