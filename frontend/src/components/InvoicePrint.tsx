import React from 'react';

interface InvoicePrintProps {
  type: 'TAX INVOICE' | 'QUOTATION';
  data: any;
  companyInfo?: any;
}

const InvoicePrint: React.FC<InvoicePrintProps> = ({ type, data, companyInfo }) => {
  // Utility for number to words
  const numberToWords = (num: number): string => {
    // Basic implementation for demonstration. 
    // In production, use a library like `number-to-words` or a custom Indian numbering system converter.
    return `INR ${num.toFixed(2)} Only`; 
  };

  const getHsnSummary = (items: any[]) => {
    const summary: Record<string, any> = {};
    items.forEach(item => {
      const hsn = item.productId?.hsnCode || '-';
      if (!summary[hsn]) {
        summary[hsn] = { taxableValue: 0, cgstAmount: 0, sgstAmount: 0, rate: item.productId?.gstRate || 0 };
      }
      summary[hsn].taxableValue += item.taxableTotalPrice || 0;
      const cgst = (item.taxableTotalPrice * ((item.productId?.gstRate || 0) / 2)) / 100;
      summary[hsn].cgstAmount += cgst;
      summary[hsn].sgstAmount += cgst;
    });
    return Object.values(summary);
  };

  const hsnSummary = data?.items ? getHsnSummary(data.items) : [];

  return (
    <div className="bg-white text-black p-4 md:p-8 w-[210mm] min-h-[297mm] mx-auto text-xs shadow-lg print:shadow-none print:p-0" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Print styles */}
      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
          .no-print { display: none; }
        }
        table, th, td { border: 1px solid black; border-collapse: collapse; }
        th, td { padding: 4px 8px; }
      `}</style>

      {/* Header */}
      <h1 className="text-center font-bold text-xl uppercase mb-2">{type}</h1>

      {/* Two Column Layout for Header Details */}
      <div className="grid grid-cols-2 border border-black mb-4">
        {/* Left Column */}
        <div className="border-r border-black flex flex-col">
          <div className="p-2 border-b border-black flex-1">
            <h3 className="font-semibold mb-1">Consignee (Ship to)</h3>
            <p className="font-bold">{data?.customerId?.name || 'Customer Name'}</p>
            <p>{data?.customerId?.address || 'Address Line 1'}</p>
            <p>State Name: {data?.customerId?.state || '-'}, Code: {data?.customerId?.stateCode || '-'}</p>
            <p>Contact: {data?.customerId?.phone || '-'}</p>
          </div>
          <div className="p-2 flex-1">
            <h3 className="font-semibold mb-1">Buyer (Bill to)</h3>
            <p className="font-bold">{data?.customerId?.name || 'Customer Name'}</p>
            <p>{data?.customerId?.address || 'Address Line 1'}</p>
            <p>State Name: {data?.customerId?.state || '-'}, Code: {data?.customerId?.stateCode || '-'}</p>
            <p>Contact: {data?.customerId?.phone || '-'}</p>
          </div>
        </div>

        {/* Right Column */}
        {type === 'TAX INVOICE' ? (
          <div className="grid grid-cols-2">
            <div className="p-2 border-r border-b border-black">
              <p className="font-semibold">Invoice No.</p>
              <p className="font-bold">{data?.invoiceNumber || '-'}</p>
            </div>
            <div className="p-2 border-b border-black">
              <p className="font-semibold">Dated</p>
              <p className="font-bold">{new Date(data?.createdAt || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}</p>
            </div>
            <div className="p-2 border-r border-b border-black">
              <p className="font-semibold">Delivery Note</p>
              <p>-</p>
            </div>
            <div className="p-2 border-b border-black">
              <p className="font-semibold">Reference No. & Date.</p>
              <p>-</p>
            </div>
            <div className="p-2 border-r border-b border-black">
              <p className="font-semibold">Buyer's Order No.</p>
              <p>-</p>
            </div>
            <div className="p-2 border-b border-black">
              <p className="font-semibold">Dated</p>
              <p>-</p>
            </div>
            <div className="p-2 border-r border-b border-black">
              <p className="font-semibold">Dispatch Doc No.</p>
              <p>-</p>
            </div>
            <div className="p-2 border-b border-black">
              <p className="font-semibold">Delivery Note Date</p>
              <p>-</p>
            </div>
            <div className="p-2 border-r border-black">
              <p className="font-semibold">Dispatched through</p>
              <p>-</p>
            </div>
            <div className="p-2">
              <p className="font-semibold">Destination</p>
              <p>-</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2">
            <div className="p-2 border-r border-b border-black col-span-2 flex justify-between">
              <div>
                <p className="font-semibold">Quotation No.</p>
                <p className="font-bold">{data?.quotationNumber || '-'}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">Dated</p>
                <p className="font-bold">{new Date(data?.createdAt || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}</p>
              </div>
            </div>
            <div className="p-2 border-black col-span-2">
              <p className="font-semibold">Valid Until</p>
              <p className="font-bold">{data?.validUntil ? new Date(data.validUntil).toLocaleDateString('en-GB') : '-'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Main Table */}
      <table className="w-full mb-0 border-b-0">
        <thead>
          <tr>
            <th className="w-10">Sl No.</th>
            <th className="text-left">Description of Goods</th>
            <th>HSN/SAC</th>
            <th>GST Rate</th>
            <th>Quantity</th>
            <th>Rate</th>
            <th>per</th>
            <th>Disc. %</th>
            <th className="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {data?.items?.map((item: any, index: number) => (
            <tr key={index}>
              <td className="text-center align-top border-b-0">{index + 1}</td>
              <td className="border-b-0">
                <p className="font-bold">{item.productId?.name}</p>
                {item.serialNumbers && item.serialNumbers.length > 0 && (
                  <p className="italic text-[10px]">SN: {item.serialNumbers.join(', ')}</p>
                )}
              </td>
              <td className="text-center align-top border-b-0">{item.productId?.hsnCode || '-'}</td>
              <td className="text-center align-top border-b-0">{item.productId?.gstRate || 0}%</td>
              <td className="text-center align-top border-b-0 font-bold">{item.quantity} PC</td>
              <td className="text-right align-top border-b-0">{item.taxableUnitPrice?.toFixed(2)}</td>
              <td className="text-center align-top border-b-0">PC</td>
              <td className="text-center align-top border-b-0">-</td>
              <td className="text-right align-top border-b-0 font-bold">{item.taxableTotalPrice?.toFixed(2)}</td>
            </tr>
          ))}
          {/* Fill empty space if few items */}
          <tr className="h-24">
            <td className="border-y-0"></td><td className="border-y-0"></td><td className="border-y-0"></td><td className="border-y-0"></td><td className="border-y-0"></td><td className="border-y-0"></td><td className="border-y-0"></td><td className="border-y-0"></td><td className="border-y-0"></td>
          </tr>
          
          {/* Tax Totals */}
          <tr>
            <td colSpan={8} className="text-right italic border-y-0 font-semibold pt-4">CGST</td>
            <td className="text-right border-y-0 font-bold pt-4">{data?.cgstAmount?.toFixed(2)}</td>
          </tr>
          <tr>
            <td colSpan={8} className="text-right italic border-y-0 font-semibold">SGST</td>
            <td className="text-right border-y-0 font-bold">{data?.sgstAmount?.toFixed(2)}</td>
          </tr>
          <tr>
            <td colSpan={8} className="text-right italic border-y-0 font-semibold pb-4">Round Off</td>
            <td className="text-right border-y-0 font-bold pb-4">
               {data ? (data.grandTotal - (data.taxableAmount + data.cgstAmount + data.sgstAmount)).toFixed(2) : '0.00'}
            </td>
          </tr>
          <tr>
            <td colSpan={8} className="text-right font-bold">Total</td>
            <td className="text-right font-bold text-sm">₹ {data?.grandTotal?.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      {/* Amount in words */}
      <div className="border border-t-0 border-black p-2 flex justify-between">
        <div>
          <span className="italic">Amount Chargeable (in words)</span><br />
          <span className="font-bold">{numberToWords(data?.grandTotal || 0)}</span>
        </div>
        <div className="italic font-bold">E. & O.E</div>
      </div>

      {/* Tax Breakdown Table */}
      <table className="w-full mt-4">
        <thead>
          <tr>
            <th rowSpan={2}>HSN/SAC</th>
            <th rowSpan={2}>Taxable Value</th>
            <th colSpan={2}>CGST</th>
            <th colSpan={2}>SGST/UTGST</th>
            <th rowSpan={2}>Total Tax Amount</th>
          </tr>
          <tr>
            <th>Rate</th>
            <th>Amount</th>
            <th>Rate</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {hsnSummary.map((hsn: any, idx: number) => (
            <tr key={idx}>
              <td className="text-center">{hsn.hsnCode || '-'}</td>
              <td className="text-right">{hsn.taxableValue.toFixed(2)}</td>
              <td className="text-center">{hsn.rate / 2}%</td>
              <td className="text-right">{hsn.cgstAmount.toFixed(2)}</td>
              <td className="text-center">{hsn.rate / 2}%</td>
              <td className="text-right">{hsn.sgstAmount.toFixed(2)}</td>
              <td className="text-right">{(hsn.cgstAmount + hsn.sgstAmount).toFixed(2)}</td>
            </tr>
          ))}
          <tr>
            <td className="text-right font-bold">Total</td>
            <td className="text-right font-bold">{data?.taxableAmount?.toFixed(2)}</td>
            <td></td>
            <td className="text-right font-bold">{data?.cgstAmount?.toFixed(2)}</td>
            <td></td>
            <td className="text-right font-bold">{data?.sgstAmount?.toFixed(2)}</td>
            <td className="text-right font-bold">{data?.taxAmount?.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <div className="border border-t-0 border-black p-2">
        <span className="italic">Tax Amount (in words) :</span> <span className="font-bold">{numberToWords(data?.taxAmount || 0)}</span>
      </div>

      {/* Footer Section */}
      <div className="border border-t-0 border-black flex">
        <div className="w-1/2 p-2 border-r border-black flex flex-col justify-between">
          <div>
             <p>Company's GSTIN/UIN : <span className="font-bold">09KIIPS1847F1ZP</span></p>
             <div className="mt-2 text-[10px]">
               <p className="font-bold underline mb-1">Declaration</p>
               <p>We declare that this {type === 'QUOTATION' ? 'quotation' : 'invoice'} shows the actual price of the goods described and that all particulars are true and correct.</p>
             </div>
          </div>
        </div>
        <div className="w-1/2 p-2">
          <p className="font-bold mb-1 underline">Company's Bank Details</p>
          <p>Bank Name <span className="float-right">: HDFC Bank 759</span></p>
          <p>A/c No. <span className="float-right">: </span></p>
          <p>Branch & IFS Code <span className="float-right">: </span></p>
        </div>
      </div>

      <div className="border border-t-0 border-black flex min-h-[100px]">
         <div className="w-1/2 p-2 border-r border-black">
           <p className="mb-4">Customer's Seal and Signature</p>
         </div>
         <div className="w-1/2 p-2 relative">
           <p className="font-bold text-right">for ANSHIKA ENTERPRISES</p>
           <p className="absolute bottom-2 right-2">Authorised Signatory</p>
         </div>
      </div>
      
      <p className="text-center mt-2 text-[10px]">This is a Computer Generated {type === 'QUOTATION' ? 'Quotation' : 'Invoice'}</p>
    </div>
  );
};

export default InvoicePrint;
