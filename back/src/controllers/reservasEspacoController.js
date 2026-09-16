'use strict';

const reservaEspacoService = require('../services/reservaEspacoService');
const ApiError = require('../utils/ApiError');

exports.listar = async (req, res) => {
  try {
    const reservas = await reservaEspacoService.listar({ usuario: req.user });
    return res.json(reservas);
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// RN-33/IDOR: empresa_afiliada nunca decide de qual empresa é a reserva — empresaId é
// sempre forçado a partir do token (req.user.empresaId), ignorando qualquer empresa_id que
// venha no body. equipe_programa pode reservar em nome de qualquer empresa, mas precisa
// informar empresa_id explicitamente no body (mesmo padrão de documentosService.upload).
//
// Decisão de design (RN-35 -> 400, não 500): reservaEspacoService.criarReserva já implementa
// a regra do limite anual e lança um `Error` comum (não ApiError) quando o limite é atingido
// ou quando `tipo_espaco` é desconhecido — decisão tomada para não reescrever/duplicar essa
// lógica já testada no service existente. Em vez de um helper genérico, este controller
// envolve SOMENTE essa chamada num try/catch local e relança como ApiError(400, err.message):
// é a abordagem mais simples para um único ponto de chamada (um helper reutilizável seria
// over-engineering aqui) e mantém o service intacto, como pedido.
exports.criar = async (req, res) => {
  try {
    let empresaId;
    if (req.user.papel === 'empresa_afiliada') {
      empresaId = req.user.empresaId;
    } else {
      empresaId = req.body.empresa_id;
      if (!empresaId) {
        throw new ApiError(400, 'empresa_id é obrigatório.');
      }
    }

    let reserva;
    try {
      reserva = await reservaEspacoService.criarReserva({
        empresaId,
        tipoEspaco: req.body.tipo_espaco,
        dataReserva: req.body.data_reserva,
        observacoes: req.body.observacoes,
      });
    } catch (err) {
      if (err instanceof ApiError) {
        throw err;
      }
      throw new ApiError(400, err.message);
    }

    return res.status(201).json(reserva);
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

exports.atualizarStatus = async (req, res) => {
  try {
    const reserva = await reservaEspacoService.atualizarStatus(req.params.id, req.body.status);
    return res.json(reserva);
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
