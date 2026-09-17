"use client";

import { useState, type FormEvent } from "react";
import { Badge } from "@/components/Badge";
import { PageHeader } from "@/components/PageHeader";
import {
  EditButton,
  ErrorText,
  Field,
  Input,
  PrimaryButton,
  Select,
  SecondaryButton,
} from "@/components/form";
import { apiFetch, ApiError } from "@/lib/api";
import { useApiResource } from "@/lib/useApiResource";

interface Usuario {
  id: number;
  nome: string;
  email: string;
  papel: "equipe_programa" | "empresa_afiliada" | "contabilidade";
  empresa_id: string | null;
  ativo: boolean;
}

interface Empresa {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
}

const PAPEL_ROTULO: Record<string, string> = {
  equipe_programa: "Equipe do programa",
  empresa_afiliada: "Empresa afiliada",
  contabilidade: "Contabilidade",
};

const CAMPOS_INICIAIS = {
  nome: "",
  email: "",
  papel: "equipe_programa" as Usuario["papel"],
  empresa_id: "",
  senha: "",
};

function LinhaUsuario({
  usuario,
  empresas,
  token,
  onSalvo,
}: {
  usuario: Usuario;
  empresas: Empresa[];
  token: string | null;
  onSalvo: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [papel, setPapel] = useState(usuario.papel);
  const [empresaId, setEmpresaId] = useState(usuario.empresa_id ?? "");
  const [novaSenha, setNovaSenha] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    setSalvando(true);
    setErro(null);
    try {
      await apiFetch(`/usuarios/${usuario.id}`, {
        method: "PATCH",
        token,
        body: {
          papel,
          empresa_id: papel === "empresa_afiliada" ? empresaId || null : null,
          ...(novaSenha ? { senha: novaSenha } : {}),
        },
      });
      setEditando(false);
      setNovaSenha("");
      onSalvo();
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  async function alternarAtivo() {
    setSalvando(true);
    setErro(null);
    try {
      await apiFetch(`/usuarios/${usuario.id}`, { method: "PATCH", token, body: { ativo: !usuario.ativo } });
      onSalvo();
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <tr className="border-b border-secondary-subtle-border last:border-0 align-top">
      <td className="px-4 py-3">
        <p className="font-medium text-foreground">{usuario.nome}</p>
        <p className="text-xs text-neutral-600">{usuario.email}</p>
      </td>
      <td className="px-4 py-3">
        {editando ? (
          <div className="flex flex-col gap-2">
            <Select value={papel} onChange={(e) => setPapel(e.target.value as Usuario["papel"])}>
              {Object.entries(PAPEL_ROTULO).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </Select>
            {papel === "empresa_afiliada" && (
              <Select value={empresaId} onChange={(e) => setEmpresaId(e.target.value)}>
                <option value="">Selecione a empresa…</option>
                {empresas.map((empresa) => (
                  <option key={empresa.id} value={empresa.id}>
                    {empresa.nome_fantasia || empresa.razao_social}
                  </option>
                ))}
              </Select>
            )}
            <Input
              type="password"
              placeholder="Deixe em branco para manter a senha atual"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              aria-label="Nova senha (opcional)"
            />
          </div>
        ) : (
          PAPEL_ROTULO[usuario.papel] ?? usuario.papel
        )}
        {erro && <p className="mt-1 text-xs text-danger">{erro}</p>}
      </td>
      <td className="px-4 py-3">
        <button type="button" onClick={alternarAtivo} disabled={salvando}>
          <Badge variante={usuario.ativo ? "secondary" : "neutral"}>{usuario.ativo ? "Ativo" : "Inativo"}</Badge>
        </button>
      </td>
      <td className="px-4 py-3 text-right">
        {editando ? (
          <div className="flex justify-end gap-2">
            <SecondaryButton
              type="button"
              onClick={() => {
                setEditando(false);
                setNovaSenha("");
              }}
              className="px-3 py-1.5 text-xs"
            >
              Cancelar
            </SecondaryButton>
            <PrimaryButton type="button" onClick={salvar} disabled={salvando} className="px-3 py-1.5 text-xs">
              {salvando ? "Salvando…" : "Salvar"}
            </PrimaryButton>
          </div>
        ) : (
          <EditButton type="button" onClick={() => setEditando(true)} className="px-3 py-1.5 text-xs">
            Editar
          </EditButton>
        )}
      </td>
    </tr>
  );
}

export default function UsuariosPage() {
  const { dados: usuarios, erro, recarregar, token } = useApiResource<Usuario[]>("/usuarios");
  const { dados: empresas } = useApiResource<Empresa[]>("/empresas");

  const [formAberto, setFormAberto] = useState(false);
  const [campos, setCampos] = useState(CAMPOS_INICIAIS);
  const [enviando, setEnviando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);

  function atualizarCampo<K extends keyof typeof campos>(campo: K, valor: (typeof campos)[K]) {
    setCampos((atual) => ({ ...atual, [campo]: valor }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEnviando(true);
    setErroForm(null);
    try {
      await apiFetch("/usuarios", {
        method: "POST",
        token,
        body: {
          nome: campos.nome,
          email: campos.email,
          papel: campos.papel,
          empresa_id: campos.papel === "empresa_afiliada" ? campos.empresa_id || null : null,
          senha: campos.senha,
        },
      });
      setCampos(CAMPOS_INICIAIS);
      setFormAberto(false);
      recarregar();
    } catch (error) {
      setErroForm(error instanceof ApiError ? error.message : "Não foi possível cadastrar o usuário.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Usuários"
        subtitle="Gestão de quem tem acesso ao sistema."
        action={
          <SecondaryButton type="button" onClick={() => setFormAberto((v) => !v)}>
            {formAberto ? "Cancelar" : "Novo usuário"}
          </SecondaryButton>
        }
      />

      {formAberto && (
        <form onSubmit={handleSubmit} className="mb-6 grid gap-4 rounded-brand border border-neutral-100 p-5 sm:grid-cols-2">
          <Field label="Nome" htmlFor="nome">
            <Input
              id="nome"
              required
              value={campos.nome}
              onChange={(e) => atualizarCampo("nome", e.target.value)}
            />
          </Field>
          <Field label="E-mail" htmlFor="email">
            <Input
              id="email"
              type="email"
              required
              value={campos.email}
              onChange={(e) => atualizarCampo("email", e.target.value)}
            />
          </Field>
          <Field label="Papel" htmlFor="papel">
            <Select
              id="papel"
              value={campos.papel}
              onChange={(e) => atualizarCampo("papel", e.target.value as Usuario["papel"])}
            >
              {Object.entries(PAPEL_ROTULO).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </Select>
          </Field>
          {campos.papel === "empresa_afiliada" && (
            <Field label="Empresa" htmlFor="empresa_id">
              <Select
                id="empresa_id"
                value={campos.empresa_id}
                onChange={(e) => atualizarCampo("empresa_id", e.target.value)}
              >
                <option value="">Selecione a empresa…</option>
                {(empresas ?? []).map((empresa) => (
                  <option key={empresa.id} value={empresa.id}>
                    {empresa.nome_fantasia || empresa.razao_social}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Field label="Senha inicial" htmlFor="senha">
            <Input
              id="senha"
              type="password"
              required
              value={campos.senha}
              onChange={(e) => atualizarCampo("senha", e.target.value)}
            />
          </Field>

          {erroForm && (
            <div className="sm:col-span-2">
              <ErrorText>{erroForm}</ErrorText>
            </div>
          )}

          <div className="sm:col-span-2">
            <PrimaryButton type="submit" disabled={enviando}>
              {enviando ? "Cadastrando…" : "Cadastrar usuário"}
            </PrimaryButton>
          </div>
        </form>
      )}

      {erro && <ErrorText>{erro}</ErrorText>}
      {!usuarios && !erro && <p className="text-sm text-neutral-600">Carregando…</p>}
      {usuarios && usuarios.length === 0 && <p className="text-sm text-neutral-600">Nenhum usuário cadastrado.</p>}

      {usuarios && usuarios.length > 0 && (
        <div className="overflow-x-auto rounded-brand border border-secondary-subtle-border bg-neutral-100">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-secondary-subtle-border bg-[#66B95D] text-white">
                <th className="px-4 py-3 text-left font-bold">Usuário</th>
                <th className="px-4 py-3 text-left font-bold">Papel</th>
                <th className="px-4 py-3 text-left font-bold">Status</th>
                <th className="px-4 py-3 text-left font-bold" />
              </tr>
            </thead>
            <tbody>
              {usuarios.map((usuario) => (
                <LinhaUsuario
                  key={usuario.id}
                  usuario={usuario}
                  empresas={empresas ?? []}
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
