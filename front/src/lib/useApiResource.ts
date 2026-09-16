"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "./api";
import { useAuth } from "./auth";

// Centraliza o padrão repetido em toda tela de listagem: busca ao montar, usa o token da
// sessão, redireciona pro /login em 401, e expõe um jeito de recarregar após uma mutação.
export function useApiResource<T>(path: string | null) {
  const router = useRouter();
  const { token, logout } = useAuth();
  const [dados, setDados] = useState<T | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [versao, setVersao] = useState(0);

  const recarregar = useCallback(() => setVersao((v) => v + 1), []);

  useEffect(() => {
    if (!token || !path) return;

    let cancelado = false;
    // Limpa erro de uma tentativa anterior antes de disparar a nova — path/token/versao
    // mudando é justamente o sinal de que uma nova busca está começando.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setErro(null);

    apiFetch<T>(path, { token })
      .then((resultado) => {
        if (!cancelado) setDados(resultado);
      })
      .catch((error: unknown) => {
        if (cancelado) return;
        if (error instanceof ApiError && error.status === 401) {
          logout();
          router.replace("/login");
          return;
        }
        setErro(error instanceof ApiError ? error.message : "Não foi possível carregar os dados.");
      });

    return () => {
      cancelado = true;
    };
  }, [path, token, logout, router, versao]);

  return { dados, erro, recarregar, token };
}
