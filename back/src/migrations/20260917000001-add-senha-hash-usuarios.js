'use strict';

// Reversão do ADR 0003 §3 (2026-09-17): SSO institucional via Auth.js não é viável (validado
// com o time) — volta a ser autenticação local (e-mail + senha, hash bcrypt). Nullable porque
// usuários existentes (seed) não têm senha até a equipe_programa definir uma (RN-02 revisado:
// só a equipe_programa cria usuário e define/reseta a senha, ver docs/decisoes/0003).
module.exports = {
  up: async (qi, Sq) => {
    await qi.addColumn('usuarios', 'senha_hash', { type: Sq.STRING(255), allowNull: true });
  },

  down: async (qi) => {
    await qi.removeColumn('usuarios', 'senha_hash');
  },
};
