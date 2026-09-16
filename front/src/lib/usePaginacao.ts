import { useEffect, useMemo, useState } from "react";

// Paginação client-side: a API sempre devolve a lista inteira (volumes pequenos, protótipo)
// — pagina-se em memória, sem mudar contrato de rota nenhum.
export function usePaginacao<T>(itens: T[] | null, porPagina = 12) {
  const [paginaAtual, setPaginaAtual] = useState(1);

  const totalItens = itens?.length ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(totalItens / porPagina));
  const paginaSegura = Math.min(paginaAtual, totalPaginas);

  // Volta pra página 1 sempre que a lista de origem mudar de tamanho (ex.: filtro/busca
  // aplicado) — sem isso o usuário podia ficar preso numa página que deixou de existir.
  useEffect(() => {
    setPaginaAtual(1);
  }, [totalItens]);

  const itensPaginados = useMemo(() => {
    if (!itens) return null;
    const inicio = (paginaSegura - 1) * porPagina;
    return itens.slice(inicio, inicio + porPagina);
  }, [itens, paginaSegura, porPagina]);

  return { paginaAtual: paginaSegura, setPaginaAtual, itensPaginados, totalPaginas, totalItens, porPagina };
}
