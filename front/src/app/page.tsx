"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, rotaInicialPorPapel } from "@/lib/auth";

export default function Home() {
  const router = useRouter();
  const { usuario, carregando } = useAuth();

  useEffect(() => {
    if (carregando) return;
    router.replace(usuario ? rotaInicialPorPapel(usuario.papel) : "/login");
  }, [carregando, usuario, router]);

  return null;
}
