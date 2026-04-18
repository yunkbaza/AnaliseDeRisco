import express from 'express';
import cors from 'cors';
import { prisma } from './lib.js'; 
import { riskAnalysisQueue, redisConnection } from './queue.js';
import { Prisma } from '@prisma/client';
import rateLimit from 'express-rate-limit'; // 🛡️ NOVIDADE: Importação do Rate Limit

const app = express();

app.use(cors());
app.use(express.json());

// 🛡️ GATILHO DE SEGURANÇA: Limita a 50 requisições por minuto por IP
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 50, 
  message: { error: 'Too Many Requests', details: 'Limite de requisições excedido. Tente novamente em 1 minuto.' },
  standardHeaders: true, 
  legacyHeaders: false, 
});

// Aplica o escudo apenas nas rotas da API (o /health fica de fora para não bloquear os monitores)
app.use('/api/', apiLimiter);

/**
 * GET /health
 * Padrão Sênior: Healthcheck para orquestradores (Docker/Kubernetes).
 */
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`; // Testa o Postgres
    await redisConnection.ping();     // Testa o Redis
    res.status(200).json({ status: 'healthy', database: 'connected', redis: 'connected' });
  } catch (error) {
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

    res.status(202).json({
      message: 'Transação recebida e enviada para análise assíncrona.',
      jobId: transaction.id,
      status: transaction.status
    });

  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({ error: 'Conflict', message: 'Transação já processada.' });
    }
    console.error('Erro na ingestão:', error);
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
      select: {
        id: true,
        transactionId: true,
        amount: true,
        status: true,
        fraudScore: true
      }
    });
    res.json(analyses);
  } catch (error) {
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
      resultado: {
        score: analysis.fraudScore,
        justificativa: analysis.iaReason
      },
      atualizadoEm: analysis.updatedAt
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao consultar análise' });
  }
});

const PORT = Number(process.env.PORT) || 3333;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Motor de Risco Online na porta ${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('Sinal SIGTERM recebido. Fechando servidor HTTP...');
  server.close(() => {
    console.log('Servidor HTTP fechado.');
    prisma.$disconnect();
    redisConnection.quit();
    process.exit(0);
  });
});