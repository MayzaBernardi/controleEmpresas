'use strict';

const ApiError = require('../utils/ApiError');
const wrapSequelizeErrors = require('../utils/wrapSequelizeErrors');

// RN-33: equipe_programa vê todos os documentos; empresa_afiliada só os vinculados à
// própria empresa (scope `paraEmpresa`, nunca defaultScope — ver Documento.js).
async function listar({ usuario, models } = {}) {
  const db = models || require('../models');
  if (usuario?.papel === 'empresa_afiliada') {
    return db.Documento.scope({ method: ['paraEmpresa', usuario.empresaId] }).findAll();
  }
  return db.Documento.findAll();
}

// RF-05: registra a referência de um documento enviado (upload do arquivo em si é infra à
// parte, fora de escopo — aqui só nome/URL do arquivo são persistidos).
// RN-33/IDOR: empresa_afiliada nunca decide de qual empresa é o documento — empresa_id é
// sempre forçado a partir do token (usuario.empresaId), ignorando qualquer empresa_id que
// venha no body. equipe_programa pode enviar em nome de qualquer empresa, mas precisa
// informar empresa_id explicitamente no body.
async function upload(body, { usuario, models } = {}) {
  const db = models || require('../models');

  if (!body?.tipo_documento) {
    throw new ApiError(400, 'tipo_documento é obrigatório.');
  }
  if (!body?.nome_arquivo) {
    throw new ApiError(400, 'nome_arquivo é obrigatório.');
  }
  if (!body?.url_arquivo) {
    throw new ApiError(400, 'url_arquivo é obrigatório.');
  }

  let empresaId;
  if (usuario?.papel === 'empresa_afiliada') {
    empresaId = usuario.empresaId;
  } else {
    empresaId = body.empresa_id;
    if (!empresaId) {
      throw new ApiError(400, 'empresa_id é obrigatório.');
    }
  }

  const dados = {
    empresa_id: empresaId,
    contrato_id: body.contrato_id ?? null,
    tipo_documento: body.tipo_documento,
    nome_arquivo: body.nome_arquivo,
    url_arquivo: body.url_arquivo,
    observacoes: body.observacoes ?? null,
  };

  return wrapSequelizeErrors(db.Documento.create(dados));
}

// RF-05 / RN-15: aprova ou rejeita um documento — só equipe_programa (checado na rota via
// requireRole, não repetido aqui). Sem checagem de isolamento RN-33: quem chama este fluxo
// já enxerga todos os documentos.
async function avaliar(id, body, { models } = {}) {
  const db = models || require('../models');
  const documento = await db.Documento.findByPk(id);
  if (!documento) {
    throw new ApiError(404, 'Documento não encontrado.');
  }
  if (body.status !== undefined) {
    documento.status = body.status;
  }
  if (body.observacoes !== undefined) {
    documento.observacoes = body.observacoes;
  }
  return wrapSequelizeErrors(documento.save());
}

module.exports = {
  listar,
  upload,
  avaliar,
};
