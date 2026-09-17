"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth, rotaInicialPorPapel, type Usuario } from "@/lib/auth";
import { PollenLogo } from "@/components/PollenLogo";

interface LoginResposta {
  token: string;
  usuario: Usuario;
}

export default function LoginPage() {
  const router = useRouter();
  const { usuario, carregando, login } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [mostrarDevLogin, setMostrarDevLogin] = useState(false);
  const [devEmail, setDevEmail] = useState("");
  const [devEnviando, setDevEnviando] = useState(false);
  const [devErro, setDevErro] = useState<string | null>(null);

  useEffect(() => {
    if (!carregando && usuario) {
      router.replace(rotaInicialPorPapel(usuario.papel));
    }
  }, [carregando, usuario, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    setEnviando(true);

    try {
      const resposta = await apiFetch<LoginResposta>("/auth/login", {
        method: "POST",
        body: { email, senha },
      });
      login(resposta.token, resposta.usuario);
      router.push(rotaInicialPorPapel(resposta.usuario.papel));
    } catch (error) {
      setErro(error instanceof ApiError ? error.message : "Não foi possível conectar ao servidor.");
    } finally {
      setEnviando(false);
    }
  }

  async function handleDevSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDevErro(null);
    setDevEnviando(true);

    try {
      const resposta = await apiFetch<LoginResposta>("/auth/dev-login", {
        method: "POST",
        body: { email: devEmail },
      });
      login(resposta.token, resposta.usuario);
      router.push(rotaInicialPorPapel(resposta.usuario.papel));
    } catch (error) {
      setDevErro(error instanceof ApiError ? error.message : "Não foi possível conectar ao servidor.");
    } finally {
      setDevEnviando(false);
    }
  }

  return (
    // Mesmo fundo escuro do resto do sistema (bg-neutral-100, ver globals.css) — o vídeo
    // institucional (baixado de pollenparque.com.br, banner da home) fica atrás de tudo, com
    // um véu escuro por cima pra manter o card branco e o texto legíveis.
    <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-neutral-100 px-4 py-16">
      <video
        autoPlay
        muted
        loop
        playsInline
        poster="/videos/pollen-banner-poster.jpg"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      >
        <source src="/videos/pollen-banner.webm" type="video/webm" />
        <source src="/videos/pollen-banner.mp4" type="video/mp4" />
      </video>
      <div className="pointer-events-none absolute inset-0 bg-black/70" />

      <div className="relative w-full max-w-sm">
        <div className="mb-10 text-center">
          <PollenLogo textClassName="text-7xl text-foreground" />
          <p className="mt-3 text-xs font-semibold tracking-[0.2em] text-white/70">
            PARQUE CIENTÍFICO E TECNOLÓGICO
          </p>
          <p className="mt-4 text-sm text-white/50">Painel de gestão de afiliados</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-brand bg-neutral-100 p-8 shadow-2xl shadow-black/40">
          <label htmlFor="email" className="block text-center text-sm font-medium text-foreground">
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
            className="mt-2 w-full rounded-brand border border-gray-300 bg-gray-200 px-4 py-2.5 text-sm text-black outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-300"
          />

          <label htmlFor="senha" className="mt-4 block text-center text-sm font-medium text-foreground">
            Senha
          </label>
          <input
            id="senha"
            name="senha"
            type="password"
            required
            value={senha}
            onChange={(event) => setSenha(event.target.value)}
            placeholder="••••••••"
            className="mt-2 w-full rounded-brand border border-gray-300 bg-gray-200 px-4 py-2.5 text-sm text-black outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-300"
          />

          {erro && (
            <p className="mt-4 rounded-brand bg-danger/10 px-4 py-2.5 text-sm text-danger">{erro}</p>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="mt-6 w-full rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-secondary hover:text-on-secondary disabled:opacity-60"
          >
            {enviando ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setMostrarDevLogin((atual) => !atual)}
            className="text-xs text-white/40 underline decoration-dotted underline-offset-2 hover:text-white/60"
          >
            Ambiente de desenvolvimento: entrar sem senha (dev-login)
          </button>

          {mostrarDevLogin && (
            <form
              onSubmit={handleDevSubmit}
              className="mt-3 rounded-brand border border-white/10 bg-white/5 p-4 text-left"
            >
              <label htmlFor="dev-email" className="block text-xs font-medium text-white/60">
                E-mail (sem senha)
              </label>
              <input
                id="dev-email"
                name="dev-email"
                type="email"
                required
                value={devEmail}
                onChange={(event) => setDevEmail(event.target.value)}
                placeholder="nome.sobrenome@pollenparque.org.br"
                className="mt-1.5 w-full rounded-brand border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-white/30"
              />

              {devErro && <p className="mt-2 text-xs text-danger">{devErro}</p>}

              <button
                type="submit"
                disabled={devEnviando}
                className="mt-3 w-full rounded-full bg-white/10 px-4 py-2 text-xs font-medium text-white/80 transition-colors hover:bg-white/20 disabled:opacity-60"
              >
                {devEnviando ? "Entrando…" : "Entrar sem senha"}
              </button>

              <p className="mt-3 text-[11px] leading-relaxed text-white/40">
                Atalho de desenvolvimento — funciona só fora de produção. Usuários
                recém-criados/sem senha definida ainda podem entrar assim. Ex.:{" "}
                <span className="text-white/60">ana.ribeiro@pollenparque.org.br</span> (equipe do
                programa) ou <span className="text-white/60">carla.souza@pollenparque.org.br</span>{" "}
                (contabilidade).
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
