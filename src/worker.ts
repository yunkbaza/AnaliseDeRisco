import 'dotenv/config';
import { Worker } from 'bullmq';
import { redisConnection } from './queue.js';
import { prisma } from './lib.js';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

// Inicializa a IA do Google
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

console.log('👷 Worker iniciado e aguardando transações na fila...');

const worker = new Worker('RiskAnalysisQueue', async (job) => {
  const { transactionId } = job.data;
  console.log(`[Job ${job.id}] Iniciando análise da transação: ${transactionId}`);

  try {
    // 1. Busca os dados e marca como PROCESSANDO
    const transaction = await prisma.transactionAnalysis.update({
      where: { id: transactionId },
      data: { status: 'PROCESSING' }
    });

    // 2. Configura o modelo para retornar ESTRITAMENTE JSON
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const prompt = `
      Você é um sistema de detecção de fraudes. 
      Analise os dados e retorne APENAS um JSON:
      {
        "fraudScore": número de 0 a 100,
        "iaReason": "justificativa curta"
      }

      Dados:
      Valor: R$ ${transaction.amount}
      Loja: ${transaction.merchant}
      IP: ${transaction.deviceIp}
    `;  

    // 3. Chamada à IA
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    console.log(`[Job ${job.id}] Resposta bruta da IA:`, text);

    // 4. Parse seguro do JSON
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const aiAnalysis = JSON.parse(text);

    // 5. Atualiza o banco com o veredito final
    await prisma.transactionAnalysis.update({
      where: { id: transactionId },
      data: {
        status: 'COMPLETED',
        fraudScore: aiAnalysis.fraudScore ?? 0,
        iaReason: aiAnalysis.iaReason ?? "Sem justificativa fornecida pela IA."
      }
    });

    console.log(`[Job ${job.id}] Sucesso! Score: ${aiAnalysis.fraudScore}`);

  } catch (error) {
    console.error(`[Job ${job.id}] Erro no processamento:`, error);
    
    // Tenta marcar como falha no banco para não ficar em loop eterno
    try {
        await prisma.transactionAnalysis.update({
            where: { id: transactionId },
            data: { status: 'FAILED' }
        });
    } catch (dbError) {
        console.error("Erro ao atualizar status para FAILED no banco:", dbError);
    }
    
    throw error; 
  }
}, { 
    connection: redisConnection,
    removeOnComplete: { count: 100 }, // Limpa jobs antigos do Redis para não encher a memória
});

process.on('SIGINT', async () => {
  await worker.close();
  process.exit(0);
});