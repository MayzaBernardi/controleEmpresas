'use strict';

const ApiError = require('../utils/ApiError');
const wrapSequelizeErrors = require('../utils/wrapSequelizeErrors');
const auditoriaService = require('./auditoriaService');

const CODIGO_STATUS_PENDENTE = 'pendente';
const CODIGO_STATUS_PAGO = 'pago';

async function buscarStatusFinanceiroPorCodigo(codigo, { models } = {}) {
  const db = models || require('../models');
  const status = await db.StatusFinanceiro.findOne({ where: { codigo } });
  if (!status) {
    throw new ApiError(400, `Status financeiro "${codigo}" não está cadastrado em status_financeiro.`);
  }
  return status;
}

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

// RN-33: equipe_programa/contabilidade veem tudo (RN-16); empresa_afiliada só os próprios
// lançamentos (scope `paraEmpresa`, RN-19).
async function listar({ usuario, models } = {}) {
  const db = models || require('../models');
  if (usuario?.papel === 'empresa_afiliada') {
    return db.FinanceiroLancamento.scope({ method: ['paraEmpresa', usuario.empresaId] }).findAll();
  }
  return db.FinanceiroLancamento.findAll();
}

// RN-31: "atrasado" não é coluna — é calculado em leitura pelo getter virtual
// `estaAtrasado` do model (vencimento no passado + sem data_pagamento). Restringimos no SQL
// aos lançamentos com status formal ainda "pendente" (busca o id por código, nunca chumbado)
// e filtramos o restante em JS.
async function listarAtrasados({ models } = {}) {
  const db = models || require('../models');
  const statusPendente = await buscarStatusFinanceiroPorCodigo(CODIGO_STATUS_PENDENTE, { models: db });
  const lancamentosPendentes = await db.FinanceiroLancamento.findAll({
    where: { status_financeiro_id: statusPendente.id },
  });
  return lancamentosPendentes.filter((lancamento) => lancamento.estaAtrasado);
}

// RN-16: só contabilidade lança (checado na rota via requireRole, não repetido aqui).
async function lancar(body, { usuario, models } = {}) {
  const db = models || require('../models');

  if (!body?.empresa_id) {
    throw new ApiError(400, 'empresa_id é obrigatório.');
  }
  if (body?.valor === undefined || body?.valor === null) {
    throw new ApiError(400, 'valor é obrigatório.');
  }
  if (!body?.data_vencimento) {
    throw new ApiError(400, 'data_vencimento é obrigatório.');
  }

  let statusFinanceiroId = body.status_financeiro_id;
  if (!statusFinanceiroId) {
    const statusPendente = await buscarStatusFinanceiroPorCodigo(CODIGO_STATUS_PENDENTE, { models: db });
    statusFinanceiroId = statusPendente.id;
  }

  const dados = {
    empresa_id: body.empresa_id,
    contrato_id: body.contrato_id ?? null,
    numero_documento: body.numero_documento ?? null,
    numero_nota_fiscal: body.numero_nota_fiscal ?? null,
    valor: body.valor,
    forma_pagamento: body.forma_pagamento,
    parcela_numero: body.parcela_numero,
    total_parcelas: body.total_parcelas,
    data_vencimento: body.data_vencimento,
    data_pagamento: body.data_pagamento ?? null,
    status_financeiro_id: statusFinanceiroId,
    comprovante_url: body.comprovante_url ?? null,
    comprovante_mimetype: body.comprovante_mimetype ?? null,
    comprovante_base64: body.comprovante_base64 ?? null,
    observacoes: body.observacoes ?? null,
  };

  const lancamento = await wrapSequelizeErrors(db.FinanceiroLancamento.create(dados));
  await auditoriaService.registrar({
    entidade: 'financeiro_lancamentos',
    entidadeId: lancamento.id,
    acao: 'create',
    usuario,
    dadosNovos: lancamento.toJSON(),
    models: db,
  });
  return lancamento;
}

// RF-06: confirma pagamento de um lançamento — busca por id (404 se não achar), sem
// checagem de isolamento RN-33 (só contabilidade chama este fluxo, que já enxerga tudo).
async function confirmarPagamento(id, body, { usuario, models } = {}) {
  const db = models || require('../models');
  const lancamento = await db.FinanceiroLancamento.findByPk(id);
  if (!lancamento) {
    throw new ApiError(404, 'Lançamento financeiro não encontrado.');
  }

  const statusPago = await buscarStatusFinanceiroPorCodigo(CODIGO_STATUS_PAGO, { models: db });

  const dadosAnteriores = {
    data_pagamento: lancamento.data_pagamento,
    status_financeiro_id: lancamento.status_financeiro_id,
    comprovante_url: lancamento.comprovante_url,
  };

  lancamento.data_pagamento = body?.data_pagamento || hoje();
  lancamento.status_financeiro_id = statusPago.id;
  if (body?.comprovante_url !== undefined) {
    lancamento.comprovante_url = body.comprovante_url;
  }

  const resultado = await wrapSequelizeErrors(lancamento.save());
  await auditoriaService.registrar({
    entidade: 'financeiro_lancamentos',
    entidadeId: lancamento.id,
    acao: 'update',
    usuario,
    dadosAnteriores,
    dadosNovos: {
      data_pagamento: lancamento.data_pagamento,
      status_financeiro_id: lancamento.status_financeiro_id,
      comprovante_url: lancamento.comprovante_url,
    },
    models: db,
  });
  return resultado;
}

module.exports = {
  listar,
  listarAtrasados,
  lancar,
  confirmarPagamento,
};
