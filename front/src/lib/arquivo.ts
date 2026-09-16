// Upload de contrato/documento vira base64 direto no body JSON (armazenado no Postgres,
// sem storage externo — decisão do negócio em 2026-09-16). O teto de 8MB evita estourar o
// limite de 15mb do body parser (back/src/app.js) já contando a inflação de ~33% do base64.
export const TAMANHO_MAXIMO_ARQUIVO = 8 * 1024 * 1024;

export interface ArquivoLido {
  nome: string;
  mimetype: string;
  base64: string;
}

export function lerArquivoComoBase64(file: File): Promise<ArquivoLido> {
  if (file.size > TAMANHO_MAXIMO_ARQUIVO) {
    return Promise.reject(new Error("Arquivo muito grande — o limite é 8MB."));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    reader.onload = () => {
      const resultado = reader.result as string;
      const base64 = resultado.split(",")[1] ?? "";
      resolve({ nome: file.name, mimetype: file.type || "application/octet-stream", base64 });
    };
    reader.readAsDataURL(file);
  });
}

export function abrirArquivoBase64(base64: string, mimetype: string) {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i += 1) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  const blob = new Blob([new Uint8Array(byteNumbers)], { type: mimetype });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
