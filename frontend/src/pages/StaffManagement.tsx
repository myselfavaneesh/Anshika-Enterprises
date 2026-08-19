import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';
import api from '../services/api';
import { Button } from '../components/ui/button';
import toast from 'react-hot-toast';
import {
  UserPlus,
  Shield,
  Search,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  X,
  Pencil,
  Ban,
  ChevronDown,
  ChevronUp,
  Check,
  Users,
  Loader2,
  Phone,
  Mail,
  Crown,
  ShieldCheck,
  User,
} from 'lucide-react';

// ---- Types ----

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  phone: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PermissionMeta {
  allPermissions: string[];
  rolePresets: Record<string, string[]>;
}

// ---- Permission Module Grouping ----

const PERMISSION_MODULES = [
  {
    module: 'Dashboard',
    permissions: [
      { key: 'dashboard:view', label: 'View Dashboard', icon: '📊' },
    ],
  },
  {
    module: 'Products',
    permissions: [
      { key: 'products:view', label: 'View', icon: '👁️' },
      { key: 'products:create', label: 'Create', icon: '➕' },
      { key: 'products:edit', label: 'Edit', icon: '✏️' },
      { key: 'products:delete', label: 'Delete', icon: '🗑️' },
    ],
  },
  {
    module: 'Categories',
    permissions: [
      { key: 'categories:view', label: 'View', icon: '👁️' },
      { key: 'categories:create', label: 'Create', icon: '➕' },
      { key: 'categories:edit', label: 'Edit', icon: '✏️' },
      { key: 'categories:delete', label: 'Delete', icon: '🗑️' },
    ],
  },
  {
    module: 'Inventory',
    permissions: [
      { key: 'inventory:view', label: 'View', icon: '👁️' },
      { key: 'inventory:edit', label: 'Manage', icon: '✏️' },
    ],
  },
  {
    module: 'Sales',
    permissions: [
      { key: 'sales:view', label: 'View', icon: '👁️' },
      { key: 'sales:create', label: 'Create', icon: '➕' },
      { key: 'sales:edit', label: 'Edit', icon: '✏️' },
      { key: 'sales:delete', label: 'Delete', icon: '🗑️' },
    ],
  },
  {
    module: 'Purchases',
    permissions: [
      { key: 'purchases:view', label: 'View', icon: '👁️' },
      { key: 'purchases:create', label: 'Create', icon: '➕' },
      { key: 'purchases:edit', label: 'Edit', icon: '✏️' },
      { key: 'purchases:delete', label: 'Delete', icon: '🗑️' },
    ],
  },
  {
    module: 'Quotations',
    permissions: [
      { key: 'quotations:view', label: 'View', icon: '👁️' },
      { key: 'quotations:create', label: 'Create', icon: '➕' },
      { key: 'quotations:edit', label: 'Edit', icon: '✏️' },
      { key: 'quotations:delete', label: 'Delete', icon: '🗑️' },
    ],
  },
  {
    module: 'Khata Book (Parties)',
    permissions: [
      { key: 'parties:view', label: 'View', icon: '👁️' },
      { key: 'parties:create', label: 'Create', icon: '➕' },
      { key: 'parties:edit', label: 'Edit', icon: '✏️' },
      { key: 'parties:delete', label: 'Delete', icon: '🗑️' },
    ],
  },
  {
    module: 'Payments',
    permissions: [
      { key: 'payments:view', label: 'View', icon: '👁️' },
      { key: 'payments:create', label: 'Create/Edit', icon: '➕' },
    ],
  },
  {
    module: 'Staff Management',
    permissions: [
      { key: 'staff:view', label: 'View', icon: '👁️' },
      { key: 'staff:create', label: 'Create', icon: '➕' },
      { key: 'staff:edit', label: 'Edit', icon: '✏️' },
      { key: 'staff:delete', label: 'Delete', icon: '🗑️' },
    ],
  },
];

// ---- Role badge colors ----

const roleBadge = (role: string) => {
  switch (role) {
    case 'admin':
      return {
        bg: 'bg-amber-100 dark:bg-amber-900/40',
        text: 'text-amber-800 dark:text-amber-300',
        border: 'border-amber-300 dark:border-amber-700',
        icon: Crown,
      };
    case 'manager':
      return {
        bg: 'bg-blue-100 dark:bg-blue-900/40',
        text: 'text-blue-800 dark:text-blue-300',
        border: 'border-blue-300 dark:border-blue-700',
        icon: ShieldCheck,
      };
    default:
      return {
        bg: 'bg-slate-100 dark:bg-slate-800',
        text: 'text-slate-700 dark:text-slate-300',
        border: 'border-slate-300 dark:border-slate-700',
        icon: User,
      };
  }
};

// ---- Main Component ----

const StaffManagement = () => {
  usePageTitle('Staff Management');
  const { user: currentUser } = useAuth();

  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [permMeta, setPermMeta] = useState<PermissionMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRole, setFormRole] = useState<string>('staff');
  const [formPermissions, setFormPermissions] = useState<string[]>([]);
  const [formSaving, setFormSaving] = useState(false);
  const [expandedModules, setExpandedModules] = useState<string[]>([]);

  // Load data
  useEffect(() => {
    fetchStaff();
    fetchPermissions();
  }, []);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const res = await api.get('/staff');
      setStaffList(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load staff');
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const res = await api.get('/staff/permissions');
      setPermMeta(res.data);
    } catch {
      // Permissions metadata is non-critical
    }
  };

  // ---- Handlers ----

  const openAddModal = () => {
    setEditingStaff(null);
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormPhone('');
    setFormRole('staff');
    setFormPermissions(permMeta?.rolePresets?.staff || []);
    setExpandedModules([]);
    setShowModal(true);
  };

  const openEditModal = (staff: StaffMember) => {
    setEditingStaff(staff);
    setFormName(staff.name);
    setFormEmail(staff.email);
    setFormPassword('');
    setFormPhone(staff.phone || '');
    setFormRole(staff.role);
    setFormPermissions(Array.isArray(staff.permissions) ? [...staff.permissions] : []);
    setExpandedModules([]);
    setShowModal(true);
  };

  const handleRoleChange = (role: string) => {
    setFormRole(role);
    // Auto-fill permissions from preset
    if (permMeta?.rolePresets?.[role]) {
      setFormPermissions([...permMeta.rolePresets[role]]);
    }
  };

  const togglePermission = (key: string) => {
    setFormPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const toggleModuleAll = (modulePerms: { key: string }[]) => {
    const keys = modulePerms.map((p) => p.key);
    const allSelected = keys.every((k) => formPermissions.includes(k));
    if (allSelected) {
      setFormPermissions((prev) => prev.filter((p) => !keys.includes(p)));
    } else {
      setFormPermissions((prev) => [...new Set([...prev, ...keys])]);
    }
  };

  const toggleExpandModule = (moduleName: string) => {
    setExpandedModules((prev) =>
      prev.includes(moduleName) ? prev.filter((m) => m !== moduleName) : [...prev, moduleName]
    );
  };

  const handleSave = async () => {
    if (!formName.trim() || !formEmail.trim()) {
      toast.error('Name and email are required');
      return;
    }
    if (!editingStaff && !formPassword.trim()) {
      toast.error('Password is required for new staff');
      return;
    }
    if (formPassword && formPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setFormSaving(true);
    try {
      const payload: any = {
        name: formName.trim(),
        email: formEmail.trim().toLowerCase(),
        role: formRole,
        permissions: formPermissions,
        phone: formPhone.trim() || null,
      };

      if (formPassword) {
        payload.password = formPassword;
      }

      if (editingStaff) {
        await api.put(`/staff/${editingStaff.id}`, payload);
        toast.success('Staff updated successfully');
      } else {
        payload.password = formPassword;
        await api.post('/staff', payload);
        toast.success('Staff added successfully');
      }

      setShowModal(false);
      fetchStaff();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save staff');
    } finally {
      setFormSaving(false);
    }
  };

  const handleToggleActive = async (staff: StaffMember) => {
    try {
      await api.patch(`/staff/${staff.id}/toggle-active`);
      toast.success(`${staff.name} ${staff.isActive ? 'deactivated' : 'activated'}`);
      fetchStaff();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to toggle status');
    }
  };

  const handleDelete = async (staffId: string) => {
    try {
      await api.delete(`/staff/${staffId}`);
      toast.success('Staff deleted successfully');
      setDeleteConfirm(null);
      fetchStaff();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete staff');
    }
  };

  // ---- Filter staff ----

  const filteredStaff = staffList.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.role.toLowerCase().includes(search.toLowerCase())
  );

  // Count active permissions for display
  const countActivePerms = (perms: string[]) => {
    if (!Array.isArray(perms)) return 0;
    return perms.length;
  };

  // ---- Render ----

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="h-7 w-7 text-primary" />
            Staff Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage staff accounts, roles and permissions
          </p>
        </div>
        <Button onClick={openAddModal} className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Add Staff
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name, email, or role..."
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Staff List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="text-center py-20">
          <Users className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">
            {search ? 'No staff found matching your search' : 'No staff members yet. Add your first one!'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredStaff.map((staff) => {
            const badge = roleBadge(staff.role);
            const RoleIcon = badge.icon;
            const isSelf = staff.id === currentUser?._id;

            return (
              <div
                key={staff.id}
                className={`relative bg-white dark:bg-slate-800 border rounded-xl p-4 sm:p-5 transition-all duration-200 hover:shadow-md ${
                  !staff.isActive
                    ? 'border-red-200 dark:border-red-900/50 opacity-70'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                {/* Inactive overlay label */}
                {!staff.isActive && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 text-xs font-semibold rounded-full border border-red-200 dark:border-red-800">
                    <Ban className="h-3 w-3" />
                    Inactive
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Avatar + Info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-full flex items-center justify-center text-lg font-bold ${badge.bg} ${badge.text} border ${badge.border} flex-shrink-0`}
                    >
                      {staff.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                          {staff.name}
                        </h3>
                        {isSelf && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                            You
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                          <Mail className="h-3 w-3" />
                          {staff.email}
                        </span>
                        {staff.phone && (
                          <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                            <Phone className="h-3 w-3" />
                            {staff.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Role + Perms count */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}
                    >
                      <RoleIcon className="h-3 w-3" />
                      {staff.role.charAt(0).toUpperCase() + staff.role.slice(1)}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {staff.role === 'admin'
                        ? 'Full Access'
                        : `${countActivePerms(staff.permissions)} permissions`}
                    </span>
                  </div>

                  {/* Actions */}
                  {!isSelf && (
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                      <button
                        onClick={() => openEditModal(staff)}
                        className="p-2 text-slate-500 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(staff)}
                        className={`p-2 rounded-lg transition-colors ${
                          staff.isActive
                            ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                            : 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                        }`}
                        title={staff.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {staff.isActive ? (
                          <ToggleRight className="h-5 w-5" />
                        ) : (
                          <ToggleLeft className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(staff.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Delete Confirmation */}
                {deleteConfirm === staff.id && (
                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center justify-between gap-3">
                    <p className="text-sm text-red-700 dark:text-red-400">
                      Delete <strong>{staff.name}</strong>? This can't be undone.
                    </p>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteConfirm(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(staff.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ---- Add/Edit Modal ---- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 sm:pt-16 px-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col border border-slate-200 dark:border-slate-700">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {editingStaff ? (
                  <>
                    <Pencil className="h-5 w-5 text-primary" />
                    Edit Staff
                  </>
                ) : (
                  <>
                    <UserPlus className="h-5 w-5 text-primary" />
                    Add New Staff
                  </>
                )}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
              {/* Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Enter name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {editingStaff ? 'New Password (leave empty to keep)' : 'Password *'}
                  </label>
                  <input
                    type="password"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder={editingStaff ? '••••••' : 'Min 6 characters'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="Phone number"
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Role
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['admin', 'manager', 'staff'] as const).map((role) => {
                    const badge = roleBadge(role);
                    const RoleIcon = badge.icon;
                    const selected = formRole === role;
                    return (
                      <button
                        key={role}
                        onClick={() => handleRoleChange(role)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200 ${
                          selected
                            ? `${badge.bg} ${badge.border} ring-2 ring-primary/30`
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <RoleIcon
                          className={`h-6 w-6 ${
                            selected ? badge.text : 'text-slate-400 dark:text-slate-500'
                          }`}
                        />
                        <span
                          className={`text-sm font-semibold ${
                            selected ? badge.text : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          {role === 'admin'
                            ? 'Full Access'
                            : role === 'manager'
                            ? 'Elevated Access'
                            : 'Limited Access'}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {formRole === 'admin' && (
                  <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    Admin has full access to everything — permissions below don't apply.
                  </p>
                )}
              </div>

              {/* Permissions Matrix */}
              {formRole !== 'admin' && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Permissions ({formPermissions.length} selected)
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const allKeys = PERMISSION_MODULES.flatMap((m) =>
                            m.permissions.map((p) => p.key)
                          );
                          setFormPermissions(allKeys);
                        }}
                        className="text-xs text-primary hover:underline"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        onClick={() => setFormPermissions([])}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {PERMISSION_MODULES.map((mod) => {
                      const moduleKeys = mod.permissions.map((p) => p.key);
                      const selectedCount = moduleKeys.filter((k) =>
                        formPermissions.includes(k)
                      ).length;
                      const allSelected = selectedCount === moduleKeys.length;
                      const someSelected = selectedCount > 0 && !allSelected;
                      const isExpanded = expandedModules.includes(mod.module);

                      return (
                        <div
                          key={mod.module}
                          className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
                        >
                          {/* Module Header */}
                          <div
                            className={`flex items-center justify-between px-3 py-2.5 cursor-pointer transition-colors ${
                              allSelected
                                ? 'bg-primary/5 dark:bg-primary/10'
                                : 'bg-slate-50 dark:bg-slate-800/50'
                            }`}
                            onClick={() => toggleExpandModule(mod.module)}
                          >
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleModuleAll(mod.permissions);
                                }}
                                className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                                  allSelected
                                    ? 'bg-primary border-primary text-white'
                                    : someSelected
                                    ? 'bg-primary/30 border-primary/50 text-white'
                                    : 'border-slate-300 dark:border-slate-600'
                                }`}
                              >
                                {(allSelected || someSelected) && <Check className="h-3 w-3" />}
                              </button>
                              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                {mod.module}
                              </span>
                              <span className="text-[10px] text-slate-400 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-full">
                                {selectedCount}/{moduleKeys.length}
                              </span>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-slate-400" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-slate-400" />
                            )}
                          </div>

                          {/* Permissions */}
                          {isExpanded && (
                            <div className="px-3 py-2 grid grid-cols-2 sm:grid-cols-4 gap-2 border-t border-slate-100 dark:border-slate-700">
                              {mod.permissions.map((perm) => {
                                const isSelected = formPermissions.includes(perm.key);
                                return (
                                  <button
                                    key={perm.key}
                                    onClick={() => togglePermission(perm.key)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                                      isSelected
                                        ? 'bg-primary/10 text-primary border-primary/30 dark:bg-primary/20'
                                        : 'bg-slate-50 dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                    }`}
                                  >
                                    <span>{perm.icon}</span>
                                    {perm.label}
                                    {isSelected && <Check className="h-3 w-3 ml-auto" />}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
              <Button variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={formSaving}>
                {formSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : editingStaff ? (
                  'Update Staff'
                ) : (
                  'Add Staff'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagement;
