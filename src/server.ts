import express from 'express';
import cors from 'cors';
import { prisma } from './lib.js'; 
import { riskAnalysisQueue, redisConnection } from './queue.js';
import { Prisma } from '@prisma/client';
import rateLimit from 'express-rate-limit';

// 1. O teu novo Logger (Garante que criaste o ficheiro src/logger.ts)
import { logger } from './logger.js'; 

// 2. Importações do Bull-Board
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

// 3. Importações do Swagger
import swaggerUi from 'swagger-ui-express';

// Exportamos a app para que o Vitest possa testá-la sem abrir a porta HTTP
export const app = express();

app.use(cors());
app.use(express.json());

// --- CONFIGURAÇÃO DO SWAGGER ---
const swaggerDocument = {
  openapi: "3.0.0",
  info: { title: "Motor Anti-Fraude API", version: "1.0.0", description: "API de análise de risco financeiro com IA" },
  paths: {
    "/api/v1/analyze-risk": {
      post: {
        summary: "Envia transação para análise",
        requestBody: { content: { "application/json": { schema: { type: "object", properties: { transactionId: { type: "string" }, userId: { type: "string" }, amount: { type: "number" }, merchant: { type: "string" }, deviceIp: { type: "string" }, timestamp: { type: "string", format: "date-time" } } } } } },
        responses: { "202": { description: "Aceite" }, "400": { description: "Bad Request" }, "409": { description: "Conflito (Duplicado)" } }
      },
      get: {
        summary: "Lista últimas análises",
        parameters: [{ name: "limit", in: "query", schema: { type: "integer" } }],
        responses: { "200": { description: "Sucesso" } }
      }
    },
    "/api/v1/analyze-risk/{id}": {
        get: {
            summary: "Consulta uma análise específica",
            parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
            responses: { "200": { description: "Sucesso" }, "404": { description: "Não encontrado" } }
        }
    }
  }
};
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// --- CONFIGURAÇÃO DO BULL-BOARD (Painel da Fila) ---
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');
createBullBoard({
  queues: [new BullMQAdapter(riskAnalysisQueue)],
  serverAdapter: serverAdapter,
});
app.use('/admin/queues', serverAdapter.getRouter());


// 🛡️ GATILHO DE SEGURANÇA: Limita a 50 requisições por minuto por IP
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 50, 
  message: { error: 'Too Many Requests', details: 'Limite de requisições excedido. Tente novamente em 1 minuto.' },
  standardHeaders: true, 
  legacyHeaders: false, 
});

// Aplica o escudo apenas nas rotas da API (o /health fica de fora)
app.use('/api/', apiLimiter);

/**
 * GET /health
 * Padrão Sênior: Healthcheck para orquestradores
 */
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`; 
    await redisConnection.ping();     
    res.status(200).json({ status: 'healthy', database: 'connected', redis: 'connected' });
  } catch (error) {
    logger.error({ err: error }, 'Erro no Healthcheck');
    res.status(503).json({ status: 'unhealthy', error: 'Service Unavailable' });
  }
});

/**
 * POST /api/v1/analyze-risk
 */
app.post('/api/v1/analyze-risk', async (req, res) => {
  try {
    const { transactionId, userId, amount, merchant, deviceIp, timestamp } = req.body;

    if (!transactionId || !userId || !amount) {
      return res.status(400).json({ error: 'Campos obrigatórios ausentes: transactionId, userId e amount.' });
    }

    const transaction = await prisma.transactionAnalysis.create({
      data: {
        transactionId,
        userId,
        amount,
        merchant,
        deviceIp,
        timestamp: new Date(timestamp), 
        status: 'PENDING' 
      }
    });

    await riskAnalysisQueue.add('AnalyzeTransaction', { transactionId: transaction.id });
    
    logger.info(`Transação ${transactionId} enviada para a fila com sucesso.`);

    res.status(202).json({
      message: 'Transação recebida e enviada para análise assíncrona.',
      jobId: transaction.id,
      status: transaction.status
    });

  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      logger.warn(`Conflito: Transação ${req.body.transactionId} já processada.`);
      return res.status(409).json({ error: 'Conflict', message: 'Transação já processada.' });
    }
    logger.error({ err: error }, 'Erro na ingestão de transação');
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

/**
 * GET /api/v1/analyze-risk
 */
app.get('/api/v1/analyze-risk', async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 10;
    const analyses = await prisma.transactionAnalysis.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: { id: true, transactionId: true, amount: true, status: true, fraudScore: true }
    });
    res.json(analyses);
  } catch (error) {
    logger.error({ err: error }, 'Erro ao listar análises');
    res.status(500).json({ error: 'Erro ao listar análises' });
  }
});

/**
 * GET /api/v1/analyze-risk/:id
 */
app.get('/api/v1/analyze-risk/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const analysis = await prisma.transactionAnalysis.findUnique({ where: { id } });

    if (!analysis) return res.status(404).json({ error: 'Análise não encontrada.' });

    res.json({
      id: analysis.id,
      status: analysis.status,
      resultado: { score: analysis.fraudScore, justificativa: analysis.iaReason },
      atualizadoEm: analysis.updatedAt
    });
  } catch (error) {
    logger.error({ err: error }, `Erro ao consultar análise ${req.params.id}`);
    res.status(500).json({ error: 'Erro ao consultar análise' });
  }
});

const PORT = Number(process.env.PORT) || 3333;

// Só inicia o servidor na porta se não estivermos num ambiente de testes (Vitest)
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info(`🚀 Motor de Risco Online na porta ${PORT}`);
    logger.info(`📚 Swagger Docs em: http://localhost:${PORT}/api-docs`);
    logger.info(`📊 Fila Bull-Board em: http://localhost:${PORT}/admin/queues`);
  });

  process.on('SIGTERM', () => {
    logger.info('Sinal SIGTERM recebido. Fechando servidor HTTP...');
    server.close(() => {
      logger.info('Servidor HTTP fechado.');
      prisma.$disconnect();
      redisConnection.quit();
      process.exit(0);
    });
  });
}