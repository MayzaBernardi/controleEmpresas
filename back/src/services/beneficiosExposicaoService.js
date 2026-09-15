'use strict';

const ApiError = require('../utils/ApiError');
const wrapSequelizeErrors = require('../utils/wrapSequelizeErrors');

const CAMPOS_ATUALIZACAO = ['telao_ativo', 'marca_site_ativo', 'observacoes'];

function somenteCamposPermitidos(body, camposPermitidos) {
  const dados = {};
  for (const campo of camposPermitidos) {
    if (Object.prototype.hasOwnProperty.call(body, campo)) {
      dados[campo] = body[campo];
    }
  }
  return dados;
}

// RN-33: empresa_afiliada só enxerga o próprio registro — comparação feita depois de buscar
// (nunca scope + where combinados na mesma query, ver comentário em Empresa.js).
function garantirAcessoPermitido(empresaId, usuario) {
  if (usuario?.papel === 'empresa_afiliada' && String(empresaId) !== String(usuario.empresaId)) {
    throw new ApiError(404, 'Benefícios de exposição não encontrados.');
  }
}

// Relação 1:1 (ADR 0005 §5): a empresa pode ainda não ter registro — isso não é erro, é o
// estado inicial. Nesse caso devolve um objeto default (telao/marca desativados) em vez de
// 404, para o front não precisar tratar "sem benefício" como uma falha.
async function buscarPorEmpresa(empresaId, { usuario, models } = {}) {
  const db = models || require('../models');
  garantirAcessoPermitido(empresaId, usuario);

  const beneficio = await db.BeneficioExposicao.findOne({ where: { empresa_id: empresaId } });
  if (!beneficio) {
    return {
      empresa_id: empresaId,
      telao_ativo: false,
      marca_site_ativo: false,
      observacoes: null,
    };
  }
  return beneficio;
}

async function upsert(empresaId, body, { models } = {}) {
  const db = models || require('../models');
  const dados = somenteCamposPermitidos(body, CAMPOS_ATUALIZACAO);

  const [beneficio] = await db.BeneficioExposicao.findOrCreate({
    where: { empresa_id: empresaId },
    defaults: { empresa_id: empresaId, ...dados, atualizado_em: new Date() },
  });

  Object.assign(beneficio, dados, { atualizado_em: new Date() });
  return wrapSequelizeErrors(beneficio.save());
}

module.exports = { buscarPorEmpresa, upsert };
