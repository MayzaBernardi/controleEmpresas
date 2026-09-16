"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth, type Usuario } from "@/lib/auth";
import { PollenLogo } from "@/components/PollenLogo";

interface DevLoginResposta {
  token: string;
  usuario: Usuario;
}

export default function LoginPage() {
  const router = useRouter();
  const { usuario, carregando, login } = useAuth();
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!carregando && usuario) {
      router.replace("/empresas");
    }
  }, [carregando, usuario, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    setEnviando(true);

    try {
      const resposta = await apiFetch<DevLoginResposta>("/auth/dev-login", {
        method: "POST",
        body: { email },
      });
      login(resposta.token, resposta.usuario);
      router.push("/empresas");
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível conectar ao servidor.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    // Fundo preto fixo (não acompanha o tema claro/escuro do sistema) — é a mesma
    // identidade visual do site institucional, deliberadamente igual nas duas telas.
    <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-black px-4 py-16">
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[36rem] -translate-x-1/2 rounded-full opacity-25 blur-[100px]"
        style={{ background: "radial-gradient(circle, #cfff92 0%, transparent 70%)" }}
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-10 text-center">
          <PollenLogo textClassName="text-5xl text-white" />
          <p className="mt-3 text-xs font-semibold tracking-[0.2em] text-white/70">
            PARQUE CIENTÍFICO E TECNOLÓGICO
          </p>
          <p className="mt-4 text-sm text-white/50">Painel de gestão de afiliados</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-brand bg-white p-8 shadow-2xl shadow-black/40">
          <h1 className="font-display text-xl font-semibold text-black">Entrar no painel</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Acesso institucional da equipe do Pollen Parque.
          </p>

          <label htmlFor="email" className="mt-6 block text-sm font-medium text-black">
            E-mail institucional
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoFocus
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="nome.sobrenome@pollenparque.org.br"
            className="mt-2 w-full rounded-brand border border-gray-200 bg-white px-4 py-2.5 text-sm text-black outline-none focus:border-[#53663a] focus:ring-2 focus:ring-secondary"
          />

          {erro && (
            <p className="mt-4 rounded-brand bg-danger/10 px-4 py-2.5 text-sm text-danger">{erro}</p>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="mt-6 w-full rounded-full bg-black px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-black/85 disabled:opacity-60"
          >
            {enviando ? "Entrando…" : "Entrar"}
          </button>

          <p className="mt-6 rounded-brand border border-[#ecffd3] bg-[#f5ffe9] px-4 py-3 text-xs text-[#53663a]">
            Ambiente de desenvolvimento: o login institucional (SSO) ainda não foi implementado
            (ADR 0003). Use o e-mail de um usuário já cadastrado, ex.:{" "}
            <span className="font-medium">ana.ribeiro@pollenparque.org.br</span> (equipe do
            programa) ou <span className="font-medium">carla.souza@pollenparque.org.br</span>{" "}
            (contabilidade).
          </p>
        </form>
      </div>
    </div>
  );
}
