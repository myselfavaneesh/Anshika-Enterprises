import puppeteer from 'puppeteer';

export const generateInvoicePDF = async (sale: any, items: any[], customer: any): Promise<Buffer> => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  const itemsHtml = items.map(item => {
    const serialsText = item.serialNumbers && item.serialNumbers.length > 0 
      ? `<br><small style="color: #666;">S/N: ${item.serialNumbers.join(', ')}</small>` 
      : '';
    return `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">
        ${item.productId?.name || 'Unknown Product'}
        ${serialsText}
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">₹${item.taxableUnitPrice ? item.taxableUnitPrice.toFixed(2) : item.unitPrice.toFixed(2)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">₹${item.taxableTotalPrice ? item.taxableTotalPrice.toFixed(2) : item.totalPrice.toFixed(2)}</td>
    </tr>
  `;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice ${sale.invoiceNumber}</title>
      <style>
        body { font-family: 'Helvetica Neue', 'Helvetica', Helvetica, Arial, sans-serif; color: #333; }
        .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, 0.15); font-size: 16px; line-height: 24px; }
        .invoice-box table { width: 100%; line-height: inherit; text-align: left; border-collapse: collapse; }
        .invoice-box table td { padding: 5px; vertical-align: top; }
        .title { font-size: 45px; line-height: 45px; color: #333; font-weight: bold; }
        .header-table { margin-bottom: 40px; }
        .items-table th { background: #eee; padding: 8px; text-align: left; }
        .items-table td { padding: 8px; }
        .total-row td { border-top: 2px solid #eee; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="invoice-box">
        <table class="header-table">
          <tr>
            <td class="title">INVOICE</td>
            <td style="text-align: right;">
              Invoice #: ${sale.invoiceNumber}<br>
              Created: ${new Date(sale.createdAt).toLocaleDateString()}<br>
            </td>
          </tr>
        </table>
        
        <table style="margin-bottom: 40px;">
          <tr>
            <td>
              <strong>Billed To:</strong><br>
              ${customer.name}<br>
              ${customer.phone || 'N/A'}<br>
              ${customer.address || ''}
            </td>
          </tr>
        </table>
        
        <table class="items-table">
          <thead>
            <tr>
              <th>Item</th>
              <th style="text-align: right;">Quantity</th>
              <th style="text-align: right;">Taxable Rate</th>
              <th style="text-align: right;">Taxable Value</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
            <tr class="total-row">
              <td colspan="3" style="text-align: right; padding-top: 20px;">Taxable Value:</td>
              <td style="text-align: right; padding-top: 20px;">₹${(sale.taxableAmount || sale.subtotal - sale.discount).toFixed(2)}</td>
            </tr>
            <tr>
              <td colspan="3" style="text-align: right;">CGST:</td>
              <td style="text-align: right;">₹${(sale.cgstAmount || (sale.taxAmount / 2)).toFixed(2)}</td>
            </tr>
            <tr>
              <td colspan="3" style="text-align: right;">SGST:</td>
              <td style="text-align: right;">₹${(sale.sgstAmount || (sale.taxAmount / 2)).toFixed(2)}</td>
            </tr>
            <tr>
              <td colspan="3" style="text-align: right;">Discount:</td>
              <td style="text-align: right;">₹${sale.discount.toFixed(2)}</td>
            </tr>
            <tr>
              <td colspan="3" style="text-align: right; font-size: 20px;"><strong>Grand Total:</strong></td>
              <td style="text-align: right; font-size: 20px;"><strong>₹${sale.grandTotal.toFixed(2)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    </body>
    </html>
  `;

  await page.setContent(html, { waitUntil: 'load' });
  const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });

  await browser.close();
  return Buffer.from(pdfBuffer);
};
