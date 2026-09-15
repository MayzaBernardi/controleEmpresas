const { Router } = require('express');

const routes = Router();

routes.get('/', (req, res) => {
  res.json({ message: 'API rodando com sucesso!' });
});

routes.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

routes.use('/auth', require('./auth'));
routes.use('/empresas', require('./empresas'));
routes.use('/formulario-respostas', require('./formularioRespostas'));
routes.use('/prospeccoes', require('./prospeccoes'));
routes.use('/contratos', require('./contratos'));
routes.use('/documentos', require('./documentos'));
routes.use('/financeiro-lancamentos', require('./financeiroLancamentos'));
routes.use('/planos-afiliacao', require('./planosAfiliacao'));
routes.use('/espacos-fisicos', require('./espacosFisicos'));
routes.use('/reservas-espaco', require('./reservasEspaco'));
routes.use('/comunicacoes-email', require('./comunicacoesEmail'));
routes.use('/log-auditoria', require('./logAuditoria'));
routes.use('/usuarios', require('./usuarios'));

// Routers de caminho completo (rotas aninhadas sob outro recurso) — montados na raiz,
// sem prefixo, porque cada um já declara o path inteiro internamente.
routes.use(require('./assinaturas'));
routes.use(require('./beneficiosExposicao'));

module.exports = routes;
