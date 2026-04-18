import { Queue, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import { logger } from './logger.js'; // 🛡️ Importamos o logger

export const redisConnection = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null, 
});

redisConnection.on('error', (err) => {
  logger.error({ err }, '⚠️ Erro de conexão com o Redis');
});

export const riskAnalysisQueue = new Queue('RiskAnalysisQueue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3, 
    backoff: { type: 'exponential', delay: 1000 },
  }
});

const queueEvents = new QueueEvents('RiskAnalysisQueue', { connection: redisConnection });

queueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error(`🔴 Fila: Job ${jobId} falhou definitivamente. Motivo: ${failedReason}`);
});