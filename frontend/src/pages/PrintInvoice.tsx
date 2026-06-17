import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import api from '../services/api';
import InvoicePrint from '../components/InvoicePrint';

const PrintInvoice = () => {
  const { id } = useParams();
  const location = useLocation();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const isQuotation = location.pathname.includes('quotations');
  const type = isQuotation ? 'QUOTATION' : 'TAX INVOICE';
  const endpoint = isQuotation ? `/quotations/${id}` : `/sales/${id}`;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get(endpoint);
        setData(response.data);
      } catch (error) {
        console.error('Error fetching data for print', error);
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      fetchData();
    }
  }, [id, endpoint]);

  useEffect(() => {
    if (!loading && data) {
      // Small delay to allow images/styles to load
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [loading, data]);

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!data) return <div className="p-8 text-center text-red-500">Error loading document.</div>;

  return (
    <div className="bg-slate-100 min-h-screen py-8 print:py-0 print:bg-white">
      <InvoicePrint type={type} data={data} />
    </div>
  );
};

export default PrintInvoice;
