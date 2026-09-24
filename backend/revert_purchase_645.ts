import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function revert() {
  const purchase = await prisma.purchase.findFirst({
    where: { purchaseInvoiceNumber: "645" }
  });

  if (!purchase) {
    console.log("Purchase 645 not found.");
    return;
  }

  console.log(`Reverting purchase ${purchase.id}...`);

  // Revert inventory balances
  const transactions = await prisma.inventoryTransaction.findMany({
    where: { referenceId: purchase.id }
  });

  for (const t of transactions) {
    if (t.transactionType === "IN") {
      await prisma.inventory.update({
        where: { productId: t.productId },
        data: { quantity: { decrement: t.quantity } }
      });
      console.log(`Decremented inventory for product ${t.productId} by ${t.quantity}`);
    }
  }

  // Delete inventory transactions
  await prisma.inventoryTransaction.deleteMany({
    where: { referenceId: purchase.id }
  });
  console.log("Deleted inventory transactions");

  // Delete product units
  await prisma.productUnit.deleteMany({
    where: { purchaseId: purchase.id }
  });
  console.log("Deleted product units");

  // Delete purchase items
  await prisma.purchaseItem.deleteMany({
    where: { purchaseId: purchase.id }
  });
  console.log("Deleted purchase items");

  // Delete purchase
  await prisma.purchase.delete({
    where: { id: purchase.id }
  });
  console.log("Deleted purchase");
}

revert().catch(console.error).finally(() => prisma.$disconnect());
