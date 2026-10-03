import { Request, Response } from 'express';
import prisma from '../prisma';
import { logger } from '../utils/logger';
import { mapEntityId } from '../utils/mapper';
import { generateInvoicePDF, generateQuotationPDF } from '../services/invoice';
import { decryptData, maskSensitive } from '../utils/crypto';

export const getPublicSale = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const sale = await prisma.sale.findUnique({
      where: { id: id as string }
    });

    if (!sale) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    const rawItems = await prisma.saleItem.findMany({
      where: { saleId: id as string },
      include: {
        product: true,
        productUnits: { select: { serialNumber: true } }
      }
    });

    const customer = await prisma.customer.findUnique({
      where: { id: sale.customerId }
    });

    const tenantId = (sale as any).tenantId || 'default-tenant';
    const profile = await prisma.businessProfile.findUnique({
      where: { tenantId }
    });

    // Zero-leak shielding: explicitly omit purchasePrice, costs, and internal margin data
    const items = rawItems.map((item) => ({
      id: item.id,
      productId: item.productId ? { id: item.productId, name: item.product?.name, unit: item.product?.unit } : null,
      product: item.product ? { id: item.product.id, name: item.product.name, unit: item.product.unit } : null,
      name: item.product?.name,
      hsnCode: item.hsnCode || item.product?.hsnCode,
      quantity: item.quantity,
      unit: item.unit || item.product?.unit || 'PC',
      unitPrice: item.unitPrice,
      taxableUnitPrice: item.taxableUnitPrice,
      gstRate: item.gstRate,
      cgstAmount: item.cgstAmount,
      sgstAmount: item.sgstAmount,
      igstAmount: item.igstAmount,
      taxableTotalPrice: item.taxableTotalPrice,
      totalPrice: item.totalPrice,
      wattage: item.wattage,
      serialNumbers: item.productUnits.map(u => u.serialNumber)
    }));

    const cleanCompany = profile ? {
      businessName: profile.businessName,
      legalName: profile.legalName,
      businessType: profile.businessType,
      businessCategory: profile.businessCategory,
      ownerName: profile.ownerName,
      primaryPhone: profile.phone,
      alternatePhone: profile.alternatePhone,
      email: profile.email,
      website: profile.website,
      addressLine1: profile.addressLine1,
      addressLine2: profile.addressLine2,
      city: profile.city,
      district: profile.district,
      state: profile.state,
      stateCode: profile.stateCode,
      gstStateCode: profile.stateCode,
      pincode: profile.pincode,
      country: profile.country,
      gstin: profile.gstin,
      pan: profile.pan,
      gstType: profile.gstType,
      bankName: profile.bankName,
      accountNumber: profile.accountNumberLast4 ? `••••••••${profile.accountNumberLast4}` : (profile.encryptedAccountNumber ? maskSensitive(decryptData(profile.encryptedAccountNumber)) : ''),
      ifscCode: profile.ifscCode,
      branch: profile.bankBranch,
      upiId: profile.upiId,
      qrCodeUrl: profile.qrCodeUrl,
      logoUrl: profile.logoUrl,
      signatureUrl: profile.signatureUrl,
      invoiceFooterTerms: profile.termsAndConditions,
      showBankOnInvoice: profile.showBankDetails
    } : null;

    res.json({
      sale: mapEntityId(sale),
      items,
      customer: customer ? mapEntityId(customer) : null,
      company: cleanCompany
    });
  } catch (error: any) {
    logger.error('Error fetching public sale', { id: req.params.id, error: error.message });
    res.status(500).json({ error: 'Failed to retrieve invoice' });
  }
};

export const getPublicSalePDF = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const sale = await prisma.sale.findUnique({
      where: { id: id as string }
    });

    if (!sale) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    const rawItems = await prisma.saleItem.findMany({
      where: { saleId: id as string },
      include: {
        product: true,
        productUnits: { select: { serialNumber: true } }
      }
    });

    const customer = await prisma.customer.findUnique({
      where: { id: sale.customerId }
    });

    const tenantId = (sale as any).tenantId || 'default-tenant';
    const profile = await prisma.businessProfile.findUnique({
      where: { tenantId }
    });

    const items = rawItems.map((item) => ({
      ...mapEntityId(item),
      productId: item.product ? mapEntityId(item.product) : null,
      product: item.product ? mapEntityId(item.product) : null,
      serialNumbers: item.productUnits.map(u => u.serialNumber)
    }));

    const cleanCompany = profile ? {
      ...profile,
      primaryPhone: profile.phone,
      gstStateCode: profile.stateCode,
      accountNumber: profile.encryptedAccountNumber ? decryptData(profile.encryptedAccountNumber) : '',
      invoiceFooterTerms: profile.termsAndConditions,
      showBankOnInvoice: profile.showBankDetails
    } : null;

    const pdfBuffer = await generateInvoicePDF(mapEntityId(sale), items, customer ? mapEntityId(customer) : null, cleanCompany);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="invoice-${sale.invoiceNumber}.pdf"`);
    res.send(pdfBuffer);
  } catch (error: any) {
    logger.error('Error generating public invoice PDF', { id: req.params.id, error: error.message });
    res.status(500).json({ error: 'Failed to generate invoice PDF' });
  }
};

export const getPublicQuotation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const quotation = await prisma.quotation.findUnique({
      where: { id: id as string }
    });

    if (!quotation) {
      res.status(404).json({ error: 'Quotation not found' });
      return;
    }

    const rawItems = await prisma.quotationItem.findMany({
      where: { quotationId: id as string },
      include: { product: true }
    });

    const customer = await prisma.customer.findUnique({
      where: { id: quotation.customerId }
    });

    const tenantId = (quotation as any).tenantId || 'default-tenant';
    const profile = await prisma.businessProfile.findUnique({
      where: { tenantId }
    });

    const items = rawItems.map((item) => ({
      id: item.id,
      productId: item.productId ? { id: item.productId, name: item.product?.name, unit: item.product?.unit } : null,
      product: item.product ? { id: item.product.id, name: item.product.name, unit: item.product.unit } : null,
      name: item.product?.name,
      hsnCode: item.product?.hsnCode,
      quantity: item.quantity,
      unit: item.product?.unit || 'PC',
      unitPrice: item.unitPrice,
      taxableUnitPrice: item.taxableUnitPrice,
      gstRate: item.gstRate,
      cgstAmount: item.cgstAmount,
      sgstAmount: item.sgstAmount,
      igstAmount: 0,
      taxableTotalPrice: item.taxableTotalPrice,
      totalPrice: item.totalPrice,
      wattage: item.wattage,
      serialNumbers: []
    }));

    const cleanCompany = profile ? {
      businessName: profile.businessName,
      legalName: profile.legalName,
      businessType: profile.businessType,
      businessCategory: profile.businessCategory,
      ownerName: profile.ownerName,
      primaryPhone: profile.phone,
      alternatePhone: profile.alternatePhone,
      email: profile.email,
      website: profile.website,
      addressLine1: profile.addressLine1,
      addressLine2: profile.addressLine2,
      city: profile.city,
      district: profile.district,
      state: profile.state,
      stateCode: profile.stateCode,
      gstStateCode: profile.stateCode,
      pincode: profile.pincode,
      country: profile.country,
      gstin: profile.gstin,
      pan: profile.pan,
      gstType: profile.gstType,
      bankName: profile.bankName,
      accountNumber: profile.accountNumberLast4 ? `••••••••${profile.accountNumberLast4}` : (profile.encryptedAccountNumber ? maskSensitive(decryptData(profile.encryptedAccountNumber)) : ''),
      ifscCode: profile.ifscCode,
      branch: profile.bankBranch,
      upiId: profile.upiId,
      qrCodeUrl: profile.qrCodeUrl,
      logoUrl: profile.logoUrl,
      signatureUrl: profile.signatureUrl,
      invoiceFooterTerms: profile.termsAndConditions,
      showBankOnInvoice: profile.showBankDetails
    } : null;

    res.json({
      quotation: mapEntityId(quotation),
      items,
      customer: customer ? mapEntityId(customer) : null,
      company: cleanCompany
    });
  } catch (error: any) {
    logger.error('Error fetching public quotation', { id: req.params.id, error: error.message });
    res.status(500).json({ error: 'Failed to retrieve quotation' });
  }
};

export const getPublicQuotationPDF = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const quotation = await prisma.quotation.findUnique({
      where: { id: id as string }
    });

    if (!quotation) {
      res.status(404).json({ error: 'Quotation not found' });
      return;
    }

    const rawItems = await prisma.quotationItem.findMany({
      where: { quotationId: id as string },
      include: { product: true }
    });

    const customer = await prisma.customer.findUnique({
      where: { id: quotation.customerId }
    });

    const tenantId = (quotation as any).tenantId || 'default-tenant';
    const profile = await prisma.businessProfile.findUnique({
      where: { tenantId }
    });

    const items = rawItems.map((item) => ({
      ...mapEntityId(item),
      productId: item.product ? mapEntityId(item.product) : null,
      serialNumbers: []
    }));

    const cleanCompany = profile ? {
      ...profile,
      primaryPhone: profile.phone,
      gstStateCode: profile.stateCode,
      accountNumber: profile.encryptedAccountNumber ? decryptData(profile.encryptedAccountNumber) : '',
      invoiceFooterTerms: profile.termsAndConditions,
      showBankOnInvoice: profile.showBankDetails
    } : null;

    const pdfBuffer = await generateQuotationPDF(mapEntityId(quotation), items, customer ? mapEntityId(customer) : null, cleanCompany);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="quotation-${quotation.quotationNumber.replace(/\//g, '-')}.pdf"`);
    res.send(pdfBuffer);
  } catch (error: any) {
    logger.error('Error generating public quotation PDF', { id: req.params.id, error: error.message });
    res.status(500).json({ error: 'Failed to generate quotation PDF' });
  }
};
