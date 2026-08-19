import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldX } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  permission: string;
  adminOnly?: boolean;
}

/**
 * ProtectedRoute — Frontend route guard based on permissions.
 * This is a UI-only guard for better UX (shows access denied instead of blank page).
 * The actual security enforcement happens on the backend via requirePermission middleware.
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, permission, adminOnly = false }) => {
  const { user, hasPermission, isAdmin } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Admin-only route check
  if (adminOnly && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
          <ShieldX className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
          This section is only accessible to administrators. Contact your admin if you need access.
        </p>
      </div>
    );
  }

  // Permission check (admin always passes)
  if (!hasPermission(permission)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-4">
          <ShieldX className="h-8 w-8 text-amber-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Permission Required</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
          You don't have permission to access this page. Contact your admin to update your access.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
