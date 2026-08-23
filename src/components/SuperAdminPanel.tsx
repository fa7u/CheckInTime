import React, { useState } from 'react';
import { 
  Building2, Users, Shield, Plus, Edit, Trash2, Copy, 
  Check, X, Link, Search, Calendar, Landmark, Key, Compass, ExternalLink 
} from 'lucide-react';
import { Tenant } from '../types';

interface SuperAdminPanelProps {
  tenants: Tenant[];
  onAddTenant: (tenant: Tenant) => void;
  onEditTenant: (oldId: string, tenant: Tenant) => void;
  onDeleteTenant: (id: string) => void;
  onLogout: () => void;
  superAdminUsername: string;
  superAdminPassword: string;
  onUpdateSuperAdminCredentials: (user: string, pass: string) => void;
}

export default function SuperAdminPanel({
  tenants,
  onAddTenant,
  onEditTenant,
  onDeleteTenant,
  onLogout,
  superAdminUsername,
  superAdminPassword,
  onUpdateSuperAdminCredentials,
}: SuperAdminPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  // SuperAdmin credentials edit state
  const [showSuperSettings, setShowSuperSettings] = useState(false);
  const [newSuperUser, setNewSuperUser] = useState(superAdminUsername);
  const [newSuperPass, setNewSuperPass] = useState(superAdminPassword);
  const [superError, setSuperError] = useState('');
  const [superSuccess, setSuperSuccess] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  
  // Add form fields
  const [companyName, setCompanyName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [customId, setCustomId] = useState('');
  const [formError, setFormError] = useState('');

  // Edit form fields
  const [editCompanyName, setEditCompanyName] = useState('');
  const [editAdminName, setEditAdminName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editCustomId, setEditCustomId] = useState('');
  const [editFormError, setEditFormError] = useState('');

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Copied link indicator state
  const [copiedTenantId, setCopiedTenantId] = useState<{ id: string; type: 'portal' | 'admin' } | null>(null);

  // Copy link helper
  const handleCopyLink = (tenantId: string, type: 'portal' | 'admin') => {
    let url = window.location.origin;
    if (tenantId !== 'default') {
      if (type === 'portal') {
        url += `?portal=employee&tenant=${tenantId}`;
      } else {
        url += `?portal=admin&tenant=${tenantId}`;
      }
    } else {
      if (type === 'portal') {
        url += `?portal=employee`;
      } else {
        url += `?portal=admin`;
      }
    }
    
    navigator.clipboard.writeText(url).then(() => {
      setCopiedTenantId({ id: tenantId, type });
      setTimeout(() => {
        setCopiedTenantId(null);
      }, 2000);
    });
  };

  // Open Add modal with default custom ID prefilled
  const handleOpenAddModal = () => {
    setCompanyName('');
    setAdminName('');
    setUsername('');
    setPassword('');
    setCustomId(`tenant-${Date.now().toString().slice(-4)}`);
    setFormError('');
    setShowAddModal(true);
  };

  // Submit new tenant
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const finalId = customId.trim().toLowerCase().replace(/[^a-z0-9_\-]/g, '');

    if (!companyName.trim() || !adminName.trim() || !username.trim() || !password.trim() || !finalId) {
      setFormError('الرجاء ملء جميع الحقول المطلوبة.');
      return;
    }

    if (finalId === 'default' || finalId === 'superadmin') {
      setFormError('هذا المعرّف محجوز للأنظمة.');
      return;
    }

    if (tenants.some(t => t.id.toLowerCase() === finalId)) {
      setFormError('معرّف الرابط هذا مستخدم بالفعل لدى مؤسسة أخرى. يرجى اختيار معرّف فريد.');
      return;
    }

    // Check if username already exists (excluding superadmin and duplicates)
    if (username.toLowerCase() === 'superadmin') {
      setFormError('اسم المستخدم "superadmin" محجوز للمصمم العام.');
      return;
    }

    if (tenants.some(t => t.username.toLowerCase() === username.toLowerCase())) {
      setFormError('اسم المستخدم هذا مستخدم بالفعل لدى مؤسسة أخرى.');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];

    onAddTenant({
      id: finalId,
      companyName: companyName.trim(),
      adminName: adminName.trim(),
      username: username.trim(),
      password: password.trim(),
      createdAt: todayStr,
    });

    // Reset and close
    setCompanyName('');
    setAdminName('');
    setUsername('');
    setPassword('');
    setCustomId('');
    setShowAddModal(false);
  };

  // Submit edited tenant
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEditFormError('');

    const finalId = editCustomId.trim().toLowerCase().replace(/[^a-z0-9_\-]/g, '');

    if (!editCompanyName.trim() || !editAdminName.trim() || !editUsername.trim() || !editPassword.trim() || !finalId) {
      setEditFormError('الرجاء ملء جميع الحقول المطلوبة.');
      return;
    }

    if (editingTenant) {
      if (finalId === 'default' || finalId === 'superadmin') {
        setEditFormError('هذا المعرّف محجوز للأنظمة.');
        return;
      }

      if (tenants.some(t => t.id !== editingTenant.id && t.id.toLowerCase() === finalId)) {
        setEditFormError('معرّف الرابط هذا مستخدم بالفعل لدى مؤسسة أخرى. يرجى اختيار معرّف فريد.');
        return;
      }

      if (editUsername.toLowerCase() === 'superadmin') {
        setEditFormError('اسم المستخدم "superadmin" محجوز للمصمم العام.');
        return;
      }

      if (tenants.some(t => t.id !== editingTenant.id && t.username.toLowerCase() === editUsername.toLowerCase())) {
        setEditFormError('اسم المستخدم هذا مستخدم بالفعل لدى مؤسسة أخرى.');
        return;
      }

      onEditTenant(editingTenant.id, {
        ...editingTenant,
        id: finalId,
        companyName: editCompanyName.trim(),
        adminName: editAdminName.trim(),
        username: editUsername.trim(),
        password: editPassword.trim(),
      });

      setShowEditModal(false);
      setEditingTenant(null);
    }
  };

  const handleStartEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setEditCompanyName(tenant.companyName);
    setEditAdminName(tenant.adminName);
    setEditUsername(tenant.username);
    setEditPassword(tenant.password);
    setEditCustomId(tenant.id);
    setEditFormError('');
    setShowEditModal(true);
  };

  const filteredTenants = tenants.filter(t => 
    t.id !== 'default' && (
      t.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.adminName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.username.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const activeTenantsCount = tenants.filter(t => t.id !== 'default').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300 text-right" dir="rtl">
      
      {/* Upper Status Banner */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center border border-indigo-100 text-indigo-600 shadow-2xs shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">لوحة تحكم المصمم العام (Super Admin)</h2>
            <p className="text-xs text-slate-500 mt-1">تتيح لك تهيئة المؤسسات، وإصدار روابط وحسابات العملاء لإدارتها بشكل مستقل كلياً.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setNewSuperUser(superAdminUsername);
              setNewSuperPass(superAdminPassword);
              setSuperError('');
              setSuperSuccess('');
              setShowSuperSettings(true);
            }}
            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Key className="w-4 h-4" />
            <span>تعديل حساب المصمم (Super Admin)</span>
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <X className="w-4 h-4" />
            <span>تسجيل الخروج من الإدارة العامة</span>
          </button>
        </div>
      </div>

      {/* Analytics Info widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Metric 1 */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
          <div className="text-right">
            <span className="text-xs text-slate-500 font-semibold block">المؤسسات المسجلة</span>
            <span className="text-3xl font-extrabold text-slate-900 mt-1.5 block font-mono">
              {activeTenantsCount}
            </span>
          </div>
          <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs">
            <Landmark className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
          <div className="text-right">
            <span className="text-xs text-slate-500 font-semibold block">مجموع مدراء الأنظمة</span>
            <span className="text-3xl font-extrabold text-indigo-600 mt-1.5 block font-mono">
              {activeTenantsCount}
            </span>
          </div>
          <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs">
            <Shield className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
          <div className="text-right">
            <span className="text-xs text-slate-500 font-semibold block">طبيعة العزل</span>
            <span className="text-sm font-extrabold text-slate-900 mt-2 block">
              عزل تام للبيانات والموظفين
            </span>
          </div>
          <div className="w-12 h-12 bg-purple-50 border border-purple-100 text-purple-600 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs">
            <Compass className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Main organizations table card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Table Header Filter controls */}
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:max-w-md">
            <input
              type="text"
              placeholder="ابحث باسم المؤسسة، المدير، أو اسم الدخول..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 hover:border-slate-400 focus:border-indigo-600 rounded-xl text-xs pl-4 pr-10 py-3 text-right focus:outline-none text-slate-900 font-medium transition-all shadow-2xs"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
          </div>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold px-5 py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إنشاء مؤسسة / مشروع جديد</span>
          </button>
        </div>

        {/* Table / Grid list */}
        <div className="overflow-x-auto">
          {filteredTenants.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-800">لا توجد مؤسسات أو مشاريع مسجلة حالياً.</p>
              <p className="text-xs text-slate-500 mt-1">انقر على زر الإنشاء بالأعلى لإضافة مؤسستك الأولى.</p>
            </div>
          ) : (
            <table className="w-full text-right border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-bold">
                  <th className="px-6 py-4">المؤسسة / المشروع</th>
                  <th className="px-6 py-4">المدير المسؤول</th>
                  <th className="px-6 py-4">بيانات دخول المدير</th>
                  <th className="px-6 py-4">روابط النظام الذكية</th>
                  <th className="px-6 py-4">تاريخ التأسيس</th>
                  <th className="px-6 py-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* Organization details */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-indigo-600">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">
                            {tenant.companyName}
                          </span>
                          <span className="text-[11px] text-slate-500 block mt-1 font-mono">
                            ID: {tenant.id}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Admin Name */}
                    <td className="px-6 py-4 text-xs font-semibold text-slate-800">
                      {tenant.adminName}
                    </td>

                    {/* Login credentials */}
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-slate-500 text-[10px]">المستخدم:</span>
                          <span className="font-mono font-bold text-indigo-700">{tenant.username}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-slate-500 text-[10px]">السرّي:</span>
                          <span className="font-mono text-slate-700">{tenant.password}</span>
                        </div>
                      </div>
                    </td>

                    {/* Smart links with copy */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        {/* Employee portal link */}
                        <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl max-w-[240px]">
                          <span className="text-[10px] text-slate-600 font-bold shrink-0">بوابة الموظفين:</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleCopyLink(tenant.id, 'portal')}
                              className="text-indigo-600 hover:text-indigo-800 p-0.5 rounded transition-colors cursor-pointer"
                              title="نسخ رابط الموظفين"
                            >
                              {copiedTenantId?.id === tenant.id && copiedTenantId?.type === 'portal' ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <a 
                              href={`?portal=employee${tenant.id !== 'default' ? `&tenant=${tenant.id}` : ''}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-400 hover:text-slate-700 p-0.5"
                              title="فتح الرابط"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>

                        {/* Admin direct link */}
                        <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl max-w-[240px]">
                          <span className="text-[10px] text-amber-700 font-bold shrink-0">لوحة الإدارة:</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleCopyLink(tenant.id, 'admin')}
                              className="text-amber-700 hover:text-amber-800 p-0.5 rounded transition-colors cursor-pointer"
                              title="نسخ رابط لوحة الإدارة"
                            >
                              {copiedTenantId?.id === tenant.id && copiedTenantId?.type === 'admin' ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <a 
                              href={`?portal=admin${tenant.id !== 'default' ? `&tenant=${tenant.id}` : ''}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-400 hover:text-slate-700 p-0.5"
                              title="فتح الرابط"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Creation Date */}
                    <td className="px-6 py-4 text-xs font-mono text-slate-500">
                      {tenant.createdAt}
                    </td>

                    {/* Action buttons */}
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {deleteConfirmId === tenant.id ? (
                          <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 p-1 rounded-xl">
                            <span className="text-[10px] text-rose-700 font-bold px-1">حذف؟</span>
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteTenant(tenant.id);
                                setDeleteConfirmId(null);
                              }}
                              className="text-white hover:bg-emerald-700 p-1 bg-emerald-600 rounded-lg transition-colors cursor-pointer"
                              title="تأكيد الحذف"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              className="text-slate-600 hover:bg-slate-200 p-1 bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="إلغاء"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleStartEdit(tenant)}
                              className="text-indigo-600 hover:text-indigo-800 p-2 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer"
                              title="تعديل بيانات المؤسسة"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(tenant.id)}
                              className="text-rose-600 hover:text-rose-800 p-2 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                              title="حذف المؤسسة نهائياً"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* CREATE NEW TENANT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 w-full max-w-md shadow-2xl relative text-right">
            
            <button 
              onClick={() => {
                setShowAddModal(false);
                setFormError('');
              }}
              className="absolute left-4 top-4 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Plus className="w-5 h-5 text-indigo-600" />
              إنشاء مؤسسة / مشروع جديد
            </h4>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              {formError && (
                <p className="text-xs text-rose-700 font-bold bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                  {formError}
                </p>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">اسم المؤسسة أو المشروع *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: شركة التطوير العقاري المحدودة"
                  value={companyName}
                  onChange={(e) => {
                    setCompanyName(e.target.value);
                    const cleanVal = e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9\s\-]/g, '')
                      .trim()
                      .replace(/\s+/g, '-');
                    if (cleanVal && /^[a-z0-9\-]+$/.test(cleanVal)) {
                      setCustomId(cleanVal);
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl text-sm px-3 py-2.5 focus:outline-none focus:border-indigo-600 text-slate-900 shadow-2xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-indigo-700 block">رابط المعرّف الفريد للمؤسسة (ID) *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: my-company"
                  value={customId}
                  onChange={(e) => setCustomId(e.target.value.toLowerCase().replace(/[^a-z0-9_\-]/g, ''))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl text-xs px-3 py-2.5 focus:outline-none focus:border-indigo-600 text-slate-900 font-mono text-left shadow-2xs"
                  dir="ltr"
                />
                <p className="text-[10px] text-slate-500 text-left mt-1 font-mono" dir="ltr">
                  URL: {window.location.origin}?tenant={customId || 'id'}
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">اسم المسؤول / مدير النظام *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: م. خالد السديري"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl text-sm px-3 py-2.5 focus:outline-none focus:border-indigo-600 text-slate-900 shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-indigo-700 block flex items-center gap-1">
                    <Key className="w-3 h-3" />
                    اسم مستخدم المدير *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="khaled"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl text-xs px-3 py-2 focus:outline-none focus:border-indigo-600 text-slate-900 font-mono shadow-2xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-indigo-700 block flex items-center gap-1">
                    <Key className="w-3 h-3" />
                    كلمة مرور المدير *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="رمز الدخول"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl text-xs px-3 py-2 focus:outline-none focus:border-indigo-600 text-slate-900 font-mono shadow-2xs"
                  />
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-3.5 text-xs text-slate-600 leading-relaxed">
                💡 <strong>بمجرد الإنشاء:</strong> ستحصل هذه المؤسسة على قاعدة بيانات فارغة ومستقلة كلياً، ويمكن للمسؤول الدخول باستخدام هذه البيانات لإضافة موظفيه وتهيئة النطاق الجغرافي.
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-2.5 rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  حفظ وإنشاء المشروع
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setFormError('');
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 rounded-xl border border-slate-300 transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TENANT MODAL */}
      {showEditModal && editingTenant && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 w-full max-w-md shadow-2xl relative text-right">
            
            <button 
              onClick={() => {
                setShowEditModal(false);
                setEditingTenant(null);
                setEditFormError('');
              }}
              className="absolute left-4 top-4 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Edit className="w-5 h-5 text-indigo-600" />
              تعديل بيانات المؤسسة
            </h4>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              {editFormError && (
                <p className="text-xs text-rose-700 font-bold bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                  {editFormError}
                </p>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">اسم المؤسسة أو المشروع *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: شركة التطوير العقاري المحدودة"
                  value={editCompanyName}
                  onChange={(e) => setEditCompanyName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl text-sm px-3 py-2.5 focus:outline-none focus:border-indigo-600 text-slate-900 shadow-2xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-indigo-700 block">رابط المعرّف الفريد للمؤسسة (ID) *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: my-company"
                  value={editCustomId}
                  onChange={(e) => setEditCustomId(e.target.value.toLowerCase().replace(/[^a-z0-9_\-]/g, ''))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl text-xs px-3 py-2.5 focus:outline-none focus:border-indigo-600 text-slate-900 font-mono text-left shadow-2xs"
                  dir="ltr"
                />
                <p className="text-[10px] text-slate-500 text-left mt-1 font-mono" dir="ltr">
                  URL: {window.location.origin}?tenant={editCustomId || 'id'}
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">اسم المسؤول / مدير النظام *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: م. خالد السديري"
                  value={editAdminName}
                  onChange={(e) => setEditAdminName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl text-sm px-3 py-2.5 focus:outline-none focus:border-indigo-600 text-slate-900 shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-indigo-700 block flex items-center gap-1">
                    <Key className="w-3 h-3" />
                    اسم مستخدم المدير *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="khaled"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl text-xs px-3 py-2 focus:outline-none focus:border-indigo-600 text-slate-900 font-mono shadow-2xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-indigo-700 block flex items-center gap-1">
                    <Key className="w-3 h-3" />
                    كلمة مرور المدير *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="رمز الدخول"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl text-xs px-3 py-2 focus:outline-none focus:border-indigo-600 text-slate-900 font-mono shadow-2xs"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-2.5 rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  حفظ التعديلات
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingTenant(null);
                    setEditFormError('');
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 rounded-xl border border-slate-300 transition-colors cursor-pointer"
                >
                  إلغاء الأمر
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUPER ADMIN SETTINGS MODAL */}
      {showSuperSettings && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 relative animate-in zoom-in-95 duration-150 text-right shadow-2xl">
            <button
              type="button"
              onClick={() => setShowSuperSettings(false)}
              className="absolute left-4 top-4 text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-5 pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-600" />
                تعديل حساب المصمم العام (Super Admin)
              </h3>
              <p className="text-xs text-slate-500 mt-1">تعديل بيانات الدخول الخاصة بحساب الإدارة العامة المعزول.</p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSuperError('');
                setSuperSuccess('');

                if (!newSuperUser.trim() || !newSuperPass.trim()) {
                  setSuperError('الرجاء تعبئة اسم المستخدم وكلمة المرور.');
                  return;
                }

                if (newSuperUser.trim().toLowerCase() === 'admin') {
                  setSuperError('لا يمكن استخدام اسم المستخدم "admin" لحماية خصوصية حساب المصمم العام.');
                  return;
                }

                onUpdateSuperAdminCredentials(newSuperUser.trim(), newSuperPass.trim());
                setSuperSuccess('تم تحديث بيانات دخول المصمم العام بنجاح!');
                setTimeout(() => {
                  setShowSuperSettings(false);
                  setSuperSuccess('');
                }, 1500);
              }}
              className="space-y-4"
            >
              {superError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-2.5 rounded-xl text-xs font-bold">
                  {superError}
                </div>
              )}
              {superSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-2.5 rounded-xl text-xs font-bold">
                  {superSuccess}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">اسم مستخدم المصمم العام *</label>
                <input
                  type="text"
                  required
                  value={newSuperUser}
                  onChange={(e) => setNewSuperUser(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 rounded-xl text-xs px-3 py-2.5 focus:outline-none text-slate-900 font-mono shadow-2xs"
                  placeholder="superadmin"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">كلمة المرور الجديدة *</label>
                <input
                  type="text"
                  required
                  value={newSuperPass}
                  onChange={(e) => setNewSuperPass(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 rounded-xl text-xs px-3 py-2.5 focus:outline-none text-slate-900 font-mono shadow-2xs"
                  placeholder="كلمة المرور"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-2.5 rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  حفظ التعديلات
                </button>
                <button
                  type="button"
                  onClick={() => setShowSuperSettings(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
