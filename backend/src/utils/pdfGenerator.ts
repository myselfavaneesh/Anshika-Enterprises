const getPuppeteer = async () => {
  const puppeteerModule = await (new Function('return import("puppeteer")')() as Promise<any>);
  return puppeteerModule.default || puppeteerModule;
};

const SHOP_STATE_CODE = '09';

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
  const customerStateCode = customer?.stateCode || data?.placeOfSupplyCode || SHOP_STATE_CODE;
  const isInterState = customerStateCode !== SHOP_STATE_CODE;
  
  let docTitle = 'TAX INVOICE';
  if (type === 'QUOTATION') {
    docTitle = isNonGst ? 'ESTIMATE' : 'QUOTATION';
  } else if (isNonGst) {
    docTitle = 'ESTIMATE';
  } else if (data?.documentType === 'PROFORMA') {
    docTitle = 'PROFORMA INVOICE';
  } else if (data?.documentType === 'CHALLAN') {
    docTitle = 'DELIVERY CHALLAN';
  }

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
    const gstRate = item.gstRate || data?.taxRate || 0;
    const halfRate = gstRate / 2;
    const unitVal = item.unit || item.productId?.unit || 'PC';
    const hsnVal = item.hsnCode || item.productId?.hsnCode || '-';

    return `
      <tr>
        <td style="text-align: center; vertical-align: top; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 6px;">${index + 1}</td>
        <td style="text-align: left; vertical-align: top; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 6px;">
          <div style="font-weight: bold; color: #000;">${item.productId?.name || 'Item Name'}</div>
          ${wattageHtml}
          ${serialsHtml}
        </td>
        <td style="text-align: center; vertical-align: top; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 6px;">${hsnVal}</td>
        <td style="text-align: center; vertical-align: top; border-right: 1px solid #000; border-bottom: 1px solid #000; font-weight: bold;">${item.quantity}</td>
        <td style="text-align: center; vertical-align: top; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 6px;">${unitVal}</td>
        <td style="text-align: right; vertical-align: top; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 6px;">${rateVal}</td>
        ${!isNonGst ? (
          isInterState ? `
            <td style="text-align: center; vertical-align: top; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 6px;">${gstRate}%</td>
            <td style="text-align: right; vertical-align: top; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 6px;">${(item.igstAmount || ((item.cgstAmount || 0) + (item.sgstAmount || 0))).toFixed(2)}</td>
          ` : `
            <td style="text-align: center; vertical-align: top; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 6px;">${halfRate}%</td>
            <td style="text-align: right; vertical-align: top; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 6px;">${(item.cgstAmount || 0).toFixed(2)}</td>
            <td style="text-align: center; vertical-align: top; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 6px;">${halfRate}%</td>
            <td style="text-align: right; vertical-align: top; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 6px;">${(item.sgstAmount || 0).toFixed(2)}</td>
          `
        ) : ''}
        <td style="text-align: right; vertical-align: top; border-bottom: 1px solid #000; padding: 4px 6px; font-weight: bold;">${amountVal}</td>
      </tr>
    `;
  }).join('');

  const colSpanCount = isNonGst ? 7 : (isInterState ? 9 : 11);

  const servicesRowsHtml = (data?.services || []).map((service: any) => `
    <tr>
      <td colspan="${colSpanCount - 1}" style="text-align: right; font-style: italic; font-weight: 600; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 6px;">
        ${service.name} ${!isNonGst && service.gstRate ? `(${service.gstRate}%)` : ''}
      </td>
      <td style="text-align: right; font-weight: bold; border-bottom: 1px solid #000; padding: 4px 6px;">
        ${(service.taxableAmount || service.amount || 0).toFixed(2)}
      </td>
    </tr>
  `).join('');

  // HSN Summary Calculation
  const hsnMap: Record<string, { hsnCode: string; taxableValue: number; gstRate: number; cgst: number; sgst: number; igst: number; totalTax: number }> = {};
  if (!isNonGst) {
    items.forEach((item: any) => {
      const hsn = item.hsnCode || item.productId?.hsnCode || '-';
      const rate = item.gstRate || 0;
      const key = `${hsn}_${rate}`;
      if (!hsnMap[key]) {
        hsnMap[key] = { hsnCode: hsn, taxableValue: 0, gstRate: rate, cgst: 0, sgst: 0, igst: 0, totalTax: 0 };
      }
      hsnMap[key].taxableValue += (item.taxableTotalPrice || item.totalPrice || 0);
      if (isInterState) {
        hsnMap[key].igst += item.igstAmount || ((item.cgstAmount || 0) + (item.sgstAmount || 0));
      } else {
        hsnMap[key].cgst += (item.cgstAmount || 0);
        hsnMap[key].sgst += (item.sgstAmount || 0);
      }
      hsnMap[key].totalTax = hsnMap[key].cgst + hsnMap[key].sgst + hsnMap[key].igst;
    });
  }
  const hsnSummaryList = Object.values(hsnMap);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${docTitle} ${docNumber || ''}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    body { font-family: 'Inter', Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: #ffffff; margin: 0; padding: 10px; color: #000; font-size: 11px; }
    .invoice-card { max-width: 800px; margin: 0 auto; background: #ffffff; padding: 12px; border: 1px solid #000; box-sizing: border-box; }
    table { width: 100%; border-collapse: collapse; }
    .border-all { border: 1px solid #000; }
  </style>
</head>
<body>
  <div class="invoice-card">
    
    <!-- Title -->
    <h1 style="text-align: center; font-size: 18px; font-weight: bold; text-transform: uppercase; margin: 0 0 10px 0; color: #000;">
      ${docTitle}
    </h1>

    <!-- Company & Buyer Info Box -->
    <table class="border-all" style="margin-bottom: 0;">
      <tr>
        <!-- Left Side: Company & Buyer -->
        <td style="width: 50%; vertical-align: top; border-right: 1px solid #000; padding: 0;">
          <div style="padding: 6px; border-bottom: 1px solid #000;">
            <div style="font-weight: 600; color: #555; font-size: 10px; margin-bottom: 1px;">Company</div>
            <div style="font-weight: bold; font-size: 13px;">ANSHIKA ENTERPRISES</div>
            <div>Phoolpur, Azamgarh, Uttar Pradesh - 276304</div>
            <div>State Name: Uttar Pradesh, Code: 09</div>
            <div>Contact: 8840527476</div>
          </div>
          <div style="padding: 6px;">
            <div style="font-weight: 600; color: #555; font-size: 10px; margin-bottom: 1px;">Buyer (Bill to)</div>
            <div style="font-weight: bold; font-size: 13px;">${customer?.name || 'Customer Name'}</div>
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
                <td style="width: 50%; padding: 6px; border-right: 1px solid #000; border-bottom: 1px solid #000; vertical-align: top;">
                  <div style="font-weight: 600; color: #555; font-size: 10px;">Invoice No.</div>
                  <div style="font-weight: bold; font-size: 12px;">${docNumber || '-'}</div>
                </td>
                <td style="width: 50%; padding: 6px; border-bottom: 1px solid #000; vertical-align: top;">
                  <div style="font-weight: 600; color: #555; font-size: 10px;">Dated</div>
                  <div style="font-weight: bold; font-size: 12px;">${docDate}</div>
                </td>
              </tr>
              <tr>
                <td colspan="2" style="padding: 6px; border-bottom: 1px solid #000; vertical-align: top;">
                  <div style="font-weight: 600; color: #555; font-size: 10px;">Place of Supply</div>
                  <div style="font-weight: bold; font-size: 12px;">${data?.placeOfSupply || customer?.state || 'Uttar Pradesh'} (${data?.placeOfSupplyCode || customer?.stateCode || '09'})</div>
                </td>
              </tr>
              ${(data?.eInvoiceAckNo || data?.eWayBillNo) ? `
                <tr>
                  ${data?.eInvoiceAckNo ? `
                    <td style="padding: 6px; border-right: 1px solid #000; vertical-align: top;">
                      <div style="font-weight: 600; color: #555; font-size: 10px;">E-Invoice Ack No.</div>
                      <div style="font-weight: bold; font-size: 10px;">${data.eInvoiceAckNo}</div>
                    </td>
                  ` : ''}
                  ${data?.eWayBillNo ? `
                    <td style="padding: 6px; vertical-align: top;" ${!data?.eInvoiceAckNo ? 'colspan="2"' : ''}>
                      <div style="font-weight: 600; color: #555; font-size: 10px;">E-Way Bill No.</div>
                      <div style="font-weight: bold; font-size: 10px;">${data.eWayBillNo}</div>
                    </td>
                  ` : ''}
                </tr>
              ` : ''}
            </table>
          ` : `
            <table style="width: 100%;">
              <tr>
                <td style="padding: 6px; border-bottom: 1px solid #000;">
                  <table style="width: 100%;">
                    <tr>
                      <td style="vertical-align: top;">
                        <div style="font-weight: 600; color: #555; font-size: 10px;">Quotation No.</div>
                        <div style="font-weight: bold; font-size: 12px;">${docNumber || '-'}</div>
                      </td>
                      <td style="text-align: right; vertical-align: top;">
                        <div style="font-weight: 600; color: #555; font-size: 10px;">Dated</div>
                        <div style="font-weight: bold; font-size: 12px;">${docDate}</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding: 6px;">
                  <div style="font-weight: 600; color: #555; font-size: 10px;">Valid Until</div>
                  <div style="font-weight: bold; font-size: 12px;">${validUntil}</div>
                </td>
              </tr>
            </table>
          `}
        </td>
      </tr>
    </table>

    <!-- Main Items Table -->
    <table class="border-all" style="border-top: none; margin-bottom: 0;">
      <thead>
        <tr style="background-color: #ffffff; border-bottom: 1px solid #000;">
          <th style="width: 30px; border-right: 1px solid #000; padding: 4px; text-align: center;">SN</th>
          <th style="border-right: 1px solid #000; padding: 4px; text-align: left;">Description of Goods</th>
          <th style="width: 60px; border-right: 1px solid #000; padding: 4px; text-align: center;">HSN/SAC</th>
          <th style="width: 40px; border-right: 1px solid #000; padding: 4px; text-align: center;">Qty</th>
          <th style="width: 40px; border-right: 1px solid #000; padding: 4px; text-align: center;">Unit</th>
          <th style="width: 70px; border-right: 1px solid #000; padding: 4px; text-align: right;">${isNonGst ? 'Rate' : 'Taxable Rate'}</th>
          ${!isNonGst ? (
            isInterState ? `
              <th style="width: 50px; border-right: 1px solid #000; padding: 4px; text-align: center;">IGST %</th>
              <th style="width: 65px; border-right: 1px solid #000; padding: 4px; text-align: right;">IGST Amt</th>
            ` : `
              <th style="width: 45px; border-right: 1px solid #000; padding: 4px; text-align: center;">CGST %</th>
              <th style="width: 55px; border-right: 1px solid #000; padding: 4px; text-align: right;">CGST Amt</th>
              <th style="width: 45px; border-right: 1px solid #000; padding: 4px; text-align: center;">SGST %</th>
              <th style="width: 55px; border-right: 1px solid #000; padding: 4px; text-align: right;">SGST Amt</th>
            `
          ) : ''}
          <th style="width: 80px; padding: 4px; text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRowsHtml}
        ${servicesRowsHtml}

        ${(data?.discount || 0) > 0 ? `
          <tr>
            <td colspan="${colSpanCount - 1}" style="text-align: right; font-style: italic; font-weight: 600; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 6px;">Discount</td>
            <td style="text-align: right; font-weight: bold; border-bottom: 1px solid #000; padding: 4px 6px; color: #dc2626;">- ${(data.discount).toFixed(2)}</td>
          </tr>
        ` : ''}

        ${!isNonGst ? `
          <tr>
            <td colspan="${colSpanCount - 1}" style="text-align: right; font-style: italic; font-weight: 600; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 6px;">Taxable Value</td>
            <td style="text-align: right; font-weight: bold; border-bottom: 1px solid #000; padding: 4px 6px;">${(data?.taxableAmount || 0).toFixed(2)}</td>
          </tr>
          ${isInterState ? `
            <tr>
              <td colspan="${colSpanCount - 1}" style="text-align: right; font-style: italic; font-weight: 600; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 6px;">IGST</td>
              <td style="text-align: right; font-weight: bold; border-bottom: 1px solid #000; padding: 4px 6px;">${(data?.igstAmount || data?.taxAmount || 0).toFixed(2)}</td>
            </tr>
          ` : `
            <tr>
              <td colspan="${colSpanCount - 1}" style="text-align: right; font-style: italic; font-weight: 600; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 6px;">CGST</td>
              <td style="text-align: right; font-weight: bold; border-bottom: 1px solid #000; padding: 4px 6px;">${(data?.cgstAmount || 0).toFixed(2)}</td>
            </tr>
            <tr>
              <td colspan="${colSpanCount - 1}" style="text-align: right; font-style: italic; font-weight: 600; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 6px;">SGST</td>
              <td style="text-align: right; font-weight: bold; border-bottom: 1px solid #000; padding: 4px 6px;">${(data?.sgstAmount || 0).toFixed(2)}</td>
            </tr>
          `}
          ${(data?.roundOff !== undefined && data?.roundOff !== 0) ? `
            <tr>
              <td colspan="${colSpanCount - 1}" style="text-align: right; font-style: italic; font-weight: 600; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 6px;">Round Off</td>
              <td style="text-align: right; font-weight: bold; border-bottom: 1px solid #000; padding: 4px 6px;">${data.roundOff > 0 ? '+' : ''}${data.roundOff.toFixed(2)}</td>
            </tr>
          ` : ''}
        ` : ''}

        <tr style="background-color: #f8fafc;">
          <td colspan="${colSpanCount - 1}" style="text-align: right; font-weight: bold; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 5px;">Grand Total</td>
          <td style="text-align: right; font-weight: bold; font-size: 13px; border-bottom: 1px solid #000; padding: 5px;">₹ ${(data?.grandTotal || 0).toFixed(2)}</td>
        </tr>
      </tbody>
    </table>

    <!-- HSN Summary Table -->
    ${(!isNonGst && hsnSummaryList.length > 0) ? `
      <table class="border-all" style="border-top: none; margin-bottom: 0;">
        <thead>
          <tr style="background-color: #f8fafc; border-bottom: 1px solid #000;">
            <th colspan="${isInterState ? 5 : 7}" style="text-align: center; font-size: 9px; padding: 3px;">HSN/SAC Wise Tax Summary</th>
          </tr>
          <tr style="font-size: 9px; border-bottom: 1px solid #000;">
            <th style="padding: 3px; border-right: 1px solid #000; text-align: center;">HSN/SAC</th>
            <th style="padding: 3px; border-right: 1px solid #000; text-align: right;">Taxable Value</th>
            ${isInterState ? `
              <th style="padding: 3px; border-right: 1px solid #000; text-align: center;">IGST Rate</th>
              <th style="padding: 3px; border-right: 1px solid #000; text-align: right;">IGST Amt</th>
            ` : `
              <th style="padding: 3px; border-right: 1px solid #000; text-align: center;">CGST Rate</th>
              <th style="padding: 3px; border-right: 1px solid #000; text-align: right;">CGST Amt</th>
              <th style="padding: 3px; border-right: 1px solid #000; text-align: center;">SGST Rate</th>
              <th style="padding: 3px; border-right: 1px solid #000; text-align: right;">SGST Amt</th>
            `}
            <th style="padding: 3px; text-align: right;">Total Tax</th>
          </tr>
        </thead>
        <tbody>
          ${hsnSummaryList.map((row) => `
            <tr style="font-size: 9px; border-bottom: 1px solid #000;">
              <td style="text-align: center; border-right: 1px solid #000; padding: 2px 4px;">${row.hsnCode}</td>
              <td style="text-align: right; border-right: 1px solid #000; padding: 2px 4px;">${row.taxableValue.toFixed(2)}</td>
              ${isInterState ? `
                <td style="text-align: center; border-right: 1px solid #000; padding: 2px 4px;">${row.gstRate}%</td>
                <td style="text-align: right; border-right: 1px solid #000; padding: 2px 4px;">${row.igst.toFixed(2)}</td>
              ` : `
                <td style="text-align: center; border-right: 1px solid #000; padding: 2px 4px;">${row.gstRate / 2}%</td>
                <td style="text-align: right; border-right: 1px solid #000; padding: 2px 4px;">${row.cgst.toFixed(2)}</td>
                <td style="text-align: center; border-right: 1px solid #000; padding: 2px 4px;">${row.gstRate / 2}%</td>
                <td style="text-align: right; border-right: 1px solid #000; padding: 2px 4px;">${row.sgst.toFixed(2)}</td>
              `}
              <td style="text-align: right; font-weight: 600; padding: 2px 4px;">${row.totalTax.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : ''}

    <!-- Summary Box -->
    <table class="border-all" style="border-top: none; margin-bottom: 0;">
      <tr>
        <td style="width: 50%; padding: 6px; vertical-align: top; border-right: 1px solid #000;">
          <div><span style="font-weight: 600; display: inline-block; width: 80px;">Total Items:</span> ${totalItemsCount}</div>
          <div><span style="font-weight: 600; display: inline-block; width: 80px;">Total Qty:</span> ${totalQty}</div>
        </td>
        <td style="width: 50%; padding: 6px; text-align: right; vertical-align: top;">
          ${!isNonGst ? `
            <div><span style="font-weight: 600;">Taxable Amount:</span> ₹ ${(data?.taxableAmount || 0).toFixed(2)}</div>
            ${isInterState ? `
              <div><span style="font-weight: 600;">IGST:</span> ₹ ${(data?.igstAmount || data?.taxAmount || 0).toFixed(2)}</div>
            ` : `
              <div><span style="font-weight: 600;">CGST:</span> ₹ ${(data?.cgstAmount || 0).toFixed(2)}</div>
              <div><span style="font-weight: 600;">SGST:</span> ₹ ${(data?.sgstAmount || 0).toFixed(2)}</div>
            `}
          ` : ''}
          <div style="font-size: 12px; font-weight: bold; margin-top: 2px;"><span>Grand Total:</span> ₹ ${(data?.grandTotal || 0).toFixed(2)}</div>
        </td>
      </tr>
    </table>

    <!-- Amount Chargeable in Words Box -->
    <table class="border-all" style="border-top: none; margin-bottom: 0;">
      <tr>
        <td style="padding: 6px; vertical-align: top;">
          <div style="font-style: italic; color: #444; font-size: 10px;">Amount Chargeable (in words)</div>
          <div style="font-weight: bold; font-size: 12px; margin-top: 1px;">${numberToWords(Math.round(data?.grandTotal || 0))}</div>
        </td>
        <td style="width: 80px; text-align: right; vertical-align: top; padding: 6px; font-style: italic; font-weight: bold;">
          E. & O.E
        </td>
      </tr>
    </table>

    <!-- Company GSTIN, Declaration & Bank Details Box -->
    <table class="border-all" style="border-top: none; margin-bottom: 0;">
      <tr>
        <!-- Left: Declaration -->
        <td style="width: 50%; padding: 6px; vertical-align: top; border-right: 1px solid #000;">
          <div>Company's GSTIN/UIN : <span style="font-weight: bold;">09BZOPK7723E1Z1</span></div>
          <div style="margin-top: 4px;">
            <div style="font-weight: bold; text-decoration: underline; margin-bottom: 1px;">Declaration</div>
            <div style="font-size: 9px; color: #333; line-height: 1.3;">We declare that this ${type === 'QUOTATION' ? 'quotation' : 'invoice'} shows the actual price of the goods described and that all particulars are true and correct.</div>
          </div>
        </td>
        <!-- Right: Bank Details -->
        <td style="width: 50%; padding: 6px; vertical-align: top;">
          <div style="font-weight: bold; text-decoration: underline; margin-bottom: 3px;">Company's Bank Details</div>
          <table style="width: 100%; font-size: 10px;">
            <tr><td style="width: 70px; padding: 1px 0;">Bank Name</td><td style="font-weight: 600; padding: 1px 0;">: Union Bank of India</td></tr>
            <tr><td style="padding: 1px 0;">A/c No.</td><td style="font-weight: 600; padding: 1px 0;">: 359701010036291</td></tr>
            <tr><td style="padding: 1px 0;">IFSC Code</td><td style="font-weight: 600; padding: 1px 0;">: UBIN0535974</td></tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Signatures Box -->
    <table class="border-all" style="border-top: none; min-height: 80px;">
      <tr>
        <td style="width: 50%; padding: 6px; vertical-align: bottom; border-right: 1px solid #000;">
          <div style="margin-top: 30px;">Customer's Signature</div>
        </td>
        <td style="width: 50%; padding: 6px; text-align: right; vertical-align: bottom;">
          <div style="font-weight: bold; margin-bottom: 30px;">for ANSHIKA ENTERPRISES</div>
          <div style="font-weight: 600;">Authorised Signatory</div>
        </td>
      </tr>
    </table>

    <!-- Footer Note -->
    <div style="text-align: center; margin-top: 6px; font-size: 9px; color: #555;">
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
  const puppeteer = await getPuppeteer();
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage();
  const html = getInvoiceHTML(sale, items, customer);

  await page.setContent(html, { waitUntil: 'networkidle0' as any });
  const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' } });

  await browser.close();
  return Buffer.from(pdfBuffer);
};

export const generateQuotationPDF = async (quotation: any, items: any[], customer: any): Promise<Buffer> => {
  const puppeteer = await getPuppeteer();
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage();
  const html = getQuotationHTML(quotation, items, customer);

  await page.setContent(html, { waitUntil: 'networkidle0' as any });
  const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' } });

  await browser.close();
  return Buffer.from(pdfBuffer);
};
