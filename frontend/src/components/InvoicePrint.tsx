import React from 'react';

interface InvoicePrintProps {
  type: 'TAX INVOICE' | 'QUOTATION';
  data: any;
  companyInfo?: any;
}

const SHOP_STATE_CODE = '09';

const InvoicePrint: React.FC<InvoicePrintProps> = ({ type, data }) => {
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

  // Determine if this is inter-state based on customer state code vs shop state code
  const customerStateCode = data?.customerId?.stateCode || data?.placeOfSupplyCode || SHOP_STATE_CODE;
  const isInterState = customerStateCode !== SHOP_STATE_CODE;
  const isGST = data?.invoiceType !== 'NON_GST';

  // Determine document heading
  const getDocumentHeading = (): string => {
    if (type === 'QUOTATION') return 'QUOTATION';
    if (data?.invoiceType === 'NON_GST') return 'ESTIMATE';
    switch (data?.documentType) {
      case 'PROFORMA': return 'PROFORMA INVOICE';
      case 'CHALLAN': return 'DELIVERY CHALLAN';
      default: return 'TAX INVOICE';
    }
  };

  // Build HSN-wise summary
  const buildHsnSummary = () => {
    const hsnMap: Record<string, { hsnCode: string; taxableValue: number; gstRate: number; cgst: number; sgst: number; igst: number; totalTax: number }> = {};
    
    data?.items?.forEach((item: any) => {
      const hsn = item.hsnCode || item.productId?.hsnCode || '-';
      const rate = item.gstRate || 0;
      const key = `${hsn}_${rate}`;
      
      if (!hsnMap[key]) {
        hsnMap[key] = { hsnCode: hsn, taxableValue: 0, gstRate: rate, cgst: 0, sgst: 0, igst: 0, totalTax: 0 };
      }
      hsnMap[key].taxableValue += item.taxableTotalPrice || 0;
      if (isInterState) {
        hsnMap[key].igst += item.igstAmount || (item.cgstAmount || 0) + (item.sgstAmount || 0);
      } else {
        hsnMap[key].cgst += item.cgstAmount || 0;
        hsnMap[key].sgst += item.sgstAmount || 0;
      }
      hsnMap[key].totalTax = hsnMap[key].cgst + hsnMap[key].sgst + hsnMap[key].igst;
    });
    
    return Object.values(hsnMap);
  };

  const hsnSummary = isGST ? buildHsnSummary() : [];
  const totalColSpan = isGST ? (isInterState ? 9 : 11) : 7;

  React.useEffect(() => {
    const originalTitle = document.title;
    if (type === 'TAX INVOICE') {
      document.title = `Invoice_${data?.invoiceNumber || 'Draft'}`;
    } else {
      document.title = `Quotation_${data?.quotationNumber || 'Draft'}`;
    }
    return () => {
      document.title = originalTitle;
    };
  }, [type, data]);



  return (
    <div className="bg-white text-black p-4 md:p-8 w-[210mm] min-h-[297mm] mx-auto text-xs shadow-lg print:shadow-none print:p-[10mm]" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Print styles */}
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
          .no-print { display: none; }
        }
        table, th, td { border: 1px solid black; border-collapse: collapse; }
        th, td { padding: 4px 8px; }
      `}</style>

      {/* Header */}
      <h1 className="text-center font-bold text-xl uppercase mb-2">
        {getDocumentHeading()}
      </h1>

      {/* Two Column Layout for Header Details */}
      <div className="grid grid-cols-2 border border-black mb-0">
        {/* Left Column */}
        <div className="border-r border-black flex flex-col">
          <div className="p-2 border-b border-black flex-1">
            <h3 className="font-semibold mb-1 text-gray-600">Company</h3>
            <p className="font-bold text-sm">ANSHIKA ENTERPRISES</p>
            <p>Phoolpur, Azamgarh, Uttar Pradesh - 276304</p>
            <p>State Name: Uttar Pradesh, Code: 09</p>
            <p>Contact: 8840527476</p>
          </div>
          <div className="p-2 flex-1">
            <h3 className="font-semibold mb-1 text-gray-600">Buyer (Bill to)</h3>
            <p className="font-bold text-sm">{data?.customerId?.name || 'Customer Name'}</p>
            <p>{data?.customerId?.address || 'Address Line 1'}</p>
            <p>State Name: {data?.customerId?.state || 'Uttar Pradesh'}, Code: {data?.customerId?.stateCode || '09'}</p>
            <p>Contact: {data?.customerId?.phone || '-'}</p>
            {data?.customerId?.gstNumber && (
              <p>GSTIN/UIN: <span className="font-bold">{data?.customerId?.gstNumber}</span></p>
            )}
          </div>
        </div>

        {/* Right Column */}
        {type === 'TAX INVOICE' ? (
          <div className="grid grid-cols-2">
            <div className="p-2 border-r border-b border-black">
              <p className="font-semibold text-gray-600">Invoice No.</p>
              <p className="font-bold">{data?.invoiceNumber || '-'}</p>
            </div>
            <div className="p-2 border-b border-black">
              <p className="font-semibold text-gray-600">Dated</p>
              <p className="font-bold">{new Date(data?.createdAt || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}</p>
            </div>
            <div className="p-2 col-span-2 border-b border-black">
              <p className="font-semibold text-gray-600">Place of Supply</p>
              <p className="font-bold">{data?.placeOfSupply || data?.customerId?.state || 'Uttar Pradesh'} ({data?.placeOfSupplyCode || data?.customerId?.stateCode || '09'})</p>
            </div>
            {(data?.eInvoiceAckNo || data?.eWayBillNo) && (
              <>
                {data?.eInvoiceAckNo && (
                  <div className="p-2 border-r border-black">
                    <p className="font-semibold text-gray-600">E-Invoice Ack No.</p>
                    <p className="font-bold text-[10px]">{data.eInvoiceAckNo}</p>
                  </div>
                )}
                {data?.eWayBillNo && (
                  <div className={`p-2 ${!data?.eInvoiceAckNo ? 'col-span-2' : ''}`}>
                    <p className="font-semibold text-gray-600">E-Way Bill No.</p>
                    <p className="font-bold text-[10px]">{data.eWayBillNo}</p>
                  </div>
                )}
              </>
            )}
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
      <table className="w-full mb-0 border-b-0 border-t-0">
        <thead>
          <tr>
            <th className="w-8">SN</th>
            <th className="text-left">Description of Goods</th>
            <th>HSN/SAC</th>
            <th>Qty</th>
            <th>Unit</th>
            <th>{isGST ? 'Taxable Rate' : 'Rate'}</th>
            {isGST && (
              isInterState ? (
                <>
                  <th>IGST %</th>
                  <th className="text-right">IGST Amt</th>
                </>
              ) : (
                <>
                  <th>CGST %</th>
                  <th className="text-right">CGST Amt</th>
                  <th>SGST %</th>
                  <th className="text-right">SGST Amt</th>
                </>
              )
            )}
            <th className="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {data?.items?.map((item: any, index: number) => {
            const gstRate = item.gstRate || data?.taxRate || 0;
            const halfRate = gstRate / 2;
            return (
            <tr key={index}>
              <td className="text-center align-top border-b-0">{index + 1}</td>
              <td className="border-b-0">
                <p className="font-bold">{item.productId?.name}</p>
                {item.wattage > 0 && (
                  <p className="text-[10px] text-gray-500 mt-0.5">({item.quantity} units × {item.wattage}W = {item.quantity * item.wattage}W @ ₹{item.unitPrice || (item.taxableUnitPrice / (item.quantity * item.wattage)).toFixed(2)}/W)</p>
                )}
                {item.serialNumbers && item.serialNumbers.length > 0 && (
                  <p className="text-[10px] text-gray-500 mt-1">SN: {item.serialNumbers.join(', ')}</p>
                )}
              </td>
              <td className="text-center align-top border-b-0">{item.hsnCode || item.productId?.hsnCode || '-'}</td>
              <td className="text-center align-top border-b-0 font-bold">{item.quantity}</td>
              <td className="text-center align-top border-b-0">{item.unit || item.productId?.unit || 'PC'}</td>
              <td className="text-right align-top border-b-0">{item.taxableUnitPrice?.toFixed(2)}</td>
              {isGST && (
                isInterState ? (
                  <>
                    <td className="text-center align-top border-b-0">{gstRate}%</td>
                    <td className="text-right align-top border-b-0">{(item.igstAmount || ((item.cgstAmount || 0) + (item.sgstAmount || 0)))?.toFixed(2)}</td>
                  </>
                ) : (
                  <>
                    <td className="text-center align-top border-b-0">{halfRate}%</td>
                    <td className="text-right align-top border-b-0">{item.cgstAmount?.toFixed(2)}</td>
                    <td className="text-center align-top border-b-0">{halfRate}%</td>
                    <td className="text-right align-top border-b-0">{item.sgstAmount?.toFixed(2)}</td>
                  </>
                )
              )}
              <td className="text-right align-top border-b-0 font-bold">{item.taxableTotalPrice?.toFixed(2)}</td>
            </tr>
            );
          })}
          {/* Fill empty space if few items */}
          <tr className="h-24">
            <td className="border-y-0"></td><td className="border-y-0"></td><td className="border-y-0"></td><td className="border-y-0"></td><td className="border-y-0"></td><td className="border-y-0"></td>
            {isGST && (isInterState ? <><td className="border-y-0"></td><td className="border-y-0"></td></> : <><td className="border-y-0"></td><td className="border-y-0"></td><td className="border-y-0"></td><td className="border-y-0"></td></>)}
            <td className="border-y-0"></td>
          </tr>

          {/* Custom Extra Costs (Services) */}
          {data?.services?.map((service: any, index: number) => (
            <tr key={`service-${index}`}>
              <td colSpan={totalColSpan - 1} className="text-right italic border-y-0 font-semibold pt-2">
                {service.name} {isGST && service.gstRate ? `(${service.gstRate}%)` : ''}
              </td>
              <td className="text-right border-y-0 font-bold pt-2">
                {service.taxableAmount ? service.taxableAmount.toFixed(2) : service.amount?.toFixed(2)}
              </td>
            </tr>
          ))}

          {/* Discount */}
          {(data?.discount || 0) > 0 && (
            <tr>
              <td colSpan={totalColSpan - 1} className="text-right italic border-y-0 font-semibold pt-2">
                Discount
              </td>
              <td className="text-right border-y-0 font-bold pt-2 text-red-600">
                - {data.discount.toFixed(2)}
              </td>
            </tr>
          )}

          {/* Tax Totals */}
          {isGST && (
            <>
              <tr>
                <td colSpan={totalColSpan - 1} className="text-right italic border-y-0 font-semibold pt-4">
                  Taxable Value
                </td>
                <td className="text-right border-y-0 font-bold pt-4">{data?.taxableAmount?.toFixed(2) || '0.00'}</td>
              </tr>
              {isInterState ? (
                <tr>
                  <td colSpan={totalColSpan - 1} className="text-right italic border-y-0 font-semibold pt-1">
                    IGST
                  </td>
                  <td className="text-right border-y-0 font-bold pt-1">{(data?.igstAmount || data?.taxAmount || 0).toFixed(2)}</td>
                </tr>
              ) : (
                <>
                  <tr>
                    <td colSpan={totalColSpan - 1} className="text-right italic border-y-0 font-semibold pt-1">
                      CGST
                    </td>
                    <td className="text-right border-y-0 font-bold pt-1">{data?.cgstAmount?.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td colSpan={totalColSpan - 1} className="text-right italic border-y-0 font-semibold">
                      SGST
                    </td>
                    <td className="text-right border-y-0 font-bold">{data?.sgstAmount?.toFixed(2)}</td>
                  </tr>
                </>
              )}
              {/* Round Off */}
              {(data?.roundOff !== undefined && data?.roundOff !== 0) && (
                <tr>
                  <td colSpan={totalColSpan - 1} className="text-right italic border-y-0 font-semibold pb-2">
                    Round Off
                  </td>
                  <td className="text-right border-y-0 font-bold pb-2">{data.roundOff > 0 ? '+' : ''}{data.roundOff.toFixed(2)}</td>
                </tr>
              )}
            </>
          )}
          <tr className="bg-slate-100/50">
            <td colSpan={totalColSpan - 1} className="text-right font-bold py-2">Grand Total</td>
            <td className="text-right font-bold text-base py-2">₹ {data?.grandTotal?.toFixed(2) || '0.00'}</td>
          </tr>
        </tbody>
      </table>

      {/* HSN-wise Tax Summary Table (GST Compliance) */}
      {isGST && hsnSummary.length > 0 && (
        <table className="w-full border-t-0">
          <thead>
            <tr>
              <th colSpan={isInterState ? 5 : 7} className="text-center text-[10px] py-1 bg-slate-50/50">HSN/SAC Wise Tax Summary</th>
            </tr>
            <tr className="text-[10px]">
              <th>HSN/SAC</th>
              <th className="text-right">Taxable Value</th>
              {isInterState ? (
                <>
                  <th className="text-center">IGST Rate</th>
                  <th className="text-right">IGST Amt</th>
                </>
              ) : (
                <>
                  <th className="text-center">CGST Rate</th>
                  <th className="text-right">CGST Amt</th>
                  <th className="text-center">SGST Rate</th>
                  <th className="text-right">SGST Amt</th>
                </>
              )}
              <th className="text-right">Total Tax</th>
            </tr>
          </thead>
          <tbody>
            {hsnSummary.map((row, idx) => (
              <tr key={idx} className="text-[10px]">
                <td className="text-center">{row.hsnCode}</td>
                <td className="text-right">{row.taxableValue.toFixed(2)}</td>
                {isInterState ? (
                  <>
                    <td className="text-center">{row.gstRate}%</td>
                    <td className="text-right">{row.igst.toFixed(2)}</td>
                  </>
                ) : (
                  <>
                    <td className="text-center">{(row.gstRate / 2)}%</td>
                    <td className="text-right">{row.cgst.toFixed(2)}</td>
                    <td className="text-center">{(row.gstRate / 2)}%</td>
                    <td className="text-right">{row.sgst.toFixed(2)}</td>
                  </>
                )}
                <td className="text-right font-semibold">{row.totalTax.toFixed(2)}</td>
              </tr>
            ))}
            <tr className="text-[10px] font-bold">
              <td className="text-center">Total</td>
              <td className="text-right">{hsnSummary.reduce((s, r) => s + r.taxableValue, 0).toFixed(2)}</td>
              {isInterState ? (
                <>
                  <td></td>
                  <td className="text-right">{hsnSummary.reduce((s, r) => s + r.igst, 0).toFixed(2)}</td>
                </>
              ) : (
                <>
                  <td></td>
                  <td className="text-right">{hsnSummary.reduce((s, r) => s + r.cgst, 0).toFixed(2)}</td>
                  <td></td>
                  <td className="text-right">{hsnSummary.reduce((s, r) => s + r.sgst, 0).toFixed(2)}</td>
                </>
              )}
              <td className="text-right">{hsnSummary.reduce((s, r) => s + r.totalTax, 0).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      )}

      {/* Summary Box */}
      <div className="border border-t-0 border-black p-4 flex justify-between bg-slate-50/50">
        <div className="space-y-1 text-[11px]">
          <p><span className="font-semibold inline-block w-24">Total Items:</span> {data?.items?.length || 0}</p>
          <p><span className="font-semibold inline-block w-24">Total Qty:</span> {data?.items?.reduce((sum: number, i: any) => sum + i.quantity, 0) || 0}</p>
        </div>
        <div className="space-y-1 text-[11px] text-right">
          {isGST && (
            <>
              <p><span className="font-semibold inline-block w-32">Taxable Amount:</span> ₹ {data?.taxableAmount?.toFixed(2) || '0.00'}</p>
              {isInterState ? (
                <p><span className="font-semibold inline-block w-32">IGST:</span> ₹ {(data?.igstAmount || data?.taxAmount || 0).toFixed(2)}</p>
              ) : (
                <>
                  <p><span className="font-semibold inline-block w-32">CGST:</span> ₹ {data?.cgstAmount?.toFixed(2) || '0.00'}</p>
                  <p><span className="font-semibold inline-block w-32">SGST:</span> ₹ {data?.sgstAmount?.toFixed(2) || '0.00'}</p>
                </>
              )}
            </>
          )}
          <p className="text-sm mt-1"><span className="font-bold inline-block w-32">Grand Total:</span> <span className="font-bold">₹ {data?.grandTotal?.toFixed(2) || '0.00'}</span></p>
        </div>
      </div>

      <div className="border border-t-0 border-black p-2 flex justify-between">
        <div>
          <span className="italic">Amount Chargeable (in words)</span><br />
          <span className="font-bold">{numberToWords(data?.grandTotal || 0)}</span>
        </div>
        <div className="italic font-bold">E. & O.E</div>
      </div>

      {/* Footer Section */}
      <div className="border border-t-0 border-black flex">
        <div className="w-1/2 p-2 border-r border-black flex flex-col justify-between">
          <div>
            <p>Company's GSTIN/UIN : <span className="font-bold">09BZOPK7723E1Z1</span></p>
            <div className="mt-2 text-[10px]">
              <p className="font-bold underline mb-1">Declaration</p>
              <p>We declare that this {type === 'QUOTATION' ? 'quotation' : 'invoice'} shows the actual price of the goods described and that all particulars are true and correct.</p>
            </div>
          </div>
        </div>
        <div className="w-1/2 p-2">
          <p className="font-bold mb-2 underline">Company's Bank Details</p>
          <table className="w-full border-none">
            <tbody>
              <tr><td className="border-none py-0.5 px-0 w-24">Bank Name</td><td className="border-none py-0.5 px-0 font-semibold">: Union Bank of India</td></tr>
              <tr><td className="border-none py-0.5 px-0 w-24">A/c No.</td><td className="border-none py-0.5 px-0 font-semibold">: 359701010036291</td></tr>
              <tr><td className="border-none py-0.5 px-0 w-24">IFSC Code</td><td className="border-none py-0.5 px-0 font-semibold">: UBIN0535974</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="border border-t-0 border-black flex min-h-[100px]">
        <div className="w-1/2 p-2 border-r border-black">
          <p className="mb-4">Customer's Signature</p>
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
