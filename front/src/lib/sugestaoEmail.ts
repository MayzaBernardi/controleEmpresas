// Sugestão de corpo de e-mail por modelo/template local. Desde 2026-09-16 a sugestão "de
// verdade" é gerada pela IA (Gemini), via POST /comunicacoes-email/sugestao-corpo — esta função
// serve como FALLBACK, usada pela página de comunicações quando a chamada à API falha (rede,
// Gemini fora do ar, etc.), pra nunca deixar o campo vazio nem quebrar a tela. Escolhe um
// template por palavra-chave no assunto; cai num genérico se nada bater. Sempre marcado como
// ponto de partida — a equipe revisa/edita antes de aprovar (RN-28).
export function sugerirCorpoEmail(assunto: string): string {
  const texto = assunto.toLowerCase();

  if (/(bem[- ]?vind|boas[- ]?vindas)/.test(texto)) {
    return "<p>Olá! Seja bem-vindo(a) ao programa de afiliados do Pollen Parque.</p><p>Estamos à disposição para o que precisar durante o seu processo de afiliação.</p>";
  }

  if (/(vencimento|renova)/.test(texto)) {
    return "<p>Olá! O seu contrato encontra-se em período de renovação.</p><p>Por gentileza, contate a nossa equipe para dar continuidade à renovação e seguir aproveitando os benefícios de ser um afiliado Pollen Parque.</p>";
  }

  if (/(vencid|expirad)/.test(texto)) {
    return "<p>Olá! Identificamos que o seu contrato está vencido.</p><p>Entre em contato com a nossa equipe para renovar e voltar a aproveitar dos benefícios de ser um afiliado Pollen Parque.</p>";
  }

  if (/(débito|debito|atraso|cobran[cç]a|pagamento)/.test(texto)) {
    return "<p>Olá! Identificamos um débito em aberto referente à sua anuidade no Pollen Parque.</p><p>Por gentileza, entre em contato com a nossa contabilidade para regularizar a situação.</p>";
  }

  if (/(document)/.test(texto)) {
    return "<p>Olá! Notamos uma pendência relacionada aos documentos do seu processo de afiliação.</p><p>Por favor, acesse o painel ou entre em contato com a nossa equipe para mais detalhes.</p>";
  }

  return `<p>Olá!</p><p>Escrevemos sobre: <strong>${assunto}</strong>.</p><p>Fico à disposição para qualquer dúvida.</p>`;
}
