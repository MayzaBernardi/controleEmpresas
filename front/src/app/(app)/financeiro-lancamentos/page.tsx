"use client";

import { useMemo, useState, type FormEvent } from "react";
import { GiConfirmed } from "react-icons/gi";
import { MdOutlineWatchLater } from "react-icons/md";
import { TbReportMoneyFilled } from "react-icons/tb";
import { Badge } from "@/components/Badge";
import { useConfirm } from "@/components/ConfirmDialog";
import { PageHeader } from "@/components/PageHeader";
import { ErrorText, Field, Input, PrimaryButton, Select, UploadButton } from "@/components/form";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { abrirArquivoBase64, lerArquivoComoBase64 } from "@/lib/arquivo";
import { formatarData, formatarMoeda } from "@/lib/format";
import { useApiResource } from "@/lib/useApiResource";

interface FinanceiroLancamento {
  id: number;
  empresa_id: string;
  tipo_lancamento: "nota_fiscal" | "boleto";
  valor: string;
  forma_pagamento: string;
  numero_documento: string | null;
  numero_nota_fiscal: string | null;
  data_vencimento: string;
  data_pagamento: string | null;
  estaAtrasado: boolean;
  comprovante_mimetype: string | null;
  comprovante_base64: string | null;
}

interface Empresa {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
}

const CAMPOS_INICIAIS = {
  empresa_id: "",
  tipo_lancamento: "",
  valor: "",
  data_vencimento: "",
  forma_pagamento: "boleto",
  numero_documento: "",
  numero_nota_fiscal: "",
};

function UploadArquivo({
  arquivoNome,
  onSelecionar,
  erro,
}: {
  arquivoNome: string | null;
  onSelecionar: (file: File) => void;
  erro: string | null;
}) {
  return (
    <div>
      <UploadButton onSelecionar={onSelecionar} accept=".png,image/png,.jpg,.jpeg,image/jpeg,.pdf,application/pdf" />
      {arquivoNome && <p className="mt-1 text-xs text-secondary-foreground">Selecionado: {arquivoNome}</p>}
      {erro && <p className="mt-1 text-xs text-danger">{erro}</p>}
    </div>
  );
}

function BotaoConfirmarPagamento({
  lancamento,
  token,
  onConfirmado,
}: {
  lancamento: FinanceiroLancamento;
  token: string | null;
  onConfirmado: () => void;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const pedirConfirmacao = useConfirm();

  async function confirmar() {
    if (
      !(await pedirConfirmacao({
        mensagem: "Confirmar o pagamento deste lançamento com a data de hoje?",
        tone: "default",
        confirmarLabel: "Confirmar pagamento",
      }))
    )
      return;
    setConfirmando(true);
    setErro(null);
    try {
      await apiFetch(`/financeiro-lancamentos/${lancamento.id}/pagamento`, { method: "PATCH", token });
      onConfirmado();
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível confirmar o pagamento.");
    } finally {
      setConfirmando(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={confirmar}
        disabled={confirmando}
        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-on-secondary transition-colors hover:bg-[#15803d] disabled:opacity-60"
      >
        <GiConfirmed className="h-3.5 w-3.5" />
        {confirmando ? "Confirmando…" : "Confirmar pagamento"}
      </button>
      {erro && <p className="text-xs text-danger">{erro}</p>}
    </div>
  );
}

// RN-16: só a contabilidade lança boleto/nota e confirma pagamento (checado no back via
// requireRole) — a equipe do programa continua só visualizando, sem a coluna de ações.
export default function FinanceiroPage() {
  const { usuario } = useAuth();
  const podeLancar = usuario?.papel === "contabilidade";

  const [somenteAtrasados, setSomenteAtrasados] = useState(false);
  const path = somenteAtrasados ? "/financeiro-lancamentos/atrasados" : "/financeiro-lancamentos";
  const { dados: lancamentos, erro, recarregar, token } = useApiResource<FinanceiroLancamento[]>(path);
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEnviando(true);
    setErroForm(null);
    try {
      await apiFetch("/financeiro-lancamentos", {
        method: "POST",
        token,
        body: {
          empresa_id: campos.empresa_id,
          tipo_lancamento: campos.tipo_lancamento,
          valor: Number(campos.valor),
          data_vencimento: campos.data_vencimento,
          forma_pagamento: campos.forma_pagamento,
          numero_documento: campos.numero_documento || null,
          numero_nota_fiscal: campos.numero_nota_fiscal || null,
          comprovante_mimetype: arquivo?.mimetype,
          comprovante_base64: arquivo?.base64,
        },
      });
      setCampos(CAMPOS_INICIAIS);
      setArquivo(null);
      setFormAberto(false);
      recarregar();
    } catch (error) {
      setErroForm(error instanceof ApiError ? error.message : "Não foi possível cadastrar o lançamento.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Financeiro"
        subtitle={
          podeLancar
            ? "Cadastro de boleto/nota fiscal"
            : "Leitura dos lançamentos — cadastrados pela contabilidade."
        }
        action={
          <div className="flex items-center gap-2">
            {podeLancar && (
              <PrimaryButton
                type="button"
                onClick={() => setFormAberto((v) => !v)}
                icon={!formAberto && <TbReportMoneyFilled className="h-4 w-4" />}
                className="text-white!"
              >
                {formAberto ? "Cancelar" : "Cadastrar boleto / nota"}
              </PrimaryButton>
            )}
            <button
              type="button"
              onClick={() => setSomenteAtrasados((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-full bg-danger px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-600"
            >
              <MdOutlineWatchLater className="h-4 w-4" />
              {somenteAtrasados ? "Ver todos" : "Só atrasados"}
            </button>
          </div>
        }
      />

      {podeLancar && formAberto && (
        <form onSubmit={handleSubmit} className="mb-6 grid gap-4 rounded-brand border border-neutral-100 p-5 sm:grid-cols-2">
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

          <Field label="Tipo de lançamento" htmlFor="tipo_lancamento">
            <Select
              id="tipo_lancamento"
              required
              value={campos.tipo_lancamento}
              onChange={(e) => atualizarCampo("tipo_lancamento", e.target.value)}
            >
              <option value="">Selecione…</option>
              <option value="nota_fiscal">Nota Fiscal</option>
              <option value="boleto">Boleto</option>
            </Select>
          </Field>

          <Field label="Forma de pagamento" htmlFor="forma_pagamento">
            <Select
              id="forma_pagamento"
              required
              value={campos.forma_pagamento}
              onChange={(e) => atualizarCampo("forma_pagamento", e.target.value)}
            >
              <option value="boleto">Boleto</option>
              <option value="pix">Pix</option>
              <option value="parcelado">Parcelado</option>
            </Select>
          </Field>

          <Field label="Valor" htmlFor="valor">
            <Input
              id="valor"
              type="number"
              step="0.01"
              min="0"
              required
              value={campos.valor}
              onChange={(e) => atualizarCampo("valor", e.target.value)}
            />
          </Field>

          <Field label="Vencimento" htmlFor="data_vencimento">
            <Input
              id="data_vencimento"
              type="date"
              required
              value={campos.data_vencimento}
              onChange={(e) => atualizarCampo("data_vencimento", e.target.value)}
            />
          </Field>

          <Field label="Número do boleto/documento" htmlFor="numero_documento">
            <Input
              id="numero_documento"
              value={campos.numero_documento}
              onChange={(e) => atualizarCampo("numero_documento", e.target.value)}
            />
          </Field>

          <Field label="Número da nota fiscal" htmlFor="numero_nota_fiscal">
            <Input
              id="numero_nota_fiscal"
              value={campos.numero_nota_fiscal}
              onChange={(e) => atualizarCampo("numero_nota_fiscal", e.target.value)}
            />
          </Field>

          <div className="sm:col-span-2">
            <p className="mb-1.5 text-sm font-medium text-foreground">Arquivo da nota/boleto (opcional)</p>
            <UploadArquivo arquivoNome={arquivo?.nome ?? null} onSelecionar={selecionarArquivo} erro={erroArquivo} />
          </div>

          {erroForm && (
            <div className="sm:col-span-2">
              <ErrorText>{erroForm}</ErrorText>
            </div>
          )}

          <div className="sm:col-span-2">
            <PrimaryButton type="submit" disabled={enviando}>
              {enviando ? "Cadastrando…" : "Cadastrar lançamento"}
            </PrimaryButton>
          </div>
        </form>
      )}

      {erro && <ErrorText>{erro}</ErrorText>}
      {!lancamentos && !erro && <p className="text-sm text-neutral-600">Carregando…</p>}
      {lancamentos && lancamentos.length === 0 && (
        <p className="text-sm text-neutral-600">
          {somenteAtrasados ? "Nenhum lançamento atrasado." : "Nenhum lançamento registrado ainda."}
        </p>
      )}

      {lancamentos && lancamentos.length > 0 && (
        <div className="overflow-x-auto rounded-brand border border-secondary-subtle-border bg-neutral-100">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-secondary-subtle-border bg-[#66B95D] text-white">
                <th className="px-4 py-3 text-left font-bold">Empresa</th>
                <th className="px-4 py-3 text-left font-bold">Tipo</th>
                <th className="px-4 py-3 text-left font-bold">Valor</th>
                <th className="px-4 py-3 text-left font-bold">Vencimento</th>
                <th className="px-4 py-3 text-left font-bold">Forma</th>
                <th className="px-4 py-3 text-left font-bold">Nota/boleto</th>
                <th className="px-4 py-3 text-left font-bold">Situação</th>
                {podeLancar && <th className="px-4 py-3 font-bold text-right">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {lancamentos.map((lancamento) => (
                <tr key={lancamento.id} className="border-b border-secondary-subtle-border last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground">{nomeEmpresa(lancamento.empresa_id)}</td>
                  <td className="px-4 py-3">
                    {lancamento.tipo_lancamento === "nota_fiscal" ? (
                      <Badge variante="secondary">Nota Fiscal</Badge>
                    ) : (
                      <Badge variante="neutral">Boleto</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-foreground">{formatarMoeda(lancamento.valor)}</td>
                  <td className="px-4 py-3 text-foreground">{formatarData(lancamento.data_vencimento)}</td>
                  <td className="px-4 py-3 text-foreground capitalize">{lancamento.forma_pagamento}</td>
                  <td className="px-4 py-3">
                    {lancamento.comprovante_base64 ? (
                      <button
                        type="button"
                        onClick={() =>
                          abrirArquivoBase64(lancamento.comprovante_base64!, lancamento.comprovante_mimetype || "application/pdf")
                        }
                        className="text-secondary-foreground hover:underline"
                      >
                        Ver arquivo
                      </button>
                    ) : (
                      <span className="text-neutral-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {lancamento.data_pagamento ? (
                      <Badge variante="secondary">Pago em {formatarData(lancamento.data_pagamento)}</Badge>
                    ) : lancamento.estaAtrasado ? (
                      <Badge variante="danger">Atrasado</Badge>
                    ) : (
                      <Badge variante="warning">Pendente</Badge>
                    )}
                  </td>
                  {podeLancar && (
                    <td className="px-4 py-3 text-right">
                      {!lancamento.data_pagamento && (
                        <BotaoConfirmarPagamento lancamento={lancamento} token={token} onConfirmado={recarregar} />
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
