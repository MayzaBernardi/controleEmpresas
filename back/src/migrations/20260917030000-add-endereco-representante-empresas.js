'use strict';

// Campos exigidos pelo template de emissão de contrato (minuta-contrato-afiliacao.docx),
// que o cadastro de Empresa ainda não tinha. Todos opcionais no cadastro (allowNull) — só
// passam a ser exigidos no momento de emitir contrato (contratosService.emitir).
module.exports = {
  up: async (qi, Sq) => {
    await qi.addColumn('empresas', 'endereco_logradouro', {
      type: Sq.STRING(255),
      allowNull: true,
    });
    await qi.addColumn('empresas', 'endereco_numero', {
      type: Sq.STRING(20),
      allowNull: true,
    });
    await qi.addColumn('empresas', 'endereco_complemento', {
      type: Sq.STRING(100),
      allowNull: true,
    });
    await qi.addColumn('empresas', 'endereco_bairro', {
      type: Sq.STRING(150),
      allowNull: true,
    });
    await qi.addColumn('empresas', 'representante_legal_cpf', {
      type: Sq.STRING(14),
      allowNull: true,
    });
    await qi.addColumn('empresas', 'representante_legal_email', {
      type: Sq.STRING(255),
      allowNull: true,
    });
  },

  down: async (qi) => {
    // As 6 colunas abaixo foram todas adicionadas por esta própria migration, sem dado
    // pré-existente — nenhum backfill foi feito para elas (ADR 0005 §7).
    await qi.removeColumn('empresas', 'representante_legal_email');
    await qi.removeColumn('empresas', 'representante_legal_cpf');
    await qi.removeColumn('empresas', 'endereco_bairro');
    await qi.removeColumn('empresas', 'endereco_complemento');
    await qi.removeColumn('empresas', 'endereco_numero');
    await qi.removeColumn('empresas', 'endereco_logradouro');
  },
};
