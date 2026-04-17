import { Queue } from 'bullmq';
import Redis from 'ioredis';

// Cria a conexão com o Redis que acabamos de subir no Docker
export const redisConnection = new Redis({
  host: '127.0.0.1',
  port: 6379,
  maxRetriesPerRequest: null, // Obrigatório para o BullMQ funcionar corretamente
});

// Cria a instância da fila "RiskAnalysisQueue"
export const riskAnalysisQueue = new Queue('RiskAnalysisQueue', {
  connection: redisConnection,
});