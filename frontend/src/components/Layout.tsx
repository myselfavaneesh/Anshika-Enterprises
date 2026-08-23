import { useState } from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { InstallAppModal } from './InstallAppModal';
import { InstallAppBanner } from './InstallAppBanner';
import AnshikaLogo from '../../assets/icon.svg';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  ShoppingCart, 
  ShoppingBag,
  LogOut,
  FileText,
  Menu,
  X,
  ListTree,
  Warehouse,
  Plus,
  Smartphone,
  Download,
  Shield,
  Receipt,
} from 'lucide-react';

const Layout = () => {
  const { user, logout, loading, hasPermission, isAdmin } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const {
    isInstalled,
    isIOS,
    deferredPrompt,
    showInstructionsModal,
    setShowInstructionsModal,
    triggerInstall,
  } = usePWAInstall();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Build navigation based on permissions
  const allNavigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, permission: 'dashboard:view' },
    { name: 'Products', href: '/products', icon: Package, permission: 'products:view' },
    { name: 'Categories', href: '/categories', icon: ListTree, permission: 'categories:view' },
    { name: 'Inventory', href: '/inventory', icon: Warehouse, permission: 'inventory:view' },
    { name: 'Khata Book', href: '/parties', icon: Users, permission: 'parties:view' },
    { name: 'Purchases', href: '/purchases', icon: ShoppingBag, permission: 'purchases:view' },
    { name: 'Sales', href: '/sales', icon: ShoppingCart, permission: 'sales:view' },
    { name: 'Quotations', href: '/quotations', icon: FileText, permission: 'quotations:view' },
    { name: 'Expenses', href: '/expenses', icon: Receipt, permission: 'expenses:view' },
    // Staff Management — admin only
    ...(isAdmin ? [{ name: 'Staff', href: '/staff', icon: Shield, permission: 'staff:view' }] : []),
  ];

  // Filter navigation to only show items user has permission for
  const navigation = allNavigation.filter((item) => hasPermission(item.permission));

  // Get user initials for avatar
  const initials = user.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-950 overflow-hidden">
      
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm md:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:inset-0 shadow-2xl md:shadow-none
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-indigo-600 to-violet-600 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center p-0.5 shadow-sm flex-shrink-0">
              <img src={AnshikaLogo} alt="Anshika Enterprises" className="w-full h-full object-contain" />
            </div>
            <div className="leading-tight">
              <h1 className="text-sm font-bold text-white tracking-tight">Anshika Enterprises</h1>
              <p className="text-[10px] text-indigo-200">Power • Solar • Appliances</p>
            </div>
          </div>
          <button 
            className="md:hidden text-white/80 hover:text-white hover:bg-white/15 p-1 rounded-lg transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3">
          <p className="px-4 mb-1 text-[10px] font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-widest">Menu</p>
          <ul className="space-y-0.5 px-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href || 
                              (item.href !== '/' && location.pathname.startsWith(item.href));
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative ${
                      isActive 
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 shadow-sm' 
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    {/* Active left indicator */}
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-indigo-600 rounded-r-full" />
                    )}
                    <item.icon className={`mr-3 h-4 w-4 flex-shrink-0 transition-colors ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        
        {/* Bottom Section */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2 flex-shrink-0">
          {!isInstalled && (
            <button
              onClick={() => {
                setSidebarOpen(false);
                triggerInstall();
              }}
              className="flex w-full items-center px-3 py-2.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 transition-colors"
            >
              <Smartphone className="mr-2.5 h-4 w-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>Install App</span>
            </button>
          )}

          {/* User card */}
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{user.name}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 truncate capitalize">{user.role}</p>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden w-full min-w-0">
        {/* Mobile Header */}
        <div className="md:hidden h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center px-4 justify-between flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-slate-200 shadow-sm p-0.5">
              <img src={AnshikaLogo} alt="Anshika Enterprises" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-base font-bold text-slate-800 dark:text-white">Anshika Enterprises</h1>
          </div>
          <div className="flex items-center gap-2">
            {!isInstalled && (
              <button
                onClick={triggerInstall}
                className="flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Install</span>
              </button>
            )}
            <button 
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5 text-slate-600 dark:text-slate-300" />
            </button>
          </div>
        </div>

        <InstallAppBanner onInstall={triggerInstall} isInstalled={isInstalled} />

        <main className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-7 pb-20 md:pb-7">
          <div className="mx-auto max-w-6xl animate-fade-in-up">
            <Outlet />
          </div>
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-around z-40 px-1 shadow-lg">
          {hasPermission('dashboard:view') && (
            <Link 
              to="/" 
              className={`flex flex-col items-center justify-center w-full h-full py-1 text-[10px] font-semibold transition-colors ${
                location.pathname === '/' 
                  ? 'text-indigo-600 dark:text-indigo-400' 
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              <LayoutDashboard className={`h-5 w-5 mb-0.5 transition-all ${location.pathname === '/' ? 'scale-110' : ''}`} />
              Home
            </Link>
          )}
          {hasPermission('sales:view') && (
            <Link 
              to="/sales" 
              className={`flex flex-col items-center justify-center w-full h-full py-1 text-[10px] font-semibold transition-colors ${
                location.pathname.startsWith('/sales') && location.pathname !== '/sales/new' 
                  ? 'text-indigo-600 dark:text-indigo-400' 
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              <ShoppingCart className={`h-5 w-5 mb-0.5 transition-all ${location.pathname.startsWith('/sales') && location.pathname !== '/sales/new' ? 'scale-110' : ''}`} />
              Sales
            </Link>
          )}
          {hasPermission('sales:create') && (
            <Link 
              to="/sales/new" 
              className="flex flex-col items-center justify-center w-full h-full py-1"
            >
              <div className={`bg-indigo-600 text-white p-2.5 rounded-full shadow-lg shadow-indigo-200 dark:shadow-indigo-900/50 -mt-5 border-2 border-white dark:border-slate-900 transition-all active:scale-95 ${location.pathname === '/sales/new' ? 'scale-110 bg-violet-600' : ''}`}>
                <Plus className="h-5 w-5" />
              </div>
              <span className={`text-[10px] font-bold mt-0.5 ${location.pathname === '/sales/new' ? 'text-violet-600' : 'text-indigo-600 dark:text-indigo-400'}`}>New Sale</span>
            </Link>
          )}
          {hasPermission('parties:view') && (
            <Link 
              to="/parties" 
              className={`flex flex-col items-center justify-center w-full h-full py-1 text-[10px] font-semibold transition-colors ${
                location.pathname.startsWith('/parties') 
                  ? 'text-indigo-600 dark:text-indigo-400' 
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              <Users className={`h-5 w-5 mb-0.5 transition-all ${location.pathname.startsWith('/parties') ? 'scale-110' : ''}`} />
              Khata
            </Link>
          )}
          <button 
            onClick={() => setSidebarOpen(true)}
            className="flex flex-col items-center justify-center w-full h-full py-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 transition-colors hover:text-slate-600 dark:hover:text-slate-300"
          >
            <Menu className="h-5 w-5 mb-0.5" />
            More
          </button>
        </div>
      </div>

      <InstallAppModal
        isOpen={showInstructionsModal}
        onClose={() => setShowInstructionsModal(false)}
        onInstall={triggerInstall}
        isIOS={isIOS}
        hasDeferredPrompt={!!deferredPrompt}
      />
    </div>
  );
};

export default Layout;
