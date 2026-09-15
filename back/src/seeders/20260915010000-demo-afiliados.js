'use strict';

const { randomUUID } = require('crypto');

// Datas relativas a "hoje" para que o seed continue fazendo sentido (renovação
// pendente, atraso etc.) não importa quando `db:seed` for executado.
function dataRelativa(diasOffset) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + diasOffset);
  return d.toISOString().slice(0, 10); // formato DATEONLY (YYYY-MM-DD)
}

function cnpjFake(seq) {
  // Gera um CNPJ sintético de 14 dígitos, só para dar variedade — não é um CNPJ válido real.
  return `${String(20000000 + seq).padStart(8, '0')}0001${String(50 + seq).padStart(2, '0')}`;
}

const TABELAS_SEED_EM_ORDEM_REVERSA = [
  'log_auditoria',
  'comunicacoes_destinatarios',
  'comunicacoes_email',
  'financeiro_lancamentos',
  'documentos',
  'assinaturas',
  'espacos_fisicos',
  'contratos',
  'formulario_respostas',
  'usuarios',
  'empresas',
];

module.exports = {
  up: async (qi, Sequelize) => {
    const statusContratoRows = await qi.sequelize.query('SELECT id, codigo FROM status_contrato', {
      type: Sequelize.QueryTypes.SELECT,
    });
    const statusFinanceiroRows = await qi.sequelize.query('SELECT id, codigo FROM status_financeiro', {
      type: Sequelize.QueryTypes.SELECT,
    });
    const statusContrato = Object.fromEntries(statusContratoRows.map((r) => [r.codigo, r.id]));
    const statusFinanceiro = Object.fromEntries(statusFinanceiroRows.map((r) => [r.codigo, r.id]));

    // ---------------------------------------------------------------------
    // usuarios
    // ---------------------------------------------------------------------
    const usuarioEquipeAna = 1;
    const usuarioEquipeBruno = 2;
    const usuarioContabilidadeCarla = 3;

    const usuarios = [
      { id: usuarioEquipeAna, nome: 'Ana Ribeiro', email: 'ana.ribeiro@pollenparque.org.br', papel: 'equipe_programa', empresa_id: null, ativo: true },
      { id: usuarioEquipeBruno, nome: 'Bruno Castro', email: 'bruno.castro@pollenparque.org.br', papel: 'equipe_programa', empresa_id: null, ativo: true },
      { id: usuarioContabilidadeCarla, nome: 'Carla Souza', email: 'carla.souza@pollenparque.org.br', papel: 'contabilidade', empresa_id: null, ativo: true },
    ];

    // ---------------------------------------------------------------------
    // Definição das ~15 empresas, uma por estágio do fluxo de afiliação.
    // ---------------------------------------------------------------------
    const empresasDef = [
      // estágio: só formulário — ainda sem contrato
      { key: 'cedro', razao_social: 'Cedro Biociências Ltda', nome_fantasia: 'Cedro Bio', estagio: 'formulario' },
      { key: 'girassol', razao_social: 'Girassol EdTech Ltda', nome_fantasia: 'Girassol EdTech', estagio: 'formulario' },

      // estágio: contrato em elaboração
      { key: 'nortis', razao_social: 'Nortis Automação Industrial Ltda', nome_fantasia: 'Nortis', estagio: 'elaboracao' },
      { key: 'vetor', razao_social: 'Vetor Quântico Software Ltda', nome_fantasia: 'Vetor Quântico', estagio: 'elaboracao' },

      // estágio: aguardando assinatura (na Procuradoria)
      { key: 'prisma', razao_social: 'Prisma Agroanalytics Ltda', nome_fantasia: 'Prisma Agro', estagio: 'assinatura' },
      { key: 'zenith', razao_social: 'Zenith Materiais Avançados Ltda', nome_fantasia: 'Zenith Materiais', estagio: 'assinatura' },

      // estágio: ativo / vigente
      { key: 'alfa', razao_social: 'Alfa Biotecnologia Ltda', nome_fantasia: 'Alfa Bio', estagio: 'ativo', temRenovacaoAnterior: true },
      { key: 'orbita', razao_social: 'Órbita Sistemas Embarcados Ltda', nome_fantasia: 'Órbita', estagio: 'ativo' },
      {
        key: 'helix',
        razao_social: 'Helix Genomics International Inc.',
        nome_fantasia: 'Helix Genomics',
        estagio: 'ativo',
        tipo_empresa: 'internacional',
        identificador_estrangeiro: 'EIN-98-7654321',
      },
      {
        key: 'kaizen',
        razao_social: 'Kaizen Manufatura de Grande Porte Ltda',
        nome_fantasia: 'Kaizen',
        estagio: 'ativo',
        tipo_caso_especial: 'grande_porte',
        descricao_caso_especial: 'Empresa em processo de alteração contratual por expansão de porte (RN-12) — tratamento diferenciado ainda pendente de detalhamento com o negócio.',
      },

      // estágio: inadimplente (lançamento vencido, sem pagamento)
      { key: 'latitude', razao_social: 'Latitude Robótica Ltda', nome_fantasia: 'Latitude', estagio: 'inadimplente' },
      { key: 'solsticio', razao_social: 'Solstício Nanotecnologia Ltda', nome_fantasia: 'Solstício', estagio: 'inadimplente' },

      // estágio: renovação pendente (vigência termina em até 60 dias)
      { key: 'aurora', razao_social: 'Aurora Ópticas de Precisão Ltda', nome_fantasia: 'Aurora Ópticas', estagio: 'renovacao_pendente' },
      { key: 'meridiano', razao_social: 'Meridiano Ciência de Dados Ltda', nome_fantasia: 'Meridiano', estagio: 'renovacao_pendente' },

      // estágio: encerrada por vencimento (sem renovação)
      { key: 'ventus', razao_social: 'Ventus Energias Renováveis Ltda', nome_fantasia: 'Ventus', estagio: 'encerrada' },
    ];

    const STATUS_PROCESSO_POR_ESTAGIO = {
      formulario: 'inscricao_pendente',
      elaboracao: 'contrato_elaboracao',
      assinatura: 'aguardando_assinatura',
      ativo: 'ativa',
      inadimplente: 'ativa',
      renovacao_pendente: 'ativa',
      encerrada: 'encerrada',
    };

    empresasDef.forEach((def, i) => {
      def.id = randomUUID();
      def.tipo_empresa = def.tipo_empresa || 'nacional';
      def.tipo_caso_especial = def.tipo_caso_especial || 'nenhum';
      def.status_processo = STATUS_PROCESSO_POR_ESTAGIO[def.estagio];
      if (def.tipo_empresa === 'internacional') {
        def.cnpj = null;
      } else {
        def.cnpj = cnpjFake(i + 1);
      }
    });

    const empresas = empresasDef.map((def) => ({
      id: def.id,
      razao_social: def.razao_social,
      nome_fantasia: def.nome_fantasia,
      cnpj: def.cnpj,
      identificador_estrangeiro: def.identificador_estrangeiro || null,
      tipo_empresa: def.tipo_empresa,
      tipo_caso_especial: def.tipo_caso_especial,
      descricao_caso_especial: def.descricao_caso_especial || null,
      status_processo: def.status_processo,
      contatos: JSON.stringify({ email: `contato@${def.key}.com.br`, telefone: '(19) 3000-0000' }),
      observacoes: null,
    }));

    const porKey = Object.fromEntries(empresasDef.map((d) => [d.key, d]));

    // ---------------------------------------------------------------------
    // usuarios empresa_afiliada — um por empresa representativa de cada estágio ativo
    // ---------------------------------------------------------------------
    let proximoUsuarioId = 4;
    ['alfa', 'latitude', 'aurora'].forEach((key) => {
      usuarios.push({
        id: proximoUsuarioId,
        nome: `Responsável ${porKey[key].nome_fantasia}`,
        email: `financeiro@${key}.com.br`,
        papel: 'empresa_afiliada',
        empresa_id: porKey[key].id,
        ativo: true,
      });
      porKey[key].usuarioEmpresaId = proximoUsuarioId;
      proximoUsuarioId += 1;
    });

    // ---------------------------------------------------------------------
    // formulario_respostas
    // ---------------------------------------------------------------------
    const formularioRespostas = [];

    // Submissões brutas ainda não triadas (sem cadastro de empresa vinculado).
    formularioRespostas.push({
      empresa_id: null,
      email_contato: 'contato@novaideia.com.br',
      payload_respostas: JSON.stringify({ razao_social: 'Nova Ideia Tecnologia Ltda', interesse: 'edital 2026' }),
      status_triagem: 'aguardando',
      observacoes_triagem: null,
    });
    formularioRespostas.push({
      empresa_id: null,
      email_contato: 'contato@bioinova.com.br',
      payload_respostas: JSON.stringify({ razao_social: 'BioInova Ltda', interesse: 'edital 2026' }),
      status_triagem: 'aguardando',
      observacoes_triagem: null,
    });

    // Empresas no estágio "só formulário" já têm cadastro (RN-04), com a resposta vinculada.
    ['cedro', 'girassol'].forEach((key) => {
      formularioRespostas.push({
        empresa_id: porKey[key].id,
        email_contato: `contato@${key}.com.br`,
        payload_respostas: JSON.stringify({ razao_social: porKey[key].razao_social, interesse: 'edital 2026' }),
        status_triagem: 'triado',
        observacoes_triagem: 'Cadastro criado a partir da submissão; aguardando elaboração de contrato.',
      });
    });

    // ---------------------------------------------------------------------
    // contratos, assinaturas, documentos, financeiro, espaços físicos, por estágio
    // ---------------------------------------------------------------------
    const contratos = [];
    const assinaturas = [];
    const documentos = [];
    const financeiroLancamentos = [];
    const espacosFisicos = [];

    function empresaTemAssinaturas(contratoId, statusPorPapel) {
      const papeis = [
        'representante_legal',
        'assinante_institucional_1',
        'assinante_institucional_2',
        'assinante_institucional_3',
        'reitor',
      ];
      papeis.forEach((papel) => {
        const status = statusPorPapel[papel] || 'pendente';
        assinaturas.push({
          contrato_id: contratoId,
          nome_signatario: `Signatário (${papel})`,
          email_signatario: `${papel}@pollenparque.org.br`,
          papel_assinatura: papel,
          status,
          data_assinatura: status === 'assinado' ? dataRelativa(-30) : null,
          observacoes: null,
        });
      });
    }

    // elaboração — contrato existe, ainda sem termo/procuradoria
    ['nortis', 'vetor'].forEach((key) => {
      const empresa = porKey[key];
      const contratoId = randomUUID();
      empresa.contratoAtivoId = contratoId;
      contratos.push({
        id: contratoId,
        empresa_id: empresa.id,
        contrato_anterior_id: null,
        numero_termo: null,
        data_inicio_vigencia: dataRelativa(0),
        data_termino_vigencia: dataRelativa(365),
        status_contrato_id: statusContrato.elaboracao,
        numero_chamado_procuradoria: null,
        data_envio_procuradoria: null,
        data_retorno_procuradoria: null,
        valor_anuidade: '3600.00',
        observacoes: 'Minuta em elaboração pela equipe do programa.',
      });
      documentos.push({
        empresa_id: empresa.id,
        contrato_id: contratoId,
        tipo_documento: 'minuta_contrato',
        nome_arquivo: 'minuta-contrato-rascunho.pdf',
        url_arquivo: `https://storage.pollenparque.org.br/${key}/minuta-contrato-rascunho.pdf`,
        status: 'pendente',
        observacoes: null,
      });
    });

    // aguardando assinatura — contrato enviado à Procuradoria, assinaturas parciais
    ['prisma', 'zenith'].forEach((key, idx) => {
      const empresa = porKey[key];
      const contratoId = randomUUID();
      empresa.contratoAtivoId = contratoId;
      contratos.push({
        id: contratoId,
        empresa_id: empresa.id,
        contrato_anterior_id: null,
        numero_termo: `POLLEN-2026-${100 + idx}`,
        data_inicio_vigencia: dataRelativa(0),
        data_termino_vigencia: dataRelativa(365),
        status_contrato_id: statusContrato.em_assinatura,
        numero_chamado_procuradoria: `PROC-2026-${400 + idx}`,
        data_envio_procuradoria: dataRelativa(-12),
        data_retorno_procuradoria: null,
        valor_anuidade: '3600.00',
        observacoes: null,
      });
      empresaTemAssinaturas(contratoId, {
        representante_legal: 'assinado',
        assinante_institucional_1: 'assinado',
        assinante_institucional_2: 'pendente',
        assinante_institucional_3: 'pendente',
        reitor: 'pendente',
      });
      ['estatuto_social', 'cnpj', 'minuta_contrato'].forEach((tipo) => {
        documentos.push({
          empresa_id: empresa.id,
          contrato_id: contratoId,
          tipo_documento: tipo,
          nome_arquivo: `${tipo}.pdf`,
          url_arquivo: `https://storage.pollenparque.org.br/${key}/${tipo}.pdf`,
          status: 'aprovado',
          observacoes: null,
        });
      });
    });

    // ativo / vigente — contrato vigente, tudo assinado, financeiro em dia
    ['alfa', 'orbita', 'helix', 'kaizen'].forEach((key, idx) => {
      const empresa = porKey[key];

      if (empresa.temRenovacaoAnterior) {
        const contratoAnteriorId = randomUUID();
        contratos.push({
          id: contratoAnteriorId,
          empresa_id: empresa.id,
          contrato_anterior_id: null,
          numero_termo: 'POLLEN-2025-001',
          data_inicio_vigencia: dataRelativa(-730),
          data_termino_vigencia: dataRelativa(-366),
          status_contrato_id: statusContrato.encerrado,
          numero_chamado_procuradoria: 'PROC-2025-010',
          data_envio_procuradoria: dataRelativa(-740),
          data_retorno_procuradoria: dataRelativa(-720),
          valor_anuidade: '3400.00',
          observacoes: 'Primeiro termo, encerrado por vencimento e sucedido por renovação.',
        });
        empresaTemAssinaturas(contratoAnteriorId, {
          representante_legal: 'assinado',
          assinante_institucional_1: 'assinado',
          assinante_institucional_2: 'assinado',
          assinante_institucional_3: 'assinado',
          reitor: 'assinado',
        });
        empresa.contratoAnteriorId = contratoAnteriorId;
      }

      const contratoId = randomUUID();
      empresa.contratoAtivoId = contratoId;
      contratos.push({
        id: contratoId,
        empresa_id: empresa.id,
        contrato_anterior_id: empresa.contratoAnteriorId || null,
        numero_termo: `POLLEN-2026-${200 + idx}`,
        data_inicio_vigencia: dataRelativa(-180),
        data_termino_vigencia: dataRelativa(185),
        status_contrato_id: statusContrato.vigente,
        numero_chamado_procuradoria: `PROC-2026-${500 + idx}`,
        data_envio_procuradoria: dataRelativa(-200),
        data_retorno_procuradoria: dataRelativa(-182),
        valor_anuidade: '3600.00',
        observacoes: null,
      });
      empresaTemAssinaturas(contratoId, {
        representante_legal: 'assinado',
        assinante_institucional_1: 'assinado',
        assinante_institucional_2: 'assinado',
        assinante_institucional_3: 'assinado',
        reitor: 'assinado',
      });
      ['estatuto_social', 'cnpj', 'comprovante_endereco', 'minuta_contrato'].forEach((tipo) => {
        documentos.push({
          empresa_id: empresa.id,
          contrato_id: contratoId,
          tipo_documento: tipo,
          nome_arquivo: `${tipo}.pdf`,
          url_arquivo: `https://storage.pollenparque.org.br/${key}/${tipo}.pdf`,
          status: 'aprovado',
          observacoes: null,
        });
      });
      financeiroLancamentos.push({
        empresa_id: empresa.id,
        contrato_id: contratoId,
        numero_documento: `BOL-2026-${300 + idx}`,
        numero_nota_fiscal: `NF-2026-${300 + idx}`,
        valor: '3600.00',
        forma_pagamento: 'boleto',
        parcela_numero: 1,
        total_parcelas: 1,
        data_vencimento: dataRelativa(-150),
        data_pagamento: dataRelativa(-152),
        status_financeiro_id: statusFinanceiro.pago,
        comprovante_url: `https://storage.pollenparque.org.br/${key}/comprovante-pagamento.pdf`,
        observacoes: null,
      });
      espacosFisicos.push({
        empresa_id: empresa.id,
        identificador_sala: `Sala ${10 + idx}`,
        bloco: 'Bloco A',
        metragem_quadrada: '24.50',
        data_inicio_ocupacao: dataRelativa(-180),
        data_fim_ocupacao: null,
        ativo: true,
      });
    });

    // inadimplente — contrato vigente, lançamento vencido e não pago
    ['latitude', 'solsticio'].forEach((key, idx) => {
      const empresa = porKey[key];
      const contratoId = randomUUID();
      empresa.contratoAtivoId = contratoId;
      contratos.push({
        id: contratoId,
        empresa_id: empresa.id,
        contrato_anterior_id: null,
        numero_termo: `POLLEN-2026-${300 + idx}`,
        data_inicio_vigencia: dataRelativa(-200),
        data_termino_vigencia: dataRelativa(165),
        status_contrato_id: statusContrato.vigente,
        numero_chamado_procuradoria: `PROC-2026-${600 + idx}`,
        data_envio_procuradoria: dataRelativa(-220),
        data_retorno_procuradoria: dataRelativa(-202),
        valor_anuidade: '3600.00',
        observacoes: null,
      });
      empresaTemAssinaturas(contratoId, {
        representante_legal: 'assinado',
        assinante_institucional_1: 'assinado',
        assinante_institucional_2: 'assinado',
        assinante_institucional_3: 'assinado',
        reitor: 'assinado',
      });
      espacosFisicos.push({
        empresa_id: empresa.id,
        identificador_sala: `Sala ${20 + idx}`,
        bloco: 'Bloco B',
        metragem_quadrada: '18.00',
        data_inicio_ocupacao: dataRelativa(-200),
        data_fim_ocupacao: null,
        ativo: true,
      });
      // RN-31: status formal continua "pendente" — o atraso é calculado em tempo de leitura.
      financeiroLancamentos.push({
        empresa_id: empresa.id,
        contrato_id: contratoId,
        numero_documento: `BOL-2026-${400 + idx}`,
        numero_nota_fiscal: `NF-2026-${400 + idx}`,
        valor: '3600.00',
        forma_pagamento: 'boleto',
        parcela_numero: 1,
        total_parcelas: 1,
        data_vencimento: dataRelativa(-30 - idx * 10),
        data_pagamento: null,
        status_financeiro_id: statusFinanceiro.pendente,
        comprovante_url: null,
        observacoes: null,
      });
    });

    // renovação pendente — contrato vigente com data_termino_vigencia dentro de 60 dias
    ['aurora', 'meridiano'].forEach((key, idx) => {
      const empresa = porKey[key];
      const contratoId = randomUUID();
      empresa.contratoAtivoId = contratoId;
      contratos.push({
        id: contratoId,
        empresa_id: empresa.id,
        contrato_anterior_id: null,
        numero_termo: `POLLEN-2025-${900 + idx}`,
        data_inicio_vigencia: dataRelativa(-330),
        // RN-30: renovação pendente = data_termino_vigencia <= hoje + 60 dias, status formal "vigente".
        data_termino_vigencia: dataRelativa(35 + idx * 5),
        status_contrato_id: statusContrato.vigente,
        numero_chamado_procuradoria: `PROC-2025-${700 + idx}`,
        data_envio_procuradoria: dataRelativa(-350),
        data_retorno_procuradoria: dataRelativa(-332),
        valor_anuidade: '3600.00',
        observacoes: null,
      });
      empresaTemAssinaturas(contratoId, {
        representante_legal: 'assinado',
        assinante_institucional_1: 'assinado',
        assinante_institucional_2: 'assinado',
        assinante_institucional_3: 'assinado',
        reitor: 'assinado',
      });
      espacosFisicos.push({
        empresa_id: empresa.id,
        identificador_sala: `Sala ${30 + idx}`,
        bloco: 'Bloco C',
        metragem_quadrada: '20.00',
        data_inicio_ocupacao: dataRelativa(-330),
        data_fim_ocupacao: null,
        ativo: true,
      });
      financeiroLancamentos.push({
        empresa_id: empresa.id,
        contrato_id: contratoId,
        numero_documento: `BOL-2025-${500 + idx}`,
        numero_nota_fiscal: `NF-2025-${500 + idx}`,
        valor: '3600.00',
        forma_pagamento: 'boleto',
        parcela_numero: 1,
        total_parcelas: 1,
        data_vencimento: dataRelativa(-320),
        data_pagamento: dataRelativa(-322),
        status_financeiro_id: statusFinanceiro.pago,
        comprovante_url: `https://storage.pollenparque.org.br/${key}/comprovante-pagamento.pdf`,
        observacoes: null,
      });
    });

    // encerrada por vencimento — sem contrato de renovação subsequente
    {
      const empresa = porKey.ventus;
      const contratoId = randomUUID();
      empresa.contratoAtivoId = contratoId;
      contratos.push({
        id: contratoId,
        empresa_id: empresa.id,
        contrato_anterior_id: null,
        numero_termo: 'POLLEN-2025-050',
        data_inicio_vigencia: dataRelativa(-425),
        data_termino_vigencia: dataRelativa(-60),
        status_contrato_id: statusContrato.encerrado,
        numero_chamado_procuradoria: 'PROC-2025-050',
        data_envio_procuradoria: dataRelativa(-440),
        data_retorno_procuradoria: dataRelativa(-427),
        valor_anuidade: '3400.00',
        observacoes: 'Encerrado por vencimento — empresa optou por não renovar.',
      });
      empresaTemAssinaturas(contratoId, {
        representante_legal: 'assinado',
        assinante_institucional_1: 'assinado',
        assinante_institucional_2: 'assinado',
        assinante_institucional_3: 'assinado',
        reitor: 'assinado',
      });
      espacosFisicos.push({
        empresa_id: empresa.id,
        identificador_sala: 'Sala 40',
        bloco: 'Bloco A',
        metragem_quadrada: '22.00',
        data_inicio_ocupacao: dataRelativa(-425),
        data_fim_ocupacao: dataRelativa(-60),
        ativo: false,
      });
      financeiroLancamentos.push({
        empresa_id: empresa.id,
        contrato_id: contratoId,
        numero_documento: 'BOL-2025-600',
        numero_nota_fiscal: 'NF-2025-600',
        valor: '3400.00',
        forma_pagamento: 'boleto',
        parcela_numero: 1,
        total_parcelas: 1,
        data_vencimento: dataRelativa(-395),
        data_pagamento: dataRelativa(-396),
        status_financeiro_id: statusFinanceiro.pago,
        comprovante_url: 'https://storage.pollenparque.org.br/ventus/comprovante-pagamento.pdf',
        observacoes: null,
      });
    }

    // ---------------------------------------------------------------------
    // comunicacoes_email + comunicacoes_destinatarios
    // ---------------------------------------------------------------------
    const comunicacoesEmail = [
      {
        id: 1,
        assunto: 'Boas-vindas ao Pollen Parque',
        corpo_html: '<p>Olá! Seja bem-vindo(a) ao programa de afiliados do Pollen Parque.</p>',
        gerado_por_ia: true,
        revisado_por_usuario_id: usuarioEquipeAna,
        revisado_em: dataHoraRelativa(-150),
        status: 'enviado',
        data_envio: dataHoraRelativa(-150),
        observacoes_ia: 'Rascunho gerado pelo agente de e-mail (RF-04) a partir do template de boas-vindas.',
      },
      {
        id: 2,
        assunto: 'Aviso de débito em atraso — Pollen Parque',
        corpo_html: '<p>Identificamos um boleto em atraso referente à sua anuidade. Entre em contato com a contabilidade.</p>',
        gerado_por_ia: true,
        revisado_por_usuario_id: usuarioEquipeBruno,
        revisado_em: dataHoraRelativa(-2),
        status: 'aprovado',
        data_envio: null,
        observacoes_ia: 'Rascunho de cobrança em massa (RN-28) — aguardando disparo manual pela equipe.',
      },
      {
        id: 3,
        assunto: 'Sua vigência está próxima do vencimento',
        corpo_html: '<p>Sua anuidade no Pollen Parque vence em breve. Fale com a equipe do programa para iniciar a renovação.</p>',
        gerado_por_ia: true,
        revisado_por_usuario_id: null,
        revisado_em: null,
        status: 'rascunho',
        data_envio: null,
        observacoes_ia: 'Rascunho ainda não revisado por nenhum integrante da equipe do programa (RN-28).',
      },
    ];

    const comunicacoesDestinatarios = [
      { comunicacao_email_id: 1, empresa_id: porKey.alfa.id },
      { comunicacao_email_id: 2, empresa_id: porKey.latitude.id },
      { comunicacao_email_id: 2, empresa_id: porKey.solsticio.id },
      { comunicacao_email_id: 3, empresa_id: porKey.aurora.id },
      { comunicacao_email_id: 3, empresa_id: porKey.meridiano.id },
    ];

    // ---------------------------------------------------------------------
    // log_auditoria
    // ---------------------------------------------------------------------
    const logAuditoria = [
      {
        entidade: 'contratos',
        entidade_id: porKey.alfa.contratoAtivoId,
        acao: 'create',
        usuario_id: usuarioEquipeAna,
        dados_anteriores: null,
        dados_novos: JSON.stringify({ status_contrato_id: statusContrato.vigente }),
      },
      {
        entidade: 'financeiro_lancamentos',
        entidade_id: porKey.latitude.id,
        acao: 'update',
        usuario_id: usuarioContabilidadeCarla,
        dados_anteriores: JSON.stringify({ data_pagamento: null }),
        dados_novos: JSON.stringify({ data_pagamento: null, observacao: 'Cobrança reforçada por e-mail.' }),
      },
    ];

    // ---------------------------------------------------------------------
    // Inserts na ordem correta de dependência de FK
    // ---------------------------------------------------------------------
    await qi.bulkInsert('empresas', empresas);
    await qi.bulkInsert('usuarios', usuarios);
    await qi.bulkInsert('formulario_respostas', formularioRespostas);
    await qi.bulkInsert('contratos', contratos);
    await qi.bulkInsert('assinaturas', assinaturas);
    await qi.bulkInsert('documentos', documentos);
    await qi.bulkInsert('financeiro_lancamentos', financeiroLancamentos);
    await qi.bulkInsert('espacos_fisicos', espacosFisicos);
    await qi.bulkInsert('comunicacoes_email', comunicacoesEmail);
    await qi.bulkInsert('comunicacoes_destinatarios', comunicacoesDestinatarios);
    await qi.bulkInsert('log_auditoria', logAuditoria);

    // Ajusta a sequence de usuarios.id porque inserimos IDs explícitos acima.
    await qi.sequelize.query("SELECT setval(pg_get_serial_sequence('usuarios', 'id'), (SELECT MAX(id) FROM usuarios));");
    await qi.sequelize.query("SELECT setval(pg_get_serial_sequence('comunicacoes_email', 'id'), (SELECT MAX(id) FROM comunicacoes_email));");
  },

  down: async (qi) => {
    for (const tabela of TABELAS_SEED_EM_ORDEM_REVERSA) {
      await qi.bulkDelete(tabela, null, {});
    }
  },
};

function dataHoraRelativa(diasOffset) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + diasOffset);
  return d;
}
