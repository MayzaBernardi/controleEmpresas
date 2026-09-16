'use strict';

const ApiError = require('../utils/ApiError');
const wrapSequelizeErrors = require('../utils/wrapSequelizeErrors');

const CAMPOS_CRIACAO = [
  'razao_social',
  'nome_fantasia',
  'cnpj',
  'identificador_estrangeiro',
  'tipo_empresa',
  'tipo_caso_especial',
  'descricao_caso_especial',
  'status_processo',
  'contatos',
  'observacoes',
  'telefone',
  'cidade',
  'uf',
  'representante_legal',
];

// 'ativo' só é atualizável, nunca setável na criação (toda empresa nova começa ativa) —
// é o campo usado para "excluir" (soft-delete, RN a confirmar formalmente).
const CAMPOS_ATUALIZACAO = [...CAMPOS_CRIACAO, 'ativo'];

function somenteCamposPermitidos(body, camposPermitidos) {
  const dados = {};
  for (const campo of camposPermitidos) {
    if (Object.prototype.hasOwnProperty.call(body, campo)) {
      dados[campo] = body[campo];
    }
  }
  return dados;
}

async function listar({ models } = {}) {
  const db = models || require('../models');
  return db.Empresa.findAll({ where: { ativo: true }, order: [['razao_social', 'ASC']] });
}

async function buscarPorId(id, { models } = {}) {
  const db = models || require('../models');
  const empresa = await db.Empresa.findByPk(id);
  if (!empresa) {
    throw new ApiError(404, 'Empresa não encontrada.');
  }
  return empresa;
}

// RN-33: usado pelo controller para o autoatendimento (GET /empresas/me) — busca
// diretamente por empresaId (sem depender de :id de rota), então não tem o risco de IDOR
// que motivou o Op.and no scope `paraEmpresa` (ver docs/modelagem/empresa.md).
async function buscarMinhaEmpresa(empresaId, { models } = {}) {
  if (!empresaId) {
    throw new ApiError(403, 'Usuário não está vinculado a nenhuma empresa.');
  }
  return buscarPorId(empresaId, { models });
}

async function criar(body, { models } = {}) {
  const db = models || require('../models');
  const dados = somenteCamposPermitidos(body, CAMPOS_CRIACAO);
  return wrapSequelizeErrors(db.Empresa.create(dados));
}

async function atualizar(id, body, { models } = {}) {
  const empresa = await buscarPorId(id, { models });
  const dados = somenteCamposPermitidos(body, CAMPOS_ATUALIZACAO);
  Object.assign(empresa, dados);
  return wrapSequelizeErrors(empresa.save());
}

// ADR 0005 §4 / RN-06 (⚠️ pendente): só move a FK nova (status_processo_id); o campo de
// texto legado (status_processo) não é tocado por este fluxo.
async function atualizarStatusProcesso(id, statusProcessoId, { models } = {}) {
  const db = models || require('../models');
  const empresa = await buscarPorId(id, { models });

  if (statusProcessoId !== null) {
    const statusProcesso = await db.StatusProcesso.findByPk(statusProcessoId);
    if (!statusProcesso) {
      throw new ApiError(400, 'status_processo_id inválido — não existe em status_processo.');
    }
  }

  empresa.status_processo_id = statusProcessoId;
  return empresa.save();
}

module.exports = {
  listar,
  buscarPorId,
  buscarMinhaEmpresa,
  criar,
  atualizar,
  atualizarStatusProcesso,
};
