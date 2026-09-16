"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Badge } from "@/components/Badge";
import { PageHeader } from "@/components/PageHeader";
import { ErrorText, Field, Input, PrimaryButton, Select, SecondaryButton, TextArea } from "@/components/form";
import { formatarData } from "@/lib/format";
import { apiFetch, ApiError } from "@/lib/api";
import { useApiResource } from "@/lib/useApiResource";

interface ReservaEspaco {
  id: number;
  empresa_id: string;
  tipo_espaco: "sala_atico" | "auditorio" | "coworking";
  data_reserva: string | null;
  status: "pre_reservado" | "confirmado" | "realizado" | "cancelado";
  observacoes: string | null;
}

interface EspacoFisico {
  id: number;
  empresa_id: string;
  identificador_sala: string;
  bloco: string | null;
  metragem_quadrada: string | null;
  ativo: boolean;
}

interface Empresa {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
}

const TIPOS_ESPACO = [
  { valor: "sala_atico", rotulo: "Sala ático (1x/ano)" },
  { valor: "auditorio", rotulo: "Auditório (1x/ano)" },
  { valor: "coworking", rotulo: "Coworking (12x/ano)" },
];

const STATUS_OPCOES = ["pre_reservado", "confirmado", "realizado", "cancelado"] as const;

const STATUS_VARIANTE: Record<string, "secondary" | "warning" | "danger" | "neutral"> = {
  pre_reservado: "warning",
  confirmado: "secondary",
  realizado: "secondary",
  cancelado: "neutral",
};

const CAMPOS_INICIAIS = { empresa_id: "", tipo_espaco: "", data_reserva: "", observacoes: "" };

function LinhaReserva({
  reserva,
  nomeEmpresa,
  token,
  onSalvo,
}: {
  reserva: ReservaEspaco;
  nomeEmpresa: (id: string) => string;
  token: string | null;
  onSalvo: () => void;
}) {
  const [salvando, setSalvando] = useState(false);

  async function mudarStatus(novoStatus: string) {
    setSalvando(true);
    try {
      await apiFetch(`/reservas-espaco/${reserva.id}`, { method: "PATCH", token, body: { status: novoStatus } });
      onSalvo();
    } catch {
      // erro pontual — mantém a linha como está
    } finally {
      setSalvando(false);
    }
  }

  return (
    <tr className="border-b border-secondary-subtle-border last:border-0">
      <td className="px-4 py-3 font-medium text-foreground">{nomeEmpresa(reserva.empresa_id)}</td>
      <td className="px-4 py-3 text-foreground">
        {TIPOS_ESPACO.find((t) => t.valor === reserva.tipo_espaco)?.rotulo ?? reserva.tipo_espaco}
      </td>
      <td className="px-4 py-3 text-foreground">{formatarData(reserva.data_reserva)}</td>
      <td className="px-4 py-3">
        <Badge variante={STATUS_VARIANTE[reserva.status]}>{reserva.status.replace(/_/g, " ")}</Badge>
      </td>
      <td className="px-4 py-3 text-right">
        <Select
          value={reserva.status}
          disabled={salvando}
          onChange={(e) => mudarStatus(e.target.value)}
          className="w-auto text-xs"
        >
          {STATUS_OPCOES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </Select>
      </td>
    </tr>
  );
}

export default function ReservasEspacoPage() {
  const { dados: reservas, erro, recarregar, token } = useApiResource<ReservaEspaco[]>("/reservas-espaco");
  const { dados: espacos } = useApiResource<EspacoFisico[]>("/espacos-fisicos");
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

  function atualizarCampo<K extends keyof typeof CAMPOS_INICIAIS>(campo: K, valor: string) {
    setCampos((atual) => ({ ...atual, [campo]: valor }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEnviando(true);
    setErroForm(null);
    try {
      await apiFetch("/reservas-espaco", {
        method: "POST",
        token,
        body: {
          empresa_id: campos.empresa_id,
          tipo_espaco: campos.tipo_espaco,
          data_reserva: campos.data_reserva || undefined,
          observacoes: campos.observacoes || undefined,
        },
      });
      setCampos(CAMPOS_INICIAIS);
      setFormAberto(false);
      recarregar();
    } catch (error) {
      setErroForm(error instanceof ApiError ? error.message : "Não foi possível criar a reserva.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Espaços & reservas"
        subtitle="Reservas de espaço compartilhado, com limite anual por tipo de espaço."
        action={
          <SecondaryButton type="button" onClick={() => setFormAberto((v) => !v)}>
            {formAberto ? "Cancelar" : "Nova reserva"}
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
            <Field label="Tipo de espaço" htmlFor="tipo_espaco">
              <Select
                id="tipo_espaco"
                required
                value={campos.tipo_espaco}
                onChange={(e) => atualizarCampo("tipo_espaco", e.target.value)}
              >
                <option value="">Selecione…</option>
                {TIPOS_ESPACO.map((tipo) => (
                  <option key={tipo.valor} value={tipo.valor}>
                    {tipo.rotulo}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Data da reserva (opcional)" htmlFor="data_reserva">
              <Input
                id="data_reserva"
                type="date"
                value={campos.data_reserva}
                onChange={(e) => atualizarCampo("data_reserva", e.target.value)}
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
            {enviando ? "Salvando…" : "Criar reserva"}
          </PrimaryButton>
        </form>
      )}

      {erro && <ErrorText>{erro}</ErrorText>}
      {!reservas && !erro && <p className="text-sm text-neutral-600">Carregando…</p>}
      {reservas && reservas.length === 0 && <p className="text-sm text-neutral-600">Nenhuma reserva ainda.</p>}

      {reservas && reservas.length > 0 && (
        <div className="overflow-x-auto rounded-brand border border-secondary-subtle-border bg-neutral-100">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-secondary-subtle-border bg-[#66B95D] text-white">
                <th className="px-4 py-3 font-bold">Empresa</th>
                <th className="px-4 py-3 font-bold">Tipo</th>
                <th className="px-4 py-3 font-bold">Data</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 font-bold">Mudar status</th>
              </tr>
            </thead>
            <tbody>
              {reservas.map((reserva) => (
                <LinhaReserva
                  key={reserva.id}
                  reserva={reserva}
                  nomeEmpresa={nomeEmpresa}
                  token={token}
                  onSalvo={recarregar}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mt-10 mb-3 font-display text-lg font-semibold text-foreground">
        Espaços físicos (conceito legado)
      </h2>
      {espacos && espacos.length > 0 && (
        <div className="overflow-x-auto rounded-brand border border-secondary-subtle-border bg-neutral-100">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-secondary-subtle-border bg-[#66B95D] text-white">
                <th className="px-4 py-3 font-bold">Empresa</th>
                <th className="px-4 py-3 font-bold">Sala</th>
                <th className="px-4 py-3 font-bold">Bloco</th>
                <th className="px-4 py-3 font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {espacos.map((espaco) => (
                <tr key={espaco.id} className="border-b border-secondary-subtle-border last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground">{nomeEmpresa(espaco.empresa_id)}</td>
                  <td className="px-4 py-3 text-foreground">{espaco.identificador_sala}</td>
                  <td className="px-4 py-3 text-foreground">{espaco.bloco ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variante={espaco.ativo ? "secondary" : "neutral"}>
                      {espaco.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {espacos && espacos.length === 0 && (
        <p className="text-sm text-neutral-600">Nenhum espaço físico legado cadastrado.</p>
      )}
    </div>
  );
}
