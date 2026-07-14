import puppeteer from 'puppeteer';

const numberToWords = (num: number): string => {
  if (num === 0) return 'Zero';
  
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const inWords = (n: number): string => {
    let str = '';
    if (n > 99) {
      str += a[Math.floor(n / 100)] + 'Hundred ';
      n %= 100;
    }
    if (n > 19) {
      str += b[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += a[n];
    }
    return str.trim();
  };

  let word = '';
  let crore = Math.floor(num / 10000000);
  num %= 10000000;
  let lakh = Math.floor(num / 100000);
  num %= 100000;
  let thousand = Math.floor(num / 1000);
  num %= 1000;
  
  if (crore > 0) word += inWords(crore) + ' Crore ';
  if (lakh > 0) word += inWords(lakh) + ' Lakh ';
  if (thousand > 0) word += inWords(thousand) + ' Thousand ';
  if (num > 0) word += inWords(num);
  
  return 'Rupees ' + word.trim() + ' Only';
};

export const generateInvoicePDF = async (sale: any, items: any[], customer: any): Promise<Buffer> => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const taxableValue = sale.taxableAmount || (sale.subtotal - sale.discount);
  const cgst = sale.cgstAmount || (sale.taxAmount / 2);
  const sgst = sale.sgstAmount || (sale.taxAmount / 2);
  const cgstRate = sale.taxRate / 2;
  const sgstRate = sale.taxRate / 2;
  const roundOff = Math.round(sale.grandTotal) - sale.grandTotal;

  const itemsHtml = items.map((item, index) => {
    const serialsHtml = item.serialNumbers && item.serialNumbers.length > 0 
      ? `<div class="mt-1 text-sm italic text-gray-700">Serial Number(s):<br>${item.serialNumbers.join(', ')}</div>` 
      : '';
    
    const itemAmount = item.taxableTotalPrice || item.totalPrice;
    const isFoc = itemAmount === 0;

    return `
      <tr class="border-b border-gray-300">
        <td class="p-2 text-center align-top border-r border-gray-300">${index + 1}</td>
        <td class="p-2 align-top border-r border-gray-300">
          <div class="font-bold text-gray-900">${item.productId?.name || 'Unknown Product'}</div>
          ${serialsHtml}
        </td>
        <td class="p-2 text-center align-top border-r border-gray-300">8507</td>
        <td class="p-2 text-center align-top border-r border-gray-300 font-bold">${item.quantity}</td>
        <td class="p-2 text-right align-top border-r border-gray-300">${isFoc ? '0.00' : (item.taxableUnitPrice || item.unitPrice).toFixed(2)}</td>
        <td class="p-2 text-right align-top font-bold">${isFoc ? '0.00' : itemAmount.toFixed(2)}</td>
      </tr>
    `;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice ${sale.invoiceNumber}</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        body { font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      </style>
    </head>
    <body class="bg-white text-black text-[13px] leading-tight m-0 p-0">
      
      <!-- Header -->
      <div class="text-center mb-4">
        <h1 class="text-2xl font-bold uppercase tracking-wide">ANSHIKA ENTERPRISES</h1>
        <p class="mt-1">Phoolpur, Azamgarh, Uttar Pradesh - 276304</p>
        <p class="font-semibold">GSTIN/UIN: 09BZOPK7723E1Z1 | State Code: 09</p>
        <p>Phone: 9598522526</p>
      </div>

      <div class="flex justify-between items-end border-b-2 border-black pb-2 mb-4">
        <h2 class="text-xl font-bold uppercase">GST TAX INVOICE</h2>
        <span class="text-xs font-semibold">(ORIGINAL FOR RECIPIENT)</span>
      </div>

      <!-- Info Grid -->
      <div class="grid grid-cols-2 gap-4 border border-black mb-4">
        <!-- Customer Details -->
        <div class="p-3 border-r border-black">
          <div class="font-bold text-gray-500 mb-1 uppercase text-xs">Bill To</div>
          <div class="font-bold text-[15px] mb-1">${customer.name}</div>
          ${customer.address ? `<div>${customer.address}</div>` : ''}
          ${customer.phone ? `<div>Phone: ${customer.phone}</div>` : ''}
          ${customer.gstNumber ? `<div class="font-semibold mt-1">GSTIN: ${customer.gstNumber}</div>` : ''}
          <div class="mt-1">State: Uttar Pradesh, Code: 09</div>
        </div>
        
        <!-- Invoice Details -->
        <div class="p-3 flex flex-col justify-center">
          <div class="grid grid-cols-[100px_1fr] gap-y-2">
            <div class="font-semibold">Invoice No</div>
            <div class="font-bold text-base">: ${sale.invoiceNumber}</div>
            
            <div class="font-semibold">Invoice Date</div>
            <div class="font-bold text-base">: ${new Date(sale.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')}</div>
          </div>
        </div>
      </div>

      <!-- Items Table -->
      <table class="w-full border border-black mb-4 border-collapse">
        <thead>
          <tr class="border-b border-black bg-gray-100">
            <th class="p-2 border-r border-gray-400 w-[5%]">Sr</th>
            <th class="p-2 border-r border-gray-400 text-left">Description of Goods</th>
            <th class="p-2 border-r border-gray-400 w-[10%]">HSN/SAC</th>
            <th class="p-2 border-r border-gray-400 w-[8%]">Qty</th>
            <th class="p-2 border-r border-gray-400 w-[15%] text-right">Rate</th>
            <th class="p-2 text-right w-[18%]">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
          
          <!-- Empty Spacer if needed -->
          <tr class="h-4"><td colspan="6"></td></tr>
          
          <!-- GST & Totals Inside Table -->
          <tr>
            <td colspan="4" class="border-r border-gray-300"></td>
            <td class="p-2 text-right border-r border-gray-300 font-semibold text-gray-600">Taxable Value</td>
            <td class="p-2 text-right border-gray-300 font-semibold">${taxableValue.toFixed(2)}</td>
          </tr>
          ${sale.discount > 0 ? `
          <tr>
            <td colspan="4" class="border-r border-gray-300"></td>
            <td class="p-2 text-right border-r border-gray-300 font-semibold text-gray-600">Discount</td>
            <td class="p-2 text-right border-gray-300 font-semibold">- ${sale.discount.toFixed(2)}</td>
          </tr>
          ` : ''}
          <tr>
            <td colspan="4" class="border-r border-gray-300"></td>
            <td class="p-2 text-right border-r border-gray-300 font-semibold text-gray-600">CGST (${cgstRate}%)</td>
            <td class="p-2 text-right border-gray-300 font-semibold">${cgst.toFixed(2)}</td>
          </tr>
          <tr>
            <td colspan="4" class="border-r border-gray-300"></td>
            <td class="p-2 text-right border-r border-gray-300 font-semibold text-gray-600">SGST (${sgstRate}%)</td>
            <td class="p-2 text-right border-gray-300 font-semibold">${sgst.toFixed(2)}</td>
          </tr>
          ${roundOff !== 0 ? `
          <tr>
            <td colspan="4" class="border-r border-gray-300"></td>
            <td class="p-2 text-right border-r border-gray-300 font-semibold text-gray-600">Round Off</td>
            <td class="p-2 text-right border-gray-300 font-semibold">${roundOff > 0 ? '+' : ''}${roundOff.toFixed(2)}</td>
          </tr>
          ` : ''}
          <tr class="border-t border-black bg-gray-50">
            <td colspan="3" class="p-2 text-right border-r border-gray-300 font-bold">Total</td>
            <td class="p-2 text-center border-r border-gray-300 font-bold">${totalQuantity}</td>
            <td class="p-2 text-right border-r border-gray-300 font-bold">Grand Total</td>
            <td class="p-2 text-right font-bold text-lg text-black">₹ ${Math.round(sale.grandTotal).toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <!-- Amount in Words & Tax Summary -->
      <div class="border border-black p-3 mb-4 flex justify-between items-center bg-gray-50">
        <div>
          <span class="font-semibold text-gray-600 uppercase text-xs block mb-1">Amount in Words</span>
          <span class="font-bold text-[14px]">${numberToWords(Math.round(sale.grandTotal))}</span>
        </div>
        <div class="text-right border-l border-gray-300 pl-4">
          <span class="font-semibold text-gray-600 uppercase text-xs block mb-1">Total Tax Amount</span>
          <span class="font-bold text-[14px]">₹ ${sale.taxAmount.toFixed(2)}</span>
        </div>
      </div>

      <!-- Declaration & Footer -->
      <div class="border border-black p-4 flex justify-between items-end min-h-[140px]">
        <div class="w-1/2">
          <div class="font-bold text-sm mb-1 underline">Declaration:</div>
          <p class="text-xs text-gray-700 leading-relaxed mb-4">We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</p>
          <div class="font-bold text-xs uppercase">Subject to Azamgarh Jurisdiction</div>
        </div>
        
        <div class="w-1/2 flex justify-end gap-12 text-center">
          <div class="flex flex-col justify-end items-center">
            <div class="w-32 border-b border-black mb-2"></div>
            <span class="text-xs font-semibold">Customer Signature</span>
          </div>
          
          <div class="flex flex-col justify-end items-center">
            <span class="font-bold text-xs mb-8 block">for ANSHIKA ENTERPRISES</span>
            <div class="w-40 border-b border-black mb-2"></div>
            <span class="text-xs font-semibold">Authorized Signatory</span>
          </div>
        </div>
      </div>

      <div class="text-center mt-4">
        <p class="text-xs text-gray-500 font-medium">This is a Computer Generated Invoice</p>
      </div>

    </body>
    </html>
  `;

  await page.setContent(html, { waitUntil: 'networkidle0' as any });
  const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' } });

  await browser.close();
  return Buffer.from(pdfBuffer);
};
