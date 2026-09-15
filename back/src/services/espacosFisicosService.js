'use strict';

// RN-33: equipe_programa vê todos os espaços físicos (conceito legado, ver
// docs/modelagem/espaco-fisico.md); empresa_afiliada só os vinculados à própria empresa
// (scope `paraEmpresa`, nunca defaultScope nem combinado com findByPk/where — ver
// EspacoFisico.js e o comentário em Empresa.js sobre o IDOR já corrigido nesta base).
async function listar({ usuario, models } = {}) {
  const db = models || require('../models');
  const { EspacoFisico } = db;

  if (usuario?.papel === 'empresa_afiliada') {
    return EspacoFisico.scope({ method: ['paraEmpresa', usuario.empresaId] }).findAll();
  }

  return EspacoFisico.findAll();
}

module.exports = { listar };
