import { PrismaClient as ImportedPrismaClient } from '@prisma/client';

const PrismaClient = ImportedPrismaClient;

declare global {
  var prisma: ImportedPrismaClient | undefined;
}

export const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}
