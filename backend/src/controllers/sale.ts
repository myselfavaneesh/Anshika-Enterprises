import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { SaleService } from '../services/saleService';
import { generateInvoicePDF, getInvoiceHTML } from '../utils/pdfGenerator';
import { sendInvoiceEmail } from '../services/emailService';
import { logger } from '../utils/logger';
import { mapToMongoose } from '../utils/mapper';

const SaleItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().min(1),
  unitPrice: z.number().min(0),
  taxableUnitPrice: z.number().min(0),
  taxableTotalPrice: z.number().min(0),
  totalPrice: z.number().min(0),
  gstRate: z.number().min(0).default(0),
  cgstAmount: z.number().min(0).default(0),
  sgstAmount: z.number().min(0).default(0),
  wattage: z.number().min(0).default(0),
  serialNumbers: z.array(z.string()).optional(),
});

const SaleServiceSchema = z.object({
  name: z.string(),
  amount: z.number().min(0),
  gstRate: z.number().min(0).default(0),
  cgstAmount: z.number().min(0).default(0),
  sgstAmount: z.number().min(0).default(0),
  taxableAmount: z.number().min(0).default(0),
  isGstInclusive: z.boolean().default(true),
});

const SaleInputSchema = z.object({
  customerId: z.string(),
  invoiceType: z.enum(['GST', 'NON_GST']).default('GST'),
  items: z.array(SaleItemSchema).min(1),
  services: z.array(SaleServiceSchema).optional(),
  subtotal: z.number().min(0),
  discount: z.number().min(0).default(0),
  taxableAmount: z.number().min(0),
  taxRate: z.number().min(0).default(0),
  taxAmount: z.number().min(0).default(0),
  cgstAmount: z.number().min(0).default(0),
  sgstAmount: z.number().min(0).default(0),
  grandTotal: z.number().min(0),
  amountPaid: z.number().min(0).default(0),
  paymentMode: z.string().optional(),
});

export const createSale = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = SaleInputSchema.parse(req.body);

    const sale = await SaleService.createSale(validatedData);

    res.status(201).json(mapToMongoose(sale));

    // Asynchronously send email without blocking the response
    (async () => {
      try {
        const customer = await prisma.customer.findUnique({ where: { id: sale.customerId } });
        if (customer && customer.email) {
          const rawItems = await prisma.saleItem.findMany({
            where: { saleId: sale.id },
            include: { product: true }
          });
          const items = await Promise.all(rawItems.map(async (item) => {
            const units = await prisma.productUnit.findMany({
              where: { saleItemId: item.id },
              select: { serialNumber: true }
            });
            return {
              ...mapToMongoose(item),
              serialNumbers: units.map(u => u.serialNumber)
            };
          }));
          const htmlContent = getInvoiceHTML(mapToMongoose(sale), items, mapToMongoose(customer));
          await sendInvoiceEmail(
            customer.email,
            `Invoice ${sale.invoiceNumber} from Anshika Enterprises`,
            htmlContent
          );
        }
      } catch (emailError) {
        logger.error('Error sending invoice email in background', { error: emailError });
      }
    })();
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: (error as any).errors });
      return;
    }
    logger.error('Error processing sale', { error: error.message });
    res.status(400).json({ error: error.message || 'Error processing sale' });
  }
};

export const updateSale = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const validatedData = SaleInputSchema.parse(req.body);

    const sale = await SaleService.updateSale(id, validatedData);

    res.json(mapToMongoose(sale));
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: (error as any).errors });
      return;
    }
    logger.error('Error updating sale', { error: error.message });
    res.status(400).json({ error: error.message || 'Error updating sale' });
  }
};

export const getSales = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const search = typeof req.query.q === 'string' ? req.query.q : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      const customers = await prisma.customer.findMany({
        where: { 
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } }
          ]
        },
        select: { id: true }
      });
      const customerIds = customers.map(c => c.id);

      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { customerId: { in: customerIds } }
      ];
    }

    const total = await prisma.sale.count({ where });
    const sales = await prisma.sale.findMany({
      where,
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const mappedSales = sales.map(s => {
      const { customer, ...rest } = s as any;
      return mapToMongoose({ ...rest, customerId: customer });
    });

    res.json({
      data: mappedSales,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    logger.error('Error fetching sales', { error: error.message });
    res.status(500).json({ error: 'Server error' });
  }
};

export const downloadInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const sale = await prisma.sale.findUnique({ where: { id: id as string } });
    if (!sale) {
      res.status(404).json({ error: 'Sale not found' });
      return;
    }

    const rawItems = await prisma.saleItem.findMany({
      where: { saleId: id as string },
      include: { product: true }
    });
    
    const customer = await prisma.customer.findUnique({ where: { id: sale.customerId } });

    const items = await Promise.all(rawItems.map(async (item) => {
      const units = await prisma.productUnit.findMany({
        where: { saleItemId: item.id },
        select: { serialNumber: true }
      });
      return {
        ...mapToMongoose(item),
        serialNumbers: units.map(u => u.serialNumber)
      };
    }));

    const pdfBuffer = await generateInvoicePDF(mapToMongoose(sale), items, mapToMongoose(customer));

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="invoice-${sale.invoiceNumber}.pdf"`);
    res.send(pdfBuffer);
  } catch (error: any) {
    logger.error('Error generating invoice PDF', { saleId: req.params.id, error: error.message });
    res.status(500).json({ error: 'Error generating invoice PDF' });
  }
};

export const getSaleById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const sale = await prisma.sale.findUnique({ where: { id: id as string } });
    if (!sale) {
      res.status(404).json({ error: 'Sale not found' });
      return;
    }

    const rawItems = await prisma.saleItem.findMany({
      where: { saleId: id as string },
      include: { product: true }
    });
    const customer = await prisma.customer.findUnique({ where: { id: sale.customerId } });

    const items = await Promise.all(rawItems.map(async (item) => {
      const units = await prisma.productUnit.findMany({
        where: { saleItemId: item.id },
        select: { serialNumber: true }
      });
      return {
        ...mapToMongoose(item),
        productId: mapToMongoose((item as any).product),
        serialNumbers: units.map(u => u.serialNumber)
      };
    }));

    const services = await prisma.saleService.findMany({
      where: { saleId: id as string }
    });

    res.json(mapToMongoose({
      ...sale,
      customerId: customer ? mapToMongoose(customer) : null,
      items: items,
      services: services
    }));
  } catch (error: any) {
    logger.error('Error fetching sale by id', { saleId: req.params.id, error: error.message });
    res.status(500).json({ error: 'Server error' });
  }
};

export const deleteSale = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await SaleService.deleteSale(id as string);
    res.json({ message: 'Sale deleted successfully' });
  } catch (error: any) {
    logger.error('Error deleting sale', { saleId: req.params.id, error: error.message });
    res.status(500).json({ error: error.message || 'Server error' });
  }
};

export const sendSaleEmailController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const sale = await prisma.sale.findUnique({ where: { id: id as string } });
    if (!sale) {
      res.status(404).json({ error: 'Sale not found' });
      return;
    }
    const customer = await prisma.customer.findUnique({ where: { id: sale.customerId } });
    if (!customer || !customer.email) {
      res.status(400).json({ error: 'Customer email not found. Please add customer email first.' });
      return;
    }

    const rawItems = await prisma.saleItem.findMany({
      where: { saleId: id as string },
      include: { product: true }
    });
    const items = await Promise.all(rawItems.map(async (item) => {
      const units = await prisma.productUnit.findMany({
        where: { saleItemId: item.id },
        select: { serialNumber: true }
      });
      return {
        ...mapToMongoose(item),
        serialNumbers: units.map(u => u.serialNumber)
      };
    }));

    const htmlContent = getInvoiceHTML(mapToMongoose(sale), items, mapToMongoose(customer));
    await sendInvoiceEmail(
      customer.email,
      `Invoice ${sale.invoiceNumber} from Anshika Enterprises`,
      htmlContent
    );

    res.json({ message: `Invoice email sent successfully to ${customer.email}` });
  } catch (error: any) {
    logger.error('Error sending sale email', { saleId: req.params.id, error: error.message });
    res.status(500).json({ error: error.message || 'Error sending invoice email' });
  }
};

