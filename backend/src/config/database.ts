import { PrismaClient } from '@prisma/client';

/**
 * Database configuration and Prisma client instance
 */
const prisma = new PrismaClient({
  // log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  log: [{ emit: 'event', level: 'query' }] as const,
  errorFormat: 'pretty',
});

// Handle graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;