import express from 'express';
import cors from 'cors';
import { prisma } from './lib.js'; 
import { riskAnalysisQueue } from './queue.js';
import { Prisma } from '@prisma/client';

const app = express();

app.use(cors());
app.use(express.json());

/**
 * POST /api/v1/analyze-risk
 * Recebe a transação, persiste no banco e dispara o processamento assíncrono.
 */
app.post('/api/v1/analyze-risk', async (req, res) => {
  try {
    const { transactionId, userId, amount, merchant, deviceIp, timestamp } = req.body;

    // Validação básica (Toque sênior para evitar 500 desnecessário)
    if (!transactionId || !userId || !amount) {
      return res.status(400).json({ error: 'Campos obrigatórios ausentes: transactionId, userId e amount.' });
    }

    // 1. Persistência inicial com status PENDING
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

    // 2. Desacoplamento via Redis/BullMQ
    await riskAnalysisQueue.add('AnalyzeTransaction', { 
      transactionId: transaction.id 
    });

    // 3. Resposta de aceitação (HTTP 202)
    res.status(202).json({
      message: 'Transação recebida e enviada para análise assíncrona.',
      jobId: transaction.id,
      status: transaction.status
    });

  } catch (error) {
    // Tratamento de conflito de ID Único (P2002)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return res.status(409).json({ 
          error: 'Conflict', 
          message: 'Esta transação já foi processada anteriormente.' 
        });
      }
    }
    
    console.error('Erro na ingestão:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

/**
 * GET /api/v1/analyze-risk/:id
 * Consulta o veredito da análise no banco de dados.
 */
app.get('/api/v1/analyze-risk/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const analysis = await prisma.transactionAnalysis.findUnique({
      where: { id }
    });

    if (!analysis) {
      return res.status(404).json({ error: 'Análise não encontrada.' });
    }

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
    console.error('Erro na consulta:', error);
    res.status(500).json({ error: 'Erro ao consultar análise' });
  }
});

// Correção na tipagem da porta para garantir compatibilidade com o Express
const PORT = Number(process.env.PORT) || 3333;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Motor de Risco Online na porta ${PORT}`);
});