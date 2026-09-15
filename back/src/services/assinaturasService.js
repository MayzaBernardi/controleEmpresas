'use strict';

const ApiError = require('../utils/ApiError');
const wrapSequelizeErrors = require('../utils/wrapSequelizeErrors');

const CAMPOS_ATUALIZACAO = ['status', 'data_assinatura', 'observacoes', 'nome_signatario', 'email_signatario'];

function somenteCamposPermitidos(body, camposPermitidos) {
  const dados = {};
  for (const campo of camposPermitidos) {
    if (Object.prototype.hasOwnProperty.call(body, campo)) {
      dados[campo] = body[campo];
    }
  }
  return dados;
}

// RN-33: busca o Contrato pai primeiro e aplica o mesmo padrão seguro de isolamento
// (findByPk + checagem manual, nunca scope+findByPk juntos) — se a empresa_afiliada não
// é dona do contrato, o contrato "não existe" para ela (404, nunca 403).
async function listarPorContrato(contratoId, { usuario, models } = {}) {
  const db = models || require('../models');
  const contrato = await db.Contrato.findByPk(contratoId);
  if (!contrato) {
    throw new ApiError(404, 'Contrato não encontrado.');
  }
  if (usuario?.papel === 'empresa_afiliada' && contrato.empresa_id !== usuario.empresaId) {
    throw new ApiError(404, 'Contrato não encontrado.');
  }
  return db.Assinatura.findAll({ where: { contrato_id: contratoId } });
}

async function atualizar(id, body, { models } = {}) {
  const db = models || require('../models');
  const assinatura = await db.Assinatura.findByPk(id);
  if (!assinatura) {
    throw new ApiError(404, 'Assinatura não encontrada.');
  }
  const dados = somenteCamposPermitidos(body, CAMPOS_ATUALIZACAO);
  Object.assign(assinatura, dados);
  return wrapSequelizeErrors(assinatura.save());
}

module.exports = {
  listarPorContrato,
  atualizar,
};
