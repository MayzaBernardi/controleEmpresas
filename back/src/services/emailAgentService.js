'use strict';

const { GoogleGenAI } = require('@google/genai');
const config = require('../config/env');
const ApiError = require('../utils/ApiError');

// RF-04/RN-24/RN-28: gera a sugestão de corpo de e-mail (ponto de partida, sempre revisado por
// humano antes de aprovar/enviar) a partir só do assunto, usando a API do Gemini. Quem persiste
// o rascunho é comunicacoesService.criarRascunho — este módulo só gera texto.
//
// Modelo 'gemini-3.6-flash': 'gemini-2.5-flash' (nome usado no quickstart do pacote
// @google/genai) responde 404 "no longer available to new users" para a chave configurada;
// confirmado via chamada real à API antes de integrar.
const MODEL = 'gemini-3.6-flash';

const SYSTEM_INSTRUCTION =
  'Você escreve e-mails para a equipe do programa de afiliação de empresas do Pollen Parque ' +
  '(um parque tecnológico) endereçados às empresas afiliadas ou candidatas à afiliação. Escreva ' +
  'sempre em português do Brasil, em tom profissional, cordial e conciso. Responda apenas com o ' +
  'corpo do e-mail em HTML simples, usando somente tags <p> (sem <html>, <head> ou <body>, sem ' +
  'markdown, sem comentários ou explicações antes/depois do HTML).';

let client = null;
function getClient() {
  if (!config.GEMINI_API_KEY) {
    throw new ApiError(503, 'Integração com o Gemini não está configurada (GEMINI_API_KEY ausente).');
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });
  }
  return client;
}

// Gera um corpo de e-mail em HTML a partir apenas do assunto informado. Lança ApiError em
// qualquer falha (chave inválida, quota, rede, resposta vazia/bloqueada) — quem chamar decide
// como reagir (ex.: no front, cair para o template local em src/lib/sugestaoEmail.ts).
async function sugerirCorpoEmail(assunto) {
  if (!assunto || !assunto.trim()) {
    throw new ApiError(400, 'assunto é obrigatório para gerar a sugestão de corpo.');
  }

  const ai = getClient();

  let response;
  try {
    response = await ai.models.generateContent({
      model: MODEL,
      contents: `Assunto do e-mail: "${assunto.trim()}"`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
    });
  } catch (error) {
    // Não repassa o erro bruto do Gemini pro cliente (pode conter detalhes internos da API do
    // provedor) — só loga no servidor e sobe um ApiError com mensagem segura, como
    // wrapSequelizeErrors faz para erros do banco.
    console.error('Erro ao chamar a API do Gemini:', error);
    throw new ApiError(502, 'Não foi possível gerar a sugestão de corpo com o Gemini no momento. Tente novamente em instantes.');
  }

  const corpoHtml = response?.text?.trim();
  if (!corpoHtml) {
    throw new ApiError(502, 'O Gemini não retornou nenhum conteúdo para o assunto informado.');
  }

  return corpoHtml;
}

module.exports = {
  sugerirCorpoEmail,
};
