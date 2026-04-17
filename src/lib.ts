import 'dotenv/config'; // Garante que as variáveis de ambiente sejam lidas
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// 1. Pega a URL do banco do arquivo .env
const connectionString = process.env.DATABASE_URL as string;

// 2. Cria um "Pool" de conexões nativo do Postgres
const pool = new Pool({ connectionString });

// 3. Diz para o Prisma usar esse Pool através do adaptador
const adapter = new PrismaPg(pool);

// 4. Inicia o Prisma Client passando o adaptador (agora ele não vai mais reclamar!)
export const prisma = new PrismaClient({ adapter });