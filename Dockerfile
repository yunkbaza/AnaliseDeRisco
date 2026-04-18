# Usa uma imagem estável do Node.js
FROM node:20-alpine

# Cria o diretório de trabalho
WORKDIR /app

# Copia os ficheiros de dependências
COPY package*.json ./
COPY prisma ./prisma/

# Instala as dependências
RUN npm install

# Copia o resto do código
COPY . .

# Gera o cliente do Prisma
RUN npx prisma generate

# A imagem será usada tanto para o Server como para o Worker
# O comando de início será definido no Docker Compose