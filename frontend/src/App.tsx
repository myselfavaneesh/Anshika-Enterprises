import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Categories from './pages/Categories';
import Inventory from './pages/Inventory';
import Customers from './pages/Customers';
import Sales from './pages/Sales';
import NewSale from './pages/NewSale';
import Quotations from './pages/Quotations';
import NewQuotation from './pages/NewQuotation';
import PrintInvoice from './pages/PrintInvoice';
import Parties from './pages/Parties';
import PartyLedger from './pages/PartyLedger';

import TitleUpdater from './components/TitleUpdater';

function App() {
  return (
    <AuthProvider>
      <Router>
        <TitleUpdater />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/sales/:id/print" element={<PrintInvoice />} />
          <Route path="/quotations/:id/print" element={<PrintInvoice />} />
          
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="products" element={<Products />} />
            <Route path="categories" element={<Categories />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="customers" element={<Customers />} />
            <Route path="parties" element={<Parties />} />
            <Route path="parties/:type/:id/ledger" element={<PartyLedger />} />
            <Route path="sales" element={<Sales />} />
            <Route path="sales/new" element={<NewSale />} />
            <Route path="quotations" element={<Quotations />} />
            <Route path="quotations/new" element={<NewQuotation />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
