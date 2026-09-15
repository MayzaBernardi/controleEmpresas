'use strict';

const { Op } = require('sequelize');
const ApiError = require('../utils/ApiError');
const wrapSequelizeErrors = require('../utils/wrapSequelizeErrors');

// RN-35: limite anual de reservas por tipo de espaço, contando reservas com status
// diferente de "cancelado" no ano corrente.
const LIMITE_ANUAL_POR_TIPO_ESPACO = {
  sala_atico: 1,
  auditorio: 1,
  coworking: 12,
};

function anoDaReserva(reserva) {
  if (reserva.data_reserva) return new Date(reserva.data_reserva).getUTCFullYear();
  // Reserva sem data ainda definida (ex.: pré-reservado) conta no ano em que foi criada.
  return new Date(reserva.createdAt).getUTCFullYear();
}

/**
 * RN-35: conta quantas reservas não canceladas a empresa já tem, para o tipo de espaço
 * informado, no ano-alvo (o ano de `dataReserva` quando informado, senão o ano corrente).
 */
async function contarReservasNaoCanceladasNoAno({ empresaId, tipoEspaco, dataReserva, transaction, models } = {}) {
  const db = models || require('../models');
  const { ReservaEspaco } = db;

  const anoAlvo = dataReserva ? new Date(dataReserva).getUTCFullYear() : new Date().getUTCFullYear();

  const reservasExistentes = await ReservaEspaco.findAll({
    where: {
      empresa_id: empresaId,
      tipo_espaco: tipoEspaco,
      status: { [Op.ne]: 'cancelado' },
    },
    transaction,
  });

  const quantidade = reservasExistentes.filter((reserva) => anoDaReserva(reserva) === anoAlvo).length;

  return { quantidade, anoAlvo };
}

/**
 * RN-35: cria uma reserva de espaço compartilhado, validando antes o limite anual por tipo
 * (sala_atico: 1x/ano, auditorio: 1x/ano, coworking: 12x/ano). Implementado como service —
 * não como hook do model — para manter a regra visível e testável na camada correta. Lança
 * erro com mensagem clara se o limite já foi atingido; não cria a reserva nesse caso.
 */
async function criarReserva({
  empresaId,
  tipoEspaco,
  dataReserva = null,
  status = 'pre_reservado',
  observacoes = null,
  transaction,
  models,
} = {}) {
  const db = models || require('../models');
  const { ReservaEspaco } = db;

  const limite = LIMITE_ANUAL_POR_TIPO_ESPACO[tipoEspaco];
  if (limite === undefined) {
    throw new Error(`tipo_espaco desconhecido: "${tipoEspaco}". Valores válidos: ${Object.keys(LIMITE_ANUAL_POR_TIPO_ESPACO).join(', ')}.`);
  }

  const { quantidade, anoAlvo } = await contarReservasNaoCanceladasNoAno({
    empresaId,
    tipoEspaco,
    dataReserva,
    transaction,
    models: db,
  });

  if (quantidade >= limite) {
    throw new Error(
      `Limite anual de reservas atingido para "${tipoEspaco}" (${limite}x/ano): a empresa já tem ${quantidade} ` +
        `reserva(s) não cancelada(s) em ${anoAlvo} (RN-35).`
    );
  }

  return ReservaEspaco.create(
    { empresa_id: empresaId, tipo_espaco: tipoEspaco, data_reserva: dataReserva, status, observacoes },
    { transaction }
  );
}

// RN-33: listagem de reservas — equipe_programa vê todas; empresa_afiliada só as suas
// (scope `paraEmpresa`, nunca combinado com findByPk/where extra na mesma chamada — ver
// comentário em Empresa.js sobre o IDOR já corrigido nesta base).
async function listar({ usuario, models } = {}) {
  const db = models || require('../models');
  const { ReservaEspaco } = db;

  if (usuario?.papel === 'empresa_afiliada') {
    return ReservaEspaco.scope({ method: ['paraEmpresa', usuario.empresaId] }).findAll();
  }

  return ReservaEspaco.findAll();
}

const STATUS_VALIDOS = ['pre_reservado', 'confirmado', 'realizado', 'cancelado'];

/**
 * Atualiza o status de uma reserva já existente (confirmar/realizar/cancelar/pré-reservar).
 * Valida `novoStatus` contra os 4 valores do ENUM antes de gravar — sem essa checagem, um
 * valor inválido viraria SequelizeDatabaseError (constraint do ENUM no Postgres), que
 * wrapSequelizeErrors não trata, e cairia como 500 genérico em vez de 400.
 */
async function atualizarStatus(id, novoStatus, { models } = {}) {
  const db = models || require('../models');
  const { ReservaEspaco } = db;

  const reserva = await ReservaEspaco.findByPk(id);
  if (!reserva) {
    throw new ApiError(404, 'Reserva de espaço não encontrada.');
  }

  if (!STATUS_VALIDOS.includes(novoStatus)) {
    throw new ApiError(400, `status inválido: "${novoStatus}". Valores válidos: ${STATUS_VALIDOS.join(', ')}.`);
  }

  reserva.status = novoStatus;
  return wrapSequelizeErrors(reserva.save());
}

module.exports = {
  LIMITE_ANUAL_POR_TIPO_ESPACO,
  contarReservasNaoCanceladasNoAno,
  criarReserva,
  listar,
  atualizarStatus,
};
