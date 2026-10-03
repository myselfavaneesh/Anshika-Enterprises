import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import TitleUpdater from './components/TitleUpdater';
import ProtectedRoute from './components/ProtectedRoute';

// Lazy load route pages for code splitting & minimal initial bundle
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Products = lazy(() => import('./pages/Products'));
const Categories = lazy(() => import('./pages/Categories'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Customers = lazy(() => import('./pages/Customers'));
const Sales = lazy(() => import('./pages/Sales'));
const NewSale = lazy(() => import('./pages/NewSale'));
const EditSale = lazy(() => import('./pages/EditSale'));
const Quotations = lazy(() => import('./pages/Quotations'));
const NewQuotation = lazy(() => import('./pages/NewQuotation'));
const EditQuotation = lazy(() => import('./pages/EditQuotation'));
const PrintInvoice = lazy(() => import('./pages/PrintInvoice'));
const Parties = lazy(() => import('./pages/Parties'));
const PartyLedger = lazy(() => import('./pages/PartyLedger'));
const Purchases = lazy(() => import('./pages/Purchases'));
const NewPurchase = lazy(() => import('./pages/NewPurchase'));
const EditPurchase = lazy(() => import('./pages/EditPurchase'));
const StaffManagement = lazy(() => import('./pages/StaffManagement'));
const ProfileSettings = lazy(() => import('./pages/ProfileSettings'));
const BusinessProfileSettings = lazy(() => import('./pages/BusinessProfileSettings'));
const Expenses = lazy(() => import('./pages/Expenses'));
const Reports = lazy(() => import('./pages/Reports'));
const Warehouses = lazy(() => import('./pages/Warehouses'));
const PurchaseOrders = lazy(() => import('./pages/PurchaseOrders'));
const InventoryAudits = lazy(() => import('./pages/InventoryAudits'));
const SaleReturns = lazy(() => import('./pages/SaleReturns'));
const Subscriptions = lazy(() => import('./pages/Subscriptions'));
const SerialLookup = lazy(() => import('./pages/SerialLookup'));

function PageLoader() {
  return (
    <div className="flex min-h-[50vh] w-full items-center justify-center p-8">
      <div className="flex flex-col items-center gap-3">
        <div className="w-9 h-9 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin dark:border-indigo-900 dark:border-t-indigo-400" />
        <p className="text-xs text-slate-400 font-medium tracking-wide">Loading page...</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <Toaster position="top-center" toastOptions={{ duration: 3000, style: { borderRadius: '8px', background: '#333', color: '#fff' } }} />
      <Router>
        <TitleUpdater />
        <Suspense fallback={<PageLoader />}>
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
              <Route path="/quotations/:id/edit" element={<ProtectedRoute permission="quotations:view"><EditQuotation /></ProtectedRoute>} />
              <Route path="staff" element={<ProtectedRoute permission="staff:view" adminOnly><StaffManagement /></ProtectedRoute>} />
              <Route path="profile" element={<ProfileSettings />} />
              <Route path="settings" element={<BusinessProfileSettings />} />
              <Route path="settings/business-profile" element={<BusinessProfileSettings />} />
              <Route path="expenses" element={<ProtectedRoute permission="expenses:view"><Expenses /></ProtectedRoute>} />
              <Route path="reports" element={<ProtectedRoute permission="reports:view"><Reports /></ProtectedRoute>} />
              <Route path="warehouses" element={<ProtectedRoute permission="inventory:view"><Warehouses /></ProtectedRoute>} />
              <Route path="purchase-orders" element={<ProtectedRoute permission="purchases:view"><PurchaseOrders /></ProtectedRoute>} />
              <Route path="inventory-audits" element={<ProtectedRoute permission="inventory:view"><InventoryAudits /></ProtectedRoute>} />
              <Route path="returns" element={<ProtectedRoute permission="sales:view"><SaleReturns /></ProtectedRoute>} />
              <Route path="subscriptions" element={<ProtectedRoute permission="sales:view"><Subscriptions /></ProtectedRoute>} />
              <Route path="serial-lookup" element={<ProtectedRoute permission="inventory:view"><SerialLookup /></ProtectedRoute>} />
            </Route>
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
