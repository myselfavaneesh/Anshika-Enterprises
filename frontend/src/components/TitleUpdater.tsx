import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const routeTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/products': 'Products',
  '/categories': 'Categories',
  '/inventory': 'Inventory',
  '/customers': 'Customers',
  '/parties': 'Parties',
  '/sales': 'Sales',
  '/sales/new': 'New Sale',
  '/quotations': 'Quotations',
  '/quotations/new': 'New Quotation',
};

export default function TitleUpdater() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    let title = 'Anshika Enterprises';
    
    if (routeTitles[path]) {
      title = `${routeTitles[path]} | Anshika Enterprises`;
    } else if (path.startsWith('/parties/') && path.endsWith('/ledger')) {
      title = `Party Ledger | Anshika Enterprises`;
    } else if (path.includes('/print')) {
      title = `Print Invoice | Anshika Enterprises`;
    }
    
    document.title = title;
  }, [location]);

  return null;
}
