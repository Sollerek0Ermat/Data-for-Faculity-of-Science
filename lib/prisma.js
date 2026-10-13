// lib/prisma.js

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const env = require('dotenv').config({ path: './config.env' })


let prisma;

function getPrisma() {
  if (!prisma) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set when Prisma client was created. Check env loading order.');
    }

    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
    prisma = new PrismaClient({ adapter });
  }
  return prisma;
}

module.exports = getPrisma();