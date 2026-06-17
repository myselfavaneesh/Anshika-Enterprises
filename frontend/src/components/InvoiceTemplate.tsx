import React from 'react';

// Helper function to convert numbers to words (Indian numbering system)
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

interface InvoiceProps {
  sale: {
    invoiceNumber: string;
    createdAt: string;
    status: string;
    subtotal: number;
    discount: number;
    taxableAmount: number;
    taxRate: number;
    taxAmount: number;
    cgstAmount: number;
    sgstAmount: number;
    grandTotal: number;
    paymentMethod?: string;
  };
  customer: {
    name: string;
    phone?: string;
    address?: string;
    gstNumber?: string;
  };
  items: Array<{
    _id: string;
    productId?: { name: string };
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    taxableUnitPrice: number;
    taxableTotalPrice: number;
    serialNumbers: string[];
  }>;
}

const InvoiceTemplate: React.FC<InvoiceProps> = ({ sale, customer, items }) => {
  return (
    <div className="bg-white text-slate-800 p-8 md:p-12 max-w-[210mm] min-h-[297mm] mx-auto shadow-sm print:shadow-none print:p-0 font-sans">
      
      {/* Header Section */}
      <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-6">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">ANSHIKA ENTERPRISES</h1>
          <p className="text-sm text-slate-500 mt-1">Phoolpur, Azamgarh, Uttar Pradesh</p>
          <p className="text-sm text-slate-500">Phone: +91 98765 43210</p>
          <p className="text-sm text-slate-500">Email: contact@anshikaenterprises.in</p>
          <p className="text-sm font-semibold text-slate-700 mt-1">GSTIN: 09XXXXX1234X1ZX</p>
        </div>
        <div className="flex flex-col items-end text-right">
          <h2 className="text-3xl font-bold text-primary uppercase tracking-wider mb-2">TAX INVOICE</h2>
          <div className="flex flex-col gap-1 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Invoice No:</span>
              <span className="font-semibold text-slate-900">{sale.invoiceNumber}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Date:</span>
              <span className="font-semibold text-slate-900">{new Date(sale.createdAt).toLocaleDateString('en-IN')}</span>
            </div>
            <div className="mt-2 flex justify-end">
              <span className={`px-3 py-1 text-xs font-bold uppercase rounded-full ${
                sale.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {sale.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Section */}
      <div className="mb-8">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 w-1/2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Bill To</h3>
          <div className="flex flex-col gap-1">
            <p className="text-base font-bold text-slate-900">{customer.name}</p>
            {customer.phone && <p className="text-sm text-slate-600">Phone: {customer.phone}</p>}
            {customer.address && <p className="text-sm text-slate-600">Address: {customer.address}</p>}
            {customer.gstNumber && <p className="text-sm font-semibold text-slate-700 mt-1">GSTIN: {customer.gstNumber}</p>}
          </div>
        </div>
      </div>

      {/* Product Table */}
      <div className="mb-8">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-300 bg-slate-50">
              <th className="py-3 px-4 text-sm font-semibold text-slate-700">Item Description</th>
              <th className="py-3 px-4 text-sm font-semibold text-slate-700 text-center">Qty</th>
              <th className="py-3 px-4 text-sm font-semibold text-slate-700 text-right">Taxable Rate</th>
              <th className="py-3 px-4 text-sm font-semibold text-slate-700 text-center">GST</th>
              <th className="py-3 px-4 text-sm font-semibold text-slate-700 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item._id || index} className={`border-b border-slate-200 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                <td className="py-4 px-4 align-top">
                  <p className="font-bold text-slate-900">{item.productId?.name || 'Unknown Product'}</p>
                  {item.serialNumbers && item.serialNumbers.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.serialNumbers.map((sn, i) => (
                        <span key={i} className="inline-block px-2 py-0.5 bg-slate-100 border border-slate-200 text-xs text-slate-500 rounded-md font-mono">
                          {sn}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="py-4 px-4 align-top text-center font-medium">{item.quantity}</td>
                <td className="py-4 px-4 align-top text-right text-slate-600">₹{(item.taxableUnitPrice || item.unitPrice).toFixed(2)}</td>
                <td className="py-4 px-4 align-top text-center text-slate-600">{sale.taxRate}%</td>
                <td className="py-4 px-4 align-top text-right font-semibold text-slate-900">₹{(item.taxableTotalPrice || item.totalPrice).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Section */}
      <div className="flex justify-between items-start mb-12">
        
        {/* Payment & Words Info */}
        <div className="w-1/2 pr-8 flex flex-col gap-6">
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Amount in Words</h4>
            <p className="text-sm font-semibold text-slate-800 italic bg-slate-50 p-3 rounded-md border border-slate-200">
              {numberToWords(Math.round(sale.grandTotal))}
            </p>
          </div>
          
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Payment Details</h4>
            <p className="text-sm text-slate-700">Method: <span className="font-semibold">{sale.paymentMethod || 'Cash / UPI / Bank Transfer'}</span></p>
          </div>
        </div>

        {/* Totals Box */}
        <div className="w-1/2 max-w-sm ml-auto bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 space-y-3">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Taxable Value:</span>
              <span className="font-medium">₹{(sale.taxableAmount || (sale.subtotal - sale.discount)).toFixed(2)}</span>
            </div>
            
            {sale.discount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount:</span>
                <span className="font-medium">- ₹{sale.discount.toFixed(2)}</span>
              </div>
            )}
            
            <div className="flex justify-between text-sm text-slate-600">
              <span>CGST ({(sale.taxRate / 2).toFixed(1)}%):</span>
              <span className="font-medium">₹{(sale.cgstAmount || (sale.taxAmount / 2)).toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between text-sm text-slate-600">
              <span>SGST ({(sale.taxRate / 2).toFixed(1)}%):</span>
              <span className="font-medium">₹{(sale.sgstAmount || (sale.taxAmount / 2)).toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between text-sm text-slate-600 pb-3 border-b border-slate-200">
              <span>Round Off:</span>
              <span className="font-medium">₹{(Math.round(sale.grandTotal) - sale.grandTotal).toFixed(2)}</span>
            </div>
          </div>
          
          <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
            <span className="text-lg font-bold">Grand Total</span>
            <span className="text-2xl font-black tracking-tight">₹{Math.round(sale.grandTotal).toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* Footer Section */}
      <div className="mt-auto border-t-2 border-slate-200 pt-8 flex justify-between items-end">
        <div className="w-2/3">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Terms & Conditions</h4>
          <ul className="text-xs text-slate-500 space-y-1 list-disc pl-4">
            <li>Goods once sold will not be taken back or exchanged.</li>
            <li>All disputes are subject to Azamgarh jurisdiction only.</li>
            <li>Warranty on batteries as per company norms. Please preserve this invoice for warranty claims.</li>
          </ul>
        </div>
        
        <div className="w-1/3 flex flex-col items-center">
          <div className="h-16 w-48 border-b border-slate-400 mb-2"></div>
          <span className="text-xs font-bold text-slate-800 uppercase">Authorized Signature</span>
          <span className="text-[10px] text-slate-400 mt-1">For ANSHIKA ENTERPRISES</span>
        </div>
      </div>
      
      <div className="mt-8 text-center border-t border-slate-100 pt-4">
        <p className="text-[10px] text-slate-400">This is a computer-generated invoice.</p>
        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Powered by Inventory & Billing SaaS</p>
      </div>

    </div>
  );
};

export default InvoiceTemplate;
