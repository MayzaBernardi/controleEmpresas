"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Badge } from "@/components/Badge";
import { useConfirm } from "@/components/ConfirmDialog";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { usePaginacao } from "@/lib/usePaginacao";
import { useApiResource } from "@/lib/useApiResource";
import {
  DangerButton,
  EditButton,
  ErrorText,
  Field,
  Input,
  PrimaryButton,
  SearchInput,
  SecondaryButton,
  Select,
  TextArea,
} from "@/components/form";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatarCnpj } from "@/lib/format";

interface Empresa {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string | null;
  identificador_estrangeiro: string | null;
  tipo_empresa: "nacional" | "internacional";
  status_processo: string;
  cidade: string | null;
  uf: string | null;
  telefone: string | null;
  endereco_logradouro: string | null;
  endereco_numero: string | null;
  endereco_complemento: string | null;
  endereco_bairro: string | null;
  representante_legal: string | null;
  representante_legal_cpf: string | null;
  representante_legal_email: string | null;
  observacoes: string | null;
}

// RN-06: status_processo tem só estes 3 valores. Empresa nasce em contrato_elaboracao,
// vira ativa automaticamente quando um contrato dela é emitido (RN-46, back cuida sozinho),
// e encerrada é calculado pelo back em tempo de leitura (não é editável manualmente aqui).
const STATUS_INFO: Record<string, { rotulo: string; variante: "secondary" | "warning" | "neutral" }> = {
  contrato_elaboracao: { rotulo: "Contrato em elaboração", variante: "warning" },
  ativa: { rotulo: "Ativa", variante: "secondary" },
  encerrada: { rotulo: "Encerrada", variante: "neutral" },
};

const CAMPOS_INICIAIS = {
  razao_social: "",
  nome_fantasia: "",
  tipo_empresa: "nacional" as "nacional" | "internacional",
  cnpj: "",
  identificador_estrangeiro: "",
  cidade: "",
  uf: "",
  telefone: "",
  endereco_logradouro: "",
  endereco_numero: "",
  endereco_complemento: "",
  endereco_bairro: "",
  representante_legal: "",
  representante_legal_cpf: "",
  representante_legal_email: "",
  observacoes: "",
};

function formatarDocumento(empresa: Empresa) {
  if (empresa.tipo_empresa === "internacional") {
    return empresa.identificador_estrangeiro ?? "—";
  }
  return formatarCnpj(empresa.cnpj);
}

function LinhaEmpresa({
  empresa,
  token,
  onSalvo,
  podeEditar,
}: {
  empresa: Empresa;
  token: string | null;
  onSalvo: () => void;
  podeEditar: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [campos, setCampos] = useState({
    razao_social: empresa.razao_social,
    nome_fantasia: empresa.nome_fantasia ?? "",
    cidade: empresa.cidade ?? "",
    uf: empresa.uf ?? "",
    telefone: empresa.telefone ?? "",
    endereco_logradouro: empresa.endereco_logradouro ?? "",
    endereco_numero: empresa.endereco_numero ?? "",
    endereco_complemento: empresa.endereco_complemento ?? "",
    endereco_bairro: empresa.endereco_bairro ?? "",
    representante_legal: empresa.representante_legal ?? "",
    representante_legal_cpf: empresa.representante_legal_cpf ?? "",
    representante_legal_email: empresa.representante_legal_email ?? "",
    observacoes: empresa.observacoes ?? "",
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const pedirConfirmacao = useConfirm();

  function atualizarCampo<K extends keyof typeof campos>(campo: K, valor: string) {
    setCampos((atual) => ({ ...atual, [campo]: valor }));
  }

  async function salvar() {
    setSalvando(true);
    setErro(null);
    try {
      await apiFetch(`/empresas/${empresa.id}`, { method: "PATCH", token, body: campos });
      setEditando(false);
      onSalvo();
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (
      !(await pedirConfirmacao({
        mensagem: `Excluir "${empresa.razao_social}"? Ela sai das listagens, mas o histórico é mantido.`,
        tone: "danger",
        confirmarLabel: "Excluir",
      }))
    ) {
      return;
    }
    setSalvando(true);
    try {
      await apiFetch(`/empresas/${empresa.id}`, { method: "PATCH", token, body: { ativo: false } });
      onSalvo();
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível excluir.");
    } finally {
      setSalvando(false);
    }
  }

  const status = STATUS_INFO[empresa.status_processo];

  return (
    <>
      <tr className="border-b border-secondary-subtle-border last:border-0">
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <p className="font-medium text-foreground">{empresa.nome_fantasia || empresa.razao_social}</p>
            {empresa.tipo_empresa === "internacional" && <Badge variante="neutral">Internacional</Badge>}
          </div>
          {empresa.nome_fantasia && <p className="text-xs text-neutral-600">{empresa.razao_social}</p>}
        </td>
        <td className="px-4 py-3 text-foreground">{formatarDocumento(empresa)}</td>
        <td className="px-4 py-3 text-foreground">
          {empresa.cidade ? `${empresa.cidade}/${empresa.uf ?? "—"}` : "—"}
        </td>
        <td className="px-4 py-3">
          <Badge variante={status?.variante ?? "warning"}>{status?.rotulo ?? empresa.status_processo}</Badge>
        </td>
        <td className="px-4 py-3 text-right">
          {podeEditar && (
            <div className="flex justify-end gap-2">
              <EditButton type="button" onClick={() => setEditando((v) => !v)}>
                {editando ? "Cancelar" : "Editar"}
              </EditButton>
              <DangerButton type="button" onClick={excluir} disabled={salvando}>
                Excluir
              </DangerButton>
            </div>
          )}
        </td>
      </tr>
      {podeEditar && editando && (
        <tr className="border-b border-secondary-subtle-border bg-secondary-subtle">
          <td colSpan={5} className="px-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Razão social" htmlFor={`razao-${empresa.id}`}>
                <Input
                  id={`razao-${empresa.id}`}
                  value={campos.razao_social}
                  onChange={(e) => atualizarCampo("razao_social", e.target.value)}
                />
              </Field>
              <Field label="Nome fantasia" htmlFor={`fantasia-${empresa.id}`}>
                <Input
                  id={`fantasia-${empresa.id}`}
                  value={campos.nome_fantasia}
                  onChange={(e) => atualizarCampo("nome_fantasia", e.target.value)}
                />
              </Field>
              <Field label="Cidade" htmlFor={`cidade-${empresa.id}`}>
                <Input
                  id={`cidade-${empresa.id}`}
                  value={campos.cidade}
                  onChange={(e) => atualizarCampo("cidade", e.target.value)}
                />
              </Field>
              <Field label="UF" htmlFor={`uf-${empresa.id}`}>
                <Input
                  id={`uf-${empresa.id}`}
                  maxLength={2}
                  value={campos.uf}
                  onChange={(e) => atualizarCampo("uf", e.target.value.toUpperCase())}
                />
              </Field>
              <Field label="Telefone" htmlFor={`telefone-${empresa.id}`}>
                <Input
                  id={`telefone-${empresa.id}`}
                  value={campos.telefone}
                  onChange={(e) => atualizarCampo("telefone", e.target.value)}
                />
              </Field>
              <Field label="Logradouro" htmlFor={`logradouro-${empresa.id}`}>
                <Input
                  id={`logradouro-${empresa.id}`}
                  value={campos.endereco_logradouro}
                  onChange={(e) => atualizarCampo("endereco_logradouro", e.target.value)}
                />
              </Field>
              <Field label="Número" htmlFor={`numero-${empresa.id}`}>
                <Input
                  id={`numero-${empresa.id}`}
                  value={campos.endereco_numero}
                  onChange={(e) => atualizarCampo("endereco_numero", e.target.value)}
                />
              </Field>
              <Field label="Complemento" htmlFor={`complemento-${empresa.id}`}>
                <Input
                  id={`complemento-${empresa.id}`}
                  value={campos.endereco_complemento}
                  onChange={(e) => atualizarCampo("endereco_complemento", e.target.value)}
                />
              </Field>
              <Field label="Bairro" htmlFor={`bairro-${empresa.id}`}>
                <Input
                  id={`bairro-${empresa.id}`}
                  value={campos.endereco_bairro}
                  onChange={(e) => atualizarCampo("endereco_bairro", e.target.value)}
                />
              </Field>
              <Field label="Representante legal" htmlFor={`repr-${empresa.id}`}>
                <Input
                  id={`repr-${empresa.id}`}
                  value={campos.representante_legal}
                  onChange={(e) => atualizarCampo("representante_legal", e.target.value)}
                />
              </Field>
              <Field label="CPF do representante" htmlFor={`repr-cpf-${empresa.id}`}>
                <Input
                  id={`repr-cpf-${empresa.id}`}
                  value={campos.representante_legal_cpf}
                  onChange={(e) => atualizarCampo("representante_legal_cpf", e.target.value)}
                />
              </Field>
              <Field label="E-mail do representante" htmlFor={`repr-email-${empresa.id}`}>
                <Input
                  id={`repr-email-${empresa.id}`}
                  type="email"
                  value={campos.representante_legal_email}
                  onChange={(e) => atualizarCampo("representante_legal_email", e.target.value)}
                />
              </Field>
            </div>
            <Field label="Observações" htmlFor={`obs-${empresa.id}`} className="mt-4">
              <TextArea
                id={`obs-${empresa.id}`}
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

export default function EmpresasPage() {
  const { usuario } = useAuth();
  const podeEditar = usuario?.papel === "equipe_programa";

  const { dados: empresas, erro, recarregar, token } = useApiResource<Empresa[]>("/empresas");

  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");
  const [cidadeFiltro, setCidadeFiltro] = useState("");

  const [formAberto, setFormAberto] = useState(false);
  const [campos, setCampos] = useState(CAMPOS_INICIAIS);
  const [enviando, setEnviando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);

  const opcoesCidade = useMemo(() => {
    const set = new Set<string>();
    for (const empresa of empresas ?? []) {
      if (empresa.cidade) set.add(`${empresa.cidade}/${empresa.uf ?? ""}`);
    }
    return Array.from(set).sort();
  }, [empresas]);

  const empresasFiltradas = useMemo(() => {
    if (!empresas) return null;
    const termo = busca.trim().toLowerCase();
    return empresas.filter((empresa) => {
      if (termo) {
        const alvo = `${empresa.razao_social} ${empresa.nome_fantasia ?? ""}`.toLowerCase();
        if (!alvo.includes(termo)) return false;
      }
      if (statusFiltro && empresa.status_processo !== statusFiltro) return false;
      if (cidadeFiltro && `${empresa.cidade}/${empresa.uf ?? ""}` !== cidadeFiltro) return false;
      return true;
    });
  }, [empresas, busca, statusFiltro, cidadeFiltro]);

  const { paginaAtual, setPaginaAtual, itensPaginados, totalPaginas, totalItens, porPagina } =
    usePaginacao(empresasFiltradas);

  function atualizarCampo<K extends keyof typeof campos>(campo: K, valor: string) {
    setCampos((atual) => ({ ...atual, [campo]: valor }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEnviando(true);
    setErroForm(null);
    try {
      await apiFetch("/empresas", {
        method: "POST",
        token,
        body: {
          razao_social: campos.razao_social,
          nome_fantasia: campos.nome_fantasia || null,
          tipo_empresa: campos.tipo_empresa,
          cnpj: campos.tipo_empresa === "nacional" ? campos.cnpj : null,
          identificador_estrangeiro: campos.tipo_empresa === "internacional" ? campos.identificador_estrangeiro : null,
          cidade: campos.cidade || null,
          uf: campos.uf || null,
          telefone: campos.telefone || null,
          endereco_logradouro: campos.endereco_logradouro || null,
          endereco_numero: campos.endereco_numero || null,
          endereco_complemento: campos.endereco_complemento || null,
          endereco_bairro: campos.endereco_bairro || null,
          representante_legal: campos.representante_legal || null,
          representante_legal_cpf: campos.representante_legal_cpf || null,
          representante_legal_email: campos.representante_legal_email || null,
          observacoes: campos.observacoes || null,
        },
      });
      setCampos(CAMPOS_INICIAIS);
      setFormAberto(false);
      recarregar();
    } catch (error) {
      setErroForm(error instanceof ApiError ? error.message : "Não foi possível cadastrar a empresa.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Empresas"
        subtitle="Empresas afiliadas cadastradas no Pollen Parque."
        action={
          <div className="flex items-center gap-2">
            {empresas && (
              <Badge variante="neutral">
                {empresas.length} {empresas.length === 1 ? "empresa" : "empresas"}
              </Badge>
            )}
            {podeEditar && (
              <SecondaryButton type="button" onClick={() => setFormAberto((v) => !v)}>
                {formAberto ? "Cancelar" : "Nova empresa"}
              </SecondaryButton>
            )}
          </div>
        }
      />

      {podeEditar && formAberto && (
        <form onSubmit={handleSubmit} className="mb-6 grid gap-4 rounded-brand border border-neutral-100 p-5 sm:grid-cols-2">
          <Field label="Razão social" htmlFor="razao_social">
            <Input
              id="razao_social"
              required
              value={campos.razao_social}
              onChange={(e) => atualizarCampo("razao_social", e.target.value)}
            />
          </Field>
          <Field label="Nome fantasia" htmlFor="nome_fantasia">
            <Input
              id="nome_fantasia"
              value={campos.nome_fantasia}
              onChange={(e) => atualizarCampo("nome_fantasia", e.target.value)}
            />
          </Field>
          <Field label="Tipo" htmlFor="tipo_empresa">
            <Select
              id="tipo_empresa"
              value={campos.tipo_empresa}
              onChange={(e) => atualizarCampo("tipo_empresa", e.target.value as "nacional" | "internacional")}
            >
              <option value="nacional">Nacional</option>
              <option value="internacional">Internacional</option>
            </Select>
          </Field>
          {campos.tipo_empresa === "nacional" ? (
            <Field label="CNPJ" htmlFor="cnpj">
              <Input id="cnpj" required value={campos.cnpj} onChange={(e) => atualizarCampo("cnpj", e.target.value)} />
            </Field>
          ) : (
            <Field label="Identificador estrangeiro" htmlFor="identificador_estrangeiro">
              <Input
                id="identificador_estrangeiro"
                required
                value={campos.identificador_estrangeiro}
                onChange={(e) => atualizarCampo("identificador_estrangeiro", e.target.value)}
              />
            </Field>
          )}
          <Field label="Cidade" htmlFor="cidade">
            <Input id="cidade" value={campos.cidade} onChange={(e) => atualizarCampo("cidade", e.target.value)} />
          </Field>
          <Field label="UF" htmlFor="uf">
            <Input
              id="uf"
              maxLength={2}
              value={campos.uf}
              onChange={(e) => atualizarCampo("uf", e.target.value.toUpperCase())}
            />
          </Field>
          <Field label="Telefone" htmlFor="telefone">
            <Input id="telefone" value={campos.telefone} onChange={(e) => atualizarCampo("telefone", e.target.value)} />
          </Field>
          <Field label="Logradouro" htmlFor="endereco_logradouro">
            <Input
              id="endereco_logradouro"
              value={campos.endereco_logradouro}
              onChange={(e) => atualizarCampo("endereco_logradouro", e.target.value)}
            />
          </Field>
          <Field label="Número" htmlFor="endereco_numero">
            <Input
              id="endereco_numero"
              value={campos.endereco_numero}
              onChange={(e) => atualizarCampo("endereco_numero", e.target.value)}
            />
          </Field>
          <Field label="Complemento" htmlFor="endereco_complemento">
            <Input
              id="endereco_complemento"
              value={campos.endereco_complemento}
              onChange={(e) => atualizarCampo("endereco_complemento", e.target.value)}
            />
          </Field>
          <Field label="Bairro" htmlFor="endereco_bairro">
            <Input
              id="endereco_bairro"
              value={campos.endereco_bairro}
              onChange={(e) => atualizarCampo("endereco_bairro", e.target.value)}
            />
          </Field>
          <Field label="Representante legal" htmlFor="representante_legal">
            <Input
              id="representante_legal"
              value={campos.representante_legal}
              onChange={(e) => atualizarCampo("representante_legal", e.target.value)}
            />
          </Field>
          <Field label="CPF do representante" htmlFor="representante_legal_cpf">
            <Input
              id="representante_legal_cpf"
              value={campos.representante_legal_cpf}
              onChange={(e) => atualizarCampo("representante_legal_cpf", e.target.value)}
            />
          </Field>
          <Field label="E-mail do representante" htmlFor="representante_legal_email">
            <Input
              id="representante_legal_email"
              type="email"
              value={campos.representante_legal_email}
              onChange={(e) => atualizarCampo("representante_legal_email", e.target.value)}
            />
          </Field>
          <Field label="Observações" htmlFor="observacoes" className="sm:col-span-2">
            <TextArea
              id="observacoes"
              rows={3}
              value={campos.observacoes}
              onChange={(e) => atualizarCampo("observacoes", e.target.value)}
            />
          </Field>

          {erroForm && (
            <div className="sm:col-span-2">
              <ErrorText>{erroForm}</ErrorText>
            </div>
          )}

          <div className="sm:col-span-2">
            <PrimaryButton type="submit" disabled={enviando}>
              {enviando ? "Cadastrando…" : "Cadastrar empresa"}
            </PrimaryButton>
          </div>
        </form>
      )}

      <div className="mb-4 text-black text-sm flex flex-wrap gap-3 rounded-brand bg-[#5EB65C] p-2 [&_input::placeholder]:text-white [&_input::placeholder]:font-bold [&_button]:text-white [&_button]:font-bold [&_input]:border-secondary-foreground [&_button]:border-secondary-foreground">
        <SearchInput
          placeholder="Buscar empresa…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="min-w-[220px] flex-1"
        />
        <Select value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)} className="w-auto min-w-[180px]">
          <option value="">Status</option>
          {Object.entries(STATUS_INFO).map(([codigo, info]) => (
            <option key={codigo} value={codigo}>
              {info.rotulo}
            </option>
          ))}
        </Select>
        <Select value={cidadeFiltro} onChange={(e) => setCidadeFiltro(e.target.value)} className="w-auto min-w-[180px]">
          <option value="">Cidade/UF</option>
          {opcoesCidade.map((opcao) => (
            <option key={opcao} value={opcao}>
              {opcao}
            </option>
          ))}
        </Select>
      </div>

      {erro && <ErrorText>{erro}</ErrorText>}
      {!empresas && !erro && <p className="text-sm text-neutral-600">Carregando empresas…</p>}
      {empresas && empresas.length === 0 && (
        <p className="text-sm text-neutral-600">Nenhuma empresa cadastrada ainda.</p>
      )}
      {empresas && empresas.length > 0 && empresasFiltradas && empresasFiltradas.length === 0 && (
        <p className="text-sm text-neutral-600">Nenhuma empresa encontrada para os filtros aplicados.</p>
      )}

      {itensPaginados && itensPaginados.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-brand border border-secondary-subtle-border bg-neutral-100">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-secondary-subtle-border bg-[#66B95D] text-white">
                  <th className="px-4 py-3 font-bold">Empresa</th>
                  <th className="px-4 py-3 font-bold">CNPJ / Identificador</th>
                  <th className="px-4 py-3 font-bold">Cidade/UF</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 font-bold text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {itensPaginados.map((empresa) => (
                  <LinhaEmpresa
                    key={empresa.id}
                    empresa={empresa}
                    token={token}
                    onSalvo={recarregar}
                    podeEditar={podeEditar}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            paginaAtual={paginaAtual}
            totalPaginas={totalPaginas}
            totalItens={totalItens}
            porPagina={porPagina}
            rotuloItens={totalItens === 1 ? "empresa" : "empresas"}
            onMudarPagina={setPaginaAtual}
          />
        </>
      )}
    </div>
  );
}
