'use strict';

const fs = require('fs');
const path = require('path');
const util = require('util');
const Docxtemplater = require('docxtemplater');
const PizZip = require('pizzip');
const libre = require('libreoffice-convert');
const extenso = require('extenso');

libre.convertAsync = util.promisify(libre.convert);
libre.convertWithOptionsAsync = util.promisify(libre.convertWithOptions);

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

// Caminhos onde o binário soffice costuma aparecer, variando por distro/container —
// SOFFICE_BIN permite forçar um caminho específico quando nenhum destes bate.
function sofficeCandidates() {
  const candidatos = [];
  if (process.env.SOFFICE_BIN) candidatos.push(process.env.SOFFICE_BIN);
  candidatos.push(
    '/usr/bin/soffice',
    '/usr/bin/libreoffice',
    '/snap/bin/libreoffice',
    '/usr/lib/libreoffice/program/soffice',
    '/opt/libreoffice/program/soffice',
  );
  return candidatos;
}

function formatarData(data) {
  if (!data) return null;

  if (data instanceof Date) {
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    return `${dia}/${mes}/${data.getFullYear()}`;
  }

  if (typeof data === 'number') return formatarData(new Date(data));

  if (typeof data === 'string') {
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(data)) return data;
    const isoDate = new Date(data);
    if (!isNaN(isoDate)) return formatarData(isoDate);
    return data;
  }

  return String(data);
}

function formatarCPF(cpf) {
  if (!cpf) return '';
  const limpo = cpf.toString().replace(/\D/g, '');
  if (limpo.length !== 11) return cpf;
  return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function numeroPorExtenso(valor) {
  if (valor === null || valor === undefined) return extenso(0);
  const numerico = typeof valor === 'string'
    ? parseFloat(valor.replace(/[^\d,.-]/g, '').replace(',', '.'))
    : Number(valor);
  return extenso(isNaN(numerico) ? 0 : numerico);
}

/**
 * Preenche um template .docx com `dados` e converte o resultado em PDF (via LibreOffice).
 * Tags do template ausentes em `dados` viram string vazia (nullGetter) em vez de derrubar
 * o render — ao contrário de exigir uma lista fixa de variáveis conhecidas de antemão.
 * DIA/MES/ANO são preenchidos automaticamente com a data atual, mas podem ser sobrescritos
 * em `dados`.
 *
 * @param {string} templateArquivo - caminho (absoluto ou relativo a este arquivo) do .docx
 * @param {Object} [dados] - pares tag/valor a mesclar no template
 * @returns {Promise<string>} PDF gerado, em base64
 */
async function gerarPdf(templateArquivo, dados = {}) {
  if (!templateArquivo) {
    throw new Error('Caminho do template não informado');
  }

  const templatePath = path.isAbsolute(templateArquivo)
    ? templateArquivo
    : path.resolve(__dirname, templateArquivo);

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template não encontrado: ${templatePath}`);
  }

  const hoje = new Date();
  const dadosMesclagem = {
    DIA: hoje.getDate(),
    MES: MESES[hoje.getMonth()],
    ANO: hoje.getFullYear(),
    ...dados,
  };

  const zip = new PizZip(fs.readFileSync(templatePath, 'binary'));
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => '',
  });

  doc.render(dadosMesclagem);

  const docxBuffer = doc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  });

  const candidatos = sofficeCandidates();
  try {
    const pdfBuffer = await libre.convertWithOptionsAsync(docxBuffer, '.pdf', undefined, {
      sofficeBinaryPaths: candidatos,
    });
    return pdfBuffer.toString('base64');
  } catch (primeiroErro) {
    try {
      const pdfBuffer = await libre.convertAsync(docxBuffer, '.pdf', undefined);
      return pdfBuffer.toString('base64');
    } catch (erroFallback) {
      erroFallback.message = `${erroFallback.message} | Tentativas de localizar soffice: ${candidatos.join(', ')}`;
      throw erroFallback;
    }
  }
}

module.exports = gerarPdf;
module.exports.numeroPorExtenso = numeroPorExtenso;
