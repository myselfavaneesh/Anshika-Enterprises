import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { logger } from '../utils/logger';
import { mapEntityId } from '../utils/mapper';
import { generateQuotationPDF, getQuotationHTML } from '../utils/pdfGenerator';
import { sendInvoiceEmail } from '../services/emailService';

const QuotationItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().min(1),
  unitPrice: z.number().min(0),
  totalPrice: z.number().min(0),
  taxableUnitPrice: z.number().min(0),
  taxableTotalPrice: z.number().min(0),
  gstRate: z.number().min(0).default(0),
  cgstAmount: z.number().min(0).default(0),
  sgstAmount: z.number().min(0).default(0),
  wattage: z.number().min(0).default(0),
});

const QuotationServiceSchema = z.object({
  name: z.string(),
  amount: z.number().min(0),
  gstRate: z.number().min(0).default(0),
  cgstAmount: z.number().min(0).default(0),
  sgstAmount: z.number().min(0).default(0),
  taxableAmount: z.number().min(0).default(0),
  isGstInclusive: z.boolean().default(true),
});

const QuotationInputSchema = z.object({
  customerId: z.string(),
  invoiceType: z.enum(['GST', 'NON_GST']).default('GST'),
  items: z.array(QuotationItemSchema).min(1),
  services: z.array(QuotationServiceSchema).optional().default([]),
  subtotal: z.number().min(0),
  discount: z.number().min(0).default(0),
  taxableAmount: z.number().min(0),
  taxRate: z.number().min(0).default(0),
  taxAmount: z.number().min(0).default(0),
  cgstAmount: z.number().min(0).default(0),
  sgstAmount: z.number().min(0).default(0),
  grandTotal: z.number().min(0),
  validUntil: z.string().optional().nullable(),
});

const generateQuotationNumber = async (): Promise<string> => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const nextYear = (date.getFullYear() + 1).toString().slice(-2);
  const prefix = `QT/${year}-${nextYear}/`;
  
  const lastQuotation = await prisma.quotation.findFirst({
    where: { quotationNumber: { startsWith: prefix } },
    orderBy: { createdAt: 'desc' }
  });

  let nextCount = 1;
  if (lastQuotation) {
    const lastNumber = parseInt(lastQuotation.quotationNumber.replace(prefix, ''), 10);
    if (!isNaN(lastNumber)) {
      nextCount = lastNumber + 1;
    }
  }

  const formattedCount = nextCount.toString().padStart(4, '0');
  return `${prefix}${formattedCount}`;
};

export const createQuotation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId, invoiceType, items, services, subtotal, discount, taxableAmount, taxRate, taxAmount, cgstAmount, sgstAmount, grandTotal, validUntil } = QuotationInputSchema.parse(req.body);

    const quotationNumber = await generateQuotationNumber();

    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber,
        invoiceType: invoiceType || 'GST',
        customerId,
        subtotal: Number(subtotal),
        discount: Number(discount),
        taxableAmount: Number(taxableAmount),
        taxRate: Number(taxRate),
        taxAmount: Number(taxAmount),
        cgstAmount: Number(cgstAmount),
        sgstAmount: Number(sgstAmount),
        grandTotal: Number(grandTotal),
        validUntil: validUntil ? new Date(validUntil) : null,
        quotationItems: {
          create: items.map((item: any) => ({
            productId: item.productId,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            totalPrice: Number(item.totalPrice),
            taxableUnitPrice: Number(item.taxableUnitPrice),
            taxableTotalPrice: Number(item.taxableTotalPrice),
            gstRate: Number(item.gstRate || 0),
            cgstAmount: Number(item.cgstAmount || 0),
            sgstAmount: Number(item.sgstAmount || 0),
            wattage: Number(item.wattage || 0),
          }))
        },
        quotationServices: {
          create: services.map((service: any) => ({
            name: service.name,
            amount: Number(service.amount),
            gstRate: Number(service.gstRate || 0),
            cgstAmount: Number(service.cgstAmount || 0),
            sgstAmount: Number(service.sgstAmount || 0),
            taxableAmount: Number(service.taxableAmount || 0),
            isGstInclusive: Boolean(service.isGstInclusive)
          }))
        }
      },
      include: {
        quotationItems: true,
        quotationServices: true
      }
    });

    res.status(201).json(mapEntityId(quotation));

    // Asynchronously send email without blocking the response
    (async () => {
      try {
        const customer = await prisma.customer.findUnique({ where: { id: quotation.customerId } });
        if (customer && customer.email) {
          const rawItems = await prisma.quotationItem.findMany({
            where: { quotationId: quotation.id },
            include: { product: true }
          });
          const items = rawItems.map((item: any) => ({
            ...mapEntityId(item),
            productId: item.product ? mapEntityId(item.product) : null,
            serialNumbers: []
          }));
          const htmlContent = getQuotationHTML(mapEntityId(quotation), items, mapEntityId(customer));
          const docType = quotation.invoiceType === 'NON_GST' ? 'Estimate' : 'Quotation';
          await sendInvoiceEmail(
            customer.email,
            `${docType} ${quotation.quotationNumber} from Anshika Enterprises`,
            htmlContent
          );
        }
      } catch (emailError) {
        logger.error('Error sending quotation email in background', { error: emailError });
      }
    })();
  } catch (error: any) {
    logger.error('Error creating quotation', { error: error.message, stack: error.stack });
    res.status(400).json({ error: 'Error creating quotation' });
  }
};

export const getQuotations = async (req: Request, res: Response): Promise<void> => {
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
        { quotationNumber: { contains: search, mode: 'insensitive' } },
        { customerId: { in: customerIds } }
      ];
    }

    const total = await prisma.quotation.count({ where });
    const quotations = await prisma.quotation.findMany({
      where,
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const mappedQuotations = quotations.map(q => {
      const { customer, ...rest } = q as any;
      return mapEntityId({ ...rest, customerId: customer });
    });

    res.json({
      data: mappedQuotations,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    logger.error('Error fetching quotations', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};

export const getQuotationById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const quotation = await prisma.quotation.findUnique({
      where: { id: id as string },
      include: {
        customer: true,
        quotationItems: {
          include: {
            product: true
          }
        },
        quotationServices: true
      }
    });

    if (!quotation) {
      res.status(404).json({ error: 'Quotation not found' });
      return;
    }

    const { customer, quotationItems, quotationServices, ...restQuotation } = quotation as any;
    
    // Map items so productId is populated
    const mappedItems = quotationItems.map((item: any) => {
      const { product, ...restItem } = item;
      return mapEntityId({ ...restItem, productId: product });
    });

    res.json(mapEntityId({ ...restQuotation, customerId: customer, items: mappedItems, services: quotationServices }));
  } catch (error: any) {
    logger.error('Error fetching quotation details', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};

export const deleteQuotation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const quotation = await prisma.quotation.findUnique({ where: { id: id as string } });
    
    if (!quotation) {
      res.status(404).json({ error: 'Quotation not found' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.quotationService.deleteMany({ where: { quotationId: id as string } });
      await tx.quotationItem.deleteMany({ where: { quotationId: id as string } });
      await tx.quotation.delete({ where: { id: id as string } });
    });

    res.json({ message: 'Quotation deleted successfully' });
  } catch (error: any) {
    logger.error('Error deleting quotation', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Server error' });
  }
};

export const updateQuotation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { customerId, invoiceType, items, services, subtotal, discount, taxableAmount, taxRate, taxAmount, cgstAmount, sgstAmount, grandTotal, validUntil } = QuotationInputSchema.parse(req.body);

    const quotation = await prisma.quotation.findUnique({ where: { id: id as string } });
    if (!quotation) {
      res.status(404).json({ error: 'Quotation not found' });
      return;
    }

    const updatedQuotation = await prisma.$transaction(async (tx) => {
      // Delete old items
      await tx.quotationItem.deleteMany({ where: { quotationId: id as string } });

      await tx.quotationService.deleteMany({ where: { quotationId: id as string } });

      // Update quotation and recreate items
      return await tx.quotation.update({
        where: { id: id as string },
        data: {
          customerId,
          invoiceType: invoiceType || 'GST',
          subtotal: Number(subtotal),
          discount: Number(discount),
          taxableAmount: Number(taxableAmount),
          taxRate: Number(taxRate),
          taxAmount: Number(taxAmount),
          cgstAmount: Number(cgstAmount),
          sgstAmount: Number(sgstAmount),
          grandTotal: Number(grandTotal),
          validUntil: validUntil ? new Date(validUntil) : null,
          quotationItems: {
            create: items.map((item: any) => ({
              productId: item.productId,
              quantity: Number(item.quantity),
              unitPrice: Number(item.unitPrice),
              totalPrice: Number(item.totalPrice),
              taxableUnitPrice: Number(item.taxableUnitPrice),
              taxableTotalPrice: Number(item.taxableTotalPrice),
              gstRate: Number(item.gstRate || 0),
              cgstAmount: Number(item.cgstAmount || 0),
              sgstAmount: Number(item.sgstAmount || 0),
              wattage: Number(item.wattage || 0),
            }))
          },
          quotationServices: {
            create: services.map((service: any) => ({
              name: service.name,
              amount: Number(service.amount),
              gstRate: Number(service.gstRate || 0),
              cgstAmount: Number(service.cgstAmount || 0),
              sgstAmount: Number(service.sgstAmount || 0),
              taxableAmount: Number(service.taxableAmount || 0),
              isGstInclusive: Boolean(service.isGstInclusive)
            }))
          }
        },
        include: {
          quotationItems: true,
          quotationServices: true
        }
      });
    });

    res.json(mapEntityId(updatedQuotation));
  } catch (error: any) {
    logger.error('Error updating quotation', { error: error.message, stack: error.stack });
    res.status(400).json({ error: 'Error updating quotation' });
  }
};

export const convertQuotation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const quotation = await prisma.quotation.findUnique({
      where: { id: id as string }
    });

    if (!quotation) {
      res.status(404).json({ error: 'Quotation not found' });
      return;
    }

    if (quotation.status === 'ACCEPTED') {
      res.status(400).json({ error: 'Quotation is already accepted and converted' });
      return;
    }

    if (!req.body || !req.body.customerId) {
      res.status(400).json({ error: 'Invalid payload. Please initiate the conversion from the frontend again (refresh the page).' });
      return;
    }

    // Call SaleService with the provided payload from NewSale.tsx
    const { SaleService } = await import('../services/saleService');
    const newSale = await SaleService.createSale(req.body);

    await prisma.quotation.update({
      where: { id: quotation.id },
      data: { status: 'ACCEPTED' }
    });

    res.json(mapEntityId(newSale));
  } catch (error: any) {
    logger.error('Error converting quotation', { error: error.message, stack: error.stack });
    res.status(400).json({ error: 'Error converting quotation' });
  }
};

export const downloadQuotationPDF = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const quotation = await prisma.quotation.findUnique({ where: { id: id as string } });
    if (!quotation) {
      res.status(404).json({ error: 'Quotation not found' });
      return;
    }

    const rawItems = await prisma.quotationItem.findMany({
      where: { quotationId: id as string },
      include: { product: true }
    });

    const customer = await prisma.customer.findUnique({ where: { id: quotation.customerId } });

    const items = rawItems.map((item: any) => ({
      ...mapEntityId(item),
      productId: item.product ? mapEntityId(item.product) : null,
      serialNumbers: []
    }));

    const pdfBuffer = await generateQuotationPDF(mapEntityId(quotation), items, mapEntityId(customer));

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="quotation-${quotation.quotationNumber.replace(/\//g, '-')}.pdf"`);
    res.send(pdfBuffer);
  } catch (error: any) {
    logger.error('Error generating quotation PDF', { quotationId: req.params.id, error: error.message });
    res.status(500).json({ error: 'Error generating quotation PDF' });
  }
};

export const sendQuotationEmailController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const quotation = await prisma.quotation.findUnique({ where: { id: id as string } });
    if (!quotation) {
      res.status(404).json({ error: 'Quotation not found' });
      return;
    }

    const customer = await prisma.customer.findUnique({ where: { id: quotation.customerId } });
    if (!customer || !customer.email) {
      res.status(400).json({ error: 'Customer email not found. Please add customer email first.' });
      return;
    }

    const rawItems = await prisma.quotationItem.findMany({
      where: { quotationId: id as string },
      include: { product: true }
    });

    const items = rawItems.map((item: any) => ({
      ...mapEntityId(item),
      productId: item.product ? mapEntityId(item.product) : null,
      serialNumbers: []
    }));

    const htmlContent = getQuotationHTML(mapEntityId(quotation), items, mapEntityId(customer));
    const docType = quotation.invoiceType === 'NON_GST' ? 'Estimate' : 'Quotation';
    await sendInvoiceEmail(
      customer.email,
      `${docType} ${quotation.quotationNumber} from Anshika Enterprises`,
      htmlContent
    );

    res.json({ message: `${docType} email sent successfully to ${customer.email}` });
  } catch (error: any) {
    logger.error('Error sending quotation email', { quotationId: req.params.id, error: error.message });
    res.status(500).json({ error: 'Error sending quotation email' });
  }
};

