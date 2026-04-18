import express from 'express';
import cors from 'cors';
import { prisma } from './lib.js'; 
import { riskAnalysisQueue, redisConnection } from './queue.js';
import { Prisma } from '@prisma/client';

const app = express();

app.use(cors());
app.use(express.json());

/**
 * GET /health
 * Padrão Sênior: Healthcheck para orquestradores (Docker/Kubernetes).
 * Verifica se o Banco e o Redis estão respondendo antes de dar "OK".
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
 * Recebe a transação, persiste no banco e dispara o processamento assíncrono.
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
 * Padrão Sênior: Rota para Dashboard de Administração com Paginação.
 * Retorna as últimas análises do motor.
 */
app.get('/api/v1/analyze-risk', async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 10; // Ex: ?limit=20
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
 * Consulta o veredito detalhado de uma análise específica.
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

// Padrão Sênior: Graceful Shutdown (Desliga o servidor sem quebrar as conexões ativas)
process.on('SIGTERM', () => {
  console.log('Sinal SIGTERM recebido. Fechando servidor HTTP...');
  server.close(() => {
    console.log('Servidor HTTP fechado.');
    prisma.$disconnect();
    redisConnection.quit();
    process.exit(0);
  });
});