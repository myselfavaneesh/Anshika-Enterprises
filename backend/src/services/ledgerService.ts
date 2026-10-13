import prisma from '../prisma';
import { mapEntityId } from '../utils/mapper';

export interface CustomerLedgerEntry {
  _id: string;
  date: Date;
  type: 'SALE' | 'PAYMENT';
  invoiceNumber?: string;
  grandTotal?: number;
  items?: any[];
  status?: string;
  paymentType?: 'MONEY_IN' | 'MONEY_OUT';
  amount?: number;
  paymentMode?: string | null;
  referenceId?: string | null;
  notes?: string | null;
  runningBalance?: number;
}

export interface SupplierLedgerEntry {
  _id: string;
  date: Date;
  type: 'PURCHASE' | 'PAYMENT';
  invoiceNumber?: string;
  grandTotal?: number;
  items?: any[];
  status?: string;
  paymentType?: 'MONEY_IN' | 'MONEY_OUT';
  amount?: number;
  paymentMode?: string | null;
  referenceId?: string | null;
  notes?: string | null;
  runningBalance?: number;
}

/**
 * Pure function: calculates cumulative running balance for customer ledger entries.
 * Sorts entries chronologically.
 * SALE -> increases balance (customer owes money)
 * PAYMENT (MONEY_IN) -> decreases balance (customer paid)
 * PAYMENT (MONEY_OUT) -> increases balance (refund given to customer)
 */
export function computeCustomerRunningBalances(entries: CustomerLedgerEntry[], openingBalance: number = 0): CustomerLedgerEntry[] {
  const sorted = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let runningBalance = openingBalance;

  return sorted.map((entry) => {
    if (entry.type === 'SALE') {
      runningBalance = Number((runningBalance + Number(entry.grandTotal || 0)).toFixed(2));
    } else if (entry.type === 'PAYMENT') {
      const amt = Number(entry.amount || 0);
      if (entry.paymentType === 'MONEY_IN') {
        runningBalance = Number((runningBalance - amt).toFixed(2));
      } else if (entry.paymentType === 'MONEY_OUT') {
        runningBalance = Number((runningBalance + amt).toFixed(2));
      }
    }

    return {
      ...entry,
      runningBalance,
    };
  });
}

/**
 * Pure function: calculates cumulative running balance for supplier ledger entries.
 * Sorts entries chronologically.
 * PURCHASE -> increases balance (we owe supplier money)
 * PAYMENT (MONEY_OUT) -> decreases balance (we paid supplier)
 * PAYMENT (MONEY_IN) -> increases balance (refund from supplier)
 */
export function computeSupplierRunningBalances(entries: SupplierLedgerEntry[], openingBalance: number = 0): SupplierLedgerEntry[] {
  const sorted = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let runningBalance = openingBalance;

  return sorted.map((entry) => {
    if (entry.type === 'PURCHASE') {
      runningBalance = Number((runningBalance + Number(entry.grandTotal || 0)).toFixed(2));
    } else if (entry.type === 'PAYMENT') {
      const amt = Number(entry.amount || 0);
      if (entry.paymentType === 'MONEY_OUT') {
        runningBalance = Number((runningBalance - amt).toFixed(2));
      } else if (entry.paymentType === 'MONEY_IN') {
        runningBalance = Number((runningBalance + amt).toFixed(2));
      }
    }

    return {
      ...entry,
      runningBalance,
    };
  });
}

export interface RecordPaymentInput {
  entityType: 'CUSTOMER' | 'SUPPLIER';
  entityId: string;
  type: 'MONEY_IN' | 'MONEY_OUT';
  amount: number;
  paymentMode: string;
  referenceId?: string | null;
  notes?: string | null;
}

export class LedgerService {
  /**
   * Fetches customer profile, all sales, and all payments, and calculates the running Khata ledger with optional date filter and opening balance.
   */
  static async getCustomerLedger(customerId: string, startDate?: string, endDate?: string) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) return null;

    const salesRaw = await prisma.sale.findMany({
      where: { customerId, deletedAt: null },
      include: {
        saleItems: {
          include: {
            product: true,
            productUnits: {
              select: { serialNumber: true },
            },
          },
        },
      },
    });

    const sales: CustomerLedgerEntry[] = salesRaw.map((sale) => {
      const items = sale.saleItems.map((item: any) => {
        const { product, productUnits, ...itemRest } = item;
        return {
          ...mapEntityId(itemRest),
          productId: mapEntityId(product),
          serialNumbers: productUnits.map((u: any) => u.serialNumber),
        };
      });

      return {
        _id: sale.id,
        date: sale.createdAt,
        type: 'SALE',
        invoiceNumber: sale.invoiceNumber,
        grandTotal: Number(sale.grandTotal),
        items,
        status: sale.status,
      };
    });

    const paymentsRaw = await prisma.payment.findMany({
      where: { entityId: customerId, entityType: 'CUSTOMER', deletedAt: null },
    });

    const payments: CustomerLedgerEntry[] = paymentsRaw.map((payment) => ({
      _id: payment.id,
      date: payment.createdAt,
      type: 'PAYMENT',
      paymentType: payment.type as 'MONEY_IN' | 'MONEY_OUT',
      amount: Number(payment.amount),
      paymentMode: payment.paymentMode,
      referenceId: payment.referenceId,
      notes: payment.notes,
    }));

    const allEntries = [...sales, ...payments].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let openingBalance = 0;
    let filteredEntries = allEntries;

    if (startDate) {
      const startDateTime = new Date(startDate).getTime();
      const priorEntries = allEntries.filter((e) => new Date(e.date).getTime() < startDateTime);
      
      for (const entry of priorEntries) {
        if (entry.type === 'SALE') {
          openingBalance += Number(entry.grandTotal || 0);
        } else if (entry.type === 'PAYMENT') {
          const amt = Number(entry.amount || 0);
          if (entry.paymentType === 'MONEY_IN') {
            openingBalance -= amt;
          } else if (entry.paymentType === 'MONEY_OUT') {
            openingBalance += amt;
          }
        }
      }
      openingBalance = Number(openingBalance.toFixed(2));

      filteredEntries = allEntries.filter((e) => {
        const entryTime = new Date(e.date).getTime();
        if (entryTime < startDateTime) return false;
        if (endDate) {
          const endDateTime = new Date(endDate).getTime() + (endDate.length <= 10 ? 86400000 - 1 : 0);
          if (entryTime > endDateTime) return false;
        }
        return true;
      });
    } else if (endDate) {
      const endDateTime = new Date(endDate).getTime() + (endDate.length <= 10 ? 86400000 - 1 : 0);
      filteredEntries = allEntries.filter((e) => new Date(e.date).getTime() <= endDateTime);
    }

    const ledger = computeCustomerRunningBalances(filteredEntries, openingBalance);

    const totalDebit = Number(
      filteredEntries
        .filter((e) => e.type === 'SALE')
        .reduce((sum, e) => sum + Number(e.grandTotal || 0), 0)
        .toFixed(2)
    );

    const totalCredit = Number(
      filteredEntries
        .filter((e) => e.type === 'PAYMENT' && e.paymentType === 'MONEY_IN')
        .reduce((sum, e) => sum + Number(e.amount || 0), 0)
        .toFixed(2)
    );

    const closingBalance = ledger.length > 0 
      ? ledger[ledger.length - 1].runningBalance! 
      : openingBalance;

    return {
      customer: mapEntityId(customer),
      openingBalance,
      closingBalance,
      totalDebit,
      totalCredit,
      startDate: startDate || null,
      endDate: endDate || null,
      ledger,
    };
  }

  /**
   * Fetches supplier profile, all purchases, and all payments, and calculates the running Khata ledger with optional date filter and opening balance.
   */
  static async getSupplierLedger(supplierId: string, startDate?: string, endDate?: string) {
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
    });

    if (!supplier) return null;

    const purchasesRaw = await prisma.purchase.findMany({
      where: { supplierId, deletedAt: null },
      include: {
        purchaseItems: {
          include: {
            product: true,
            productUnits: {
              select: { serialNumber: true },
            },
          },
        },
      },
    });

    const purchases: SupplierLedgerEntry[] = purchasesRaw.map((purchase) => {
      const items = purchase.purchaseItems.map((item: any) => {
        const { product, productUnits, ...itemRest } = item;
        return {
          ...mapEntityId(itemRest),
          productId: mapEntityId(product),
          serialNumbers: productUnits.map((u: any) => u.serialNumber),
        };
      });

      return {
        _id: purchase.id,
        date: purchase.createdAt,
        type: 'PURCHASE',
        invoiceNumber: purchase.purchaseInvoiceNumber,
        grandTotal: Number(purchase.grandTotal),
        items,
        status: purchase.status,
      };
    });

    const paymentsRaw = await prisma.payment.findMany({
      where: { entityId: supplierId, entityType: 'SUPPLIER', deletedAt: null },
    });

    const payments: SupplierLedgerEntry[] = paymentsRaw.map((payment) => ({
      _id: payment.id,
      date: payment.createdAt,
      type: 'PAYMENT',
      paymentType: payment.type as 'MONEY_IN' | 'MONEY_OUT',
      amount: Number(payment.amount),
      paymentMode: payment.paymentMode,
      referenceId: payment.referenceId,
      notes: payment.notes,
    }));

    const allEntries = [...purchases, ...payments].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let openingBalance = 0;
    let filteredEntries = allEntries;

    if (startDate) {
      const startDateTime = new Date(startDate).getTime();
      const priorEntries = allEntries.filter((e) => new Date(e.date).getTime() < startDateTime);

      for (const entry of priorEntries) {
        if (entry.type === 'PURCHASE') {
          openingBalance += Number(entry.grandTotal || 0);
        } else if (entry.type === 'PAYMENT') {
          const amt = Number(entry.amount || 0);
          if (entry.paymentType === 'MONEY_OUT') {
            openingBalance -= amt;
          } else if (entry.paymentType === 'MONEY_IN') {
            openingBalance += amt;
          }
        }
      }
      openingBalance = Number(openingBalance.toFixed(2));

      filteredEntries = allEntries.filter((e) => {
        const entryTime = new Date(e.date).getTime();
        if (entryTime < startDateTime) return false;
        if (endDate) {
          const endDateTime = new Date(endDate).getTime() + (endDate.length <= 10 ? 86400000 - 1 : 0);
          if (entryTime > endDateTime) return false;
        }
        return true;
      });
    } else if (endDate) {
      const endDateTime = new Date(endDate).getTime() + (endDate.length <= 10 ? 86400000 - 1 : 0);
      filteredEntries = allEntries.filter((e) => new Date(e.date).getTime() <= endDateTime);
    }

    const ledger = computeSupplierRunningBalances(filteredEntries, openingBalance);

    const totalDebit = Number(
      filteredEntries
        .filter((e) => e.type === 'PURCHASE')
        .reduce((sum, e) => sum + Number(e.grandTotal || 0), 0)
        .toFixed(2)
    );

    const totalCredit = Number(
      filteredEntries
        .filter((e) => e.type === 'PAYMENT' && e.paymentType === 'MONEY_OUT')
        .reduce((sum, e) => sum + Number(e.amount || 0), 0)
        .toFixed(2)
    );

    const closingBalance = ledger.length > 0 
      ? ledger[ledger.length - 1].runningBalance! 
      : openingBalance;

    return {
      supplier: mapEntityId(supplier),
      openingBalance,
      closingBalance,
      totalDebit,
      totalCredit,
      startDate: startDate || null,
      endDate: endDate || null,
      ledger,
    };
  }

  /**
   * Atomically records a payment and updates the party's outstanding balance.
   */
  static async recordPayment(data: RecordPaymentInput) {
    const numAmount = Number(data.amount);

    return await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          entityType: data.entityType,
          entityId: data.entityId,
          type: data.type,
          amount: numAmount,
          paymentMode: data.paymentMode,
          referenceId: data.referenceId,
          notes: data.notes,
        },
      });

      let balanceChange = 0;
      if (data.entityType === 'CUSTOMER') {
        balanceChange = data.type === 'MONEY_IN' ? -numAmount : numAmount;
        await tx.customer.update({
          where: { id: data.entityId },
          data: { outstandingBalance: { increment: balanceChange } },
        });
      } else if (data.entityType === 'SUPPLIER') {
        balanceChange = data.type === 'MONEY_OUT' ? -numAmount : numAmount;
        await tx.supplier.update({
          where: { id: data.entityId },
          data: { outstandingBalance: { increment: balanceChange } },
        });
      }

      return payment;
    }, {
      maxWait: 10000,
      timeout: 15000,
    });
  }

  /**
   * Atomically records bulk payments and updates balances.
   */
  static async bulkRecordPayments(paymentsData: RecordPaymentInput[]) {
    return await prisma.$transaction(async (tx) => {
      const createdPayments = [];
      const customerBalances: Record<string, number> = {};
      const supplierBalances: Record<string, number> = {};

      for (const data of paymentsData) {
        const numAmount = Number(data.amount);
        const payment = await tx.payment.create({
          data: {
            entityType: data.entityType,
            entityId: data.entityId,
            type: data.type,
            amount: numAmount,
            paymentMode: data.paymentMode,
            referenceId: data.referenceId,
            notes: data.notes,
          },
        });
        createdPayments.push(payment);

        if (data.entityType === 'CUSTOMER') {
          const delta = data.type === 'MONEY_IN' ? -numAmount : numAmount;
          customerBalances[data.entityId] = (customerBalances[data.entityId] || 0) + delta;
        } else if (data.entityType === 'SUPPLIER') {
          const delta = data.type === 'MONEY_OUT' ? -numAmount : numAmount;
          supplierBalances[data.entityId] = (supplierBalances[data.entityId] || 0) + delta;
        }
      }

      for (const [id, delta] of Object.entries(customerBalances)) {
        await tx.customer.update({
          where: { id },
          data: { outstandingBalance: { increment: delta } },
        });
      }

      for (const [id, delta] of Object.entries(supplierBalances)) {
        await tx.supplier.update({
          where: { id },
          data: { outstandingBalance: { increment: delta } },
        });
      }

      return createdPayments;
    }, {
      maxWait: 15000,
      timeout: 30000,
    });
  }
}
