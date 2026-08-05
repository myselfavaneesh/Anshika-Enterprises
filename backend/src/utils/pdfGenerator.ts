import puppeteer from 'puppeteer';

const numberToWords = (num: number): string => {
  if (num === 0) return 'Rupees Zero Only';
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const inWords = (n: number): string => {
    let str = '';
    if (n > 9999999) {
      str += inWords(Math.floor(n / 10000000)) + 'Crore ';
      n %= 10000000;
    }
    if (n > 99999) {
      str += inWords(Math.floor(n / 100000)) + 'Lakh ';
      n %= 100000;
    }
    if (n > 999) {
      str += inWords(Math.floor(n / 1000)) + 'Thousand ';
      n %= 1000;
    }
    if (n > 99) {
      str += inWords(Math.floor(n / 100)) + 'Hundred ';
      n %= 100;
    }
    if (n > 0) {
      if (n < 20) {
        str += a[n];
      } else {
        str += b[Math.floor(n / 10)] + ' ';
        if (n % 10 > 0) {
          str += a[n % 10];
        }
      }
    }
    return str;
  };

  const wholePart = Math.floor(num);
  const decimalPart = Math.round((num - wholePart) * 100);
  let result = `Rupees ${inWords(wholePart)}`;
  if (decimalPart > 0) {
    result += `and ${inWords(decimalPart)}Paise `;
  }
  return `${result}Only`.replace(/\s+/g, ' ');
};

export const getTemplateHTML = (type: 'TAX INVOICE' | 'QUOTATION', data: any, items: any[], customer: any): string => {
  const isNonGst = data?.invoiceType === 'NON_GST';
  const docTitle = type === 'TAX INVOICE' ? (isNonGst ? 'ESTIMATE' : 'TAX INVOICE') : (isNonGst ? 'ESTIMATE' : 'QUOTATION');
  const docNumber = type === 'TAX INVOICE' ? data?.invoiceNumber : data?.quotationNumber;
  const docDate = new Date(data?.createdAt || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
  const validUntil = data?.validUntil ? new Date(data.validUntil).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '-';

  const totalQty = items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
  const totalItemsCount = items.length;

  const itemsRowsHtml = items.map((item: any, index: number) => {
    const wattageHtml = item.wattage > 0 
      ? `<div style="font-size: 10px; color: #555; margin-top: 2px;">(${item.quantity} units × ${item.wattage}W = ${item.quantity * item.wattage}W @ ₹${item.unitPrice || (item.taxableUnitPrice / (item.quantity * item.wattage)).toFixed(2)}/W)</div>` 
      : '';
    const serialsHtml = item.serialNumbers && item.serialNumbers.length > 0 
      ? `<div style="font-size: 10px; color: #555; margin-top: 2px;">SN: ${item.serialNumbers.join(', ')}</div>` 
      : '';

    const rateVal = (item.taxableUnitPrice || item.unitPrice || 0).toFixed(2);
    const amountVal = (item.taxableTotalPrice || item.totalPrice || 0).toFixed(2);

    return `
      <tr>
        <td style="text-align: center; vertical-align: top; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 6px;">${index + 1}</td>
        <td style="text-align: left; vertical-align: top; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 6px;">
          <div style="font-weight: bold; color: #000;">${item.productId?.name || 'Item Name'}</div>
          ${wattageHtml}
          ${serialsHtml}
        </td>
        <td style="text-align: center; vertical-align: top; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 6px;">${item.productId?.hsnCode || '-'}</td>
        <td style="text-align: center; vertical-align: top; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 6px; font-weight: bold;">${item.quantity} PC</td>
        <td style="text-align: right; vertical-align: top; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 6px;">${rateVal}</td>
        ${!isNonGst ? `<td style="text-align: center; vertical-align: top; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 6px;">${item.gstRate || data?.taxRate || 0}%</td>` : ''}
        <td style="text-align: right; vertical-align: top; border-bottom: 1px solid #000; padding: 4px 6px; font-weight: bold;">${amountVal}</td>
      </tr>
    `;
  }).join('');

  const servicesRowsHtml = (data?.services || []).map((service: any) => `
    <tr>
      <td colspan="${isNonGst ? 5 : 6}" style="text-align: right; font-style: italic; font-weight: 600; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 6px;">
        ${service.name} ${!isNonGst && service.gstRate ? `(${service.gstRate}%)` : ''}
      </td>
      <td style="text-align: right; font-weight: bold; border-bottom: 1px solid #000; padding: 4px 6px;">
        ${(service.taxableAmount || service.amount || 0).toFixed(2)}
      </td>
    </tr>
  `).join('');

  const colSpanCount = isNonGst ? 5 : 6;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${docTitle} ${docNumber || ''}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    body { font-family: 'Inter', Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: #ffffff; margin: 0; padding: 10px; color: #000; font-size: 12px; }
    .invoice-card { max-width: 800px; margin: 0 auto; background: #ffffff; padding: 16px; border: 1px solid #000; box-sizing: border-box; }
    table { width: 100%; border-collapse: collapse; }
    .border-all { border: 1px solid #000; }
    @media only screen and (max-width: 600px) {
      body { padding: 4px; font-size: 11px; }
      .invoice-card { padding: 8px; border: 1px solid #000; }
    }
  </style>
</head>
<body>
  <div class="invoice-card">
    
    <!-- Title -->
    <h1 style="text-align: center; font-size: 20px; font-weight: bold; text-transform: uppercase; margin: 0 0 12px 0; color: #000;">
      ${docTitle}
    </h1>

    <!-- Company & Buyer Info Box -->
    <table class="border-all" style="margin-bottom: 15px;">
      <tr>
        <!-- Left Side: Company & Buyer -->
        <td style="width: 50%; vertical-align: top; border-right: 1px solid #000; padding: 0;">
          <div style="padding: 8px; border-bottom: 1px solid #000;">
            <div style="font-weight: 600; color: #555; font-size: 11px; margin-bottom: 2px;">Company</div>
            <div style="font-weight: bold; font-size: 14px;">ANSHIKA ENTERPRISES</div>
            <div>Phoolpur, Azamgarh, Uttar Pradesh - 276304</div>
            <div>State Name: Uttar Pradesh, Code: 09</div>
            <div>Contact: 9598522526</div>
          </div>
          <div style="padding: 8px;">
            <div style="font-weight: 600; color: #555; font-size: 11px; margin-bottom: 2px;">Buyer (Bill to)</div>
            <div style="font-weight: bold; font-size: 14px;">${customer?.name || 'Customer Name'}</div>
            <div>${customer?.address || 'Address Line'}</div>
            <div>State Name: ${customer?.state || 'Uttar Pradesh'}, Code: ${customer?.stateCode || '09'}</div>
            <div>Contact: ${customer?.phone || '-'}</div>
            ${customer?.gstNumber ? `<div>GSTIN/UIN: <span style="font-weight: bold;">${customer.gstNumber}</span></div>` : ''}
          </div>
        </td>

        <!-- Right Side: Details -->
        <td style="width: 50%; vertical-align: top; padding: 0;">
          ${type === 'TAX INVOICE' ? `
            <table style="width: 100%;">
              <tr>
                <td style="width: 50%; padding: 8px; border-right: 1px solid #000; border-bottom: 1px solid #000; vertical-align: top;">
                  <div style="font-weight: 600; color: #555; font-size: 11px;">Invoice No.</div>
                  <div style="font-weight: bold; font-size: 13px;">${docNumber || '-'}</div>
                </td>
                <td style="width: 50%; padding: 8px; border-bottom: 1px solid #000; vertical-align: top;">
                  <div style="font-weight: 600; color: #555; font-size: 11px;">Dated</div>
                  <div style="font-weight: bold; font-size: 13px;">${docDate}</div>
                </td>
              </tr>
            </table>
          ` : `
            <table style="width: 100%;">
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #000;">
                  <table style="width: 100%;">
                    <tr>
                      <td style="vertical-align: top;">
                        <div style="font-weight: 600; color: #555; font-size: 11px;">Quotation No.</div>
                        <div style="font-weight: bold; font-size: 13px;">${docNumber || '-'}</div>
                      </td>
                      <td style="text-align: right; vertical-align: top;">
                        <div style="font-weight: 600; color: #555; font-size: 11px;">Dated</div>
                        <div style="font-weight: bold; font-size: 13px;">${docDate}</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px;">
                  <div style="font-weight: 600; color: #555; font-size: 11px;">Valid Until</div>
                  <div style="font-weight: bold; font-size: 13px;">${validUntil}</div>
                </td>
              </tr>
            </table>
          `}
        </td>
      </tr>
    </table>

    <!-- Main Items Table -->
    <table class="border-all" style="margin-bottom: 0;">
      <thead>
        <tr style="background-color: #ffffff; border-bottom: 1px solid #000;">
          <th style="width: 40px; border-right: 1px solid #000; padding: 6px; text-align: center;">SN</th>
          <th style="border-right: 1px solid #000; padding: 6px; text-align: left;">Description of Goods</th>
          <th style="width: 80px; border-right: 1px solid #000; padding: 6px; text-align: center;">HSN/SAC</th>
          <th style="width: 80px; border-right: 1px solid #000; padding: 6px; text-align: center;">Quantity</th>
          <th style="width: 90px; border-right: 1px solid #000; padding: 6px; text-align: right;">${isNonGst ? 'Rate' : 'Taxable Rate'}</th>
          ${!isNonGst ? '<th style="width: 60px; border-right: 1px solid #000; padding: 6px; text-align: center;">GST %</th>' : ''}
          <th style="width: 100px; padding: 6px; text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRowsHtml}
        ${servicesRowsHtml}

        ${!isNonGst ? `
          <tr>
            <td colspan="${colSpanCount}" style="text-align: right; font-style: italic; font-weight: 600; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 6px;">Taxable Value</td>
            <td style="text-align: right; font-weight: bold; border-bottom: 1px solid #000; padding: 4px 6px;">${(data?.taxableAmount || 0).toFixed(2)}</td>
          </tr>
          <tr>
            <td colspan="${colSpanCount}" style="text-align: right; font-style: italic; font-weight: 600; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 6px;">CGST</td>
            <td style="text-align: right; font-weight: bold; border-bottom: 1px solid #000; padding: 4px 6px;">${(data?.cgstAmount || 0).toFixed(2)}</td>
          </tr>
          <tr>
            <td colspan="${colSpanCount}" style="text-align: right; font-style: italic; font-weight: 600; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 6px;">SGST</td>
            <td style="text-align: right; font-weight: bold; border-bottom: 1px solid #000; padding: 4px 6px;">${(data?.sgstAmount || 0).toFixed(2)}</td>
          </tr>
        ` : ''}

        <tr style="background-color: #ffffff;">
          <td colspan="${colSpanCount}" style="text-align: right; font-weight: bold; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 6px;">Grand Total</td>
          <td style="text-align: right; font-weight: bold; font-size: 14px; border-bottom: 1px solid #000; padding: 6px;">₹ ${(data?.grandTotal || 0).toFixed(2)}</td>
        </tr>
      </tbody>
    </table>

    <!-- Summary Box -->
    <table class="border-all" style="border-top: none; margin-bottom: 0;">
      <tr>
        <td style="width: 50%; padding: 8px; vertical-align: top; border-right: 1px solid #000;">
          <div><span style="font-weight: 600; display: inline-block; width: 90px;">Total Items:</span> ${totalItemsCount}</div>
          <div><span style="font-weight: 600; display: inline-block; width: 90px;">Total Qty:</span> ${totalQty} PC</div>
        </td>
        <td style="width: 50%; padding: 8px; text-align: right; vertical-align: top;">
          ${!isNonGst ? `
            <div><span style="font-weight: 600;">Taxable Amount:</span> ₹ ${(data?.taxableAmount || 0).toFixed(2)}</div>
            <div><span style="font-weight: 600;">CGST:</span> ₹ ${(data?.cgstAmount || 0).toFixed(2)}</div>
            <div><span style="font-weight: 600;">SGST:</span> ₹ ${(data?.sgstAmount || 0).toFixed(2)}</div>
          ` : ''}
          <div style="font-size: 13px; font-weight: bold; margin-top: 2px;"><span>Grand Total:</span> ₹ ${(data?.grandTotal || 0).toFixed(2)}</div>
        </td>
      </tr>
    </table>

    <!-- Amount Chargeable in Words Box -->
    <table class="border-all" style="border-top: none; margin-bottom: 0;">
      <tr>
        <td style="padding: 8px; vertical-align: top;">
          <div style="font-style: italic; color: #444; font-size: 11px;">Amount Chargeable (in words)</div>
          <div style="font-weight: bold; font-size: 13px; margin-top: 2px;">${numberToWords(Math.round(data?.grandTotal || 0))}</div>
        </td>
        <td style="width: 80px; text-align: right; vertical-align: top; padding: 8px; font-style: italic; font-weight: bold;">
          E. & O.E
        </td>
      </tr>
    </table>

    <!-- Company GSTIN, Declaration & Bank Details Box -->
    <table class="border-all" style="border-top: none; margin-bottom: 0;">
      <tr>
        <!-- Left: Declaration -->
        <td style="width: 50%; padding: 8px; vertical-align: top; border-right: 1px solid #000;">
          <div>Company's GSTIN/UIN : <span style="font-weight: bold;">09BZOPK7723E1Z1</span></div>
          <div style="margin-top: 6px;">
            <div style="font-weight: bold; text-decoration: underline; margin-bottom: 2px;">Declaration</div>
            <div style="font-size: 10px; color: #333; line-height: 1.3;">We declare that this ${type === 'QUOTATION' ? 'quotation' : 'invoice'} shows the actual price of the goods described and that all particulars are true and correct.</div>
          </div>
        </td>
        <!-- Right: Bank Details -->
        <td style="width: 50%; padding: 8px; vertical-align: top;">
          <div style="font-weight: bold; text-decoration: underline; margin-bottom: 4px;">Company's Bank Details</div>
          <table style="width: 100%; font-size: 11px;">
            <tr><td style="width: 80px; padding: 1px 0;">Bank Name</td><td style="font-weight: 600; padding: 1px 0;">: Union Bank of India</td></tr>
            <tr><td style="padding: 1px 0;">A/c No.</td><td style="font-weight: 600; padding: 1px 0;">: 359701010036291</td></tr>
            <tr><td style="padding: 1px 0;">IFSC Code</td><td style="font-weight: 600; padding: 1px 0;">: UBIN0535974</td></tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Signatures Box -->
    <table class="border-all" style="border-top: none; min-height: 90px;">
      <tr>
        <td style="width: 50%; padding: 8px; vertical-align: bottom; border-right: 1px solid #000;">
          <div style="margin-top: 40px;">Customer's Signature</div>
        </td>
        <td style="width: 50%; padding: 8px; text-align: right; vertical-align: bottom;">
          <div style="font-weight: bold; margin-bottom: 40px;">for ANSHIKA ENTERPRISES</div>
          <div style="font-weight: 600;">Authorised Signatory</div>
        </td>
      </tr>
    </table>

    <!-- Footer Note -->
    <div style="text-align: center; margin-top: 8px; font-size: 10px; color: #555;">
      This is a Computer Generated ${type === 'QUOTATION' ? 'Quotation' : 'Invoice'}
    </div>

  </div>
</body>
</html>
  `;
};

export const getInvoiceHTML = (sale: any, items: any[], customer: any): string => {
  return getTemplateHTML('TAX INVOICE', sale, items, customer);
};

export const getQuotationHTML = (quotation: any, items: any[], customer: any): string => {
  return getTemplateHTML('QUOTATION', quotation, items, customer);
};

export const generateInvoicePDF = async (sale: any, items: any[], customer: any): Promise<Buffer> => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  const html = getInvoiceHTML(sale, items, customer);

  await page.setContent(html, { waitUntil: 'networkidle0' as any });
  const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' } });

  await browser.close();
  return Buffer.from(pdfBuffer);
};

export const generateQuotationPDF = async (quotation: any, items: any[], customer: any): Promise<Buffer> => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  const html = getQuotationHTML(quotation, items, customer);

  await page.setContent(html, { waitUntil: 'networkidle0' as any });
  const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' } });

  await browser.close();
  return Buffer.from(pdfBuffer);
};
