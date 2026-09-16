const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  token?: string | null;
}

// Espelha o contrato do back/ (docs/api/mapeamento-geral.md): sucesso é o JSON puro,
// erro é sempre `{ "error": "mensagem" }`.
export async function apiFetch<T>(path: string, { body, token, headers, ...rest }: ApiFetchOptions = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.error ?? "Erro inesperado ao comunicar com o servidor.";
    throw new ApiError(response.status, message);
  }

  return data as T;
}
