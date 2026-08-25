import { useState } from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
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
  Sun,
  Moon,
} from 'lucide-react';

const Layout = () => {
  const { user, logout, loading, hasPermission, isAdmin } = useAuth();
  const { isDark, toggleTheme } = useTheme();
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
    <div className="flex h-screen h-[100dvh] bg-slate-100/70 dark:bg-slate-950 overflow-hidden w-full">
      
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm md:hidden animate-fade-in" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 h-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-r border-slate-200/80 dark:border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:inset-auto shadow-2xl md:shadow-none flex-shrink-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center p-0.5 shadow-md flex-shrink-0">
              <img src={AnshikaLogo} alt="Anshika Enterprises" className="w-full h-full object-contain" />
            </div>
            <div className="leading-tight">
              <h1 className="text-sm font-bold text-white tracking-tight">Anshika Enterprises</h1>
              <p className="text-[10px] text-indigo-200/80 font-medium">Power • Solar • Appliances</p>
            </div>
          </div>
          <button 
            className="md:hidden text-white/70 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-all active:scale-95"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          <p className="px-3 mb-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Navigation</p>
          <ul className="space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href || 
                              (item.href !== '/' && location.pathname.startsWith(item.href));
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 group relative active:scale-[0.98] ${
                      isActive 
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200 dark:shadow-indigo-950' 
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    <item.icon className={`mr-2.5 h-4 w-4 flex-shrink-0 transition-colors ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'}`} />
                    <span className="truncate">{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        
        {/* Bottom Section */}
        <div className="p-3 border-t border-slate-200/80 dark:border-slate-800/80 space-y-2 flex-shrink-0 bg-slate-50/50 dark:bg-slate-950/30">
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all border border-slate-200/60 dark:border-slate-800/60 active:scale-[0.98]"
          >
            <div className="flex items-center">
              {isDark ? (
                <Sun className="mr-2 h-4 w-4 flex-shrink-0 text-amber-400" />
              ) : (
                <Moon className="mr-2 h-4 w-4 flex-shrink-0 text-slate-500" />
              )}
              <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
            </div>
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">{isDark ? 'ON' : 'OFF'}</span>
          </button>

          {!isInstalled && (
            <button
              onClick={() => {
                setSidebarOpen(false);
                triggerInstall();
              }}
              className="flex w-full items-center px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200/80 dark:border-emerald-800/60 transition-all active:scale-[0.98]"
            >
              <Smartphone className="mr-2 h-4 w-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>Install Mobile App</span>
            </button>
          )}

          {/* User card */}
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-sm">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{user.name}</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate capitalize">{user.role}</p>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors flex-shrink-0 active:scale-95"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden w-full min-w-0">
        {/* Mobile Header */}
        <div className="md:hidden h-14 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 flex items-center px-4 justify-between flex-shrink-0 shadow-sm z-30 sticky top-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center border border-slate-200 shadow-sm p-0.5">
              <img src={AnshikaLogo} alt="Anshika Enterprises" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">Anshika Enterprises</h1>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95"
              title={isDark ? 'Light Mode' : 'Dark Mode'}
            >
              {isDark ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-slate-500" />
              )}
            </button>
            {!isInstalled && (
              <button
                onClick={triggerInstall}
                className="flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 rounded-lg hover:bg-emerald-100 transition-all active:scale-95"
              >
                <Download className="h-3 w-3" />
                <span>App</span>
              </button>
            )}
            <button 
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>

        <InstallAppBanner onInstall={triggerInstall} isInstalled={isInstalled} />

        <main className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 pb-24 md:pb-6">
          <div className="mx-auto max-w-7xl animate-fade-in-up">
            <Outlet />
          </div>
        </main>

        {/* Mobile Floating Bottom Navigation Bar */}
        <div className="md:hidden fixed bottom-3 left-3 right-3 h-15 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-2xl flex items-center justify-around z-40 px-2 shadow-diffusion">
          {hasPermission('dashboard:view') && (
            <Link 
              to="/" 
              className={`flex flex-col items-center justify-center py-1 text-[10px] font-semibold transition-all active:scale-95 ${
                location.pathname === '/' 
                  ? 'text-indigo-600 dark:text-indigo-400' 
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              <LayoutDashboard className={`h-4.5 w-4.5 mb-0.5 transition-transform ${location.pathname === '/' ? 'scale-110' : ''}`} />
              <span>Home</span>
            </Link>
          )}
          {hasPermission('sales:view') && (
            <Link 
              to="/sales" 
              className={`flex flex-col items-center justify-center py-1 text-[10px] font-semibold transition-all active:scale-95 ${
                location.pathname.startsWith('/sales') && location.pathname !== '/sales/new' 
                  ? 'text-indigo-600 dark:text-indigo-400' 
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              <ShoppingCart className={`h-4.5 w-4.5 mb-0.5 transition-transform ${location.pathname.startsWith('/sales') && location.pathname !== '/sales/new' ? 'scale-110' : ''}`} />
              <span>Sales</span>
            </Link>
          )}
          {hasPermission('sales:create') && (
            <Link 
              to="/sales/new" 
              className="flex flex-col items-center justify-center -mt-6 active:scale-95 transition-transform"
            >
              <div className="bg-indigo-600 text-white p-3 rounded-full shadow-lg shadow-indigo-500/30 border-2 border-white dark:border-slate-900 transition-all">
                <Plus className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-bold mt-0.5 text-indigo-600 dark:text-indigo-400">Add Sale</span>
            </Link>
          )}
          {hasPermission('parties:view') && (
            <Link 
              to="/parties" 
              className={`flex flex-col items-center justify-center py-1 text-[10px] font-semibold transition-all active:scale-95 ${
                location.pathname.startsWith('/parties') 
                  ? 'text-indigo-600 dark:text-indigo-400' 
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              <Users className={`h-4.5 w-4.5 mb-0.5 transition-transform ${location.pathname.startsWith('/parties') ? 'scale-110' : ''}`} />
              <span>Khata</span>
            </Link>
          )}
          <button 
            onClick={() => setSidebarOpen(true)}
            className="flex flex-col items-center justify-center py-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 transition-all hover:text-slate-600 dark:hover:text-slate-300 active:scale-95"
          >
            <Menu className="h-4.5 w-4.5 mb-0.5" />
            <span>More</span>
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
