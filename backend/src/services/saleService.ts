import prisma from '../prisma';
import { logger } from '../utils/logger';

export interface SaleItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
  taxableUnitPrice: number;
  taxableTotalPrice: number;
  totalPrice: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  hsnCode?: string | null;
  unit?: string;
  wattage: number;
  serialNumbers?: string[];
}

export interface SaleServiceInput {
  name: string;
  amount: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  taxableAmount: number;
  isGstInclusive: boolean;
}

export interface SalePaymentInput {
  paymentMode: string;
  amount: number;
  referenceNumber?: string;
  emiProvider?: string;
  emiReferenceNumber?: string;
}

export interface SaleInput {
  customerId: string;
  invoiceType: string;
  documentType?: string;
  items: SaleItemInput[];
  services?: SaleServiceInput[];
  subtotal: number;
  discount: number;
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  roundOff: number;
  grandTotal: number;
  placeOfSupply?: string;
  placeOfSupplyCode?: string;
  
  // Replaced amountPaid and paymentMode with payments array
  payments?: SalePaymentInput[];

  // Compliance
  eInvoiceAckNo?: string;
  eWayBillNo?: string;
  customerSignatureUrl?: string;
}

export class SaleService {
  static async createSale(data: SaleInput): Promise<any> {
    try {
      const sale = await prisma.$transaction(async (tx) => {
        const { 
          customerId, invoiceType, documentType = 'TAX_INVOICE', 
          items, services = [], discount, grandTotal, 
          payments = [], eInvoiceAckNo, eWayBillNo, customerSignatureUrl,
          placeOfSupply, placeOfSupplyCode
        } = data;
        
        const totalAmountPaid = payments.reduce((sum, p) => sum + p.amount, 0);
        // Generate Sequential Invoice Number
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const nextYear = (date.getFullYear() + 1).toString().slice(-2);
        const prefix = `INV/${year}-${nextYear}/`;
        
        const lastSale = await tx.sale.findFirst({
          where: { invoiceNumber: { startsWith: prefix } },
          orderBy: { createdAt: 'desc' }
        });

        let nextCount = 1;
        if (lastSale) {
          const lastNumber = parseInt(lastSale.invoiceNumber.replace(prefix, ''), 10);
          if (!isNaN(lastNumber)) {
            nextCount = lastNumber + 1;
          }
        }
        const invoiceNumber = `${prefix}${nextCount.toString().padStart(4, '0')}`;

        // Server-side Math Validation
        let expectedSubtotal = 0;
        let expectedTaxableAmount = 0;
        let expectedTaxAmount = 0;

        for (const item of items) {
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          if (!product) throw new Error(`Product not found: ${item.productId}`);
          
          let trueGstRate = product.gstRate || 0;
          if (invoiceType === 'NON_GST') {
             trueGstRate = 0;
          }

          const calculatedQty = (product.wattage || 0) > 0 ? item.quantity * product.wattage : item.quantity;
          const lineTotal = item.unitPrice * calculatedQty;
          expectedSubtotal += lineTotal;
          
          let lineTaxable = lineTotal;
          let lineTax = 0;

          if (trueGstRate > 0) {
            if (product.isGstInclusive) {
              lineTaxable = lineTotal / (1 + (trueGstRate / 100));
              lineTax = lineTotal - lineTaxable;
            } else {
              lineTaxable = lineTotal;
              lineTax = lineTotal * (trueGstRate / 100);
            }
          }
          
          expectedTaxableAmount += lineTaxable;
          expectedTaxAmount += lineTax;
        }
        
        let servicesTotal = 0;
        for (const s of services) {
           const sAmount = Number(s.amount);
           servicesTotal += sAmount;
           let sGstRate = s.gstRate || 0;
           if (invoiceType === 'NON_GST') sGstRate = 0;

           if (sGstRate > 0) {
              if (s.isGstInclusive) {
                 const sTaxable = sAmount / (1 + (sGstRate / 100));
                 expectedTaxableAmount += sTaxable;
                 expectedTaxAmount += (sAmount - sTaxable);
              } else {
                 expectedTaxableAmount += sAmount;
                 expectedTaxAmount += (sAmount * (sGstRate / 100));
              }
           } else {
              expectedTaxableAmount += sAmount;
           }
        }
        
        const expectedGrandTotal = expectedSubtotal - (discount || 0) + servicesTotal;

        if (Math.abs(expectedGrandTotal - grandTotal) > 1) {
          throw new Error('Financial calculation mismatch. Potential payload tampering.');
        }

        const customer = await tx.customer.findUnique({ where: { id: customerId } });
        if (!customer) throw new Error('Customer not found');

        if (customer.creditLimit !== null && customer.creditLimit > 0) {
          const newBalance = customer.outstandingBalance + expectedGrandTotal - totalAmountPaid;
          if (newBalance > customer.creditLimit) {
            throw new Error(`Credit Limit Exceeded. Customer has a credit limit of ₹${customer.creditLimit}. This transaction results in a balance of ₹${newBalance}. Please increase amount paid.`);
          }
        }

        // 1. Create Sale
        const newSale = await tx.sale.create({
          data: {
            invoiceNumber,
            invoiceType,
            customerId,
            subtotal: expectedSubtotal,
            discount: discount || 0,
            taxableAmount: expectedTaxableAmount,
            taxRate: data.taxRate || 0,
            taxAmount: expectedTaxAmount,
            cgstAmount: data.cgstAmount,
            sgstAmount: data.sgstAmount,
            igstAmount: data.igstAmount || 0,
            roundOff: data.roundOff || 0,
            grandTotal: expectedGrandTotal,
            status: totalAmountPaid >= expectedGrandTotal ? 'PAID' : 'PENDING',
            documentType,
            placeOfSupply,
            placeOfSupplyCode,
            eInvoiceAckNo,
            eWayBillNo,
            customerSignatureUrl,
          }
        });

        // 1.5 Create Sale Services
        if (services.length > 0) {
          await tx.saleService.createMany({
            data: services.map((s) => ({
              saleId: newSale.id,
              name: s.name,
              amount: Number(s.amount),
              gstRate: Number(s.gstRate || 0),
              cgstAmount: Number(s.cgstAmount || 0),
              sgstAmount: Number(s.sgstAmount || 0),
              taxableAmount: Number(s.taxableAmount || 0),
              isGstInclusive: Boolean(s.isGstInclusive),
            }))
          });
        }

        // 2. Process items & Update ProductUnits
        for (const item of items) {
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          if (product?.trackSerials) {
            if (!item.serialNumbers || item.serialNumbers.length !== item.quantity) {
              throw new Error(`Please provide exactly ${item.quantity} serial numbers for product ID: ${item.productId}`);
            }
          }

          const saleItem = await tx.saleItem.create({
            data: {
              saleId: newSale.id,
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              taxableUnitPrice: item.taxableUnitPrice,
              taxableTotalPrice: item.taxableTotalPrice,
              gstRate: item.gstRate,
              cgstAmount: item.cgstAmount,
              sgstAmount: item.sgstAmount,
              igstAmount: item.igstAmount || 0,
              hsnCode: item.hsnCode || product?.hsnCode || null,
              unit: item.unit || product?.unit || 'PC',
              wattage: item.wattage || 0,
            }
          });

          if (product?.trackSerials) {
            for (const serial of item.serialNumbers!) {
              // Check for duplicate invoice detection first to provide a helpful error
              const existingUnit = await tx.productUnit.findUnique({
                where: { serialNumber: serial },
                include: { sale: true }
              });

              if (!existingUnit) {
                throw new Error(`Serial number ${serial} does not exist in inventory.`);
              }
              if (existingUnit.status !== 'IN_STOCK') {
                if (existingUnit.sale) {
                   throw new Error(`Serial number ${serial} was already sold in invoice ${existingUnit.sale.invoiceNumber}. Duplicate invoice detected.`);
                }
                throw new Error(`Serial number ${serial} is unavailable (status: ${existingUnit.status}).`);
              }

              const updatedUnit = await tx.productUnit.updateMany({
                where: { serialNumber: serial, status: 'IN_STOCK' },
                data: { status: 'SOLD', saleId: newSale.id, saleItemId: saleItem.id }
              });

              if (updatedUnit.count === 0) {
                throw new Error(`Serial number ${serial} is already sold or unavailable.`);
              }
            }
          } else {
            const inventory = await tx.inventory.findUnique({ where: { productId: item.productId } });
            if (!inventory || inventory.quantity < item.quantity) {
              throw new Error(`Insufficient stock for product ID: ${item.productId}`);
            }
            await tx.inventory.update({
              where: { productId: item.productId },
              data: { quantity: { decrement: item.quantity } }
            });
          }
        }

        // 3. Ledger Logic (Khata Sync)
        // Step A: Increase the customer's balance by the invoice grandTotal
        const updatedCustomer = await tx.customer.update({
          where: { id: customerId },
          data: { outstandingBalance: { increment: expectedGrandTotal } }
        });

        // Step B: If money is paid, create SalePayments, Global Payments, and reduce balance
        if (totalAmountPaid > 0) {
          for (const p of payments) {
            if (p.amount > 0) {
              // Create Sale Payment specifically for this invoice's multi-payment breakdown
              await tx.salePayment.create({
                data: {
                  saleId: newSale.id,
                  paymentMode: p.paymentMode,
                  amount: p.amount,
                  referenceNumber: p.referenceNumber,
                  emiProvider: p.emiProvider,
                  emiReferenceNumber: p.emiReferenceNumber,
                  notes: `Payment for Sale ${invoiceNumber}`,
                }
              });

              // Create global ledger payment
              await tx.payment.create({
                data: {
                  entityType: 'CUSTOMER',
                  entityId: customerId,
                  type: 'MONEY_IN',
                  amount: p.amount,
                  paymentMode: p.paymentMode,
                  referenceId: `${invoiceNumber}-${p.paymentMode}-${Date.now()}`, // Unique ref for ledger
                  notes: `Payment for Sale ${invoiceNumber} via ${p.paymentMode}`,
                }
              });
            }
          }

          await tx.customer.update({
            where: { id: customerId },
            data: { outstandingBalance: { decrement: totalAmountPaid } }
          });
        }

        return newSale;
      });

      logger.info('Sale completed successfully', { saleId: sale.id, invoiceNumber: sale.invoiceNumber });
      return sale;
    } catch (error: any) {
      logger.error('Error during createSale', { error: error.message });
      throw error;
    }
  }

  static async updateSale(saleId: string, data: SaleInput): Promise<any> {
    try {
      const updatedSale = await prisma.$transaction(async (tx) => {
        const existingSale = await tx.sale.findUnique({ 
          where: { id: saleId },
          include: { saleItems: { include: { product: true } } }
        });
        if (!existingSale) throw new Error('Sale not found');

        const { 
          customerId, invoiceType, documentType = 'TAX_INVOICE', 
          items, services = [], discount, grandTotal, 
          payments = [], eInvoiceAckNo, eWayBillNo, customerSignatureUrl,
          placeOfSupply, placeOfSupplyCode
        } = data;
        
        const totalAmountPaid = payments.reduce((sum, p) => sum + p.amount, 0);

        // Validation
        let expectedSubtotal = 0;
        let expectedTaxableAmount = 0;
        let expectedTaxAmount = 0;

        for (const item of items) {
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          if (!product) throw new Error(`Product not found: ${item.productId}`);
          let trueGstRate = product.gstRate || 0;
          if (invoiceType === 'NON_GST') {
             trueGstRate = 0;
          }

          const calculatedQty = (product.wattage || 0) > 0 ? item.quantity * product.wattage : item.quantity;
          const lineTotal = item.unitPrice * calculatedQty;
          expectedSubtotal += lineTotal;
          
          let lineTaxable = lineTotal;
          let lineTax = 0;

          if (trueGstRate > 0) {
            if (product.isGstInclusive) {
              lineTaxable = lineTotal / (1 + (trueGstRate / 100));
              lineTax = lineTotal - lineTaxable;
            } else {
              lineTaxable = lineTotal;
              lineTax = lineTotal * (trueGstRate / 100);
            }
          }
          
          expectedTaxableAmount += lineTaxable;
          expectedTaxAmount += lineTax;
        }

        let servicesTotal = 0;
        for (const s of services) {
           const sAmount = Number(s.amount);
           servicesTotal += sAmount;
           let sGstRate = s.gstRate || 0;
           if (invoiceType === 'NON_GST') sGstRate = 0;

           if (sGstRate > 0) {
              if (s.isGstInclusive) {
                 const sTaxable = sAmount / (1 + (sGstRate / 100));
                 expectedTaxableAmount += sTaxable;
                 expectedTaxAmount += (sAmount - sTaxable);
              } else {
                 expectedTaxableAmount += sAmount;
                 expectedTaxAmount += (sAmount * (sGstRate / 100));
              }
           } else {
              expectedTaxableAmount += sAmount;
           }
        }
        
        const expectedGrandTotal = expectedSubtotal - (discount || 0) + servicesTotal;

        if (Math.abs(expectedGrandTotal - grandTotal) > 1) {
          throw new Error('Financial calculation mismatch. Potential payload tampering.');
        }

        const customer = await tx.customer.findUnique({ where: { id: customerId } });
        if (!customer) throw new Error('Customer not found');

        // Note: For update, we must calculate the net change because the old invoice grandTotal is currently in outstandingBalance
        if (customer.creditLimit !== null && customer.creditLimit > 0) {
          // Revert old invoice impact
          const oldAmountPaid = payments.length > 0 ? 0 : 0; // It's complex to know old amount paid perfectly here without looking at DB, but we know existingSale.grandTotal and existingSale.status
          // Actually, we'll revert the DB balance first, THEN check credit limit to be safe, but we are inside transaction.
          // Wait, let's revert first, then check. So we move the check down after reverting.
        }

        // REVERT EXISTING SALE DATA
        // 1. Revert ProductUnits
        await tx.productUnit.updateMany({
          where: { saleId: existingSale.id },
          data: { status: 'IN_STOCK', saleId: null, saleItemId: null }
        });

        // 1.5 Revert non-serialized inventory
        for (const oldItem of existingSale.saleItems) {
          if (!oldItem.product.trackSerials) {
            await tx.inventory.upsert({
              where: { productId: oldItem.productId },
              create: { productId: oldItem.productId, quantity: oldItem.quantity },
              update: { quantity: { increment: oldItem.quantity } }
            });
          }
        }

        // 2. Delete existing items and services
        await tx.saleItem.deleteMany({ where: { saleId: existingSale.id } });
        await tx.saleService.deleteMany({ where: { saleId: existingSale.id } });

        // 3. Revert Ledger and SalePayments
        await tx.salePayment.deleteMany({ where: { saleId: existingSale.id } });

        const existingPayments = await tx.payment.findMany({ 
          where: { 
            referenceId: { startsWith: existingSale.invoiceNumber }, 
            entityType: 'CUSTOMER' 
          } 
        });
        for (const existingPayment of existingPayments) {
          await tx.payment.delete({ where: { id: existingPayment.id } });
          await tx.customer.update({
            where: { id: existingSale.customerId },
            data: { outstandingBalance: { increment: existingPayment.amount } }
          });
        }
        await tx.customer.update({
          where: { id: existingSale.customerId },
          data: { outstandingBalance: { decrement: existingSale.grandTotal } }
        });

        // APPLY NEW SALE DATA
        const updatedCustomerBalance = (await tx.customer.findUnique({ where: { id: customerId } }))?.outstandingBalance || 0;
        const customerRef = await tx.customer.findUnique({ where: { id: customerId } });

        if (customerRef && customerRef.creditLimit !== null && customerRef.creditLimit > 0) {
          const newBalance = updatedCustomerBalance + expectedGrandTotal - totalAmountPaid;
          if (newBalance > customerRef.creditLimit) {
            throw new Error(`Credit Limit Exceeded. Customer has a credit limit of ₹${customerRef.creditLimit}. This update results in a balance of ₹${newBalance}.`);
          }
        }

        const sale = await tx.sale.update({
          where: { id: existingSale.id },
          data: {
            customerId,
            invoiceType,
            subtotal: expectedSubtotal,
            discount: discount || 0,
            taxableAmount: expectedTaxableAmount,
            taxRate: data.taxRate || 0,
            taxAmount: expectedTaxAmount,
            cgstAmount: data.cgstAmount,
            sgstAmount: data.sgstAmount,
            igstAmount: data.igstAmount || 0,
            roundOff: data.roundOff || 0,
            grandTotal: expectedGrandTotal,
            status: totalAmountPaid >= expectedGrandTotal ? 'PAID' : 'PENDING',
            documentType,
            placeOfSupply,
            placeOfSupplyCode,
            eInvoiceAckNo,
            eWayBillNo,
            customerSignatureUrl,
          }
        });

        if (services.length > 0) {
          await tx.saleService.createMany({
            data: services.map((s) => ({
              saleId: sale.id,
              name: s.name,
              amount: Number(s.amount),
              gstRate: Number(s.gstRate || 0),
              cgstAmount: Number(s.cgstAmount || 0),
              sgstAmount: Number(s.sgstAmount || 0),
              taxableAmount: Number(s.taxableAmount || 0),
              isGstInclusive: Boolean(s.isGstInclusive),
            }))
          });
        }

        for (const item of items) {
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          if (product?.trackSerials) {
            if (!item.serialNumbers || item.serialNumbers.length !== item.quantity) {
              throw new Error(`Please provide exactly ${item.quantity} serial numbers for product ID: ${item.productId}`);
            }
          }

          const saleItem = await tx.saleItem.create({
            data: {
              saleId: sale.id,
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              taxableUnitPrice: item.taxableUnitPrice,
              taxableTotalPrice: item.taxableTotalPrice,
              gstRate: item.gstRate,
              cgstAmount: item.cgstAmount,
              sgstAmount: item.sgstAmount,
              igstAmount: item.igstAmount || 0,
              hsnCode: item.hsnCode || product?.hsnCode || null,
              unit: item.unit || product?.unit || 'PC',
              wattage: item.wattage || 0,
            }
          });

          if (product?.trackSerials) {
            for (const serial of item.serialNumbers!) {
              const existingUnit = await tx.productUnit.findUnique({
                where: { serialNumber: serial },
                include: { sale: true }
              });

              if (!existingUnit) {
                throw new Error(`Serial number ${serial} does not exist in inventory.`);
              }
              if (existingUnit.status !== 'IN_STOCK' && existingUnit.saleId !== sale.id) {
                if (existingUnit.sale) {
                   throw new Error(`Serial number ${serial} was already sold in invoice ${existingUnit.sale.invoiceNumber}. Duplicate invoice detected.`);
                }
                throw new Error(`Serial number ${serial} is unavailable (status: ${existingUnit.status}).`);
              }

              const updatedUnit = await tx.productUnit.updateMany({
                where: { serialNumber: serial },
                data: { status: 'SOLD', saleId: sale.id, saleItemId: saleItem.id }
              });
              if (updatedUnit.count === 0) {
                throw new Error(`Serial number ${serial} is already sold or unavailable.`);
              }
            }
          } else {
            const inventory = await tx.inventory.findUnique({ where: { productId: item.productId } });
            if (!inventory || inventory.quantity < item.quantity) {
              throw new Error(`Insufficient stock for product ID: ${item.productId}`);
            }
            await tx.inventory.update({
              where: { productId: item.productId },
              data: { quantity: { decrement: item.quantity } }
            });
          }
        }

        // Step A: Increase the customer's balance by the invoice grandTotal
        await tx.customer.update({
          where: { id: customerId },
          data: { outstandingBalance: { increment: expectedGrandTotal } }
        });

        // Delete old SalePayments first when reverting
        await tx.salePayment.deleteMany({ where: { saleId: existingSale.id } });

        // Step B: If money is paid, create SalePayments and global payments, and reduce balance
        if (totalAmountPaid > 0) {
          for (const p of payments) {
            if (p.amount > 0) {
              await tx.salePayment.create({
                data: {
                  saleId: sale.id,
                  paymentMode: p.paymentMode,
                  amount: p.amount,
                  referenceNumber: p.referenceNumber,
                  emiProvider: p.emiProvider,
                  emiReferenceNumber: p.emiReferenceNumber,
                  notes: `Payment for Sale ${sale.invoiceNumber}`,
                }
              });

              await tx.payment.create({
                data: {
                  entityType: 'CUSTOMER',
                  entityId: customerId,
                  type: 'MONEY_IN',
                  amount: p.amount,
                  paymentMode: p.paymentMode,
                  referenceId: `${sale.invoiceNumber}-${p.paymentMode}-${Date.now()}`,
                  notes: `Payment for Sale ${sale.invoiceNumber} via ${p.paymentMode}`,
                }
              });
            }
          }

          await tx.customer.update({
            where: { id: customerId },
            data: { outstandingBalance: { decrement: totalAmountPaid } }
          });
        }

        return sale;
      });

      logger.info('Sale updated successfully', { saleId });
      return updatedSale;
    } catch (error: any) {
      logger.error('Error during updateSale', { error: error.message });
      throw error;
    }
  }

  static async deleteSale(saleId: string): Promise<void> {
    try {
      await prisma.$transaction(async (tx) => {
        const sale = await tx.sale.findUnique({ 
          where: { id: saleId },
          include: { saleItems: { include: { product: true } } }
        });
        if (!sale) throw new Error('Sale not found');

        // 1. Revert ProductUnit statuses
        await tx.productUnit.updateMany({
          where: { saleId: sale.id },
          data: { status: 'IN_STOCK', saleId: null, saleItemId: null }
        });

        // 1.5 Revert non-serialized inventory
        for (const oldItem of sale.saleItems) {
          if (!oldItem.product.trackSerials) {
            await tx.inventory.upsert({
              where: { productId: oldItem.productId },
              create: { productId: oldItem.productId, quantity: oldItem.quantity },
              update: { quantity: { increment: oldItem.quantity } }
            });
          }
        }

        // 2. Delete SaleItems, SaleServices, SalePayments
        await tx.saleItem.deleteMany({ where: { saleId: sale.id } });
        await tx.saleService.deleteMany({ where: { saleId: sale.id } });
        await tx.salePayment.deleteMany({ where: { saleId: sale.id } });

        // 3. Find and delete associated Global Payments
        // Using invoiceNumber as prefix due to the `${invoiceNumber}-${mode}-${date}` pattern used now.
        const existingPayments = await tx.payment.findMany({ 
          where: { 
            referenceId: { startsWith: sale.invoiceNumber }, 
            entityType: 'CUSTOMER' 
          } 
        });
        for (const existingPayment of existingPayments) {
          await tx.payment.delete({ where: { id: existingPayment.id } });
          // Revert the payment deduction
          await tx.customer.update({
            where: { id: sale.customerId },
            data: { outstandingBalance: { increment: existingPayment.amount } }
          });
        }

        // 4. Revert Customer balance (Revert the grandTotal addition)
        await tx.customer.update({
          where: { id: sale.customerId },
          data: { outstandingBalance: { decrement: sale.grandTotal } }
        });

        // 5. Delete Sale
        await tx.sale.delete({ where: { id: sale.id } });
      });

      logger.info('Sale deleted successfully', { saleId });
    } catch (error: any) {
      logger.error('Error deleting sale', { error: error.message });
      throw error;
    }
  }
}
