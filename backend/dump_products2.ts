import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany();
  products.forEach(p => console.log(`${p.sku} | ${p.name} | ${p.id}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
