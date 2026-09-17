"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FaFileContract } from "react-icons/fa";
import { HiOutlineRefresh } from "react-icons/hi";
import { RiContractFill } from "react-icons/ri";
import { Badge } from "@/components/Badge";
import { useConfirm } from "@/components/ConfirmDialog";
import { PageHeader } from "@/components/PageHeader";
import { DangerButton, EditButton, ErrorText, Field, Input, PrimaryButton, Select, SecondaryButton, TextArea, UploadButton } from "@/components/form";
import { formatarData, formatarMoeda } from "@/lib/format";
import { apiFetch, ApiError } from "@/lib/api";
import { useApiResource } from "@/lib/useApiResource";
import { useAuth } from "@/lib/auth";
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
  cnpj: string | null;
  identificador_estrangeiro: string | null;
  endereco_logradouro: string | null;
  endereco_numero: string | null;
  endereco_complemento: string | null;
  endereco_bairro: string | null;
  cidade: string | null;
  uf: string | null;
  telefone: string | null;
  representante_legal: string | null;
  representante_legal_cpf: string | null;
  representante_legal_email: string | null;
  contatos: { email?: string | null; telefone?: string | null } | null;
}

// RN-47: dados exigidos por contratosService.emitir — usado tanto para detectar o que falta
// (e decidir se abre o modal de completar dados) quanto para pré-preencher o formulário dele.
const CAMPOS_EMISSAO = [
  { chave: "numero_termo", rotulo: "Número do termo", origem: "contrato" as const, opcional: false },
  { chave: "cnpj", rotulo: "CNPJ / identificador estrangeiro", origem: "empresa" as const, opcional: false },
  { chave: "endereco_logradouro", rotulo: "Logradouro", origem: "empresa" as const, opcional: false },
  { chave: "endereco_numero", rotulo: "Número", origem: "empresa" as const, opcional: false },
  { chave: "endereco_complemento", rotulo: "Complemento (opcional)", origem: "empresa" as const, opcional: true },
  { chave: "endereco_bairro", rotulo: "Bairro", origem: "empresa" as const, opcional: false },
  { chave: "cidade", rotulo: "Cidade", origem: "empresa" as const, opcional: false },
  { chave: "uf", rotulo: "UF", origem: "empresa" as const, opcional: false },
  { chave: "telefone", rotulo: "Telefone da empresa", origem: "empresa" as const, opcional: false },
  { chave: "representante_legal", rotulo: "Nome do representante legal", origem: "empresa" as const, opcional: false },
  { chave: "representante_legal_cpf", rotulo: "CPF do representante", origem: "empresa" as const, opcional: false },
  { chave: "representante_legal_email", rotulo: "E-mail do representante", origem: "empresa" as const, opcional: false },
  { chave: "email_contato", rotulo: "E-mail de contato da empresa", origem: "empresa" as const, opcional: false },
] as const;

type ChaveCampoEmissao = (typeof CAMPOS_EMISSAO)[number]["chave"];

function valorAtualCampoEmissao(
  chave: ChaveCampoEmissao,
  contrato: Contrato | null,
  empresa: Empresa | undefined
): string {
  if (chave === "numero_termo") return contrato?.numero_termo ?? "";
  if (chave === "cnpj") return empresa?.cnpj ?? empresa?.identificador_estrangeiro ?? "";
  if (chave === "email_contato") return empresa?.contatos?.email ?? "";
  return (empresa?.[chave] as string | null | undefined) ?? "";
}

function camposFaltantesParaEmissao(contrato: Contrato, empresa: Empresa | undefined): string[] {
  return CAMPOS_EMISSAO.filter((campo) => !campo.opcional)
    .filter((campo) => !valorAtualCampoEmissao(campo.chave, contrato, empresa).trim())
    .map((campo) => campo.rotulo);
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
  return (
    <div>
      <UploadButton onSelecionar={onSelecionar} accept=".png,image/png,.pdf,application/pdf" />
      {arquivoNome && <p className="mt-1 text-xs text-secondary-foreground">Selecionado: {arquivoNome}</p>}
      {erro && <p className="mt-1 text-xs text-danger">{erro}</p>}
    </div>
  );
}

// Modal que aparece quando falta algum dado exigido pela emissão (RN-47) — deixa completar
// tudo ali mesmo (dados da empresa + número do termo do contrato) em vez de só mostrar a
// mensagem de erro do backend e obrigar a ir editar em outra tela. Mesmo padrão visual do
// overlay/cartão de `ConfirmDialog` (@/components/ConfirmDialog), só mais largo por ter um
// formulário em vez de uma pergunta simples.
function somarDiasISO(dataISO: string, dias: number): string {
  const data = new Date(`${dataISO}T00:00:00.000Z`);
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
}

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

const DIAS_VIGENCIA_RENOVACAO = 365;

// Também cobre o caso de contrato vencido (RN: emitir termo de um contrato vencido renova a
// vigência) — quando `contrato.estaVencido`, mostra um aviso e exige as novas datas de
// vigência antes de emitir; o PATCH de vigência vai junto com o de numero_termo. Continua
// servindo pro caso original (contrato em dia, só faltando dados cadastrais pra emissão).
function ModalCompletarDadosEmissao({
  contrato,
  empresa,
  token,
  onFechar,
  onEmitido,
}: {
  contrato: Contrato;
  empresa: Empresa | undefined;
  token: string | null;
  onFechar: () => void;
  onEmitido: () => void;
}) {
  const precisaRenovarVigencia = contrato.estaVencido;
  const [campos, setCampos] = useState<Record<ChaveCampoEmissao, string>>(() => {
    const iniciais = {} as Record<ChaveCampoEmissao, string>;
    for (const campo of CAMPOS_EMISSAO) {
      iniciais[campo.chave] = valorAtualCampoEmissao(campo.chave, contrato, empresa);
    }
    return iniciais;
  });
  const [vigencia, setVigencia] = useState(() => ({
    data_inicio_vigencia: precisaRenovarVigencia ? hojeISO() : contrato.data_inicio_vigencia,
    data_termino_vigencia: precisaRenovarVigencia
      ? somarDiasISO(hojeISO(), DIAS_VIGENCIA_RENOVACAO)
      : contrato.data_termino_vigencia,
  }));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function atualizarCampo(chave: ChaveCampoEmissao, valor: string) {
    setCampos((atual) => ({ ...atual, [chave]: valor }));
  }

  function atualizarVigencia<K extends keyof typeof vigencia>(campo: K, valor: string) {
    setVigencia((atual) => ({ ...atual, [campo]: valor }));
  }

  async function salvarEEmitir() {
    if (!empresa) {
      setErro("Empresa do contrato não encontrada.");
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      const bodyContrato: Record<string, unknown> = { numero_termo: campos.numero_termo };
      if (precisaRenovarVigencia) {
        bodyContrato.data_inicio_vigencia = vigencia.data_inicio_vigencia;
        bodyContrato.data_termino_vigencia = vigencia.data_termino_vigencia;
      }
      await apiFetch(`/contratos/${contrato.id}`, { method: "PATCH", token, body: bodyContrato });
      await apiFetch(`/empresas/${empresa.id}`, {
        method: "PATCH",
        token,
        body: {
          endereco_logradouro: campos.endereco_logradouro,
          endereco_numero: campos.endereco_numero,
          endereco_complemento: campos.endereco_complemento || null,
          endereco_bairro: campos.endereco_bairro,
          cidade: campos.cidade,
          uf: campos.uf,
          telefone: campos.telefone,
          representante_legal: campos.representante_legal,
          representante_legal_cpf: campos.representante_legal_cpf,
          representante_legal_email: campos.representante_legal_email,
          contatos: { ...empresa.contatos, email: campos.email_contato },
        },
      });
      await apiFetch(`/contratos/${contrato.id}/emitir`, { method: "POST", token });
      onEmitido();
      onFechar();
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível salvar os dados e emitir o contrato.");
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
        <p className="text-center font-display text-lg font-semibold text-foreground">
          {precisaRenovarVigencia ? "Contrato vencido — renovar vigência e emitir" : "Completar dados para emitir o contrato"}
        </p>
        <p className="mt-1 text-center text-sm text-neutral-800">
          {precisaRenovarVigencia
            ? "Este contrato está vencido. Emitir um novo termo renova a vigência — confira/ajuste o novo período abaixo antes de emitir."
            : "A minuta exige alguns dados que ainda não estão preenchidos. Complete abaixo e emita o contrato — os dados da empresa ficam salvos para as próximas emissões."}
        </p>

        {precisaRenovarVigencia && (
          <div className="mt-4 grid gap-4 rounded-brand border border-warning/30 bg-warning/10 p-4 md:grid-cols-2">
            <Field label="Nova data de início da vigência" htmlFor="renovacao-inicio">
              <Input
                id="renovacao-inicio"
                type="date"
                required
                value={vigencia.data_inicio_vigencia}
                onChange={(e) => atualizarVigencia("data_inicio_vigencia", e.target.value)}
              />
            </Field>
            <Field label="Nova data de término da vigência" htmlFor="renovacao-fim">
              <Input
                id="renovacao-fim"
                type="date"
                required
                value={vigencia.data_termino_vigencia}
                onChange={(e) => atualizarVigencia("data_termino_vigencia", e.target.value)}
              />
            </Field>
          </div>
        )}

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {CAMPOS_EMISSAO.map((campo) => (
            <Field key={campo.chave} label={campo.rotulo} htmlFor={`emissao-${campo.chave}`}>
              <Input
                id={`emissao-${campo.chave}`}
                required={!campo.opcional}
                value={campos[campo.chave]}
                onChange={(e) => atualizarCampo(campo.chave, e.target.value)}
              />
            </Field>
          ))}
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
          <PrimaryButton type="button" onClick={salvarEEmitir} disabled={salvando}>
            {salvando ? "Salvando…" : precisaRenovarVigencia ? "Renovar e emitir" : "Salvar e emitir"}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

// Empresa que ainda não tem nenhum contrato cadastrado: em vez de exigir passar por
// "Cadastrar contrato" (reservado agora pra quando já existe um contrato manual/físico pra
// registrar), "Emitir contrato" cria o registro e já emite o PDF num passo só, com os mesmos
// dados que ModalCompletarDadosEmissao pede pra um contrato existente + vigência/valor (que
// aqui ainda não existem em lugar nenhum pra pré-preencher).
function ModalEmitirContratoNovo({
  empresa,
  planos,
  token,
  onFechar,
  onEmitido,
}: {
  empresa: Empresa;
  planos: PlanoAfiliacao[];
  token: string | null;
  onFechar: () => void;
  onEmitido: () => void;
}) {
  const [campos, setCampos] = useState<Record<ChaveCampoEmissao, string>>(() => {
    const iniciais = {} as Record<ChaveCampoEmissao, string>;
    for (const campo of CAMPOS_EMISSAO) {
      iniciais[campo.chave] = valorAtualCampoEmissao(campo.chave, null, empresa);
    }
    return iniciais;
  });
  const [dadosContrato, setDadosContrato] = useState({
    data_inicio_vigencia: "",
    data_termino_vigencia: "",
    plano_id: "",
    valor_anuidade: "",
    observacoes: "",
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function atualizarCampo(chave: ChaveCampoEmissao, valor: string) {
    setCampos((atual) => ({ ...atual, [chave]: valor }));
  }

  function atualizarDadosContrato<K extends keyof typeof dadosContrato>(campo: K, valor: string) {
    setDadosContrato((atual) => ({ ...atual, [campo]: valor }));
  }

  async function criarEEmitir() {
    setSalvando(true);
    setErro(null);
    try {
      const bodyContrato: Record<string, unknown> = {
        empresa_id: empresa.id,
        data_inicio_vigencia: dadosContrato.data_inicio_vigencia,
        data_termino_vigencia: dadosContrato.data_termino_vigencia,
        numero_termo: campos.numero_termo,
        observacoes: dadosContrato.observacoes || null,
      };
      if (dadosContrato.plano_id) bodyContrato.plano_id = Number(dadosContrato.plano_id);
      if (dadosContrato.valor_anuidade) bodyContrato.valor_anuidade = Number(dadosContrato.valor_anuidade);

      const novoContrato = await apiFetch<{ id: string }>("/contratos", { method: "POST", token, body: bodyContrato });

      await apiFetch(`/empresas/${empresa.id}`, {
        method: "PATCH",
        token,
        body: {
          endereco_logradouro: campos.endereco_logradouro,
          endereco_numero: campos.endereco_numero,
          endereco_complemento: campos.endereco_complemento || null,
          endereco_bairro: campos.endereco_bairro,
          cidade: campos.cidade,
          uf: campos.uf,
          telefone: campos.telefone,
          representante_legal: campos.representante_legal,
          representante_legal_cpf: campos.representante_legal_cpf,
          representante_legal_email: campos.representante_legal_email,
          contatos: { ...empresa.contatos, email: campos.email_contato },
        },
      });

      await apiFetch(`/contratos/${novoContrato.id}/emitir`, { method: "POST", token });
      onEmitido();
      onFechar();
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível criar e emitir o contrato.");
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
        <p className="text-center font-display text-lg font-semibold text-foreground">
          Emitir contrato — {empresa.nome_fantasia || empresa.razao_social}
        </p>
        <p className="mt-1 text-center text-sm text-neutral-800">
          Esta empresa ainda não tem contrato. Preencha os dados abaixo pra criar o registro e emitir o PDF num só
          passo — os dados da empresa ficam salvos para as próximas emissões.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Início da vigência" htmlFor="novo-inicio">
            <Input
              id="novo-inicio"
              type="date"
              required
              value={dadosContrato.data_inicio_vigencia}
              onChange={(e) => atualizarDadosContrato("data_inicio_vigencia", e.target.value)}
            />
          </Field>
          <Field label="Término da vigência" htmlFor="novo-fim">
            <Input
              id="novo-fim"
              type="date"
              required
              value={dadosContrato.data_termino_vigencia}
              onChange={(e) => atualizarDadosContrato("data_termino_vigencia", e.target.value)}
            />
          </Field>
          <Field label="Plano de afiliação (opcional)" htmlFor="novo-plano">
            <Select
              id="novo-plano"
              value={dadosContrato.plano_id}
              onChange={(e) => atualizarDadosContrato("plano_id", e.target.value)}
            >
              <option value="">Sem plano — informar valor manualmente</option>
              {planos
                .filter((plano) => plano.ativo)
                .map((plano) => (
                  <option key={plano.id} value={plano.id}>
                    {plano.nome} — {formatarMoeda(plano.valor)}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="Valor da anuidade (se sem plano)" htmlFor="novo-valor">
            <Input
              id="novo-valor"
              type="number"
              step="0.01"
              min="0"
              value={dadosContrato.valor_anuidade}
              onChange={(e) => atualizarDadosContrato("valor_anuidade", e.target.value)}
            />
          </Field>
          {CAMPOS_EMISSAO.map((campo) => (
            <Field key={campo.chave} label={campo.rotulo} htmlFor={`novo-${campo.chave}`}>
              <Input
                id={`novo-${campo.chave}`}
                required={!campo.opcional}
                value={campos[campo.chave]}
                onChange={(e) => atualizarCampo(campo.chave, e.target.value)}
              />
            </Field>
          ))}
        </div>

        <Field label="Observações (opcional)" htmlFor="novo-obs" className="mt-4">
          <TextArea
            id="novo-obs"
            rows={3}
            value={dadosContrato.observacoes}
            onChange={(e) => atualizarDadosContrato("observacoes", e.target.value)}
          />
        </Field>

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
          <PrimaryButton type="button" onClick={criarEEmitir} disabled={salvando}>
            {salvando ? "Emitindo…" : "Criar e emitir"}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function BotaoEmitirContratoNovo({
  empresa,
  planos,
  token,
  onSalvo,
}: {
  empresa: Empresa;
  planos: PlanoAfiliacao[];
  token: string | null;
  onSalvo: () => void;
}) {
  const [modalAberto, setModalAberto] = useState(false);

  return (
    <div className="flex justify-end">
      <button
        type="button"
        onClick={() => setModalAberto(true)}
        className="inline-flex items-center gap-1.5 rounded-full bg-[#F5DEA3] px-3 py-1.5 text-xs font-medium text-[#5c4400] transition-colors hover:bg-[#EFD284]"
      >
        <FaFileContract className="h-3.5 w-3.5" />
        Emitir contrato
      </button>
      {modalAberto && (
        <ModalEmitirContratoNovo
          empresa={empresa}
          planos={planos}
          token={token}
          onFechar={() => setModalAberto(false)}
          onEmitido={onSalvo}
        />
      )}
    </div>
  );
}

// Linha de uma empresa que ainda não tem contrato — aparece na listagem (que agora cobre
// todas as empresas, não só as que já têm contrato) com as colunas de dados vazias e a única
// ação possível sendo emitir o primeiro contrato.
function LinhaEmpresaSemContrato({
  empresa,
  planos,
  token,
  onSalvo,
  mostrarEmpresa,
  podeGerenciar,
}: {
  empresa: Empresa;
  planos: PlanoAfiliacao[];
  token: string | null;
  onSalvo: () => void;
  mostrarEmpresa: boolean;
  podeGerenciar: boolean;
}) {
  return (
    <tr className="border-b border-secondary-subtle-border last:border-0">
      {mostrarEmpresa && (
        <td className="px-4 py-3 font-medium text-foreground">{empresa.nome_fantasia || empresa.razao_social}</td>
      )}
      <td className="px-4 py-3 text-xs text-neutral-600">—</td>
      <td className="px-4 py-3 text-xs text-neutral-600">—</td>
      <td className="px-4 py-3">
        <Badge variante="neutral">Sem contrato</Badge>
      </td>
      <td className="px-4 py-3 text-xs text-neutral-600">—</td>
      <td className="px-4 py-3 text-right">
        {podeGerenciar && (
          <BotaoEmitirContratoNovo empresa={empresa} planos={planos} token={token} onSalvo={onSalvo} />
        )}
      </td>
    </tr>
  );
}

function BotaoEmitirContrato({
  contrato,
  empresa,
  token,
  onSalvo,
}: {
  contrato: Contrato;
  empresa: Empresa | undefined;
  token: string | null;
  onSalvo: () => void;
}) {
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const pedirConfirmacao = useConfirm();

  async function emitir() {
    // Contrato vencido: emitir um novo termo renova a vigência, então sempre passa pelo modal
    // (com aviso + campos de nova vigência) em vez do confirm simples — mesmo que os demais
    // dados cadastrais já estejam completos.
    if (contrato.estaVencido) {
      setModalAberto(true);
      return;
    }
    const faltantes = camposFaltantesParaEmissao(contrato, empresa);
    if (faltantes.length > 0) {
      setModalAberto(true);
      return;
    }
    if (
      !(await pedirConfirmacao({
        mensagem: "Gerar o contrato em PDF a partir dos dados cadastrados da empresa?",
        tone: "default",
        confirmarLabel: "Emitir contrato",
      }))
    )
      return;
    setProcessando(true);
    setErro(null);
    try {
      await apiFetch(`/contratos/${contrato.id}/emitir`, { method: "POST", token });
      onSalvo();
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível emitir o contrato.");
    } finally {
      setProcessando(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={emitir}
        disabled={processando}
        className="inline-flex items-center gap-1.5 rounded-full bg-[#F5DEA3] px-3 py-1.5 text-xs font-medium text-[#5c4400] transition-colors hover:bg-[#EFD284] disabled:opacity-60"
      >
        <FaFileContract className="h-3.5 w-3.5" />
        {processando ? "Emitindo…" : "Emitir contrato"}
      </button>
      {erro && <p className="max-w-[220px] text-right text-xs text-danger">{erro}</p>}
      {modalAberto && (
        <ModalCompletarDadosEmissao
          contrato={contrato}
          empresa={empresa}
          token={token}
          onFechar={() => setModalAberto(false)}
          onEmitido={onSalvo}
        />
      )}
    </div>
  );
}

function BotaoMarcarVigente({
  contrato,
  token,
  onSalvo,
}: {
  contrato: Contrato;
  token: string | null;
  onSalvo: () => void;
}) {
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const pedirConfirmacao = useConfirm();

  async function marcarVigente() {
    if (
      !(await pedirConfirmacao({
        mensagem: "Confirmar que o contrato voltou assinado e marcá-lo como vigente?",
        tone: "default",
        confirmarLabel: "Marcar como vigente",
      }))
    )
      return;
    setProcessando(true);
    setErro(null);
    try {
      await apiFetch(`/contratos/${contrato.id}/vigente`, { method: "PATCH", token });
      onSalvo();
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível marcar o contrato como vigente.");
    } finally {
      setProcessando(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={marcarVigente}
        disabled={processando}
        className="inline-flex items-center gap-1.5 rounded-full bg-[#4A90E2] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#3A7BC8] disabled:opacity-60"
      >
        <RiContractFill className="h-3.5 w-3.5" />
        {processando ? "Marcando…" : "Marcar como vigente"}
      </button>
      {erro && <p className="max-w-[220px] text-right text-xs text-danger">{erro}</p>}
    </div>
  );
}

function LinhaContrato({
  contrato,
  nomeEmpresa,
  empresa,
  token,
  onSalvo,
  mostrarEmpresa,
  podeGerenciar,
  podeMarcarVigente,
}: {
  contrato: Contrato;
  nomeEmpresa: (id: string) => string;
  empresa: Empresa | undefined;
  token: string | null;
  onSalvo: () => void;
  mostrarEmpresa: boolean;
  podeGerenciar: boolean;
  podeMarcarVigente: boolean;
}) {
  const router = useRouter();
  const pedirConfirmacao = useConfirm();
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
    if (
      !(await pedirConfirmacao({
        mensagem: `Excluir este contrato de "${nomeEmpresa(contrato.empresa_id)}"?`,
        tone: "danger",
        confirmarLabel: "Excluir",
      }))
    )
      return;
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
        {mostrarEmpresa && (
          <td className="px-4 py-3 font-medium text-foreground">{nomeEmpresa(contrato.empresa_id)}</td>
        )}
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
            {podeGerenciar && (
              <BotaoEmitirContrato contrato={contrato} empresa={empresa} token={token} onSalvo={onSalvo} />
            )}
            {/* Marcar como vigente também é liberado pra contabilidade: é quem manda assinar e
                assina em nome do Pollen, então é quem sabe quando a assinatura foi finalizada. */}
            {podeMarcarVigente && contrato.arquivo_base64 && (
              <BotaoMarcarVigente contrato={contrato} token={token} onSalvo={onSalvo} />
            )}
            {podeGerenciar && (contrato.estaVencido || contrato.estaProximoVencimento) && (
              <button
                type="button"
                onClick={irParaRenovacao}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#AAD6E1] px-3 py-1.5 text-xs font-medium text-[#0a151f] transition-colors hover:bg-[#8FC1D0]"
              >
                <HiOutlineRefresh className="h-3.5 w-3.5" />
                Renovar
              </button>
            )}
            {podeGerenciar && (
              <>
                <EditButton type="button" onClick={() => setEditando((v) => !v)} className="px-3 py-1.5 text-xs">
                  {editando ? "Cancelar" : "Editar"}
                </EditButton>
                <DangerButton type="button" onClick={excluir} disabled={salvando}>
                  Excluir
                </DangerButton>
              </>
            )}
          </div>
        </td>
      </tr>
      {editando && (
        <tr className="border-b border-secondary-subtle-border bg-secondary-subtle">
          <td colSpan={mostrarEmpresa ? 6 : 5} className="px-4 py-4">
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
  const { usuario } = useAuth();
  const podeGerenciar = usuario?.papel === "equipe_programa";
  const podeMarcarVigente = usuario?.papel === "equipe_programa" || usuario?.papel === "contabilidade";
  const ehEmpresaAfiliada = usuario?.papel === "empresa_afiliada";

  const { dados: contratos, erro, recarregar, token } = useApiResource<Contrato[]>("/contratos");
  const { dados: empresas } = useApiResource<Empresa[]>(ehEmpresaAfiliada ? null : "/empresas");
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

  const empresaPorId = useMemo(() => {
    const mapa = new Map<string, Empresa>();
    for (const empresa of empresas ?? []) {
      mapa.set(empresa.id, empresa);
    }
    return (id: string) => mapa.get(id);
  }, [empresas]);

  // Uma empresa pode ter mais de um contrato (renovações encadeadas por contrato_anterior_id)
  // — pra listagem por empresa, o "atual" é o de vigência mais recente.
  const contratoAtualPorEmpresa = useMemo(() => {
    const mapa = new Map<string, Contrato>();
    for (const contrato of contratos ?? []) {
      const atual = mapa.get(contrato.empresa_id);
      if (!atual || contrato.data_inicio_vigencia > atual.data_inicio_vigencia) {
        mapa.set(contrato.empresa_id, contrato);
      }
    }
    return mapa;
  }, [contratos]);

  // RN: pra equipe_programa/contabilidade, a listagem cobre todas as empresas (não só as que
  // já têm contrato) — "Cadastrar contrato" fica reservado pra quando já existe um contrato
  // manual/físico a registrar; pra emitir o primeiro contrato de uma empresa, usa-se "Emitir
  // contrato" na própria linha dela (cria e emite num passo só, ModalEmitirContratoNovo).
  // empresa_afiliada só vê os próprios contratos (RN-33, já escopado no back), não faz
  // sentido "todas as empresas" pra esse papel.
  const linhas = useMemo(() => {
    if (ehEmpresaAfiliada) {
      return (contratos ?? []).map((contrato) => ({
        tipo: "com_contrato" as const,
        contrato,
        empresa: empresaPorId(contrato.empresa_id),
      }));
    }
    return (empresas ?? []).map((empresa) => {
      const contrato = contratoAtualPorEmpresa.get(empresa.id);
      return contrato
        ? { tipo: "com_contrato" as const, contrato, empresa }
        : { tipo: "sem_contrato" as const, empresa };
    });
  }, [ehEmpresaAfiliada, contratos, empresas, contratoAtualPorEmpresa, empresaPorId]);

  const carregando = ehEmpresaAfiliada ? !contratos && !erro : !empresas && !erro;

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
        subtitle={
          ehEmpresaAfiliada
            ? "Listagem de contratos de afiliação e gestão de vigência"
            : "Todas as empresas — use \"Emitir contrato\" na linha da empresa para gerar o primeiro contrato dela"
        }
        action={
          podeGerenciar ? (
            <SecondaryButton type="button" onClick={() => setFormAberto((v) => !v)}>
              {formAberto ? "Cancelar" : "Cadastrar contrato manual"}
            </SecondaryButton>
          ) : undefined
        }
      />

      {podeGerenciar && formAberto && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-brand border border-neutral-100 p-5">
          <p className="mb-4 text-sm text-neutral-800">
            Use isto só quando a empresa já tem um contrato manual/físico pra registrar (com vigência definida e,
            opcionalmente, o arquivo assinado). Pra emitir o primeiro contrato de uma empresa a partir da minuta
            padrão, use o botão Emitir contrato na linha dela.
          </p>
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
      {carregando && <p className="text-sm text-neutral-600">Carregando…</p>}
      {!carregando && linhas.length === 0 && (
        <p className="text-sm text-neutral-600">
          {ehEmpresaAfiliada ? "Nenhum contrato cadastrado ainda." : "Nenhuma empresa cadastrada ainda."}
        </p>
      )}

      {!carregando && linhas.length > 0 && (
        <div className="overflow-x-auto rounded-brand border border-secondary-subtle-border bg-neutral-100">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-secondary-subtle-border bg-[#66B95D] text-white">
                {!ehEmpresaAfiliada && <th className="px-4 py-3 text-left font-bold">Empresa</th>}
                <th className="px-4 py-3 text-left font-bold">Vigência</th>
                <th className="px-4 py-3 text-left font-bold">Anuidade</th>
                <th className="px-4 py-3 text-left font-bold">Situação</th>
                <th className="px-4 py-3 text-left font-bold">Arquivo</th>
                <th className="px-4 py-3 text-left font-bold" />
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha) =>
                linha.tipo === "com_contrato" ? (
                  <LinhaContrato
                    key={linha.contrato.id}
                    contrato={linha.contrato}
                    nomeEmpresa={nomeEmpresa}
                    empresa={linha.empresa}
                    token={token}
                    onSalvo={recarregar}
                    mostrarEmpresa={!ehEmpresaAfiliada}
                    podeGerenciar={podeGerenciar}
                    podeMarcarVigente={podeMarcarVigente}
                  />
                ) : (
                  <LinhaEmpresaSemContrato
                    key={linha.empresa.id}
                    empresa={linha.empresa}
                    planos={planos ?? []}
                    token={token}
                    onSalvo={recarregar}
                    mostrarEmpresa={!ehEmpresaAfiliada}
                    podeGerenciar={podeGerenciar}
                  />
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
