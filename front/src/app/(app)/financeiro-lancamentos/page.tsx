"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Badge } from "@/components/Badge";
import { PageHeader } from "@/components/PageHeader";
import { ErrorText, Field, Input, PrimaryButton, Select, SecondaryButton } from "@/components/form";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatarData, formatarMoeda } from "@/lib/format";
import { useApiResource } from "@/lib/useApiResource";

interface FinanceiroLancamento {
  id: number;
  empresa_id: string;
  valor: string;
  forma_pagamento: string;
  numero_documento: string | null;
  numero_nota_fiscal: string | null;
  data_vencimento: string;
  data_pagamento: string | null;
  estaAtrasado: boolean;
}

interface Empresa {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
}

const CAMPOS_INICIAIS = {
  empresa_id: "",
  valor: "",
  data_vencimento: "",
  forma_pagamento: "boleto",
  numero_documento: "",
  numero_nota_fiscal: "",
};

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

  async function confirmar() {
    if (!window.confirm("Confirmar o pagamento deste lançamento com a data de hoje?")) return;
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
      <SecondaryButton type="button" onClick={confirmar} disabled={confirmando} className="px-3 py-1.5 text-xs">
        {confirmando ? "Confirmando…" : "Confirmar pagamento"}
      </SecondaryButton>
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
          valor: Number(campos.valor),
          data_vencimento: campos.data_vencimento,
          forma_pagamento: campos.forma_pagamento,
          numero_documento: campos.numero_documento || null,
          numero_nota_fiscal: campos.numero_nota_fiscal || null,
        },
      });
      setCampos(CAMPOS_INICIAIS);
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
            ? "Cadastro de boleto/nota fiscal e confirmação de pagamento (RN-16)."
            : "Leitura dos lançamentos — NF, boleto e confirmação de pagamento são feitos pela contabilidade."
        }
        action={
          <div className="flex items-center gap-2">
            {podeLancar && (
              <PrimaryButton type="button" onClick={() => setFormAberto((v) => !v)}>
                {formAberto ? "Cancelar" : "Cadastrar boleto / nota"}
              </PrimaryButton>
            )}
            <SecondaryButton type="button" onClick={() => setSomenteAtrasados((v) => !v)}>
              {somenteAtrasados ? "Ver todos" : "Só atrasados"}
            </SecondaryButton>
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
                <th className="px-4 py-3 font-bold">Empresa</th>
                <th className="px-4 py-3 font-bold">Valor</th>
                <th className="px-4 py-3 font-bold">Vencimento</th>
                <th className="px-4 py-3 font-bold">Forma</th>
                <th className="px-4 py-3 font-bold">Situação</th>
                {podeLancar && <th className="px-4 py-3 font-bold text-right">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {lancamentos.map((lancamento) => (
                <tr key={lancamento.id} className="border-b border-secondary-subtle-border last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground">{nomeEmpresa(lancamento.empresa_id)}</td>
                  <td className="px-4 py-3 text-foreground">{formatarMoeda(lancamento.valor)}</td>
                  <td className="px-4 py-3 text-foreground">{formatarData(lancamento.data_vencimento)}</td>
                  <td className="px-4 py-3 text-foreground capitalize">{lancamento.forma_pagamento}</td>
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
