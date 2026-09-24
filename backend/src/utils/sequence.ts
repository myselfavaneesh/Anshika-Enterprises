import prisma from '../prisma';

/**
 * Atomically generates the next integer sequence for a given prefix (e.g. 'INV/26-27/', 'QT/26-27/').
 * Uses row-level atomic increment via invoiceSequence.update/upsert to prevent race conditions.
 */
export async function getNextSequenceNumber(
  tx: any,
  prefix: string,
  entityType: 'sale' | 'quotation'
): Promise<number> {
  const client = tx || prisma;

  // Check if sequence record exists
  const existing = await client.invoiceSequence.findUnique({
    where: { id: prefix }
  });

  if (!existing) {
    // Determine existing max if any
    let maxNum = 0;
    if (entityType === 'sale') {
      const sales = await client.sale.findMany({
        where: { invoiceNumber: { startsWith: prefix } },
        select: { invoiceNumber: true }
      });
      for (const s of sales) {
        const num = parseInt(s.invoiceNumber.replace(prefix, ''), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    } else if (entityType === 'quotation') {
      const quotes = await client.quotation.findMany({
        where: { quotationNumber: { startsWith: prefix } },
        select: { quotationNumber: true }
      });
      for (const q of quotes) {
        const num = parseInt(q.quotationNumber.replace(prefix, ''), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    }

    const seq = await client.invoiceSequence.upsert({
      where: { id: prefix },
      create: { id: prefix, lastValue: maxNum + 1 },
      update: { lastValue: { increment: 1 } }
    });
    return seq.lastValue;
  }

  const seq = await client.invoiceSequence.update({
    where: { id: prefix },
    data: { lastValue: { increment: 1 } }
  });
  return seq.lastValue;
}
