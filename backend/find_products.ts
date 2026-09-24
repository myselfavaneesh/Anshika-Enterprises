import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany();
  products.forEach(p => {
    if (p.sku.toLowerCase().includes('4l') || p.sku.toLowerCase().includes('5lb') || p.sku.toLowerCase().includes('9ah') || p.sku.toLowerCase().includes('4000l')) {
      console.log(`${p.sku} | ${p.name}`);
    }
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
