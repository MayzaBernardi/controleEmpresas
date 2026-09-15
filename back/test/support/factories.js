"use strict";

const crypto = require("crypto");

/**
 * Gera uma string de 14 dígitos numéricos, única o bastante para não colidir com a
 * constraint UNIQUE de `empresas.cnpj` entre testes/execuções paralelas. O validator
 * de RN-32 (Empresa.js) só confere a QUANTIDADE de dígitos, não dígito verificador
 * real, então não precisa ser um CNPJ válido de verdade.
 */
function cnpjUnico() {
  return String(crypto.randomInt(10_000_000_000_000, 99_999_999_999_999));
}

/** Mesmo CNPJ de `cnpjUnico()`, mas formatado com a máscara comum (00.000.000/0000-00). */
function cnpjMascaradoUnico() {
  const digitos = cnpjUnico();
  return `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}/${digitos.slice(8, 12)}-${digitos.slice(12, 14)}`;
}

function emailUnico(prefixo = "usuario") {
  return `${prefixo}-${crypto.randomUUID()}@example.com`;
}

function textoUnico(prefixo) {
  return `${prefixo} ${crypto.randomUUID()}`;
}

/**
 * "Hoje" calculado EXATAMENTE como os getters virtuais de Contrato (`estaVencido`,
 * `estaProximoVencimento`) e FinanceiroLancamento (`estaAtrasado`) calculam a
 * referência de "hoje": `new Date(new Date().toDateString())`.
 *
 * Isso é proposital: usar essa mesma expressão aqui (em vez de, por exemplo,
 * `new Date().toISOString().slice(0,10)`) garante que os offsets de data construídos
 * pelos testes fiquem consistentes com o que o model vai efetivamente comparar,
 * independente do fuso horário do servidor rodando a suíte — sem precisar de datas
 * fixas hardcoded (que expirariam sozinhas com o tempo).
 *
 * Ver observação sobre o bug de fuso horário nesses getters relatado na resposta
 * final desta tarefa: os testes aqui usam offsets longe de qualquer fronteira
 * (hoje / hoje+60) para não depender desse comportamento incorreto.
 */
function hojeConformeModel() {
  return new Date(new Date().toDateString());
}

function paraDateOnly(date) {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, "0");
  const dia = String(date.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

/** Data (formato YYYY-MM-DD) a partir de hoje + `dias` (aceita negativo). */
function dataOffsetDias(dias) {
  const base = hojeConformeModel();
  base.setDate(base.getDate() + dias);
  return paraDateOnly(base);
}

module.exports = {
  cnpjUnico,
  cnpjMascaradoUnico,
  emailUnico,
  textoUnico,
  hojeConformeModel,
  paraDateOnly,
  dataOffsetDias,
};
