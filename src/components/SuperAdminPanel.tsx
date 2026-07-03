import React, { useState } from 'react';
import { 
  Building2, Users, Shield, Plus, Edit, Trash2, Copy, 
  Check, X, Link, Search, Calendar, Landmark, Key, Compass, ExternalLink 
} from 'lucide-react';
import { Tenant } from '../types';

interface SuperAdminPanelProps {
  tenants: Tenant[];
  onAddTenant: (tenant: Omit<Tenant, 'id' | 'createdAt'>) => void;
  onEditTenant: (tenant: Tenant) => void;
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
  const [formError, setFormError] = useState('');

  // Edit form fields
  const [editCompanyName, setEditCompanyName] = useState('');
  const [editAdminName, setEditAdminName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
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
        url += `?tenant=${tenantId}`;
      }
    } else {
      if (type === 'portal') {
        url += `?portal=employee`;
      }
    }
    
    navigator.clipboard.writeText(url).then(() => {
      setCopiedTenantId({ id: tenantId, type });
      setTimeout(() => {
        setCopiedTenantId(null);
      }, 2000);
    });
  };

  // Submit new tenant
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!companyName.trim() || !adminName.trim() || !username.trim() || !password.trim()) {
      setFormError('الرجاء ملء جميع الحقول المطلوبة.');
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

    onAddTenant({
      companyName: companyName.trim(),
      adminName: adminName.trim(),
      username: username.trim(),
      password: password.trim(),
    });

    // Reset and close
    setCompanyName('');
    setAdminName('');
    setUsername('');
    setPassword('');
    setShowAddModal(false);
  };

  // Submit edited tenant
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEditFormError('');

    if (!editCompanyName.trim() || !editAdminName.trim() || !editUsername.trim() || !editPassword.trim()) {
      setEditFormError('الرجاء ملء جميع الحقول المطلوبة.');
      return;
    }

    if (editingTenant) {
      if (editUsername.toLowerCase() === 'superadmin') {
        setEditFormError('اسم المستخدم "superadmin" محجوز للمصمم العام.');
        return;
      }

      if (tenants.some(t => t.id !== editingTenant.id && t.username.toLowerCase() === editUsername.toLowerCase())) {
        setEditFormError('اسم المستخدم هذا مستخدم بالفعل لدى مؤسسة أخرى.');
        return;
      }

      onEditTenant({
        ...editingTenant,
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
    setEditFormError('');
    setShowEditModal(true);
  };

  const filteredTenants = tenants.filter(t => 
    t.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.adminName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300 text-right" dir="rtl">
      
      {/* Upper Status Banner */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-[#121214] border border-[#27272A] p-6 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#D4AF37]/15 rounded-2xl flex items-center justify-center border border-[#D4AF37]/30 text-[#D4AF37] shadow-lg shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">لوحة تحكم المصمم العام (Super Admin)</h2>
            <p className="text-xs text-[#8E8E93] mt-1">تتيح لك تهيئة المؤسسات، وإصدار روابط وحسابات العملاء لإدارتها بشكل مستقل كلياً.</p>
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
            className="bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/20 font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Key className="w-4 h-4" />
            <span>تعديل حساب المصمم (Super Admin)</span>
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="bg-rose-950/40 hover:bg-rose-900/40 text-rose-400 border border-rose-900/30 font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
          >
            <X className="w-4 h-4" />
            <span>تسجيل الخروج من الإدارة العامة</span>
          </button>
        </div>
      </div>

      {/* Analytics Info widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Metric 1 */}
        <div className="bg-[#121214] rounded-2xl border border-[#27272A] p-5 shadow-lg flex items-center justify-between">
          <div className="text-right">
            <span className="text-[10px] text-[#8E8E93] font-bold block">المؤسسات المسجلة</span>
            <span className="text-3xl font-extrabold text-white mt-1.5 block font-mono">
              {tenants.length}
            </span>
          </div>
          <div className="w-11 h-11 bg-emerald-950/30 border border-emerald-900/30 text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
            <Landmark className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-[#121214] rounded-2xl border border-[#27272A] p-5 shadow-lg flex items-center justify-between">
          <div className="text-right">
            <span className="text-[10px] text-[#8E8E93] font-bold block">مجموع مدراء الأنظمة</span>
            <span className="text-3xl font-extrabold text-[#D4AF37] mt-1.5 block font-mono">
              {tenants.length}
            </span>
          </div>
          <div className="w-11 h-11 bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] rounded-xl flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-[#121214] rounded-2xl border border-[#27272A] p-5 shadow-lg flex items-center justify-between">
          <div className="text-right">
            <span className="text-[10px] text-[#8E8E93] font-bold block">طبيعة العزل</span>
            <span className="text-sm font-extrabold text-white mt-2 block">
              عزل تام للبيانات والموظفين
            </span>
          </div>
          <div className="w-11 h-11 bg-blue-950/30 border border-blue-900/30 text-blue-400 rounded-xl flex items-center justify-center shrink-0">
            <Compass className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Main organizations table card */}
      <div className="bg-[#121214] rounded-3xl border border-[#27272A] shadow-xl overflow-hidden">
        
        {/* Table Header Filter controls */}
        <div className="p-6 border-b border-[#27272A] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:max-w-md">
            <input
              type="text"
              placeholder="ابحث باسم المؤسسة، المدير، أو اسم الدخول..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0F0F11] border border-[#27272A] hover:border-[#8E8E93]/40 focus:border-[#D4AF37] rounded-xl text-xs pl-4 pr-10 py-3 text-right focus:outline-none text-white font-medium transition-all"
            />
            <Search className="w-4 h-4 text-[#8E8E93] absolute right-3.5 top-3.5" />
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="w-full sm:w-auto bg-[#D4AF37] hover:bg-[#F3C63F] text-slate-950 text-xs font-extrabold px-5 py-3 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إنشاء مؤسسة / مشروع جديد</span>
          </button>
        </div>

        {/* Table / Grid list */}
        <div className="overflow-x-auto">
          {filteredTenants.length === 0 ? (
            <div className="p-12 text-center text-[#8E8E93]">
              <Building2 className="w-12 h-12 text-[#27272A] mx-auto mb-3" />
              <p className="text-sm font-bold text-[#E4E4E7]">لا توجد مؤسسات أو مشاريع مسجلة حالياً.</p>
              <p className="text-xs text-[#8E8E93] mt-1">انقر على زر الإنشاء بالأعلى لإضافة مؤسستك الأولى.</p>
            </div>
          ) : (
            <table className="w-full text-right border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-[#0F0F11]/50 border-b border-[#27272A] text-[#8E8E93] text-[10px] uppercase font-bold">
                  <th className="px-6 py-4">المؤسسة / المشروع</th>
                  <th className="px-6 py-4">المدير المسؤول</th>
                  <th className="px-6 py-4">بيانات دخول المدير</th>
                  <th className="px-6 py-4">روابط النظام الذكية</th>
                  <th className="px-6 py-4">تاريخ التأسيس</th>
                  <th className="px-6 py-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272A]/50">
                {filteredTenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-[#1A1C1E]/30 transition-colors">
                    
                    {/* Organization details */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#1A1C1E] border border-[#27272A] flex items-center justify-center shrink-0">
                          <Building2 className="w-5 h-5 text-[#D4AF37]" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-white block">
                            {tenant.companyName}
                          </span>
                          <span className="text-[9px] text-[#8E8E93] block mt-1 font-mono">
                            ID: {tenant.id}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Admin Name */}
                    <td className="px-6 py-4 text-xs font-semibold text-[#E4E4E7]">
                      {tenant.adminName}
                    </td>

                    {/* Login credentials */}
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-[#8E8E93] text-[10px]">المستخدم:</span>
                          <span className="font-mono font-bold text-[#D4AF37]">{tenant.username}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-[#8E8E93] text-[10px]">السرّي:</span>
                          <span className="font-mono text-white/90">{tenant.password}</span>
                        </div>
                      </div>
                    </td>

                    {/* Smart links with copy */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        {/* Employee portal link */}
                        <div className="flex items-center justify-between gap-2 bg-[#0F0F11] border border-[#27272A] px-2.5 py-1 rounded-lg max-w-[240px]">
                          <span className="text-[9px] text-[#8E8E93] font-bold shrink-0">بوابة الموظفين:</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleCopyLink(tenant.id, 'portal')}
                              className="text-[#D4AF37] hover:text-[#F3C63F] p-0.5 rounded transition-colors cursor-pointer"
                              title="نسخ رابط الموظفين"
                            >
                              {copiedTenantId?.id === tenant.id && copiedTenantId?.type === 'portal' ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                            <a 
                              href={`?portal=employee${tenant.id !== 'default' ? `&tenant=${tenant.id}` : ''}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#8E8E93] hover:text-white p-0.5"
                              title="فتح الرابط"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>

                        {/* Admin direct link */}
                        <div className="flex items-center justify-between gap-2 bg-[#0F0F11] border border-[#27272A] px-2.5 py-1 rounded-lg max-w-[240px]">
                          <span className="text-[9px] text-amber-500 font-bold shrink-0">لوحة الإدارة:</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleCopyLink(tenant.id, 'admin')}
                              className="text-amber-500 hover:text-amber-400 p-0.5 rounded transition-colors cursor-pointer"
                              title="نسخ رابط لوحة الإدارة"
                            >
                              {copiedTenantId?.id === tenant.id && copiedTenantId?.type === 'admin' ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                            <a 
                              href={`?tenant=${tenant.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#8E8E93] hover:text-white p-0.5"
                              title="فتح الرابط"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Creation Date */}
                    <td className="px-6 py-4 text-xs font-mono text-[#8E8E93]">
                      {tenant.createdAt}
                    </td>

                    {/* Action buttons */}
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {deleteConfirmId === tenant.id ? (
                          <div className="flex items-center gap-1 bg-rose-950/20 border border-rose-900/30 p-1 rounded-lg">
                            <span className="text-[10px] text-rose-300 font-bold px-1">حذف؟</span>
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteTenant(tenant.id);
                                setDeleteConfirmId(null);
                              }}
                              className="text-emerald-400 hover:text-emerald-300 p-1 bg-emerald-950/40 rounded transition-colors cursor-pointer"
                              title="تأكيد الحذف"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              className="text-rose-400 hover:text-rose-300 p-1 bg-rose-900/10 rounded transition-colors cursor-pointer"
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
                              className="text-[#D4AF37] hover:text-[#F3C63F] p-2 hover:bg-[#D4AF37]/10 rounded-lg transition-all cursor-pointer"
                              title="تعديل بيانات المؤسسة"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(tenant.id)}
                              className="text-rose-400 hover:text-rose-300 p-2 hover:bg-rose-950/20 rounded-lg transition-all cursor-pointer"
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-[#121214] rounded-2xl border border-[#27272A] p-6 w-full max-w-md shadow-2xl relative text-right">
            
            <button 
              onClick={() => {
                setShowAddModal(false);
                setFormError('');
              }}
              className="absolute left-4 top-4 text-[#8E8E93] hover:text-[#E4E4E7] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h4 className="text-lg font-bold text-[#E4E4E7] mb-4 flex items-center gap-2 border-b border-[#27272A] pb-3">
              <Plus className="w-5 h-5 text-[#D4AF37]" />
              إنشاء مؤسسة / مشروع جديد
            </h4>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              {formError && (
                <p className="text-xs text-rose-400 font-bold bg-rose-950/30 p-2 rounded border border-rose-900/30">
                  {formError}
                </p>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#8E8E93] block">اسم المؤسسة أو المشروع *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: شركة التطوير العقاري المحدودة"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-[#0F0F11] border border-[#27272A] rounded-lg text-sm px-3 py-2 focus:outline-none focus:border-[#D4AF37] text-[#E4E4E7]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#8E8E93] block">اسم المسؤول / مدير النظام *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: م. خالد السديري"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  className="w-full bg-[#0F0F11] border border-[#27272A] rounded-lg text-sm px-3 py-2 focus:outline-none focus:border-[#D4AF37] text-[#E4E4E7]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-[#27272A] pt-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#D4AF37] block flex items-center gap-1">
                    <Key className="w-3 h-3" />
                    اسم مستخدم المدير *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="khaled"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-[#0F0F11] border border-[#27272A] rounded-lg text-xs px-2.5 py-2 focus:outline-none focus:border-[#D4AF37] text-[#E4E4E7] font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#D4AF37] block flex items-center gap-1">
                    <Key className="w-3 h-3" />
                    كلمة مرور المدير *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="رمز الدخول"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#0F0F11] border border-[#27272A] rounded-lg text-xs px-2.5 py-2 focus:outline-none focus:border-[#D4AF37] text-[#E4E4E7] font-mono"
                  />
                </div>
              </div>

              <div className="bg-[#1A1C1E] rounded-xl border border-[#27272A] p-3 text-[11px] text-[#8E8E93] leading-relaxed">
                💡 <strong>بمجرد الإنشاء:</strong> ستحصل هذه المؤسسة على قاعدة بيانات فارغة ومستقلة كلياً، ويمكن للمسؤول الدخول باستخدام هذه البيانات لإضافة موظفيه وتهيئة النطاق الجغرافي.
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-[#D4AF37] hover:bg-[#F3C63F] text-slate-950 font-extrabold text-xs py-2.5 rounded-lg transition-colors cursor-pointer"
                >
                  حفظ وإنشاء المشروع
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setFormError('');
                  }}
                  className="flex-1 bg-[#1A1C1E] hover:bg-[#27272A] text-[#E4E4E7] font-bold text-xs py-2.5 rounded-lg border border-[#27272A] transition-colors cursor-pointer"
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-[#121214] rounded-2xl border border-[#27272A] p-6 w-full max-w-md shadow-2xl relative text-right">
            
            <button 
              onClick={() => {
                setShowEditModal(false);
                setEditingTenant(null);
                setEditFormError('');
              }}
              className="absolute left-4 top-4 text-[#8E8E93] hover:text-[#E4E4E7] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h4 className="text-lg font-bold text-[#E4E4E7] mb-4 flex items-center gap-2 border-b border-[#27272A] pb-3">
              <Edit className="w-5 h-5 text-[#D4AF37]" />
              تعديل بيانات المؤسسة
            </h4>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              {editFormError && (
                <p className="text-xs text-rose-400 font-bold bg-rose-950/30 p-2 rounded border border-rose-900/30">
                  {editFormError}
                </p>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#8E8E93] block">اسم المؤسسة أو المشروع *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: شركة التطوير العقاري المحدودة"
                  value={editCompanyName}
                  onChange={(e) => setEditCompanyName(e.target.value)}
                  className="w-full bg-[#0F0F11] border border-[#27272A] rounded-lg text-sm px-3 py-2 focus:outline-none focus:border-[#D4AF37] text-[#E4E4E7]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#8E8E93] block">اسم المسؤول / مدير النظام *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: م. خالد السديري"
                  value={editAdminName}
                  onChange={(e) => setEditAdminName(e.target.value)}
                  className="w-full bg-[#0F0F11] border border-[#27272A] rounded-lg text-sm px-3 py-2 focus:outline-none focus:border-[#D4AF37] text-[#E4E4E7]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-[#27272A] pt-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#D4AF37] block flex items-center gap-1">
                    <Key className="w-3 h-3" />
                    اسم مستخدم المدير *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="khaled"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full bg-[#0F0F11] border border-[#27272A] rounded-lg text-xs px-2.5 py-2 focus:outline-none focus:border-[#D4AF37] text-[#E4E4E7] font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#D4AF37] block flex items-center gap-1">
                    <Key className="w-3 h-3" />
                    كلمة مرور المدير *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="رمز الدخول"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full bg-[#0F0F11] border border-[#27272A] rounded-lg text-xs px-2.5 py-2 focus:outline-none focus:border-[#D4AF37] text-[#E4E4E7] font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-[#D4AF37] hover:bg-[#F3C63F] text-slate-950 font-extrabold text-xs py-2.5 rounded-lg transition-colors cursor-pointer"
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
                  className="flex-1 bg-[#1A1C1E] hover:bg-[#27272A] text-[#E4E4E7] font-bold text-xs py-2.5 rounded-lg border border-[#27272A] transition-colors cursor-pointer"
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
        <div className="fixed inset-0 bg-[#000]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121214] border border-[#27272A] rounded-2xl w-full max-w-md p-6 relative animate-in zoom-in-95 duration-150 text-right">
            <button
              type="button"
              onClick={() => setShowSuperSettings(false)}
              className="absolute left-4 top-4 text-[#8E8E93] hover:text-white cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-5 pb-3 border-b border-[#27272A]">
              <h3 className="text-sm font-extrabold text-[#D4AF37] flex items-center gap-2">
                <Shield className="w-4 h-4" />
                تعديل حساب المصمم العام (Super Admin)
              </h3>
              <p className="text-[10px] text-[#8E8E93] mt-1">تعديل بيانات الدخول الخاصة بحساب الإدارة العامة المعزول.</p>
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
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-2.5 rounded-lg text-xs font-bold">
                  {superError}
                </div>
              )}
              {superSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-2.5 rounded-lg text-xs font-bold">
                  {superSuccess}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#8E8E93] block">اسم مستخدم المصمم العام *</label>
                <input
                  type="text"
                  required
                  value={newSuperUser}
                  onChange={(e) => setNewSuperUser(e.target.value)}
                  className="w-full bg-[#0F0F11] border border-[#27272A] focus:border-[#D4AF37] rounded-xl text-xs px-3 py-2.5 focus:outline-none text-white font-mono"
                  placeholder="superadmin"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#8E8E93] block">كلمة المرور الجديدة *</label>
                <input
                  type="text"
                  required
                  value={newSuperPass}
                  onChange={(e) => setNewSuperPass(e.target.value)}
                  className="w-full bg-[#0F0F11] border border-[#27272A] focus:border-[#D4AF37] rounded-xl text-xs px-3 py-2.5 focus:outline-none text-white font-mono"
                  placeholder="كلمة المرور"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-[#27272A]">
                <button
                  type="submit"
                  className="flex-1 bg-[#D4AF37] hover:bg-[#F3C63F] text-slate-950 font-extrabold text-xs py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  حفظ التعديلات
                </button>
                <button
                  type="button"
                  onClick={() => setShowSuperSettings(false)}
                  className="flex-1 bg-[#1A1C1E] hover:bg-[#27272A] border border-[#27272A] text-white font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer"
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
