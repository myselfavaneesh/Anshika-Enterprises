import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

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

export const generateAndSharePDF = async (data: any, title: string) => {
  const isNonGst = data.invoiceType === 'NON_GST';
  const customer = data.customerId || data.supplierId || {};
  const invoiceNum = data.invoiceNumber || data.purchaseInvoiceNumber || data.quotationNumber || 'N/A';
  const items = data.items || [];
  
  const taxRate = data.taxRate || 0;
  const cgstAmount = data.cgstAmount || (data.taxAmount ? data.taxAmount / 2 : 0) || 0;
  const sgstAmount = data.sgstAmount || (data.taxAmount ? data.taxAmount / 2 : 0) || 0;

  const html = `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <script src="https://cdn.tailwindcss.com"></script>
        <script>
          tailwind.config = {
            theme: {
              extend: {
                colors: { primary: '#2E8B57' }
              }
            }
          }
        </script>
        <style>
          body { font-family: 'Helvetica Neue', 'Helvetica', Arial, sans-serif; }
          .print\\\\:shadow-none { box-shadow: none !important; }
          .print\\\\:p-0 { padding: 0 !important; }
        </style>
      </head>
      <body>
        <div class="bg-white text-slate-800 p-8 md:p-12 max-w-[210mm] min-h-[297mm] mx-auto shadow-sm print:shadow-none print:p-0 font-sans">
          
          <!-- Header Section -->
          <div class="flex justify-between items-start border-b border-slate-200 pb-6 mb-6">
            <div class="flex flex-col">
              <h1 class="text-2xl font-bold text-slate-900 tracking-tight">ANSHIKA ENTERPRISES</h1>
              <p class="text-sm text-slate-500 mt-1">Phoolpur, Azamgarh, Uttar Pradesh</p>
              <p class="text-sm text-slate-500">Phone: +91 98765 43210</p>
              <p class="text-sm text-slate-500">Email: contact@anshikaenterprises.in</p>
              <p class="text-sm font-semibold text-slate-700 mt-1">GSTIN: 09XXXXX1234X1ZX</p>
            </div>
            <div class="flex flex-col items-end text-right">
              <h2 class="text-3xl font-bold text-primary uppercase tracking-wider mb-2">${title.toUpperCase()}</h2>
              <div class="flex flex-col gap-1 text-sm">
                <div class="flex justify-between gap-4">
                  <span class="text-slate-500">${title.includes('Quotation') ? 'Quote No' : 'Invoice No'}:</span>
                  <span class="font-semibold text-slate-900">${invoiceNum}</span>
                </div>
                <div class="flex justify-between gap-4">
                  <span class="text-slate-500">Date:</span>
                  <span class="font-semibold text-slate-900">${new Date(data.createdAt || Date.now()).toLocaleDateString('en-IN')}</span>
                </div>
                <div class="mt-2 flex justify-end">
                  <span class="px-3 py-1 text-xs font-bold uppercase rounded-full ${data.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}">
                    ${data.status || 'COMPLETED'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Customer Section -->
          <div class="mb-8 flex gap-4">
            <div class="bg-slate-50 border border-slate-200 rounded-lg p-5 w-1/2">
              <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Bill To</h3>
              <div class="flex flex-col gap-1">
                <p class="text-base font-bold text-slate-900">${customer.name || 'N/A'}</p>
                ${customer.phone ? `<p class="text-sm text-slate-600">Phone: ${customer.phone}</p>` : ''}
                ${customer.address ? `<p class="text-sm text-slate-600">Address: ${customer.address}</p>` : ''}
                ${customer.gstNumber ? `<p class="text-sm font-semibold text-slate-700 mt-1">GSTIN: ${customer.gstNumber}</p>` : ''}
              </div>
            </div>
            <div class="bg-slate-50 border border-slate-200 rounded-lg p-5 w-1/2 flex items-center justify-center">
                <p class="text-lg font-bold text-slate-700 uppercase tracking-widest">${isNonGst ? 'NON-GST BILL' : 'TAX INVOICE'}</p>
            </div>
          </div>

          <!-- Product Table -->
          <div class="mb-8">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="border-b-2 border-slate-300 bg-slate-50">
                  <th class="py-3 px-4 text-sm font-semibold text-slate-700">Item Description</th>
                  <th class="py-3 px-4 text-sm font-semibold text-slate-700 text-center">Qty</th>
                  <th class="py-3 px-4 text-sm font-semibold text-slate-700 text-right">${isNonGst ? 'Rate' : 'Taxable Rate'}</th>
                  ${!isNonGst ? `<th class="py-3 px-4 text-sm font-semibold text-slate-700 text-center">GST</th>` : ''}
                  <th class="py-3 px-4 text-sm font-semibold text-slate-700 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${items.map((item: any, index: number) => `
                  <tr class="border-b border-slate-200 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}">
                    <td class="py-4 px-4 align-top">
                      <p class="font-bold text-slate-900">${item.name || item.productId?.name || 'Item'}</p>
                      ${item.serialNumbers && item.serialNumbers.length > 0 ? `
                        <div class="flex flex-wrap gap-1 mt-2">
                          ${item.serialNumbers.map((sn: string) => `
                            <span class="inline-block px-2 py-0.5 bg-slate-100 border border-slate-200 text-xs text-slate-500 rounded-md font-mono">
                              ${sn}
                            </span>
                          `).join('')}
                        </div>
                      ` : ''}
                    </td>
                    <td class="py-4 px-4 align-top text-center font-medium">${item.quantity}</td>
                    <td class="py-4 px-4 align-top text-right text-slate-600">₹${Number(isNonGst ? item.unitPrice : (item.taxableUnitPrice || item.unitPrice)).toFixed(2)}</td>
                    ${!isNonGst ? `<td class="py-4 px-4 align-top text-center text-slate-600">${item.gstRate || taxRate}%</td>` : ''}
                    <td class="py-4 px-4 align-top text-right font-semibold text-slate-900">₹${Number(isNonGst ? item.totalPrice : (item.taxableTotalPrice || item.totalPrice)).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- Summary Section -->
          <div class="flex justify-between items-start mb-12">
            
            <!-- Payment & Words Info -->
            <div class="w-1/2 pr-8 flex flex-col gap-6">
              <div>
                <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Amount in Words</h4>
                <p class="text-sm font-semibold text-slate-800 italic bg-slate-50 p-3 rounded-md border border-slate-200">
                  ${numberToWords(Math.round(data.grandTotal || 0))}
                </p>
              </div>
              
              <div>
                <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Payment Details</h4>
                <p class="text-sm text-slate-700">Method: <span class="font-semibold">${data.paymentMethod || data.paymentMode || 'Cash / UPI / Bank Transfer'}</span></p>
              </div>
            </div>

            <!-- Totals Box -->
            <div class="w-1/2 max-w-sm ml-auto bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
              <div class="p-4 space-y-3">
                <div class="flex justify-between text-sm text-slate-600">
                  <span>${isNonGst ? 'Subtotal' : 'Taxable Value'}:</span>
                  <span class="font-medium">₹${Number(data.taxableAmount || (data.subtotal - (data.discount || 0))).toFixed(2)}</span>
                </div>
                
                ${data.discount > 0 ? `
                  <div class="flex justify-between text-sm text-green-600">
                    <span>Discount:</span>
                    <span class="font-medium">- ₹${Number(data.discount).toFixed(2)}</span>
                  </div>
                ` : ''}

                ${data.services ? data.services.map((service: any) => `
                  <div class="flex justify-between text-sm text-slate-600">
                    <span>${service.name}:</span>
                    <span class="font-medium">₹${Number(service.amount).toFixed(2)}</span>
                  </div>
                `).join('') : ''}
                
                ${!isNonGst ? `
                  <div class="flex justify-between text-sm text-slate-600">
                    <span>CGST (${(taxRate / 2).toFixed(1)}%):</span>
                    <span class="font-medium">₹${Number(cgstAmount).toFixed(2)}</span>
                  </div>
                  
                  <div class="flex justify-between text-sm text-slate-600">
                    <span>SGST (${(taxRate / 2).toFixed(1)}%):</span>
                    <span class="font-medium">₹${Number(sgstAmount).toFixed(2)}</span>
                  </div>
                ` : ''}
                
                <div class="flex justify-between text-sm text-slate-600 pb-3 border-b border-slate-200">
                  <span>Round Off:</span>
                  <span class="font-medium">₹${(Math.round(data.grandTotal || 0) - (data.grandTotal || 0)).toFixed(2)}</span>
                </div>
              </div>
              
              <div class="bg-slate-900 text-white p-4 flex justify-between items-center">
                <span class="text-lg font-bold">Grand Total</span>
                <span class="text-2xl font-black tracking-tight">₹${Math.round(data.grandTotal || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          <!-- Footer Section -->
          <div class="mt-auto border-t-2 border-slate-200 pt-8 flex justify-between items-end">
            <div class="w-2/3">
              <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Terms & Conditions</h4>
              <ul class="text-xs text-slate-500 space-y-1 list-disc pl-4">
                <li>Goods once sold will not be taken back or exchanged.</li>
                <li>All disputes are subject to Azamgarh jurisdiction only.</li>
                <li>Warranty on batteries as per company norms. Please preserve this invoice for warranty claims.</li>
              </ul>
            </div>
            
            <div class="w-1/3 flex flex-col items-center">
              <div class="h-16 w-48 border-b border-slate-400 mb-2"></div>
              <span class="text-xs font-bold text-slate-800 uppercase">Authorized Signature</span>
              <span class="text-[10px] text-slate-400 mt-1">For ANSHIKA ENTERPRISES</span>
            </div>
          </div>
          
          <div class="mt-8 text-center border-t border-slate-100 pt-4">
            <p class="text-[10px] text-slate-400">This is a computer-generated invoice.</p>
            <p class="text-[10px] text-slate-400 font-semibold mt-0.5">Powered by Inventory & Billing SaaS</p>
          </div>

        </div>
      </body>
    </html>
  `;

  try {
    const { base64 } = await Print.printToFileAsync({ html, base64: true });
    
    if (!base64) {
      throw new Error('Failed to generate PDF base64 data');
    }

    // Write the base64 directly to a file in DocumentDirectory
    const newUri = `${FileSystem.documentDirectory}Anshika_Enterprises_Invoice_${Date.now()}.pdf`;
    await FileSystem.writeAsStringAsync(newUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(newUri, { 
        UTI: '.pdf', 
        mimeType: 'application/pdf',
        dialogTitle: 'Share Invoice'
      });
    }
  } catch (error) {
    console.error('Failed to generate PDF', error);
    throw error;
  }
};
