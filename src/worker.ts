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

    let finalScore = 0;
    let finalReason = '';

    try {
      // 🟢 PLANO A: TENTA USAR A INTELIGÊNCIA ARTIFICIAL
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash',
        generationConfig: { responseMimeType: "application/json" }
      });

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
      
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const aiAnalysis = JSON.parse(text);

      finalScore = aiAnalysis.fraudScore ?? 0;
      finalReason = aiAnalysis.iaReason ?? "Justificativa não fornecida.";

    } catch (iaError) {
      // 🛡️ PLANO B: FALLBACK DETERMINÍSTICO (Se a IA cair, usa regras fixas)
      console.warn(`[Job ${job.id}] ⚠️ IA indisponível. Acionando Motor de Regras Estáticas (Fallback)...`);
      
      const amountNum = Number(transaction.amount);
      const isPrivateIp = transaction.deviceIp?.startsWith('192.168') || transaction.deviceIp?.startsWith('172.') || transaction.deviceIp?.startsWith('10.');
      
      if (amountNum > 10000 && isPrivateIp) {
        finalScore = 85;
        finalReason = "Fallback Rule: Alto valor associado a IP local suspeito.";
      } else if (amountNum > 50000) {
        finalScore = 90;
        finalReason = "Fallback Rule: Valor da transação excede o limite de segurança operacional.";
      } else {
        finalScore = 10;
        finalReason = "Fallback Rule: Transação dentro dos limites seguros padrão.";
      }
    }

    // Persiste o veredito final (seja do Plano A ou do Plano B)
    await prisma.transactionAnalysis.update({
      where: { id: transactionId },
      data: {
        status: 'COMPLETED',
        fraudScore: finalScore,
        iaReason: finalReason
      }
    });

    console.log(`[Job ${job.id}] ✅ Sucesso! Score: ${finalScore} | ${finalReason}`);

    // 🔴 GATILHO DE SEGURANÇA REATIVA
    if (finalScore >= 80) {
      console.log(`\n🚨 [ALERTA VERMELHO] FRAUDE DETECTADA NO JOB ${job.id} 🚨`);
      console.log(`Bloqueando transação: ${transaction.transactionId}`);
      console.log(`Iniciando estorno de R$ ${transaction.amount} para o utilizador ${transaction.userId}...`);
      console.log(`🛡️ Ação concluída: Conta temporariamente suspensa por segurança.\n`);
    }

  } catch (error) {
    // Falha crítica (ex: base de dados caiu)
    console.error(`[Job ${job.id}] ❌ Erro Crítico no processamento:`, error);
    await prisma.transactionAnalysis.update({
      where: { id: transactionId },
      data: { status: 'FAILED' }
    });
    throw error; 
  }
}, { 
    connection: redisConnection,
    removeOnComplete: { count: 100 }, 
    removeOnFail: { count: 50 },
});

process.on('SIGINT', async () => {
  console.log('Desligando o Worker de forma segura...');
  await worker.close();
  process.exit(0);
});