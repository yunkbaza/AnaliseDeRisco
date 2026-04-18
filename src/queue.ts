import { Queue, QueueEvents } from 'bullmq';
import Redis from 'ioredis';

export const redisConnection = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null, 
});

redisConnection.on('error', (err) => {
  console.error('⚠️ Erro de conexão com o Redis:', err);
});

export const riskAnalysisQueue = new Queue('RiskAnalysisQueue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3, // Padrão Sênior: Se a API do Google falhar, o Redis tenta de novo automaticamente 3 vezes
    backoff: { type: 'exponential', delay: 1000 },
  }
});

// Observabilidade: Escuta os eventos da fila em tempo real
const queueEvents = new QueueEvents('RiskAnalysisQueue', { connection: redisConnection });

queueEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`🔴 Fila: Job ${jobId} falhou definitivamente. Motivo: ${failedReason}`);
});