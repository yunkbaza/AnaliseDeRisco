# 🛡️ Motor de Análise de Risco Financeiro com IA

![Node.js](https://img.shields.io/badge/Node.js-20-green?logo=nodedotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue?logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma-informational?logo=postgresql)
![Redis](https://img.shields.io/badge/Redis-BullMQ-red?logo=redis)
![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub_Actions-brightgreen?logo=github)

Microsserviço de alta performance desenvolvido para a deteção de fraudes em transações financeiras em tempo real, utilizando a Inteligência Artificial Generativa do Google (Gemini) e uma arquitetura robusta de mensageria assíncrona.

## 🏗️ Arquitetura do Sistema (Producer-Consumer)
Para garantir que a ingestão de dados não sofre com a latência da IA, o sistema foi dividido:
* **API (Produtor)**: Valida, aplica *Rate Limiting*, regista no PostgreSQL e envia para a fila.
* **Fila (Redis/BullMQ)**: Gere retentativas com *exponential backoff* em caso de falha de rede.
* **Worker (Consumidor)**: Comunica com a IA. Possui um **Circuit Breaker (Fallback)**: se a IA falhar, ativa um motor de regras heurísticas estáticas, garantindo 100% de disponibilidade.

## ✨ Funcionalidades Nível "Staff/Senior"
* **Engenharia de Caos & Resiliência**: Fallback determinístico caso o serviço da IA externa caia.
* **Segurança Reativa**: Rate Limiting contra ataques DDoS e bloqueio automático de IPs maliciosos.
* **Observabilidade Total**: Logs estruturados em JSON com **Pino** e interface visual da fila com **Bull-Board**.
* **Documentação Viva**: Rotas totalmente documentadas interativamente com **Swagger UI** (OpenAPI).
* **Qualidade Garantida**: Cobertura de testes end-to-end com **Vitest** e pipeline de CI/CD configurada no **GitHub Actions**.

## 🛠️ Como Executar (Docker Compose)
1. Clone o repositório e crie o `.env` com a sua `GEMINI_API_KEY`.
2. Inicie a infraestrutura: `docker compose up -d`
3. Aceda às interfaces visuais:
   * **Documentação da API**: `http://localhost:3333/api-docs`
   * **Painel da Fila**: `http://localhost:3333/admin/queues`

## 👨‍💻 Autor
**Allan Gabriel Baeza Amirati Silva**
Especialista em Desenvolvimento Backend e Arquitetura de Sistemas (Node.js, PostgreSQL e Prisma).