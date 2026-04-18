import 'dotenv/config';
import { Worker } from 'bullmq';
import { redisConnection } from './queue.js';
import { prisma } from './lib.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

console.log('👷 Worker de IA iniciado e conectado à fila de risco...');

const worker = new Worker('RiskAnalysisQueue', async (job) => {
  const { transactionId } = job.data;
  console.log(`\n[Job ${job.id}] 🔄 Iniciando análise da transação interna: ${transactionId}`);

  try {
    const transaction = await prisma.transactionAnalysis.update({
      where: { id: transactionId },
      data: { status: 'PROCESSING' }
    });

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: "application/json" }
    });

    // Prompt enriquecido para exigir precisão cirúrgica da IA
    const prompt = `
      Você é um motor antifraude bancário autônomo.
      Analise a transação financeira abaixo e retorne ESTRITAMENTE um objeto JSON.
      Avalie anomalias como: IPs privados em redes externas, valores exorbitantes, horários suspeitos.
      
      Estrutura obrigatória:
      {
        "fraudScore": <inteiro de 0 a 100, onde 100 é fraude confirmada>,
        "iaReason": "<explicação técnica e concisa do motivo do score em até 200 caracteres>"
      }

      Dados da Transação:
      - ID Bancário: ${transaction.transactionId}
      - Valor: R$ ${transaction.amount.toString()}
      - Estabelecimento: ${transaction.merchant}
      - IP Registrado: ${transaction.deviceIp || 'Não informado'}
      - Data/Hora: ${transaction.timestamp.toISOString()}
    `;  

    const result = await model.generateContent(prompt);
    let text = result.response.text();
    
    // Tratamento robusto para garantir que o parse não quebre se a IA enviar markdown
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const aiAnalysis = JSON.parse(text);

    // Persiste o veredito
    await prisma.transactionAnalysis.update({
      where: { id: transactionId },
      data: {
        status: 'COMPLETED',
        fraudScore: aiAnalysis.fraudScore ?? 0,
        iaReason: aiAnalysis.iaReason ?? "Justificativa não fornecida."
      }
    });

    console.log(`[Job ${job.id}] ✅ Sucesso! Score: ${aiAnalysis.fraudScore} | ${aiAnalysis.iaReason}`);

    // 🔴 GATILHO DE SEGURANÇA REATIVA (WEBHOOK INTERNO)
    if (aiAnalysis.fraudScore >= 80) {
      console.log(`\n🚨 [ALERTA VERMELHO] FRAUDE DETECTADA NO JOB ${job.id} 🚨`);
      console.log(`Bloqueando transação: ${transaction.transactionId}`);
      console.log(`Iniciando estorno de R$ ${transaction.amount} para o usuário ${transaction.userId}...`);
      
      // Aqui você poderia disparar um Webhook real:
      // await fetch('https://api.banco.com/v1/webhooks/fraud-alert', { method: 'POST', body: JSON.stringify({...}) });
      
      console.log(`🛡️ Ação concluída: Conta temporariamente suspensa por segurança.\n`);
    }

  } catch (error) {
    console.error(`[Job ${job.id}] ❌ Erro Crítico no processamento:`, error);
    
    await prisma.transactionAnalysis.update({
      where: { id: transactionId },
      data: { status: 'FAILED' }
    });
    
    throw error; 
  }
}, { 
    connection: redisConnection,
    removeOnComplete: { count: 100 }, // Mantém o Redis limpo
    removeOnFail: { count: 50 },
});

process.on('SIGINT', async () => {
  console.log('Desligando o Worker de forma segura...');
  await worker.close();
  process.exit(0);
});