import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting warehouse migration...');

  // 1. Create default Main Warehouse if it doesn't exist
  let mainWarehouse = await prisma.warehouse.findUnique({
    where: { name: 'Main Warehouse' },
  });

  if (!mainWarehouse) {
    mainWarehouse = await prisma.warehouse.create({
      data: {
        name: 'Main Warehouse',
        location: 'Headquarters',
      },
    });
    console.log(`Created new warehouse: ${mainWarehouse.name} (${mainWarehouse.id})`);
  } else {
    console.log(`Found existing warehouse: ${mainWarehouse.name} (${mainWarehouse.id})`);
  }

  // 2. Update all ProductUnits that don't have a warehouse assigned
  const result = await prisma.productUnit.updateMany({
    where: { warehouseId: null },
    data: { warehouseId: mainWarehouse.id },
  });

  console.log(`Successfully assigned ${result.count} product units to the Main Warehouse.`);
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
