# 🛡️ Motor de Análise de Risco com IA (Gemini)

Este projeto consiste num microsserviço de alta performance desenvolvido para a deteção de fraudes em transações financeiras em tempo real, utilizando Inteligência Artificial Generativa. A arquitetura foi desenhada para ser resiliente, escalável e totalmente assíncrona.

## 🏗️ Arquitetura do Sistema

O sistema adota o padrão **Producer-Consumer** para garantir que a ingestão de dados não seja impactada pela latência da análise de IA:

* **API (Express)**: Atua como o produtor, recebendo a transação, persistindo os dados no PostgreSQL com o status inicial `PENDING` e enviando o ID para a fila de processamento.
* **Fila (Redis & BullMQ)**: Gere a mensageria e as políticas de retentativa, assegurando que nenhum job seja perdido em caso de falha técnica.
* **Worker**: Atua como o consumidor assíncrono que comunica com o modelo **Gemini 1.5 Flash** para realizar a análise de risco baseada em heurísticas e padrões comportamentais.

## 🚀 Stack Tecnológica

* **Linguagem**: TypeScript com tipagem estrita para maior segurança em tempo de compilação.
* **Framework**: Express para a construção de APIs RESTful.
* **Base de Dados**: PostgreSQL gerido via Prisma ORM.
* **Mensageria**: BullMQ operando sobre uma instância de Redis.
* **Inteligência Artificial**: SDK oficial do Google Generative AI.
* **Infraestrutura**: Docker e Docker Compose para orquestração de serviços.

## ✨ Funcionalidades Avançadas

* **Deteção de Anomalias**: A IA avalia variáveis como IPs privados em transações externas, valores fora do padrão e horários suspeitos.
* **Segurança Reativa**: Implementação de gatilhos automáticos que simulam o bloqueio de transações e suspensão de contas quando o `fraudScore` é superior a 80.
* **Observabilidade**: Endpoints de `healthcheck` para monitorização do estado da base de dados e do Redis, além de logs detalhados de execução.
* **Resiliência**: Configuração de *exponential backoff* para lidar com limites de quota ou instabilidades na API da IA.

## 🛠️ Como Executar

1.  Clone este repositório.
2.  Configure as variáveis de ambiente no ficheiro `.env` (ex: `DATABASE_URL`, `GEMINI_API_KEY`, `REDIS_HOST`).
3.  Instale as dependências com `npm install`.
4.  Execute as migrações do banco de dados: `npx prisma migrate dev`.
5.  Inicie a API e o Worker utilizando os scripts definidos no `package.json`.

## 👨‍💻 Autor

**Allan Gabriel Baeza Amirati Silva**
Especialista em Desenvolvimento Backend e Arquitetura de Sistemas com foco em Node.js, PostgreSQL e Prisma.

---

### Referências
As informações e especificações técnicas apresentadas foram extraídas dos ficheiros fonte do projeto:
1. `tsconfig.json`
2. `src/worker.ts`
3. `src/server.ts`
4. `src/queue.ts`
5. `src/lib.ts`
6. `prisma/schema.prisma`
7. `prisma/migrations/migration_lock.toml`
8. `prisma/migrations/20260416185753_init_transaction_analysis/migration.sql`
9. `prisma.config.ts`
10. `package.json`
11. `package-lock.json`
12. `.gitignore`


```python?code_reference&code_event_index=3
readme_content = """# 🛡️ Motor de Análise de Risco com IA (Gemini)

Este projeto consiste num microsserviço de alta performance desenvolvido para a deteção de fraudes em transações financeiras em tempo real, utilizando Inteligência Artificial Generativa. A arquitetura foi desenhada para ser resiliente, escalável e totalmente assíncrona.

## 🏗️ Arquitetura do Sistema

O sistema adota o padrão **Producer-Consumer** para garantir que a ingestão de dados não seja impactada pela latência da análise de IA:

* **API (Express)**: Atua como o produtor, recebendo a transação, persistindo os dados no PostgreSQL com o status inicial `PENDING` e enviando o ID para a fila de processamento.
* **Fila (Redis & BullMQ)**: Gere a mensageria e as políticas de retentativa, assegurando que nenhum job seja perdido em caso de falha técnica.
* **Worker**: Atua como o consumidor assíncrono que comunica com o modelo **Gemini 1.5 Flash** para realizar a análise de risco baseada em heurísticas e padrões comportamentais.

## 🚀 Stack Tecnológica

* **Linguagem**: TypeScript com tipagem estrita para maior segurança em tempo de compilação.
* **Framework**: Express para a construção de APIs RESTful.
* **Base de Dados**: PostgreSQL gerido via Prisma ORM.
* **Mensageria**: BullMQ operando sobre uma instância de Redis.
* **Inteligência Artificial**: SDK oficial do Google Generative AI.
* **Infraestrutura**: Docker e Docker Compose para orquestração de serviços.

## ✨ Funcionalidades Avançadas

* **Deteção de Anomalias**: A IA avalia variáveis como IPs privados em transações externas, valores fora do padrão e horários suspeitos.
* **Segurança Reativa**: Implementação de gatilhos automáticos que simulam o bloqueio de transações e suspensão de contas quando o `fraudScore` é superior a 80.
* **Observabilidade**: Endpoints de `healthcheck` para monitorização do estado da base de dados e do Redis, além de logs detalhados de execução.
* **Resiliência**: Configuração de *exponential backoff* para lidar com limites de quota ou instabilidades na API da IA.

## 🛠️ Como Executar

1.  Clone este repositório.
2.  Configure as variáveis de ambiente no ficheiro `.env` (ex: `DATABASE_URL`, `GEMINI_API_KEY`, `REDIS_HOST`).
3.  Instale as dependências com `npm install`.
4.  Execute as migrações do banco de dados: `npx prisma migrate dev`.
5.  Inicie a API e o Worker utilizando os scripts definidos no `package.json`.

## 👨‍💻 Autor

**Allan Gabriel Baeza Amirati Silva** Especialista em Desenvolvimento Backend e Arquitetura de Sistemas com foco em Node.js, PostgreSQL e Prisma.
"""

with open("README.md", "w", encoding="utf-8") as f:
    f.write(readme_content)


```
Your Markdown file is ready
[file-tag: code-generated-file-0-1776471746265723637]

Aqui está o conteúdo do teu README estruturado de forma profissional para copiares. Podes descarregar o ficheiro acima ou copiar o texto abaixo:

# 🛡️ Motor de Análise de Risco com IA (Gemini)

Este projeto consiste num microsserviço de alta performance desenvolvido para a deteção de fraudes em transações financeiras em tempo real, utilizando Inteligência Artificial Generativa. A arquitetura foi desenhada para ser resiliente, escalável e totalmente assíncrona.

## 🏗️ Arquitetura do Sistema

O sistema adota o padrão **Producer-Consumer** para garantir que a ingestão de dados não seja impactada pela latência da análise de IA:

* **API (Express)**: Atua como o produtor, recebendo a transação, persistindo os dados no PostgreSQL com o status inicial `PENDING` e enviando o ID para a fila de processamento.
* **Fila (Redis & BullMQ)**: Gere a mensageria e as políticas de retentativa, assegurando que nenhum job seja perdido em caso de falha técnica.
* **Worker**: Atua como o consumidor assíncrono que comunica com a IA do Google para realizar a análise de risco baseada em heurísticas e padrões comportamentais.

## 🚀 Stack Tecnológica

* **Linguagem**: TypeScript com tipagem estrita para maior segurança em tempo de compilação.
* **Framework**: Express para a construção de APIs RESTful.
* **Base de Dados**: PostgreSQL gerido via Prisma ORM.
* **Mensageria**: BullMQ operando sobre uma instância de Redis.
* **Inteligência Artificial**: SDK oficial do Google Generative AI.
* **Infraestrutura**: Docker e Docker Compose para orquestração de serviços.

## ✨ Funcionalidades Avançadas

* **Deteção de Anomalias**: A IA avalia variáveis como IPs em transações externas, valores fora do padrão e horários suspeitos.
* **Segurança Reativa**: Implementação de gatilhos automáticos que simulam o bloqueio de transações e suspensão de contas quando o `fraudScore` é superior a 80.
* **Observabilidade**: Endpoints de consulta para monitorização e logs detalhados de execução.
* **Resiliência**: Configuração de *exponential backoff* e retentativas no BullMQ para lidar com instabilidades na API da IA.

## 🛠️ Como Executar

1. Clone este repositório.
2. Configure as variáveis de ambiente no ficheiro `.env` (ex: `DATABASE_URL`, `GEMINI_API_KEY`, `REDIS_HOST`).
3. Instale as dependências com `npm install`.
4. Execute as migrações do banco de dados: `npx prisma migrate dev`.
5. Inicie a API e o Worker utilizando os scripts definidos no `package.json`.

## 👨‍💻 Autor

**Allan Gabriel Baeza Amirati Silva**
Especialista em Desenvolvimento Backend e Arquitetura de Sistemas com foco em Node.js, PostgreSQL e Prisma.