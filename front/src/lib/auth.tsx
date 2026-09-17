"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Papel = "equipe_programa" | "empresa_afiliada" | "contabilidade";

// Primeiro módulo do menu de cada papel (ver MODULOS_* em app/(app)/layout.tsx) — usado para
// saber pra onde mandar o usuário logo após o login, em vez de sempre cair em /empresas.
const ROTA_INICIAL_POR_PAPEL: Record<Papel, string> = {
  contabilidade: "/financeiro-lancamentos",
  empresa_afiliada: "/minha-empresa",
  equipe_programa: "/empresas",
};

export function rotaInicialPorPapel(papel: Papel): string {
  return ROTA_INICIAL_POR_PAPEL[papel] ?? "/empresas";
}

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  papel: Papel;
  empresaId: string | null;
}

interface Sessao {
  token: string;
  usuario: Usuario;
}

// Armazenamento client-side (localStorage) como provisório: o back ainda não implementa
// o SSO institucional real (RN-02/ADR 0003), só o atalho de dev POST /auth/dev-login.
// Quando o Auth.js entrar, isso deve virar sessão via cookie httpOnly emitido pelo servidor.
const STORAGE_KEY = "pollen.sessao";

function lerSessao(): Sessao | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Sessao;
  } catch {
    return null;
  }
}

function salvarSessao(sessao: Sessao) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessao));
}

function limparSessaoStorage() {
  window.localStorage.removeItem(STORAGE_KEY);
}

interface AuthContextValue {
  usuario: Usuario | null;
  token: string | null;
  carregando: boolean;
  login: (token: string, usuario: Usuario) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    // Hidratação única a partir de localStorage (armazenamento externo, só existe no
    // cliente) — precisa ser efeito para não quebrar o HTML gerado no servidor.
    const sessao = lerSessao();
    if (sessao) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUsuario(sessao.usuario);
      setToken(sessao.token);
    }
    setCarregando(false);
  }, []);

  function login(novoToken: string, novoUsuario: Usuario) {
    salvarSessao({ token: novoToken, usuario: novoUsuario });
    setToken(novoToken);
    setUsuario(novoUsuario);
  }

  function logout() {
    limparSessaoStorage();
    setToken(null);
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, token, carregando, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth precisa ser usado dentro de <AuthProvider>.");
  }
  return ctx;
}
