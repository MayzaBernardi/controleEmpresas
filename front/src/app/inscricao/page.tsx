"use client";

import { useState, type FormEvent } from "react";
import { PollenLogo } from "@/components/PollenLogo";
import { ErrorText, Field, Input, PrimaryButton } from "@/components/form";
import { apiFetch, ApiError } from "@/lib/api";

// RF-01/RN-04: rota pública, sem autenticação — pensada pra ser enviada por link direto
// (copiado na tela interna de Formulários de Inscrição) pra qualquer empresa interessada.
const CAMPOS_INICIAIS = { razao_social: "", cnpj: "", telefone: "", cidade: "", uf: "", email_contato: "" };

// Conteúdo provisório — a equipe vai mandar o material oficial de benefícios pra substituir
// isto (ver conversa de 2026-09-16). Estrutura genérica de parque científico/tecnológico.
const BENEFICIOS = [
  {
    titulo: "Espaço físico no campus",
    descricao: "Salas e áreas compartilhadas (coworking, auditório) dentro do Pollen Parque.",
  },
  {
    titulo: "Exposição institucional",
    descricao: "Presença na comunicação e nos eventos do programa como empresa afiliada.",
  },
  {
    titulo: "Rede de relacionamento",
    descricao: "Acesso à comunidade de empresas, pesquisadores e parceiros do parque.",
  },
  {
    titulo: "Suporte da equipe do programa",
    descricao: "Acompanhamento dedicado durante todo o processo de afiliação e vigência do contrato.",
  },
];

export default function InscricaoPage() {
  const [aba, setAba] = useState<"formulario" | "beneficios">("formulario");
  const [campos, setCampos] = useState(CAMPOS_INICIAIS);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  function atualizarCampo<K extends keyof typeof CAMPOS_INICIAIS>(campo: K, valor: string) {
    setCampos((atual) => ({ ...atual, [campo]: valor }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      await apiFetch("/formulario-respostas", {
        method: "POST",
        body: {
          email_contato: campos.email_contato,
          payload_respostas: {
            razao_social: campos.razao_social,
            cnpj: campos.cnpj || undefined,
            telefone: campos.telefone || undefined,
            cidade: campos.cidade || undefined,
            uf: campos.uf || undefined,
          },
        },
      });
      setEnviado(true);
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível enviar. Tente novamente em instantes.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-1 justify-center bg-neutral-100 px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <PollenLogo textClassName="text-4xl text-foreground" />
          <p className="mt-2 text-sm text-neutral-600">Inscrição de empresas afiliadas</p>
        </div>

        <div className="mb-6 flex justify-center gap-2">
          <button
            type="button"
            onClick={() => setAba("formulario")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              aba === "formulario" ? "bg-primary text-primary-foreground" : "bg-white text-foreground hover:bg-neutral-100"
            }`}
          >
            Formulário
          </button>
          <button
            type="button"
            onClick={() => setAba("beneficios")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              aba === "beneficios" ? "bg-primary text-primary-foreground" : "bg-white text-foreground hover:bg-neutral-100"
            }`}
          >
            Benefícios de ser afiliado
          </button>
        </div>

        {aba === "beneficios" && (
          <div className="rounded-brand bg-white p-6 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              {BENEFICIOS.map((beneficio) => (
                <div key={beneficio.titulo} className="rounded-brand border border-secondary-subtle-border bg-secondary-subtle p-4">
                  <p className="font-display font-semibold text-secondary-foreground">{beneficio.titulo}</p>
                  <p className="mt-1 text-sm text-secondary-foreground/80">{beneficio.descricao}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {aba === "formulario" && !enviado && (
          <form onSubmit={handleSubmit} className="rounded-brand bg-white p-6 shadow-sm">
            <h1 className="font-display text-lg font-semibold text-foreground">Dados da empresa</h1>
            <p className="mt-1 text-sm text-neutral-600">
              Preencha os dados abaixo — a equipe do Pollen Parque vai entrar em contato após a análise.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Razão social" htmlFor="razao_social" className="sm:col-span-2">
                <Input
                  id="razao_social"
                  required
                  value={campos.razao_social}
                  onChange={(e) => atualizarCampo("razao_social", e.target.value)}
                />
              </Field>
              <Field label="E-mail de contato" htmlFor="email_contato">
                <Input
                  id="email_contato"
                  type="email"
                  required
                  value={campos.email_contato}
                  onChange={(e) => atualizarCampo("email_contato", e.target.value)}
                />
              </Field>
              <Field label="CNPJ" htmlFor="cnpj">
                <Input id="cnpj" value={campos.cnpj} onChange={(e) => atualizarCampo("cnpj", e.target.value)} />
              </Field>
              <Field label="Telefone" htmlFor="telefone">
                <Input id="telefone" value={campos.telefone} onChange={(e) => atualizarCampo("telefone", e.target.value)} />
              </Field>
              <Field label="Cidade" htmlFor="cidade">
                <Input id="cidade" value={campos.cidade} onChange={(e) => atualizarCampo("cidade", e.target.value)} />
              </Field>
              <Field label="UF" htmlFor="uf">
                <Input id="uf" maxLength={2} value={campos.uf} onChange={(e) => atualizarCampo("uf", e.target.value.toUpperCase())} />
              </Field>
            </div>

            {erro && (
              <div className="mt-4">
                <ErrorText>{erro}</ErrorText>
              </div>
            )}

            <PrimaryButton type="submit" disabled={enviando} className="mt-6 w-full">
              {enviando ? "Enviando…" : "Enviar inscrição"}
            </PrimaryButton>
          </form>
        )}

        {aba === "formulario" && enviado && (
          <div className="rounded-brand border border-secondary-subtle-border bg-secondary-subtle p-6 text-center">
            <p className="font-display text-lg font-semibold text-secondary-foreground">Inscrição enviada!</p>
            <p className="mt-1 text-sm text-secondary-foreground/80">
              Recebemos os seus dados — a equipe do Pollen Parque vai entrar em contato em breve.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
