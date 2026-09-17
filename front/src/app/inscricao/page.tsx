"use client";

import { useState, type FormEvent } from "react";
import { PollenLogo } from "@/components/PollenLogo";
import { ErrorText, PrimaryButton } from "@/components/form";
import { apiFetch, ApiError } from "@/lib/api";

// RF-01/RN-04: rota pública, sem autenticação — pensada pra ser enviada por link direto
// (copiado na tela interna de Formulários de Inscrição) pra qualquer empresa interessada.
const CAMPOS_INICIAIS = { razao_social: "", cnpj: "", telefone: "", cidade: "", uf: "", email_contato: "" };

const CAMPO_CLARO_CLASSES =
  "mt-1.5 w-full rounded-brand border border-gray-200 bg-white px-3 py-2 text-sm text-black outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30";

// Benefícios oficiais de afiliação ao Pollen Parque Científico e Tecnológico — texto
// institucional fornecido pela equipe (2026-09-17), mantido na íntegra (cláusulas
// numeradas em algarismos romanos, sem paráfrase).
const BENEFICIOS = [
  {
    numero: "I",
    texto:
      "Acesso à informações institucionais e participação preferencial em eventos promovidos pelo Pollen Parque Científico e Tecnológico.",
  },
  {
    numero: "II",
    texto:
      "Utilização dos espaços de coworking do Pollen Parque, mediante reserva prévia e conforme disponibilidade, limitada a até 12 (doze) acessos gratuitos por ano.",
  },
  {
    numero: "III",
    texto: "Direito a 1 (uma) reserva anual gratuita da Sala do Ático, mediante reserva prévia e conforme disponibilidade.",
  },
  {
    numero: "IV",
    texto: "Direito a 1 (uma) reserva anual gratuita do Auditório Cooperativas, mediante reserva prévia e conforme disponibilidade.",
  },
  {
    numero: "V",
    texto:
      "Acesso prioritário a informações relacionadas a editais de fomento, chamadas públicas e oportunidades de financiamento à inovação.",
  },
  {
    numero: "VI",
    texto:
      "Exposição da marca da AFILIADA NÃO RESIDENTE no telão da recepção do Pollen Parque Científico e Tecnológico, de forma contínua, observados o padrão institucional e as diretrizes.",
  },
  {
    numero: "VII",
    texto: "Inserção da marca da AFILIADA NÃO RESIDENTE no espaço destinado aos afiliados no site institucional do Pollen Parque.",
  },
  {
    numero: "VIII",
    texto:
      "Possibilidade de utilização de áreas comuns, laboratórios, unidades de pesquisas e outros espaços disponibilizados pela Unochapecó, mediante negociação prévia com o setor de Prestação de Serviços, observadas as normas internas e disponibilidade.",
  },
  {
    numero: "IX",
    texto:
      "Integração à Rede Catarinense de Centros de Inovação (RCCI), podendo acessar oportunidades de conexão, programas, eventos, parcerias, serviços e infraestrutura pelos Centros Integrantes da Rede, conforme regras e disponibilidade de cada instituição.",
  },
  {
    numero: "X",
    texto:
      "Concessão de desconto de 15% (quinze) sobre cotas de patrocínio para eventos promovidos pelo Pollen Parque, conforme condições e critérios definidos especificamente para cada evento.",
  },
  {
    numero: "XI",
    texto:
      "Possibilidade de utilização de endereço fiscal, mediante análise e aprovação prévia da Diretoria Executiva do Pollen Parque, observada a legislação aplicável.",
  },
  {
    numero: "XII",
    texto:
      "Emissão de declaração formal de vínculo institucional, a critério do Pollen Parque Científico, atestando a afiliação da empresa a ambiente de inovação integrante do sistema Catarinense de Inovação, para fins de comprovação institucional junto a editais, programas de fomento, agentes financiadores e demais oportunidades que exijam vinculação a Parques Científicos e Tecnológicos.",
  },
  {
    numero: "XIII",
    texto:
      "Utilizar, quando solicitado e devidamente autorizado, os espaços temporariamente cedidos para reuniões, eventos ou atividades exclusivamente para os fins aprovados, responsabilizando-se por qualquer dano decorrente de uso indevido, bem como pelo pagamento das taxas aplicáveis, quando houver.",
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
    <div className="relative flex flex-1 justify-center overflow-hidden bg-neutral-100 px-4 py-12">
      <div
        className="pointer-events-none absolute -top-32 left-1/2 h-80 w-[32rem] -translate-x-1/2 rounded-full opacity-25 blur-[100px]"
        style={{ background: "radial-gradient(circle, #cfff92 0%, transparent 70%)" }}
      />
      <div className="relative w-full max-w-3xl">
        <div className="mb-10 text-center">
          <PollenLogo textClassName="text-6xl text-foreground" />
          <p className="mt-3 text-sm text-neutral-600">Inscrição de empresas afiliadas</p>
        </div>

        <div className="mb-6 flex justify-center gap-2">
          <button
            type="button"
            onClick={() => setAba("formulario")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              aba === "formulario" ? "bg-primary text-primary-foreground" : "bg-white text-neutral-700 hover:bg-gray-100"
            }`}
          >
            Formulário
          </button>
          <button
            type="button"
            onClick={() => setAba("beneficios")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              aba === "beneficios" ? "bg-primary text-primary-foreground" : "bg-white text-neutral-700 hover:bg-gray-100"
            }`}
          >
            Benefícios de ser afiliado
          </button>
        </div>

        {aba === "beneficios" && (
          <div className="rounded-brand bg-white p-6 shadow-sm">
            <h1 className="font-display text-lg font-semibold text-black">Benefícios de ser um afiliado</h1>
            <p className="mt-1 text-sm text-neutral-600">
              Direitos garantidos às empresas afiliadas ao Pollen Parque Científico e Tecnológico.
            </p>

            <div className="mt-5 grid gap-3">
              {BENEFICIOS.map((beneficio) => (
                <div key={beneficio.numero} className="flex gap-4 rounded-brand border border-gray-200 bg-gray-50 p-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-white">
                    {beneficio.numero}
                  </span>
                  <p className="text-sm leading-relaxed text-neutral-700">{beneficio.texto}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {aba === "formulario" && !enviado && (
          <form onSubmit={handleSubmit} className="rounded-brand bg-white p-6 shadow-sm">
            <h1 className="font-display text-lg font-semibold text-black">Dados da empresa</h1>
            <p className="mt-1 text-sm text-neutral-600">
              Preencha os dados abaixo — a equipe do Pollen Parque vai entrar em contato após a análise.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="razao_social" className="block text-sm font-medium text-black">
                  Razão social
                </label>
                <input
                  id="razao_social"
                  required
                  value={campos.razao_social}
                  onChange={(e) => atualizarCampo("razao_social", e.target.value)}
                  className={CAMPO_CLARO_CLASSES}
                />
              </div>
              <div>
                <label htmlFor="email_contato" className="block text-sm font-medium text-black">
                  E-mail de contato
                </label>
                <input
                  id="email_contato"
                  type="email"
                  required
                  value={campos.email_contato}
                  onChange={(e) => atualizarCampo("email_contato", e.target.value)}
                  className={CAMPO_CLARO_CLASSES}
                />
              </div>
              <div>
                <label htmlFor="cnpj" className="block text-sm font-medium text-black">
                  CNPJ
                </label>
                <input
                  id="cnpj"
                  value={campos.cnpj}
                  onChange={(e) => atualizarCampo("cnpj", e.target.value)}
                  className={CAMPO_CLARO_CLASSES}
                />
              </div>
              <div>
                <label htmlFor="telefone" className="block text-sm font-medium text-black">
                  Telefone
                </label>
                <input
                  id="telefone"
                  value={campos.telefone}
                  onChange={(e) => atualizarCampo("telefone", e.target.value)}
                  className={CAMPO_CLARO_CLASSES}
                />
              </div>
              <div>
                <label htmlFor="cidade" className="block text-sm font-medium text-black">
                  Cidade
                </label>
                <input
                  id="cidade"
                  value={campos.cidade}
                  onChange={(e) => atualizarCampo("cidade", e.target.value)}
                  className={CAMPO_CLARO_CLASSES}
                />
              </div>
              <div>
                <label htmlFor="uf" className="block text-sm font-medium text-black">
                  UF
                </label>
                <input
                  id="uf"
                  maxLength={2}
                  value={campos.uf}
                  onChange={(e) => atualizarCampo("uf", e.target.value.toUpperCase())}
                  className={CAMPO_CLARO_CLASSES}
                />
              </div>
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
