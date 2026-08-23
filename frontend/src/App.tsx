import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
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
import EditSale from './pages/EditSale';
import Quotations from './pages/Quotations';
import NewQuotation from './pages/NewQuotation';
import EditQuotation from './pages/EditQuotation';
import PrintInvoice from './pages/PrintInvoice';
import Parties from './pages/Parties';
import PartyLedger from './pages/PartyLedger';
import Purchases from './pages/Purchases';
import NewPurchase from './pages/NewPurchase';

import EditPurchase from './pages/EditPurchase';
import StaffManagement from './pages/StaffManagement';
import ProfileSettings from './pages/ProfileSettings';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import Warehouses from './pages/Warehouses';
import PurchaseOrders from './pages/PurchaseOrders';
import InventoryAudits from './pages/InventoryAudits';
import SaleReturns from './pages/SaleReturns';
import Subscriptions from './pages/Subscriptions';

import TitleUpdater from './components/TitleUpdater';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-center" toastOptions={{ duration: 3000, style: { borderRadius: '8px', background: '#333', color: '#fff' } }} />
      <Router>
        <TitleUpdater />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/sales/:id/print" element={<PrintInvoice />} />
          <Route path="/quotations/:id/print" element={<PrintInvoice />} />
          
          <Route path="/" element={<Layout />}>
            <Route index element={<ProtectedRoute permission="dashboard:view"><Dashboard /></ProtectedRoute>} />
            <Route path="products" element={<ProtectedRoute permission="products:view"><Products /></ProtectedRoute>} />
            <Route path="categories" element={<ProtectedRoute permission="categories:view"><Categories /></ProtectedRoute>} />
            <Route path="inventory" element={<ProtectedRoute permission="inventory:view"><Inventory /></ProtectedRoute>} />
            <Route path="customers" element={<ProtectedRoute permission="parties:view"><Customers /></ProtectedRoute>} />
            <Route path="parties" element={<ProtectedRoute permission="parties:view"><Parties /></ProtectedRoute>} />
            <Route path="parties/:type/:id/ledger" element={<ProtectedRoute permission="parties:view"><PartyLedger /></ProtectedRoute>} />
            <Route path="sales" element={<ProtectedRoute permission="sales:view"><Sales /></ProtectedRoute>} />
            <Route path="sales/new" element={<ProtectedRoute permission="sales:create"><NewSale /></ProtectedRoute>} />
            <Route path="sales/:id/edit" element={<ProtectedRoute permission="sales:edit"><EditSale /></ProtectedRoute>} />
            <Route path="purchases" element={<ProtectedRoute permission="purchases:view"><Purchases /></ProtectedRoute>} />
            <Route path="purchases/new" element={<ProtectedRoute permission="purchases:create"><NewPurchase /></ProtectedRoute>} />
            <Route path="purchases/:id/edit" element={<ProtectedRoute permission="purchases:edit"><EditPurchase /></ProtectedRoute>} />
            <Route path="/quotations" element={<ProtectedRoute permission="quotations:view"><Quotations /></ProtectedRoute>} />
            <Route path="/quotations/new" element={<ProtectedRoute permission="quotations:create"><NewQuotation /></ProtectedRoute>} />
            <Route path="/quotations/:id" element={<ProtectedRoute permission="quotations:view"><EditQuotation /></ProtectedRoute>} />
            <Route path="staff" element={<ProtectedRoute permission="staff:view" adminOnly><StaffManagement /></ProtectedRoute>} />
            <Route path="profile" element={<ProfileSettings />} />
            <Route path="expenses" element={<ProtectedRoute permission="expenses:view"><Expenses /></ProtectedRoute>} />
            <Route path="reports" element={<ProtectedRoute permission="reports:view"><Reports /></ProtectedRoute>} />
            <Route path="warehouses" element={<ProtectedRoute permission="inventory:view"><Warehouses /></ProtectedRoute>} />
            <Route path="purchase-orders" element={<ProtectedRoute permission="purchases:view"><PurchaseOrders /></ProtectedRoute>} />
            <Route path="inventory-audits" element={<ProtectedRoute permission="inventory:view"><InventoryAudits /></ProtectedRoute>} />
            <Route path="returns" element={<ProtectedRoute permission="sales:view"><SaleReturns /></ProtectedRoute>} />
            <Route path="subscriptions" element={<ProtectedRoute permission="sales:view"><Subscriptions /></ProtectedRoute>} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
