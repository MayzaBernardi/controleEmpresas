import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gera .next/standalone (servidor Node mínimo + só as dependências realmente usadas) —
  // usado pelo Dockerfile de produção pra não precisar copiar node_modules inteiro na imagem.
  output: "standalone",
};

export default nextConfig;
