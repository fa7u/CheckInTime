import React, { useState } from 'react';
import { 
  Users, UserPlus, CheckCircle, XCircle, Clock, MapPin, 
  Settings, Award, AlertTriangle, FileText, Search, Plus, 
  Trash2, Edit, Save, Check, X, Shield, Download, RefreshCw,
  LayoutDashboard, Key, Eye, EyeOff, Menu, Link2, Copy, Archive
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';
import { Employee, AttendanceRecord, OfficeSettings, ApprovalRequest, WorkModel } from '../types';

interface AdminPanelProps {
  employees: Employee[];
  attendanceRecords: AttendanceRecord[];
  pendingRequests: ApprovalRequest[];
  officeSettings: OfficeSettings;
  onApproveRequest: (requestId: string) => void;
  onRejectRequest: (requestId: string) => void;
  onAddEmployee: (emp: Omit<Employee, 'id' | 'joinDate' | 'avatarColor'>) => void;
  onDeleteEmployee: (empId: string) => void;
  onUpdateOfficeSettings: (settings: OfficeSettings) => void;
  onForceCheckOut?: (employeeId: string) => void;
  onArchiveTodayRecords?: () => void;
  onEditEmployee?: (emp: Employee) => void;
  onDeleteAttendance?: (recordId: string) => void;
  onUpdateAttendance?: (updatedRecord: AttendanceRecord) => void;
  adminUsername?: string;
  adminPassword?: string;
  onUpdateAdminCredentials?: (user: string, pass: string, companyName?: string) => void;
  activeTenantId?: string;
  adminCompanyName?: string;
}

export default function AdminPanel({
  employees,
  attendanceRecords,
  pendingRequests,
  officeSettings,
  onApproveRequest,
  onRejectRequest,
  onAddEmployee,
  onDeleteEmployee,
  onUpdateOfficeSettings,
  onForceCheckOut,
  onArchiveTodayRecords,
  onEditEmployee,
  onDeleteAttendance,
  onUpdateAttendance,
  adminUsername = 'admin',
  adminPassword = 'admin123',
  onUpdateAdminCredentials,
  activeTenantId = 'default',
  adminCompanyName = '',
}: AdminPanelProps) {
  // Navigation tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'employees' | 'reports' | 'settings'>('dashboard');
  
  // Credentials update states
  const [adminUser, setAdminUser] = useState(adminUsername);
  const [adminPass, setAdminPass] = useState(adminPassword);
  const [compName, setCompName] = useState(adminCompanyName);
  const [credError, setCredError] = useState('');
  const [credSuccess, setCredSuccess] = useState('');

  // Keep state updated if props change
  React.useEffect(() => {
    setAdminUser(adminUsername);
    setAdminPass(adminPassword);
    setCompName(adminCompanyName);
  }, [adminUsername, adminPassword, adminCompanyName]);

  // Side Menu visibility state
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  
  // Search & Filter state
  const [reportMonth, setReportMonth] = useState('2026-07'); // Default to Current Month
  const [employeeSearch, setEmployeeSearch] = useState('');

  // Delete confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [forceCheckOutConfirmId, setForceCheckOutConfirmId] = useState<string | null>(null);

  // Edit Employee State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editEmpName, setEditEmpName] = useState('');
  const [editEmpEmail, setEditEmpEmail] = useState('');
  const [editEmpRole, setEditEmpRole] = useState('');
  const [editEmpModel, setEditEmpModel] = useState<WorkModel>('on-site');
  const [editEmpUsername, setEditEmpUsername] = useState('');
  const [editEmpPassword, setEditEmpPassword] = useState('');
  const [editFormError, setEditFormError] = useState('');

  const handleStartEditEmployee = (emp: Employee) => {
    setEditingEmployee(emp);
    setEditEmpName(emp.name);
    setEditEmpEmail(emp.email);
    setEditEmpRole(emp.role);
    setEditEmpModel(emp.workModel);
    setEditEmpUsername(emp.username || '');
    setEditEmpPassword(emp.password || '');
    setEditFormError('');
    setShowEditModal(true);
  };

  const handleEditEmployeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEditFormError('');

    if (!editEmpName.trim() || !editEmpEmail.trim() || !editEmpRole.trim() || !editEmpUsername.trim() || !editEmpPassword.trim()) {
      setEditFormError('الرجاء ملء جميع الحقول المطلوبة.');
      return;
    }

    if (editingEmployee && onEditEmployee) {
      onEditEmployee({
        ...editingEmployee,
        name: editEmpName,
        email: editEmpEmail,
        role: editEmpRole,
        workModel: editEmpModel,
        username: editEmpUsername,
        password: editEmpPassword,
      });
      setShowEditModal(false);
      setEditingEmployee(null);
    }
  };

  // Add Employee Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [reportDetailType, setReportDetailType] = useState<'absent' | 'late' | null>(null);
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpEmail, setNewEmpEmail] = useState('');
  const [newEmpRole, setNewEmpRole] = useState('');
  const [newEmpModel, setNewEmpModel] = useState<WorkModel>('on-site');
  const [newEmpUsername, setNewEmpUsername] = useState('');
  const [newEmpPassword, setNewEmpPassword] = useState('');
  
  // Visibility of passwords in employee directory
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // Copied link status states
  const [copiedMenuLink, setCopiedMenuLink] = useState(false);
  const [copiedTableLink, setCopiedTableLink] = useState(false);

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getHoursWorked = (rec: AttendanceRecord) => {
    if (!rec.checkIn) return 0;
    if (rec.checkOut) return rec.totalHours;
    
    try {
      const now = new Date();
      const currentHHMM = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const [h1, m1] = rec.checkIn.split(':').map(Number);
      const [h2, m2] = currentHHMM.split(':').map(Number);
      const diffMin = (h2 * 60 + m2) - (h1 * 60 + m1);
      const hours = diffMin / 60;
      return parseFloat(Math.max(0, hours).toFixed(2));
    } catch (e) {
      return 0;
    }
  };

  const [formError, setFormError] = useState('');

  // Office settings form state
  const [officeForm, setOfficeForm] = useState<OfficeSettings>({ ...officeSettings });
  const [showSettingsSuccess, setShowSettingsSuccess] = useState(false);
  const [locationInput, setLocationInput] = useState(officeSettings.mapLink || '');
  const [parseSuccess, setParseSuccess] = useState(false);

  // Advanced Report Filters
  const [filterStartDate, setFilterStartDate] = useState(() => {
    const d = new Date();
    // Default to the 1st of the current month
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}-01`;
  });
  const [filterEndDate, setFilterEndDate] = useState(() => {
    const d = new Date();
    // Default to today
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [filterEmployeeId, setFilterEmployeeId] = useState('all');
  const [filterWorkModel, setFilterWorkModel] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Editing attendance record modal state
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editRecDate, setEditRecDate] = useState('');
  const [editRecCheckIn, setEditRecCheckIn] = useState('');
  const [editRecCheckOut, setEditRecCheckOut] = useState('');
  const [editRecStatus, setEditRecStatus] = useState<'حاضر' | 'متأخر' | 'غياب'>('حاضر');
  const [editRecWorkModel, setEditRecWorkModel] = useState<'on-site' | 'remote'>('on-site');
  const [editRecError, setEditRecError] = useState('');

  // Sync officeForm when officeSettings prop updates
  React.useEffect(() => {
    setOfficeForm({ ...officeSettings });
    setLocationInput(officeSettings.mapLink || '');
  }, [officeSettings]);

  // Extract Coordinates from Google Maps Link or text
  const extractCoordinates = (input: string): { latitude: number; longitude: number } | null => {
    if (!input) return null;

    // Pattern 1: Match standard @lat,lng (e.g., /@24.7622,46.6409/)
    const atPattern = /@(-?\d+\.\d+),\s*(-?\d+\.\d+)/;
    const atMatch = input.match(atPattern);
    if (atMatch) {
      return {
        latitude: parseFloat(atMatch[1]),
        longitude: parseFloat(atMatch[2])
      };
    }

    // Pattern 2: Match query parameters (e.g., ?q=24.7622,46.6409 or &q=24.7622,46.6409)
    const qPattern = /[?&]q=(-?\d+\.\d+),\s*(-?\d+\.\d+)/;
    const qMatch = input.match(qPattern);
    if (qMatch) {
      return {
        latitude: parseFloat(qMatch[1]),
        longitude: parseFloat(qMatch[2])
      };
    }

    // Pattern 3: Match coordinates in path like /place/24.7622,46.6409/ or search/24.7622,46.6409
    const pathPattern = /\/(-?\d+\.\d+),\s*(-?\d+\.\d+)/;
    const pathMatch = input.match(pathPattern);
    if (pathMatch) {
      return {
        latitude: parseFloat(pathMatch[1]),
        longitude: parseFloat(pathMatch[2])
      };
    }

    // Pattern 4: General match for any comma-separated float pair (e.g., "24.7622, 46.6409")
    const generalPattern = /(-?\d+\.\d+),\s*(-?\d+\.\d+)/;
    const generalMatch = input.match(generalPattern);
    if (generalMatch) {
      return {
        latitude: parseFloat(generalMatch[1]),
        longitude: parseFloat(generalMatch[2])
      };
    }

    return null;
  };

  const handleMapLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocationInput(val);
    const coords = extractCoordinates(val);
    if (coords) {
      setOfficeForm(prev => ({
        ...prev,
        latitude: coords.latitude,
        longitude: coords.longitude
      }));
      setParseSuccess(true);
      setTimeout(() => setParseSuccess(false), 5000);
    }
  };

  // Admin info visibility in sidebar state
  const [showAdminInfo, setShowAdminInfo] = useState(true);

  // Filter pending requests
  const activePending = pendingRequests.filter(r => r.status === 'pending');

  // Generate Reports Math
  const getReportsData = () => {
    // Filter records for selected month
    const monthRecords = attendanceRecords.filter(r => r.date.startsWith(reportMonth));
    const totalRecordsCount = monthRecords.length;

    if (totalRecordsCount === 0) {
      return {
        attendanceRate: 0,
        totalHours: 0,
        totalAbsences: 0,
        totalLates: 0,
        presentRate: 0,
        lateRate: 0,
        absentRate: 0,
        employeeBreakdown: employees.map(emp => ({
          id: emp.id,
          name: emp.name,
          role: emp.role,
          workModel: emp.workModel,
          presents: 0,
          lates: 0,
          absences: 0,
          hours: 0,
          attendancePercentage: 100,
          username: emp.username,
          password: emp.password,
        })),
      };
    }

    const totalAbsences = monthRecords.filter(r => r.status === 'غياب').length;
    const totalLates = monthRecords.filter(r => r.status === 'متأخر').length;
    const totalPresents = monthRecords.filter(r => r.status === 'حاضر').length;
    
    const attendanceRate = Math.round(((totalPresents + totalLates) / (totalRecordsCount || 1)) * 100);
    const totalHours = monthRecords.reduce((sum, r) => sum + r.totalHours, 0);

    const presentRate = Math.round((totalPresents / totalRecordsCount) * 100);
    const lateRate = Math.round((totalLates / totalRecordsCount) * 100);
    const absentRate = Math.round((totalAbsences / totalRecordsCount) * 100);

    // Employee breakdown
    const breakdown = employees.map(emp => {
      const empRecords = monthRecords.filter(r => r.employeeId === emp.id);
      const daysCount = empRecords.length;
      
      const presents = empRecords.filter(r => r.status === 'حاضر').length;
      const lates = empRecords.filter(r => r.status === 'متأخر').length;
      const absences = empRecords.filter(r => r.status === 'غياب').length;
      const hours = empRecords.reduce((sum, r) => sum + r.totalHours, 0);

      const attendancePercentage = daysCount > 0 
        ? Math.round(((presents + lates) / daysCount) * 100) 
        : 100;

      return {
        id: emp.id,
        name: emp.name,
        role: emp.role,
        workModel: emp.workModel,
        presents,
        lates,
        absences,
        hours: Math.round(hours),
        attendancePercentage,
        username: emp.username,
        password: emp.password,
      };
    });

    return {
      attendanceRate,
      totalHours: Math.round(totalHours),
      totalAbsences,
      totalLates,
      presentRate,
      lateRate,
      absentRate,
      employeeBreakdown: breakdown,
    };
  };

  const reports = getReportsData();
  const todayStr = new Date().toISOString().split('T')[0];
  const activeNowCount = attendanceRecords.filter(
    r => r.date === todayStr && r.checkIn && !r.checkOut
  ).length;

  const todayUnarchivedRecords = attendanceRecords.filter(r => r.date === todayStr && !r.archived);
  const countPresent = todayUnarchivedRecords.filter(r => r.status === 'حاضر').length;
  const countLate = todayUnarchivedRecords.filter(r => r.status === 'متأخر').length;
  const countAbsent = todayUnarchivedRecords.filter(r => r.status === 'غياب').length;
  const countNotCheckedIn = Math.max(0, employees.length - todayUnarchivedRecords.length);
  const countCheckedOut = todayUnarchivedRecords.filter(r => r.checkIn && r.checkOut && r.status !== 'غياب').length;
  const countOnDuty = Math.max(0, (countPresent + countLate) - countCheckedOut);

  // Generate Trend Data for last 7 days
  const trendData = React.useMemo(() => {
    const dates: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    return dates.map(dStr => {
      const dayRecords = attendanceRecords.filter(r => r.date === dStr);
      const totalPossible = employees.length || 1;
      const attended = dayRecords.filter(r => r.status === 'حاضر' || r.status === 'متأخر').length;
      const departed = dayRecords.filter(r => r.checkIn && r.checkOut && r.status !== 'غياب').length;
      
      const attendanceRate = Math.round((attended / totalPossible) * 100);
      const departureRate = attended > 0 ? Math.round((departed / attended) * 100) : 0;
      
      const [_, m, d] = dStr.split('-');
      const formattedDate = `${d}/${m}`;
      
      return {
        date: formattedDate,
        'نسبة الحضور': attendanceRate,
        'نسبة الانصراف': departureRate,
      };
    });
  }, [attendanceRecords, employees.length]);

  // Export functions
  const exportToExcel = (records: AttendanceRecord[], title: string) => {
    const headers = [
      'الموظف',
      'الدور الوظيفي',
      'التاريخ',
      'نموذج العمل',
      'وقت الحضور',
      'وقت الانصراف',
      'ساعات العمل',
      'الحالة',
      'حالة الاعتماد'
    ];

    const rows = records.map(rec => {
      const emp = employees.find(e => e.id === rec.employeeId);
      return [
        rec.employeeName || (emp ? emp.name : 'موظف غير معروف'),
        emp ? emp.role : 'موظف',
        rec.date,
        rec.workModel === 'on-site' ? 'حضوري' : 'عن بعد',
        rec.checkIn || '-',
        rec.checkOut || '-',
        rec.checkOut ? `${rec.totalHours} ساعة` : 'قيد العمل...',
        rec.status,
        rec.isApproved ? 'معتمد' : 'بانتظار الاعتماد'
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Create blob with BOM for Excel to open UTF-8 CSV in Arabic properly
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${title}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = (records: AttendanceRecord[], title: string, subtitle: string) => {
    const totalRecords = records.length;
    const presents = records.filter(r => r.status === 'حاضر').length;
    const lates = records.filter(r => r.status === 'متأخر').length;
    const absences = records.filter(r => r.status === 'غياب').length;
    
    let totalHours = 0;
    records.forEach(r => {
      if (r.checkOut) {
        totalHours += r.totalHours || 0;
      }
    });

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('الرجاء السماح بالنوافذ المنبثقة لتصدير التقرير بنجاح.');
      return;
    }

    const recordsHtml = records.map((rec, idx) => {
      const emp = employees.find(e => e.id === rec.employeeId);
      const role = emp ? emp.role : 'موظف';
      const modelText = rec.workModel === 'on-site' ? 'حضوري' : 'عن بعد';
      const statusColor = rec.status === 'حاضر' ? 'color: #10b981;' : rec.status === 'متأخر' ? 'color: #f59e0b;' : 'color: #ef4444;';
      
      return `
        <tr style="border-bottom: 1px solid #e5e7eb; font-size: 11px;">
          <td style="padding: 10px; font-weight: bold; text-align: center; border: 1px solid #e5e7eb;">${idx + 1}</td>
          <td style="padding: 10px; text-align: right; font-weight: bold; border: 1px solid #e5e7eb;">${rec.employeeName}</td>
          <td style="padding: 10px; text-align: right; color: #4b5563; border: 1px solid #e5e7eb;">${role}</td>
          <td style="padding: 10px; text-align: center; font-family: monospace; border: 1px solid #e5e7eb;">${rec.date}</td>
          <td style="padding: 10px; text-align: center; border: 1px solid #e5e7eb;">${modelText}</td>
          <td style="padding: 10px; text-align: center; font-family: monospace; border: 1px solid #e5e7eb;">${rec.checkIn || '-'}</td>
          <td style="padding: 10px; text-align: center; font-family: monospace; border: 1px solid #e5e7eb;">${rec.checkOut || '-'}</td>
          <td style="padding: 10px; text-align: center; font-weight: bold; border: 1px solid #e5e7eb;">${rec.checkOut ? rec.totalHours + ' س' : 'قيد العمل'}</td>
          <td style="padding: 10px; text-align: center; font-weight: bold; ${statusColor} border: 1px solid #e5e7eb;">${rec.status}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
          body {
            font-family: 'Cairo', sans-serif;
            color: #1f2937;
            margin: 0;
            padding: 40px;
            background-color: #ffffff;
            direction: rtl;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px solid #D4AF37;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .logo-area {
            text-align: right;
          }
          .company-name {
            font-size: 20px;
            font-weight: 800;
            color: #111827;
            margin: 0;
          }
          .company-sub {
            font-size: 11px;
            color: #6b7280;
            margin: 5px 0 0 0;
          }
          .report-meta {
            text-align: left;
          }
          .report-title {
            font-size: 22px;
            font-weight: 800;
            color: #111827;
            margin: 0;
          }
          .report-subtitle {
            font-size: 13px;
            color: #D4AF37;
            font-weight: 600;
            margin: 5px 0 0 0;
          }
          .meta-info {
            font-size: 10px;
            color: #4b5563;
            margin-top: 8px;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 12px;
            margin-bottom: 30px;
          }
          .stat-card {
            background-color: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 10px;
            text-align: center;
          }
          .stat-label {
            font-size: 10px;
            color: #6b7280;
            font-weight: 600;
            margin-bottom: 3px;
          }
          .stat-value {
            font-size: 16px;
            font-weight: 700;
            color: #111827;
          }
          .records-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 40px;
            font-size: 11px;
          }
          .records-table th {
            background-color: #111827;
            color: #ffffff;
            padding: 10px;
            font-weight: bold;
            text-align: right;
            border: 1px solid #e5e7eb;
          }
          .records-table th:nth-child(1),
          .records-table th:nth-child(4),
          .records-table th:nth-child(5),
          .records-table th:nth-child(6),
          .records-table th:nth-child(7),
          .records-table th:nth-child(8),
          .records-table th:nth-child(9) {
            text-align: center;
          }
          .signatures-section {
            margin-top: 50px;
            display: flex;
            justify-content: space-between;
            page-break-inside: avoid;
          }
          .signature-box {
            width: 230px;
            text-align: center;
            border-top: 1.5px solid #d1d5db;
            padding-top: 10px;
            font-size: 11px;
            color: #374151;
          }
          .signature-title {
            font-weight: bold;
            margin-bottom: 25px;
          }
          @media print {
            body {
              padding: 15px;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-area">
            <h1 class="company-name">نظام checkInTime لضبط الحضور والانصراف</h1>
            <p class="company-sub">لوحة المراقبة والإشراف الإداري المتكاملة</p>
          </div>
          <div class="report-meta">
            <h2 class="report-title">${title}</h2>
            <p class="report-subtitle">${subtitle}</p>
            <div class="meta-info">
              تاريخ استخراج التقرير: ${new Date().toLocaleDateString('ar-EG')} | الوقت: ${new Date().toLocaleTimeString('ar-EG')}
            </div>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">إجمالي السجلات</div>
            <div class="stat-value" style="color: #111827;">${totalRecords}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">حضور في الموعد</div>
            <div class="stat-value" style="color: #10b981;">${presents}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">تأخير مرصود</div>
            <div class="stat-value" style="color: #f59e0b;">${lates}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">غياب كلي</div>
            <div class="stat-value" style="color: #ef4444;">${absences}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">ساعات العمل المنجزة</div>
            <div class="stat-value" style="color: #3b82f6;">${totalHours.toFixed(1)} س</div>
          </div>
        </div>

        <table class="records-table">
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">م</th>
              <th>الموظف</th>
              <th>الدور الوظيفي</th>
              <th style="text-align: center;">التاريخ</th>
              <th style="text-align: center;">نموذج العمل</th>
              <th style="text-align: center;">حضور</th>
              <th style="text-align: center;">انصراف</th>
              <th style="text-align: center;">ساعات العمل</th>
              <th style="text-align: center;">الحالة</th>
            </tr>
          </thead>
          <tbody>
            ${recordsHtml}
          </tbody>
        </table>

        <div class="signatures-section">
          <div class="signature-box">
            <div class="signature-title">إدارة الموارد البشرية</div>
            <p>الاسم: ....................................</p>
            <p>التوقيع: ..................................</p>
          </div>
          <div class="signature-box">
            <div class="signature-title">الاعتماد والختم الرسمي</div>
            <p>الاسم: ....................................</p>
            <p>التوقيع: ..................................</p>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleExport = (format: 'PDF' | 'Excel') => {
    const monthRecords = attendanceRecords.filter(r => r.date.startsWith(reportMonth));
    if (monthRecords.length === 0) {
      alert(`لا توجد سجلات حضور وانصراف مرصودة لشهر ${reportMonth}`);
      return;
    }

    const title = `تقرير الحضور والانصراف لشهر ${reportMonth}`;
    const subtitle = `الفترة المحددة: لشهر ${reportMonth}`;
    
    if (format === 'Excel') {
      exportToExcel(monthRecords, title);
    } else {
      exportToPDF(monthRecords, title, subtitle);
    }
  };

  // Live filtered records based on the custom period and selected filters
  const filteredRecords = React.useMemo(() => {
    return attendanceRecords.filter(rec => {
      // 1. Date range filter
      if (rec.date < filterStartDate || rec.date > filterEndDate) {
        return false;
      }
      // 2. Employee filter
      if (filterEmployeeId !== 'all' && rec.employeeId !== filterEmployeeId) {
        return false;
      }
      // 3. Work model filter
      if (filterWorkModel !== 'all' && rec.workModel !== filterWorkModel) {
        return false;
      }
      // 4. Status filter
      if (filterStatus !== 'all' && rec.status !== filterStatus) {
        return false;
      }
      return true;
    });
  }, [attendanceRecords, filterStartDate, filterEndDate, filterEmployeeId, filterWorkModel, filterStatus]);

  // Handle Save Edited Record
  const handleSaveEditRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    if (!editRecDate) {
      setEditRecError('الرجاء تحديد تاريخ صحيح.');
      return;
    }

    let totalHrs = 0;
    if (editRecCheckIn && editRecCheckOut) {
      try {
        const [h1, m1] = editRecCheckIn.split(':').map(Number);
        const [h2, m2] = editRecCheckOut.split(':').map(Number);
        const diffMin = (h2 * 60 + m2) - (h1 * 60 + m1);
        totalHrs = parseFloat(Math.max(0, diffMin / 60).toFixed(2));
        if (totalHrs < 0) {
          setEditRecError('وقت الانصراف لا يمكن أن يكون قبل وقت الحضور.');
          return;
        }
      } catch (err) {
        setEditRecError('خطأ في حساب ساعات العمل من التوقيت المدخل.');
        return;
      }
    }

    const updated: AttendanceRecord = {
      ...editingRecord,
      date: editRecDate,
      checkIn: editRecCheckIn || null,
      checkOut: editRecCheckOut || null,
      status: editRecStatus,
      workModel: editRecWorkModel,
      totalHours: totalHrs,
    };

    onUpdateAttendance?.(updated);
    setEditingRecord(null);
  };

  // Add Employee Handler
  const handleAddEmployeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!newEmpName.trim() || !newEmpEmail.trim() || !newEmpRole.trim() || !newEmpUsername.trim() || !newEmpPassword.trim()) {
      setFormError('الرجاء ملء جميع الحقول المطلوبة بما في ذلك اسم المستخدم وكلمة المرور.');
      return;
    }

    onAddEmployee({
      name: newEmpName,
      email: newEmpEmail,
      role: newEmpRole,
      workModel: newEmpModel,
      status: 'active',
      username: newEmpUsername,
      password: newEmpPassword,
    });

    // Reset Form
    setNewEmpName('');
    setNewEmpEmail('');
    setNewEmpRole('');
    setNewEmpModel('on-site');
    setNewEmpUsername('');
    setNewEmpPassword('');
    setShowAddModal(false);
  };

  // Save Office Coordinates Settings
  const handleSaveOfficeSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateOfficeSettings({
      latitude: Number(officeForm.latitude),
      longitude: Number(officeForm.longitude),
      radius: Number(officeForm.radius),
      addressName: officeForm.addressName,
      workStartTime: officeForm.workStartTime || '08:30',
      workEndTime: officeForm.workEndTime || '16:30',
      lateGracePeriod: officeForm.lateGracePeriod !== undefined ? Number(officeForm.lateGracePeriod) : 10,
      mapLink: locationInput,
    });
    setShowSettingsSuccess(true);
    setTimeout(() => setShowSettingsSuccess(false), 4000);
  };

  return (
    <div className="flex flex-col gap-6 min-h-[600px] text-right" id="admin-panel-root">
      
      {/* 1. COMPACT TOP-RIGHT MENU TRIGGER (MINIMALIST) */}
      <div className="flex items-center justify-between bg-[#121214]/40 border border-[#27272A]/40 rounded-2xl p-3 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            id="btn-open-admin-side-menu"
            type="button"
            onClick={() => setIsSideMenuOpen(true)}
            className="p-3 rounded-xl bg-[#121214] hover:bg-[#1C1D21] border border-[#27272A] hover:border-[#D4AF37]/50 text-[#D4AF37] hover:text-[#F3C63F] transition-all duration-150 cursor-pointer shadow-md hover:scale-[1.03] flex items-center gap-2"
            title="فتح القائمة الجانبية"
          >
            <Menu className="w-5 h-5" />
            <span className="text-xs font-bold text-white hidden sm:inline">القائمة الجانبية</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#8E8E93]">
          <span>القسم المعروض:</span>
          <span className="text-[#D4AF37] font-bold bg-[#121214] px-2.5 py-1.5 rounded-lg border border-[#27272A]">
            {activeTab === 'dashboard' && 'لوحة التحكم والملخص'}
            {activeTab === 'employees' && 'إدارة الموظفين'}
            {activeTab === 'reports' && 'صفحة التقارير'}
            {activeTab === 'settings' && 'الإعدادات'}
          </span>
        </div>
      </div>

      {/* 2. COLLAPSIBLE SIDE DRAWER MENU (SLIDE-OVER) */}
      {isSideMenuOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden text-right" id="admin-panel-drawer" role="dialog" aria-modal="true">
          {/* Backdrop Blur Overlay */}
          <div 
            className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity duration-300 cursor-pointer" 
            onClick={() => setIsSideMenuOpen(false)}
          ></div>

          {/* Sliding Panel Content (Right-aligned drawer) */}
          <div className="absolute inset-y-0 right-0 max-w-sm w-full bg-[#121214] border-l border-[#27272A] shadow-2xl flex flex-col justify-between p-6 transform transition-transform duration-300">
            
            <div className="space-y-6">
              
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[#27272A]">
                <button 
                  type="button"
                  onClick={() => setIsSideMenuOpen(false)}
                  className="p-1.5 rounded-lg bg-[#1A1C1E] hover:bg-[#27272A] border border-[#27272A] text-[#8E8E93] hover:text-[#E4E4E7] transition-all cursor-pointer"
                  title="إغلاق القائمة"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="text-right">
                  <h2 className="text-sm font-bold text-[#E4E4E7]">قائمة الإدارة</h2>
                  <p className="text-[10px] text-[#8E8E93] mt-0.5">خيارات لوحة التحكم والتهيئة</p>
                </div>
              </div>

              {/* Admin Profile Section inside Drawer */}
              <div className="bg-[#0F0F11] border border-[#27272A]/80 rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#1A1C1E] to-[#121214] border border-[#D4AF37]/30 flex items-center justify-center shadow-lg text-[#D4AF37] shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">مدير النظام (الرئيسي)</h3>
                  <p className="text-[9px] text-[#8E8E93] mt-0.5">لوحة التحكم والقرارات الإدارية</p>
                </div>
              </div>

              {/* Navigation Menu Links */}
              <nav className="flex flex-col gap-2" aria-label="لوحة التحكم الفرعية">
                
                <button
                  id="drawer-tab-btn-dashboard"
                  onClick={() => {
                    setActiveTab('dashboard');
                    setIsSideMenuOpen(false); // Close drawer
                  }}
                  className={`w-full text-right px-4 py-3.5 rounded-xl transition-all duration-200 flex items-center gap-3 ${
                    activeTab === 'dashboard'
                      ? 'bg-[#1D1E22] text-[#D4AF37] border border-[#D4AF37]/20 font-bold'
                      : 'text-[#8E8E93] hover:text-[#E4E4E7] hover:bg-[#1A1A1E]'
                  }`}
                >
                  <LayoutDashboard className={`w-5 h-5 shrink-0 ${activeTab === 'dashboard' ? 'text-[#D4AF37]' : 'text-[#8E8E93]'}`} />
                  <div className="flex-1">
                    <span className="block text-xs font-bold">لوحة التحكم والملخص</span>
                    <span className="block text-[9px] text-[#8E8E93] font-normal">رصد الحالات اليومية والطلبات</span>
                  </div>
                  {activePending.length > 0 && (
                    <span className="bg-amber-500 text-slate-950 text-[10px] px-2 py-0.5 rounded-full font-extrabold animate-pulse">
                      {activePending.length}
                    </span>
                  )}
                </button>

                <button
                  id="drawer-tab-btn-employees"
                  onClick={() => {
                    setActiveTab('employees');
                    setIsSideMenuOpen(false); // Close drawer
                  }}
                  className={`w-full text-right px-4 py-3.5 rounded-xl transition-all duration-200 flex items-center gap-3 ${
                    activeTab === 'employees'
                      ? 'bg-[#1D1E22] text-[#D4AF37] border border-[#D4AF37]/20 font-bold'
                      : 'text-[#8E8E93] hover:text-[#E4E4E7] hover:bg-[#1A1A1E]'
                  }`}
                >
                  <Users className={`w-5 h-5 shrink-0 ${activeTab === 'employees' ? 'text-[#D4AF37]' : 'text-[#8E8E93]'}`} />
                  <div className="flex-1">
                    <span className="block text-xs font-bold">إدارة الموظفين</span>
                    <span className="block text-[9px] text-[#8E8E93] font-normal">تسجيل وبيانات الكادر</span>
                  </div>
                  <span className="bg-[#1A1C1E] border border-[#27272A] text-[#E4E4E7] text-[10px] px-2 py-0.5 rounded-full font-semibold font-mono">
                    {employees.length}
                  </span>
                </button>

                <button
                  id="drawer-tab-btn-reports"
                  onClick={() => {
                    setActiveTab('reports');
                    setIsSideMenuOpen(false); // Close drawer
                  }}
                  className={`w-full text-right px-4 py-3.5 rounded-xl transition-all duration-200 flex items-center gap-3 ${
                    activeTab === 'reports'
                      ? 'bg-[#1D1E22] text-[#D4AF37] border border-[#D4AF37]/20 font-bold'
                      : 'text-[#8E8E93] hover:text-[#E4E4E7] hover:bg-[#1A1A1E]'
                  }`}
                >
                  <FileText className={`w-5 h-5 shrink-0 ${activeTab === 'reports' ? 'text-[#D4AF37]' : 'text-[#8E8E93]'}`} />
                  <div className="flex-1">
                    <span className="block text-xs font-bold">صفحة التقارير</span>
                    <span className="block text-[9px] text-[#8E8E93] font-normal">أداء الحضور الشهري</span>
                  </div>
                </button>

                <button
                  id="drawer-tab-btn-settings"
                  onClick={() => {
                    setActiveTab('settings');
                    setIsSideMenuOpen(false); // Close drawer
                  }}
                  className={`w-full text-right px-4 py-3.5 rounded-xl transition-all duration-200 flex items-center gap-3 ${
                    activeTab === 'settings'
                      ? 'bg-[#1D1E22] text-[#D4AF37] border border-[#D4AF37]/20 font-bold'
                      : 'text-[#8E8E93] hover:text-[#E4E4E7] hover:bg-[#1A1A1E]'
                  }`}
                >
                  <Settings className={`w-5 h-5 shrink-0 ${activeTab === 'settings' ? 'text-[#D4AF37]' : 'text-[#8E8E93]'}`} />
                  <div className="flex-1">
                    <span className="block text-xs font-bold">إعدادات موقع المنشأة</span>
                    <span className="block text-[9px] text-[#8E8E93] font-normal">النطاق الجغرافي للمقر</span>
                  </div>
                </button>

              </nav>

            </div>

            {/* Drawer Footer close button */}
            <div className="pt-4 border-t border-[#27272A]">
              <button
                type="button"
                onClick={() => setIsSideMenuOpen(false)}
                className="w-full bg-[#1A1C1E] hover:bg-[#27272A] border border-[#27272A] text-[#E4E4E7] font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer text-center"
              >
                إغلاق القائمة الجانبية
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 3. FULL-WIDTH MAIN CONTENT AREA */}
      <main className="flex-1 min-w-0 space-y-6" id="admin-main-content">
        
        {/* TAB 1: DASHBOARD OVERVIEW */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6" id="admin-tab-dashboard">
            
            {/* Elegant Welcome Banner */}
            <div className="bg-[#121214] rounded-2xl border border-[#27272A] p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden">
              <div className="absolute -top-12 -left-12 w-32 h-32 bg-[#D4AF37] opacity-5 blur-[60px] pointer-events-none"></div>

              <div className="flex items-center gap-3 relative z-10 text-right">
                <div className="w-12 h-12 rounded-xl bg-[#1A1C1E] text-[#D4AF37] border border-[#27272A] flex items-center justify-center">
                  <LayoutDashboard className="w-6 h-6 text-[#D4AF37]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#E4E4E7]">لوحة تحكم النظام الموحدة</h2>
                  <p className="text-xs text-[#8E8E93] mt-0.5">رصد فوري لحالات حضور وانصراف الموظفين والطلبات المعلقة</p>
                </div>
              </div>

              <div className="flex gap-4 relative z-10 shrink-0">
                <div className="bg-[#0F0F11] px-4 py-2 rounded-xl border border-[#27272A] text-center">
                  <p className="text-[10px] text-[#8E8E93] font-medium">الطلبات المعلقة</p>
                  <p className="text-lg font-extrabold text-amber-500 font-mono">{activePending.length}</p>
                </div>
                <div className="bg-[#0F0F11] px-4 py-2 rounded-xl border border-[#27272A] text-center">
                  <p className="text-[10px] text-[#8E8E93] font-medium">إجمالي الموظفين</p>
                  <p className="text-lg font-extrabold text-blue-400 font-mono">{employees.length}</p>
                </div>
              </div>
            </div>

            {/* General Metrics Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-[#121214] border border-[#27272A] rounded-xl p-4 flex items-center justify-between">
                <div className="text-right">
                  <span className="text-[11px] text-[#8E8E93]">نسبة الانضباط</span>
                  <p className="text-xl font-bold text-emerald-400 mt-1 font-mono">
                    {reports.attendanceRate || 0}%
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-emerald-950/30 text-emerald-400 border border-emerald-900/20 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-[#121214] border border-[#27272A] rounded-xl p-4 flex items-center justify-between">
                <div className="text-right">
                  <span className="text-[11px] text-[#8E8E93]">المتواجدون حالياً</span>
                  <p className="text-xl font-bold text-amber-500 mt-1 font-mono">
                    {activeNowCount} موظفين
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-amber-950/30 text-amber-500 border border-amber-900/20 flex items-center justify-center">
                  <Users className="w-5 h-5 animate-pulse" />
                </div>
              </div>

              <div className="bg-[#121214] border border-[#27272A] rounded-xl p-4 flex items-center justify-between">
                <div className="text-right">
                  <span className="text-[11px] text-[#8E8E93]">إجمالي ساعات هذا الشهر</span>
                  <p className="text-xl font-bold text-blue-400 mt-1 font-mono">
                    {reports.totalHours || 0} ساعة
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-blue-950/30 text-blue-400 border border-blue-900/20 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-[#121214] border border-[#27272A] rounded-xl p-4 flex items-center justify-between">
                <div className="text-right flex-1 min-w-0">
                  <span className="text-[11px] text-[#8E8E93] block">المقر الرئيسي للمطابقة</span>
                  <p className="text-[11px] font-bold text-amber-500 mt-1 truncate" title={officeSettings.addressName}>
                    {officeSettings.addressName}
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('settings')}
                    className="text-[10px] text-[#D4AF37] hover:underline flex items-center gap-1 mt-1 font-bold cursor-pointer"
                  >
                    <Settings className="w-3 h-3 text-[#D4AF37]" />
                    <span>تعديل موقع المنشأة</span>
                  </button>
                </div>
                <div className="w-10 h-10 rounded-lg bg-amber-950/30 text-[#D4AF37] border border-amber-900/20 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Recharts Graphical Dashboard Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="dashboard-charts-grid">
              {/* Chart 1: Daily Attendance Status (Pie Chart) */}
              <div className="bg-[#121214] border border-[#27272A] rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
                <div className="absolute -top-12 -left-12 w-24 h-24 bg-emerald-500 opacity-[0.02] blur-3xl pointer-events-none"></div>
                <div>
                  <h3 className="text-sm font-bold text-[#E4E4E7] flex items-center gap-2 mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></span>
                    <span>توزيع حالات التحضير (اليوم)</span>
                  </h3>
                  <p className="text-[11px] text-[#8E8E93] mb-4">النسبة المئوية لحالات حضور وغياب جميع الموظفين المسجلين لليوم</p>
                </div>
                
                <div className="h-[220px] w-full flex items-center justify-center relative">
                  {employees.length === 0 ? (
                    <span className="text-xs text-[#8E8E93]">لا توجد بيانات كافية</span>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'حاضر بالوقت', value: countPresent, color: '#10B981' },
                            { name: 'متأخر عن العمل', value: countLate, color: '#F59E0B' },
                            { name: 'غياب مسجل', value: countAbsent, color: '#EF4444' },
                            { name: 'لم يحضر بعد', value: countNotCheckedIn, color: '#3F3F46' }
                          ].filter(d => d.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {[
                            { name: 'حاضر بالوقت', value: countPresent, color: '#10B981' },
                            { name: 'متأخر عن العمل', value: countLate, color: '#F59E0B' },
                            { name: 'غياب مسجل', value: countAbsent, color: '#EF4444' },
                            { name: 'لم يحضر بعد', value: countNotCheckedIn, color: '#3F3F46' }
                          ].filter(d => d.value > 0).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#121214',
                            borderColor: '#27272A',
                            borderRadius: '12px',
                            color: '#E4E4E7',
                            fontSize: '11px',
                            textAlign: 'right',
                          }}
                          itemStyle={{ color: '#E4E4E7' }}
                          formatter={(value: any) => [`${value} موظف`, 'العدد']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                  {/* Central Text for Pie Chart */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] text-[#8E8E93]">نسبة الحضور</span>
                    <span className="text-xl font-extrabold text-[#E4E4E7] font-mono mt-0.5">
                      {Math.round(((countPresent + countLate) / (employees.length || 1)) * 100)}%
                    </span>
                  </div>
                </div>

                {/* Customized Legends with Counts */}
                <div className="grid grid-cols-2 gap-2 mt-4 text-[10px] text-[#E4E4E7]">
                  <div className="flex items-center gap-1.5 justify-start">
                    <span className="w-2.5 h-2.5 rounded bg-[#10B981] shrink-0"></span>
                    <span className="truncate">حاضر بالوقت ({countPresent})</span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-start">
                    <span className="w-2.5 h-2.5 rounded bg-[#F59E0B] shrink-0"></span>
                    <span className="truncate">متأخر ({countLate})</span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-start">
                    <span className="w-2.5 h-2.5 rounded bg-[#EF4444] shrink-0"></span>
                    <span className="truncate">غياب ({countAbsent})</span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-start">
                    <span className="w-2.5 h-2.5 rounded bg-[#3F3F46] shrink-0"></span>
                    <span className="truncate">لم يحضر ({countNotCheckedIn})</span>
                  </div>
                </div>
              </div>

              {/* Chart 2: Departure Status Today (Bar Chart / Progress Stack) */}
              <div className="bg-[#121214] border border-[#27272A] rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
                <div className="absolute -top-12 -left-12 w-24 h-24 bg-[#F43F5E] opacity-[0.02] blur-3xl pointer-events-none"></div>
                <div>
                  <h3 className="text-sm font-bold text-[#E4E4E7] flex items-center gap-2 mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></span>
                    <span>حالة الانصراف اليومية</span>
                  </h3>
                  <p className="text-[11px] text-[#8E8E93] mb-4">مقارنة بين عدد الموظفين على رأس العمل والذين سجلوا انصرافهم</p>
                </div>

                <div className="h-[220px] w-full flex items-center justify-center relative">
                  {employees.length === 0 ? (
                    <span className="text-xs text-[#8E8E93]">لا توجد بيانات كافية</span>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { name: 'على رأس العمل', 'الموظفين': countOnDuty, color: '#3B82F6' },
                          { name: 'سجل الانصراف', 'الموظفين': countCheckedOut, color: '#F43F5E' },
                        ]}
                        barSize={32}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#1F1F22" vertical={false} />
                        <XAxis 
                          dataKey="name" 
                          stroke="#8E8E93" 
                          fontSize={10} 
                          tickLine={false}
                          axisLine={false} 
                        />
                        <YAxis 
                          stroke="#8E8E93" 
                          fontSize={10} 
                          tickLine={false}
                          axisLine={false} 
                          allowDecimals={false}
                        />
                        <Tooltip
                          cursor={{ fill: '#1A1C1E', opacity: 0.3 }}
                          contentStyle={{
                            backgroundColor: '#121214',
                            borderColor: '#27272A',
                            borderRadius: '12px',
                            color: '#E4E4E7',
                            fontSize: '11px',
                            textAlign: 'right',
                          }}
                        />
                        <Bar dataKey="الموظفين" radius={[6, 6, 0, 0]}>
                          <Cell fill="#3B82F6" />
                          <Cell fill="#F43F5E" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Customized Stats summary */}
                <div className="grid grid-cols-2 gap-4 mt-4 text-center border-t border-[#1F1F22] pt-3 text-xs">
                  <div>
                    <span className="text-[#8E8E93] block text-[9px] mb-0.5">المغادرون</span>
                    <span className="text-rose-400 font-extrabold font-mono text-sm">{countCheckedOut} موظف</span>
                  </div>
                  <div>
                    <span className="text-[#8E8E93] block text-[9px] mb-0.5">على رأس العمل</span>
                    <span className="text-blue-400 font-extrabold font-mono text-sm">{countOnDuty} موظف</span>
                  </div>
                </div>
              </div>

              {/* Chart 3: Weekly Attendance & Departure Trend (Area Chart) */}
              <div className="bg-[#121214] border border-[#27272A] rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
                <div className="absolute -top-12 -left-12 w-24 h-24 bg-[#D4AF37] opacity-[0.02] blur-3xl pointer-events-none"></div>
                <div>
                  <h3 className="text-sm font-bold text-[#E4E4E7] flex items-center gap-2 mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></span>
                    <span>معدل الحضور والانصراف (أسبوعي)</span>
                  </h3>
                  <p className="text-[11px] text-[#8E8E93] mb-4">معدل الانضباط والالتزام اليومي لآخر 7 أيام عمل بالمنشأة</p>
                </div>

                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="colorAttendance" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorDeparture" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#F43F5E" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1F1F22" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        stroke="#8E8E93" 
                        fontSize={10} 
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        stroke="#8E8E93" 
                        fontSize={10} 
                        tickLine={false}
                        axisLine={false}
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#121214',
                          borderColor: '#27272A',
                          borderRadius: '12px',
                          color: '#E4E4E7',
                          fontSize: '11px',
                          textAlign: 'right',
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="نسبة الحضور" 
                        stroke="#10B981" 
                        fillOpacity={1} 
                        fill="url(#colorAttendance)" 
                        strokeWidth={2}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="نسبة الانصراف" 
                        stroke="#F43F5E" 
                        fillOpacity={1} 
                        fill="url(#colorDeparture)" 
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend indicator for Area chart */}
                <div className="flex justify-center gap-4 mt-4 text-[10px] text-[#E4E4E7]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
                    <span>معدل الحضور اليومي</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#F43F5E]"></span>
                    <span>معدل الانصراف اليومي</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Daily Attendance Status Section ("الوضع الحالي") */}
            <div className="bg-[#121214] rounded-2xl border border-[#27272A] p-6 shadow-xl relative overflow-hidden text-right" id="live-status-section">
              <div className="border-b border-[#27272A] pb-4 mb-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div className="text-right">
                  <h3 className="text-base font-bold text-[#E4E4E7] flex items-center justify-start gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
                    <span>الوضع الحالي لموظفي المنشأة (اليوم)</span>
                  </h3>
                  <p className="text-xs text-[#8E8E93] mt-0.5">متابعة فورية ومباشرة لحالة حضور وانصراف الموظفين خلال ساعات العمل الحالية</p>
                </div>
                <div className="text-xs text-[#8E8E93] font-mono bg-[#0F0F11] border border-[#27272A] px-3 py-1.5 rounded-xl self-start sm:self-auto">
                  {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>

              {/* Archive Today's Records Banner */}
              {(() => {
                const todayUnarchivedRecords = attendanceRecords.filter(r => r.date === todayStr && !r.archived);
                const attendedCount = todayUnarchivedRecords.filter(r => r.status !== 'غياب').length;
                const checkedOutCount = todayUnarchivedRecords.filter(r => r.checkOut && r.status !== 'غياب').length;
                const isEveryoneCheckedOut = attendedCount > 0 && attendedCount === checkedOutCount;

                if (todayUnarchivedRecords.length === 0) return null;

                return (
                  <div className={`p-4 rounded-xl mb-4 text-right flex flex-col md:flex-row items-center justify-between gap-3 border ${
                    isEveryoneCheckedOut 
                      ? 'bg-emerald-950/20 border-emerald-900/30 text-emerald-400 shadow-md animate-fade-in' 
                      : 'bg-zinc-900/30 border-[#27272A] text-zinc-400'
                  }`}>
                    <div>
                      <p className="text-xs font-bold text-[#E4E4E7] flex items-center gap-2">
                        {isEveryoneCheckedOut ? (
                          <>
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>🎉 مكتمل! جميع الموظفين الذين حضروا اليوم قد سجلوا انصرافهم بنجاح.</span>
                          </>
                        ) : (
                          <>
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                            <span>📝 تنبيه: هناك موظفون لا زالوا على رأس العمل أو لم يسجلوا انصرافهم بعد.</span>
                          </>
                        )}
                      </p>
                      <p className="text-[11px] text-[#8E8E93] mt-1">
                        يمكنك الآن ترحيل وأرشفة سجلات اليوم للتقارير وتصفير القائمة لبدء يوم عمل جديد.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('هل أنت متأكد من رغبتك في أرشفة وترحيل جميع سجلات اليوم الحالية وتصفير اللوحة؟ (ستظل السجلات محفوظة بشكل كامل في قسم التقارير)')) {
                          onArchiveTodayRecords?.();
                        }
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                        isEveryoneCheckedOut 
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/10' 
                          : 'bg-[#27272A] hover:bg-[#323235] text-[#E4E4E7] border border-[#3A3A3D]'
                      }`}
                    >
                      <Archive className="w-3.5 h-3.5" />
                      <span>ترحيل السجلات وتصفير القائمة</span>
                    </button>
                  </div>
                );
              })()}

              {employees.length === 0 ? (
                <div className="text-center py-8 text-[#8E8E93] text-xs">
                  لا يوجد موظفون مضافون بالنظام حالياً لمتابعة وضعهم اليومي.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[#27272A]">
                  <table className="w-full min-w-[950px] text-right border-collapse text-xs whitespace-nowrap">
                    <thead>
                      <tr className="bg-[#0F0F11] border-b border-[#27272A] text-[#8E8E93] font-bold">
                        <th className="px-4 py-3 text-right">الموظف</th>
                        <th className="px-4 py-3 text-right">نموذج العمل</th>
                        <th className="px-4 py-3 text-right">حالة التحضير اليومية</th>
                        <th className="px-4 py-3 text-right">وقت الحضور</th>
                        <th className="px-4 py-3 text-right">وقت الانصراف</th>
                        <th className="px-4 py-3 text-right">عدد ساعات العمل</th>
                        <th className="px-4 py-3 text-center">الإجراءات والسجلات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#27272A] text-[#E4E4E7]">
                      {employees.map((emp) => {
                        const todayRecord = attendanceRecords.find(r => r.employeeId === emp.id && r.date === todayStr && !r.archived);
                        
                        // Check if there is a pending check-in/out request for this employee today
                        const pendingIn = pendingRequests.find(r => r.employeeId === emp.id && r.date === todayStr && r.type === 'check-in' && r.status === 'pending');
                        const pendingOut = pendingRequests.find(r => r.employeeId === emp.id && r.date === todayStr && r.type === 'check-out' && r.status === 'pending');

                        let statusBadge = null;
                        if (todayRecord) {
                          if (todayRecord.status === 'حاضر') {
                            statusBadge = <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/40 text-emerald-400 border border-emerald-900/30">حاضر</span>;
                          } else if (todayRecord.status === 'متأخر') {
                            statusBadge = <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/40 text-amber-400 border border-amber-900/30">متأخر</span>;
                          } else {
                            statusBadge = <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/40 text-rose-400 border border-rose-900/30">غياب</span>;
                          }
                        } else if (pendingIn) {
                          statusBadge = <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-950/40 text-blue-400 border border-blue-900/30 animate-pulse">طلب حضور معلق</span>;
                        } else {
                          statusBadge = <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-900 text-zinc-500 border border-zinc-800">لم يحضر بعد</span>;
                        }

                        return (
                          <tr key={emp.id} className="hover:bg-[#0F0F11]/40 transition-colors">
                            <td className="px-4 py-3 font-bold text-[#E4E4E7]">
                              <div className="flex items-center gap-2">
                                <span className={`w-7 h-7 rounded-full ${emp.avatarColor} text-white flex items-center justify-center text-[10px] font-bold shrink-0`}>
                                  {emp.name.split(' ').map(n => n[0]).join('')}
                                </span>
                                <div>
                                  <p className="text-xs">{emp.name}</p>
                                  <p className="text-[9px] text-[#8E8E93] font-normal">{emp.role}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {emp.workModel === 'on-site' ? (
                                <span className="text-slate-300">حضوري (ميداني)</span>
                              ) : (
                                <span className="text-[#D4AF37] font-medium">عن بُعد</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {statusBadge}
                            </td>
                            <td className="px-4 py-3 font-mono text-emerald-400 font-bold">
                              {todayRecord ? todayRecord.checkIn : '-'}
                            </td>
                            <td className="px-4 py-3 font-mono">
                              {todayRecord ? (
                                todayRecord.checkOut ? (
                                  <span className="text-rose-400 font-bold">{todayRecord.checkOut}</span>
                                ) : pendingOut ? (
                                  <span className="text-blue-400 animate-pulse font-bold">طلب انصراف معلق</span>
                                ) : (
                                  <span className="text-amber-500 font-medium animate-pulse">على رأس العمل</span>
                                )
                              ) : '-'}
                            </td>
                            <td className="px-4 py-3 font-mono">
                              {todayRecord ? (
                                todayRecord.checkOut ? (
                                  <span className="text-emerald-400 font-bold">{todayRecord.totalHours} ساعة (مكتملة)</span>
                                ) : (
                                  <span className="text-amber-400 font-semibold">{getHoursWorked(todayRecord)} ساعة (مستمرة)</span>
                                )
                              ) : '-'}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {todayRecord && !todayRecord.checkOut ? (
                                forceCheckOutConfirmId === emp.id ? (
                                  <div className="flex items-center gap-1 bg-rose-950/20 border border-rose-900/30 p-1 rounded-lg">
                                    <span className="text-[9px] text-rose-300 font-bold">متأكد؟</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onForceCheckOut?.(emp.id);
                                        setForceCheckOutConfirmId(null);
                                      }}
                                      className="text-emerald-400 hover:text-emerald-300 p-0.5 bg-emerald-950/40 rounded transition-colors cursor-pointer"
                                      title="نعم"
                                    >
                                      <Check className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setForceCheckOutConfirmId(null)}
                                      className="text-rose-400 hover:text-rose-300 p-0.5 bg-rose-900/10 rounded transition-colors cursor-pointer"
                                      title="إلغاء"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setForceCheckOutConfirmId(emp.id)}
                                    className="bg-rose-950/40 hover:bg-rose-900/40 text-rose-400 border border-rose-900/30 text-[10px] px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer"
                                  >
                                    تسجيل انصراف
                                  </button>
                                )
                              ) : todayRecord && todayRecord.checkOut ? (
                                <span className="text-emerald-400 font-bold">تم الانصراف بنجاح ✓</span>
                              ) : (
                                <span className="text-zinc-600">غير متاح حالياً</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Daily Remote Approvals Module */}
            <div className="bg-[#121214] rounded-2xl border border-[#27272A] p-6 shadow-xl relative">
              <div className="border-b border-[#27272A] pb-4 mb-4 flex justify-between items-center">
                <div className="text-right">
                  <h3 className="text-base font-bold text-[#E4E4E7]">طلبات التحضير المعلقة</h3>
                  <p className="text-xs text-[#8E8E93] mt-0.5">طلبات العمل عن بعد والتحضير خارج النطاق الجغرافي التي تحتاج مراجعة</p>
                </div>
                <span className="bg-[#0F0F11] text-amber-500 border border-amber-500/30 text-[10px] px-2.5 py-1 rounded-full font-bold">
                  {activePending.length} طلبات معلقة
                </span>
              </div>

              {activePending.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activePending.map((req) => (
                    <div key={req.id} className="border border-[#27272A] rounded-xl p-4 space-y-3 bg-[#0F0F11] hover:border-[#D4AF37]/50 transition-all duration-200 text-right">
                      <div className="flex justify-between items-start">
                        <div className="text-right">
                          <h4 className="font-bold text-[#E4E4E7]">{req.employeeName}</h4>
                          <p className="text-xs text-[#8E8E93]">{req.role}</p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                          req.notes?.includes('خارج النطاق')
                            ? 'bg-amber-950/40 text-amber-400 border border-amber-900/30'
                            : req.type === 'check-in' 
                              ? 'bg-blue-950/40 text-blue-400 border border-blue-900/30' 
                              : 'bg-rose-950/40 text-rose-400 border border-rose-900/30'
                        }`}>
                          {req.notes?.includes('خارج النطاق')
                            ? (req.type === 'check-in' ? 'حضور خارج النطاق' : 'انصراف خارج النطاق')
                            : (req.type === 'check-in' ? 'طلب حضور عن بعد' : 'طلب انصراف عن بعد')}
                        </span>
                      </div>

                      {req.notes && (
                        <div className="bg-[#1A1C1E] border border-[#27272A] p-2 rounded-lg text-xs text-[#D4AF37] flex items-center gap-1.5 justify-start">
                          <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>{req.notes}</span>
                        </div>
                      )}

                      <div className="border-t border-[#27272A] pt-3 grid grid-cols-2 gap-2 text-xs text-[#8E8E93]">
                        <div>
                          <span>تاريخ الطلب:</span>
                          <strong className="block text-[#E4E4E7] mt-0.5 font-mono">{req.date}</strong>
                        </div>
                        <div>
                          <span>ساعة التسجيل:</span>
                          <strong className="block text-[#E4E4E7] mt-0.5 font-mono">{req.time}</strong>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-[#27272A]">
                        <button
                          id={`btn-approve-${req.id}`}
                          onClick={() => onApproveRequest(req.id)}
                          className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 border border-emerald-600/30 transition-colors duration-150 cursor-pointer"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>اعتماد وقبول</span>
                        </button>
                        
                        <button
                          id={`btn-reject-${req.id}`}
                          onClick={() => onRejectRequest(req.id)}
                          className="flex-1 bg-[#1A1C1E] hover:bg-rose-950/20 text-rose-400 font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 border border-[#27272A] hover:border-rose-900/40 transition-colors duration-150 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>رفض الطلب</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border border-dashed border-[#27272A] bg-[#0F0F11] rounded-xl">
                  <Check className="w-8 h-8 text-emerald-400 mx-auto mb-2 bg-emerald-950/40 p-1.5 rounded-full border border-emerald-900/30" />
                  <p className="text-sm font-bold text-[#E4E4E7]">لا توجد أي طلبات معلقة حالياً!</p>
                  <p className="text-xs text-[#8E8E93] mt-1">تمت معالجة كافة طلبات الحضور والانصراف عن بُعد بنجاح.</p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 2: EMPLOYEES DIRECTORY */}
        {activeTab === 'employees' && (
          <div className="space-y-6" id="admin-tab-employees">
            
            <div className="bg-[#121214] rounded-2xl border border-[#27272A] p-6 shadow-xl">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6">
                <div className="text-right">
                  <h3 className="text-lg font-bold text-[#E4E4E7]">قائمة شؤون الموظفين</h3>
                  <p className="text-xs text-[#8E8E93]">إضافة، تعديل وحذف موظفي المنشأة وتعيين بيانات الدخول الخاصة بهم</p>
                </div>

                <button
                  id="btn-open-add-emp-modal"
                  onClick={() => setShowAddModal(true)}
                  className="bg-[#D4AF37] hover:bg-[#F3C63F] text-slate-950 font-extrabold text-xs py-2.5 px-4 rounded-xl flex items-center gap-1.5 transition-colors duration-150 self-start sm:self-auto cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-slate-950" />
                  <span>إضافة موظف جديد</span>
                </button>
              </div>

              {/* Employees List Directory Table */}
              {employees.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-[#27272A]">
                  <table className="w-full min-w-[950px] text-right border-collapse text-sm whitespace-nowrap">
                    <thead>
                      <tr className="bg-[#0F0F11] border-b border-[#27272A] text-[#8E8E93] font-bold">
                        <th className="px-4 py-3 text-right">الموظف</th>
                        <th className="px-4 py-3 text-right">البريد الإلكتروني</th>
                        <th className="px-4 py-3 text-right">نموذج العمل</th>
                        <th className="px-4 py-3 text-right">بيانات الدخول (المحاكاة)</th>
                        <th className="px-4 py-3 text-right">تاريخ الانضمام</th>
                        <th className="px-4 py-3 text-right">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#27272A] text-[#E4E4E7]">
                      {employees.map((emp) => (
                        <tr key={emp.id} className="hover:bg-[#0F0F11]/50 transition-colors">
                          <td className="px-4 py-3 font-bold text-[#E4E4E7]">
                            <div className="flex items-center gap-3">
                              <span className={`w-8 h-8 rounded-full ${emp.avatarColor} text-white flex items-center justify-center text-xs font-bold shrink-0`}>
                                {emp.name.split(' ').map(n => n[0]).join('')}
                              </span>
                              <div>
                                <p>{emp.name}</p>
                                <p className="text-[10px] text-[#8E8E93] font-normal">{emp.role}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-[#8E8E93] font-medium font-mono text-xs">{emp.email}</td>
                          <td className="px-4 py-3 text-xs">
                            {emp.workModel === 'on-site' ? (
                              <span className="bg-blue-950/30 text-blue-400 px-2.5 py-0.5 rounded-full font-bold border border-blue-900/30">حضوري (مكتبي)</span>
                            ) : (
                              <span className="bg-violet-950/30 text-violet-400 px-2.5 py-0.5 rounded-full font-bold border border-violet-900/30">عن بُعد</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {emp.username ? (
                              <div className="bg-[#0F0F11] p-2 rounded-lg border border-[#27272A] space-y-1 font-mono max-w-[200px]">
                                <div className="text-right flex justify-between gap-2">
                                  <span className="text-[#8E8E93] text-[9px]">المستخدم:</span>
                                  <span className="text-slate-200 font-bold">{emp.username}</span>
                                </div>
                                <div className="text-right flex justify-between gap-2 items-center">
                                  <span className="text-[#8E8E93] text-[9px]">المرور:</span>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[#D4AF37] font-bold">
                                      {visiblePasswords[emp.id] ? emp.password : '••••••••'}
                                    </span>
                                    <button 
                                      onClick={() => togglePasswordVisibility(emp.id)}
                                      className="text-[#8E8E93] hover:text-[#E4E4E7]"
                                    >
                                      {visiblePasswords[emp.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <span className="text-[#8E8E93] italic text-xs">لا توجد بيانات دخول</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-[#8E8E93] font-mono text-xs font-semibold">{emp.joinDate}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 justify-start">
                              {deleteConfirmId === emp.id ? (
                                <div className="flex items-center gap-1 bg-rose-950/20 border border-rose-900/30 p-1 rounded-lg">
                                  <span className="text-[10px] text-rose-300 font-bold">حذف؟</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onDeleteEmployee(emp.id);
                                      setDeleteConfirmId(null);
                                    }}
                                    className="text-emerald-400 hover:text-emerald-300 p-1 bg-emerald-950/40 rounded-md transition-colors cursor-pointer"
                                    title="تأكيد الحذف"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="text-rose-400 hover:text-rose-300 p-1 bg-rose-900/10 rounded-md transition-colors cursor-pointer"
                                    title="إلغاء"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <button
                                    id={`btn-edit-emp-${emp.id}`}
                                    onClick={() => handleStartEditEmployee(emp)}
                                    className="text-[#D4AF37] hover:text-[#F3C63F] p-1.5 hover:bg-[#D4AF37]/10 rounded-lg transition-all duration-150 cursor-pointer"
                                    title="تعديل بيانات الموظف"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    id={`btn-delete-emp-${emp.id}`}
                                    onClick={() => setDeleteConfirmId(emp.id)}
                                    className="text-rose-400 hover:text-rose-300 p-1.5 hover:bg-rose-950/20 rounded-lg transition-all duration-150 cursor-pointer"
                                    title="حذف الموظف"
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
                </div>
              ) : (
                <div className="text-center py-16 border border-dashed border-[#27272A] bg-[#0F0F11] rounded-xl">
                  <UserPlus className="w-10 h-10 text-[#8E8E93] mx-auto mb-3" />
                  <p className="text-sm font-bold text-[#E4E4E7]">لا يوجد موظفون مسجلون حالياً</p>
                  <p className="text-xs text-[#8E8E93] mt-1 mb-4">اضغط على الزر أعلاه لإضافة الموظف الأول وتخصيص حسابه</p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-[#D4AF37] hover:bg-[#F3C63F] text-slate-950 font-extrabold text-xs py-2 px-4 rounded-xl inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4 text-slate-950" />
                    <span>سجل أول موظف الآن</span>
                  </button>
                </div>
              )}
            </div>

            {/* Shareable Link Under Employees Table */}
            <div className="bg-[#121214] border border-dashed border-[#D4AF37]/30 rounded-2xl p-5 shadow-lg flex flex-col lg:flex-row items-center justify-between gap-4 mt-6 text-right">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-[#D4AF37]/10 rounded-xl border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] shrink-0 mt-0.5">
                  <Link2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    بوابة الخدمة الذاتية للموظفين (رابط التحضير الذاتي المباشر)
                  </h4>
                  <p className="text-[11px] text-[#8E8E93] mt-1 max-w-xl leading-relaxed">
                    قم بنسخ الرابط المباشر وإرساله لموظفيك؛ حيث يمكن للموظف فتح الرابط من جواله، واختيار اسمه، ثم إدخال رقم المرور السري الخاص به لتسجيل حضوره وانصرافه بنجاح دون الحاجة لحساب الإدارة.
                  </p>
                </div>
              </div>

              <div className="w-full lg:w-auto flex items-center gap-2 shrink-0">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}${window.location.pathname}?portal=employee&tenant=${activeTenantId}`}
                  className="w-full lg:w-64 bg-[#0F0F11] border border-[#27272A] rounded-xl px-3 py-2 text-xs text-[#E4E4E7] font-mono focus:outline-none text-left select-all focus:border-[#D4AF37]"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  type="button"
                  onClick={() => {
                    const link = `${window.location.origin}${window.location.pathname}?portal=employee&tenant=${activeTenantId}`;
                    navigator.clipboard.writeText(link);
                    setCopiedTableLink(true);
                    setTimeout(() => setCopiedTableLink(false), 2500);
                  }}
                  className="bg-[#D4AF37] hover:bg-[#F3C63F] text-slate-950 text-xs px-4 py-2 rounded-xl font-extrabold transition-all cursor-pointer shadow-md inline-flex items-center gap-1.5 shrink-0"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-950" />
                  <span>{copiedTableLink ? 'تم نسخ الرابط!' : 'نسخ رابط البوابة'}</span>
                </button>
              </div>
            </div>

            {/* Employee Add Form modal (Overlay) */}
            {showAddModal && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                <div className="bg-[#121214] rounded-2xl border border-[#27272A] p-6 w-full max-w-md shadow-2xl relative text-right">
                  <button 
                    id="btn-close-add-emp-modal"
                    onClick={() => setShowAddModal(false)}
                    className="absolute left-4 top-4 text-[#8E8E93] hover:text-[#E4E4E7] transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <h4 className="text-lg font-bold text-[#E4E4E7] mb-4 flex items-center gap-1.5">
                    <UserPlus className="w-5 h-5 text-[#D4AF37]" />
                    تسجيل موظف جديد بالنظام
                  </h4>

                  <form onSubmit={handleAddEmployeeSubmit} className="space-y-4">
                    {formError && (
                      <p className="text-xs text-rose-400 font-bold bg-rose-950/30 p-2 rounded border border-rose-900/30">
                        {formError}
                      </p>
                    )}

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#8E8E93] block">اسم الموظف الثلاثي *</label>
                      <input
                        id="form-emp-name"
                        type="text"
                        required
                        placeholder="مثال: أحمد علي الغامدي"
                        value={newEmpName}
                        onChange={(e) => setNewEmpName(e.target.value)}
                        className="w-full bg-[#0F0F11] border border-[#27272A] rounded-lg text-sm px-3 py-2 focus:outline-none focus:border-[#D4AF37] text-[#E4E4E7]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#8E8E93] block">البريد الإلكتروني المهني *</label>
                      <input
                        id="form-emp-email"
                        type="email"
                        required
                        placeholder="ahmed@company.com"
                        value={newEmpEmail}
                        onChange={(e) => setNewEmpEmail(e.target.value)}
                        className="w-full bg-[#0F0F11] border border-[#27272A] rounded-lg text-sm px-3 py-2 focus:outline-none focus:border-[#D4AF37] text-[#E4E4E7] font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#8E8E93] block">المسمى الوظيفي والصفة *</label>
                      <input
                        id="form-emp-role"
                        type="text"
                        required
                        placeholder="مثال: مهندس برمجيات أول"
                        value={newEmpRole}
                        onChange={(e) => setNewEmpRole(e.target.value)}
                        className="w-full bg-[#0F0F11] border border-[#27272A] rounded-lg text-sm px-3 py-2 focus:outline-none focus:border-[#D4AF37] text-[#E4E4E7]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#8E8E93] block">طبيعة ونموذج العمل المعتمد *</label>
                      <select
                        id="form-emp-model"
                        value={newEmpModel}
                        onChange={(e) => setNewEmpModel(e.target.value as WorkModel)}
                        className="w-full bg-[#0F0F11] border border-[#27272A] rounded-lg text-sm px-3 py-2 focus:outline-none focus:border-[#D4AF37] text-[#E4E4E7]"
                      >
                        <option value="on-site">حضوري (مكتبي بالتحقق الجغرافي)</option>
                        <option value="remote">عن بعد (يتطلب موافقة التحضير اليومي)</option>
                      </select>
                    </div>

                    {/* Username & Password */}
                    <div className="grid grid-cols-2 gap-3 border-t border-[#27272A] pt-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-[#D4AF37] block flex items-center gap-1">
                          <Key className="w-3 h-3 text-[#D4AF37]" />
                          اسم المستخدم *
                        </label>
                        <input
                          id="form-emp-username"
                          type="text"
                          required
                          placeholder="ahmed.gh"
                          value={newEmpUsername}
                          onChange={(e) => setNewEmpUsername(e.target.value)}
                          className="w-full bg-[#0F0F11] border border-[#27272A] rounded-lg text-xs px-2.5 py-2 focus:outline-none focus:border-[#D4AF37] text-[#E4E4E7] font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-[#D4AF37] block flex items-center gap-1">
                          <Key className="w-3 h-3 text-[#D4AF37]" />
                          كلمة المرور *
                        </label>
                        <input
                          id="form-emp-password"
                          type="text"
                          required
                          placeholder="كلمة مرور الدخول"
                          value={newEmpPassword}
                          onChange={(e) => setNewEmpPassword(e.target.value)}
                          className="w-full bg-[#0F0F11] border border-[#27272A] rounded-lg text-xs px-2.5 py-2 focus:outline-none focus:border-[#D4AF37] text-[#E4E4E7] font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        id="btn-submit-add-emp"
                        type="submit"
                        className="flex-1 bg-[#D4AF37] hover:bg-[#F3C63F] text-slate-950 font-extrabold text-xs py-2.5 rounded-lg transition-colors cursor-pointer"
                      >
                        إضافة الموظف الآن
                      </button>
                      <button
                        id="btn-cancel-add-emp"
                        type="button"
                        onClick={() => setShowAddModal(false)}
                        className="flex-1 bg-[#1A1C1E] hover:bg-[#27272A] text-[#E4E4E7] font-bold text-xs py-2.5 rounded-lg border border-[#27272A] transition-colors cursor-pointer"
                      >
                        إلغاء الأمر
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Employee Edit Form modal (Overlay) */}
            {showEditModal && editingEmployee && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                <div className="bg-[#121214] rounded-2xl border border-[#27272A] p-6 w-full max-w-md shadow-2xl relative text-right">
                  <button 
                    id="btn-close-edit-emp-modal"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingEmployee(null);
                    }}
                    className="absolute left-4 top-4 text-[#8E8E93] hover:text-[#E4E4E7] transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <h4 className="text-lg font-bold text-[#E4E4E7] mb-4 flex items-center gap-1.5">
                    <Edit className="w-5 h-5 text-[#D4AF37]" />
                    تعديل بيانات الموظف
                  </h4>

                  <form onSubmit={handleEditEmployeeSubmit} className="space-y-4">
                    {editFormError && (
                      <p className="text-xs text-rose-400 font-bold bg-rose-950/30 p-2 rounded border border-rose-900/30">
                        {editFormError}
                      </p>
                    )}

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#8E8E93] block">اسم الموظف الثلاثي *</label>
                      <input
                        id="edit-form-emp-name"
                        type="text"
                        required
                        placeholder="مثال: أحمد علي الغامدي"
                        value={editEmpName}
                        onChange={(e) => setEditEmpName(e.target.value)}
                        className="w-full bg-[#0F0F11] border border-[#27272A] rounded-lg text-sm px-3 py-2 focus:outline-none focus:border-[#D4AF37] text-[#E4E4E7]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#8E8E93] block">البريد الإلكتروني المهني *</label>
                      <input
                        id="edit-form-emp-email"
                        type="email"
                        required
                        placeholder="ahmed@company.com"
                        value={editEmpEmail}
                        onChange={(e) => setEditEmpEmail(e.target.value)}
                        className="w-full bg-[#0F0F11] border border-[#27272A] rounded-lg text-sm px-3 py-2 focus:outline-none focus:border-[#D4AF37] text-[#E4E4E7] font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#8E8E93] block">المسمى الوظيفي والصفة *</label>
                      <input
                        id="edit-form-emp-role"
                        type="text"
                        required
                        placeholder="مثال: مهندس برمجيات أول"
                        value={editEmpRole}
                        onChange={(e) => setEditEmpRole(e.target.value)}
                        className="w-full bg-[#0F0F11] border border-[#27272A] rounded-lg text-sm px-3 py-2 focus:outline-none focus:border-[#D4AF37] text-[#E4E4E7]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#8E8E93] block">طبيعة ونموذج العمل المعتمد *</label>
                      <select
                        id="edit-form-emp-model"
                        value={editEmpModel}
                        onChange={(e) => setEditEmpModel(e.target.value as WorkModel)}
                        className="w-full bg-[#0F0F11] border border-[#27272A] rounded-lg text-sm px-3 py-2 focus:outline-none focus:border-[#D4AF37] text-[#E4E4E7]"
                      >
                        <option value="on-site">حضوري (مكتبي بالتحقق الجغرافي)</option>
                        <option value="remote">عن بعد (يتطلب موافقة التحضير اليومي)</option>
                      </select>
                    </div>

                    {/* Username & Password */}
                    <div className="grid grid-cols-2 gap-3 border-t border-[#27272A] pt-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-[#D4AF37] block flex items-center gap-1">
                          <Key className="w-3 h-3 text-[#D4AF37]" />
                          اسم المستخدم *
                        </label>
                        <input
                          id="edit-form-emp-username"
                          type="text"
                          required
                          placeholder="ahmed.gh"
                          value={editEmpUsername}
                          onChange={(e) => setEditEmpUsername(e.target.value)}
                          className="w-full bg-[#0F0F11] border border-[#27272A] rounded-lg text-xs px-2.5 py-2 focus:outline-none focus:border-[#D4AF37] text-[#E4E4E7] font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-[#D4AF37] block flex items-center gap-1">
                          <Key className="w-3 h-3 text-[#D4AF37]" />
                          كلمة المرور *
                        </label>
                        <input
                          id="edit-form-emp-password"
                          type="text"
                          required
                          placeholder="كلمة مرور الدخول"
                          value={editEmpPassword}
                          onChange={(e) => setEditEmpPassword(e.target.value)}
                          className="w-full bg-[#0F0F11] border border-[#27272A] rounded-lg text-xs px-2.5 py-2 focus:outline-none focus:border-[#D4AF37] text-[#E4E4E7] font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        id="btn-submit-edit-emp"
                        type="submit"
                        className="flex-1 bg-[#D4AF37] hover:bg-[#F3C63F] text-slate-950 font-extrabold text-xs py-2.5 rounded-lg transition-colors cursor-pointer"
                      >
                        حفظ التعديلات
                      </button>
                      <button
                        id="btn-cancel-edit-emp"
                        type="button"
                        onClick={() => {
                          setShowEditModal(false);
                          setEditingEmployee(null);
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

          </div>
        )}

        {/* TAB 3: MONTHLY REPORTS */}
        {activeTab === 'reports' && (
          <div className="space-y-6" id="admin-tab-reports">
            
            {/* Month & Target Selection Bar */}
            <div className="bg-[#121214] rounded-2xl border border-[#27272A] p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 relative overflow-hidden">
              <div className="flex items-center gap-2 relative z-10 text-right">
                <span className="text-sm font-bold text-[#8E8E93]">فلترة بيانات التقرير للشهر:</span>
                <select
                  id="admin-report-month-select"
                  value={reportMonth}
                  onChange={(e) => setReportMonth(e.target.value)}
                  className="bg-[#0F0F11] border border-[#27272A] rounded-lg text-sm font-bold px-3 py-1.5 focus:outline-none focus:border-[#D4AF37] text-[#E4E4E7] cursor-pointer"
                >
                  <option value="2026-07">يوليو 2026 (الحالي)</option>
                  <option value="2026-06">يونيو 2026</option>
                  <option value="2026-05">مايو 2026</option>
                </select>
              </div>

              <div className="flex gap-2 relative z-10">
                <button
                  id="btn-export-excel"
                  onClick={() => handleExport('Excel')}
                  className="bg-[#1A1C1E] hover:bg-[#27272A] text-[#E4E4E7] font-semibold text-xs py-2 px-3.5 rounded-lg border border-[#27272A] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>تصدير Excel</span>
                </button>
                <button
                  id="btn-export-pdf"
                  onClick={() => handleExport('PDF')}
                  className="bg-rose-950/30 hover:bg-rose-950/50 text-rose-300 font-semibold text-xs py-2 px-3.5 rounded-lg border border-rose-900/40 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-rose-400" />
                  <span>تصدير PDF الشهري</span>
                </button>
              </div>
            </div>

            {/* Key Executive Statistics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="bg-[#121214] rounded-2xl border border-[#27272A] p-5 shadow-xl flex items-center justify-between relative overflow-hidden">
                <div className="text-right">
                  <span className="text-xs text-[#8E8E93] font-medium">معدل الحضور العام</span>
                  <p className="text-2xl font-extrabold text-[#E4E4E7] mt-1 font-serif">{reports.attendanceRate}%</p>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/30 border border-emerald-900/30 px-2 py-0.5 rounded-full inline-block mt-1">ممتاز</span>
                </div>
                <div className="w-14 h-14 relative flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="28" cy="28" r="24" className="stroke-[#1A1C1E]" strokeWidth="4" fill="transparent" />
                    <circle cx="28" cy="28" r="24" className="stroke-emerald-500" strokeWidth="4" fill="transparent"
                      strokeDasharray={2 * Math.PI * 24}
                      strokeDashoffset={2 * Math.PI * 24 * (1 - (reports.attendanceRate || 0) / 100)} />
                  </svg>
                  <span className="absolute text-[10px] font-extrabold text-[#E4E4E7] font-mono">{reports.attendanceRate}%</span>
                </div>
              </div>

              <div className="bg-[#121214] rounded-2xl border border-[#27272A] p-5 shadow-xl flex items-center justify-between relative overflow-hidden">
                <div className="text-right">
                  <span className="text-xs text-[#8E8E93] font-medium">إجمالي الساعات المنجزة</span>
                  <p className="text-2xl font-extrabold text-blue-400 mt-1 font-serif">{reports.totalHours} ساعة</p>
                  <span className="text-[10px] text-[#8E8E93] font-medium block mt-1">كافة الموظفين</span>
                </div>
                <div className="w-12 h-12 bg-blue-950/30 text-blue-400 border border-blue-900/30 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6" />
                </div>
              </div>

              <div 
                onClick={() => setReportDetailType('absent')}
                className="bg-[#121214] rounded-2xl border border-[#27272A] hover:border-rose-500/50 p-5 shadow-xl flex items-center justify-between relative overflow-hidden cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] group"
                title="اضغط لعرض الموظفين الغائبين"
              >
                <div className="text-right">
                  <span className="text-xs text-[#8E8E93] font-medium group-hover:text-rose-400 transition-colors">إجمالي أيام الغياب</span>
                  <p className="text-2xl font-extrabold text-rose-400 mt-1 font-serif">{reports.totalAbsences} يوم</p>
                  <span className="text-[10px] text-rose-400 font-semibold bg-rose-950/30 border border-rose-900/30 px-2 py-0.5 rounded-full inline-block mt-1">اضغط للتفاصيل</span>
                </div>
                <div className="w-12 h-12 bg-rose-950/30 text-rose-400 border border-rose-900/30 group-hover:bg-rose-900/40 group-hover:border-rose-500 rounded-xl flex items-center justify-center transition-all">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              </div>

              <div 
                onClick={() => setReportDetailType('late')}
                className="bg-[#121214] rounded-2xl border border-[#27272A] hover:border-amber-500/50 p-5 shadow-xl flex items-center justify-between relative overflow-hidden cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] group"
                title="اضغط لعرض الموظفين المتأخرين"
              >
                <div className="text-right">
                  <span className="text-xs text-[#8E8E93] font-medium group-hover:text-amber-400 transition-colors">أيام التأخير المرصودة</span>
                  <p className="text-2xl font-extrabold text-amber-400 mt-1 font-serif">{reports.totalLates} يوم</p>
                  <span className="text-[10px] text-amber-400 font-semibold bg-amber-950/30 border border-amber-900/30 px-2 py-0.5 rounded-full inline-block mt-1">اضغط للتفاصيل</span>
                </div>
                <div className="w-12 h-12 bg-amber-950/30 text-[#D4AF37] border border-amber-900/30 group-hover:bg-amber-900/40 group-hover:border-amber-500 rounded-xl flex items-center justify-center transition-all">
                  <Clock className="w-6 h-6 animate-pulse" />
                </div>
              </div>

            </div>

            {/* Popup Modal for Absent/Late Details */}
            {reportDetailType && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                <div className="bg-[#121214] rounded-2xl border border-[#27272A] p-6 w-full max-w-2xl shadow-2xl relative text-right flex flex-col max-h-[85vh]">
                  <button 
                    id="btn-close-report-detail"
                    onClick={() => setReportDetailType(null)}
                    className="absolute left-4 top-4 text-[#8E8E93] hover:text-[#E4E4E7] transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <h4 className="text-lg font-bold text-[#E4E4E7] mb-2 flex items-center justify-start gap-2">
                    {reportDetailType === 'absent' ? (
                      <>
                        <AlertTriangle className="w-5 h-5 text-rose-500" />
                        <span>تفاصيل أيام الغياب المرصودة لشهر {reportMonth}</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-5 h-5 text-amber-400" />
                        <span>تفاصيل أيام التأخير المرصودة لشهر {reportMonth}</span>
                      </>
                    )}
                  </h4>
                  <p className="text-xs text-[#8E8E93] mb-4">
                    {reportDetailType === 'absent' 
                      ? 'قائمة بجميع سجلات الغياب المسجلة للموظفين خلال فترة الفلترة المحددة' 
                      : 'قائمة بجميع حالات التأخير (الحضور بعد الساعة 08:30 ص) المسجلة للموظفين'}
                  </p>

                  <div className="overflow-y-auto flex-1 rounded-xl border border-[#27272A] bg-[#0F0F11]">
                    {(() => {
                      const records = reportDetailType === 'absent' 
                        ? attendanceRecords.filter(r => r.status === 'غياب' && r.date.startsWith(reportMonth))
                        : attendanceRecords.filter(r => r.status === 'متأخر' && r.date.startsWith(reportMonth));

                      if (records.length === 0) {
                        return (
                          <div className="text-center py-12 text-[#8E8E93] text-sm">
                            لا توجد سجلات مرصودة لهذا القسم خلال هذا الشهر.
                          </div>
                        );
                      }

                      return (
                        <table className="w-full min-w-[600px] text-right border-collapse text-xs whitespace-nowrap">
                          <thead>
                            <tr className="bg-[#161618] border-b border-[#27272A] text-[#8E8E93] font-bold">
                              <th className="px-4 py-3">الموظف</th>
                              <th className="px-4 py-3">طبيعة العمل</th>
                              <th className="px-4 py-3">التاريخ</th>
                              {reportDetailType === 'late' && <th className="px-4 py-3">وقت التحضير</th>}
                              <th className="px-4 py-3">الحالة</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#27272A] text-[#E4E4E7]">
                            {records.map((rec) => {
                              const emp = employees.find(e => e.id === rec.employeeId);
                              return (
                                <tr key={rec.id} className="hover:bg-[#121214]/55 transition-colors">
                                  <td className="px-4 py-3 font-bold">
                                    <div className="flex items-center gap-2">
                                      {emp ? (
                                        <span className={`w-7 h-7 rounded-full ${emp.avatarColor || 'bg-slate-700'} text-white flex items-center justify-center text-[10px] font-bold shrink-0`}>
                                          {emp.name.split(' ').map(n => n[0]).join('')}
                                        </span>
                                      ) : (
                                        <span className="w-7 h-7 rounded-full bg-slate-700 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                                          {rec.employeeName ? rec.employeeName[0] : 'م'}
                                        </span>
                                      )}
                                      <div>
                                        <p>{rec.employeeName}</p>
                                        <p className="text-[9px] text-[#8E8E93] font-normal">{emp?.role || 'موظف'}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    {rec.workModel === 'on-site' ? (
                                      <span className="text-slate-300">حضوري</span>
                                    ) : (
                                      <span className="text-[#D4AF37]">عن بعد</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 font-mono">
                                    {rec.date}
                                  </td>
                                  {reportDetailType === 'late' && (
                                    <td className="px-4 py-3 font-mono text-amber-400 font-bold">
                                      {rec.checkIn || '-'}
                                    </td>
                                  )}
                                  <td className="px-4 py-3">
                                    {rec.status === 'غياب' ? (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/40 text-rose-400 border border-rose-900/30">غياب</span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/40 text-amber-400 border border-amber-900/30">متأخر</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      );
                    })()}
                  </div>

                  <div className="flex justify-end mt-4 border-t border-[#27272A] pt-4">
                    <button
                      type="button"
                      onClick={() => setReportDetailType(null)}
                      className="bg-[#1A1C1E] hover:bg-[#27272A] text-[#E4E4E7] font-bold text-xs py-2 px-5 rounded-lg border border-[#27272A] transition-colors cursor-pointer"
                    >
                      إغلاق النافذة
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Visual attendance ratios stacked bar */}
            <div className="bg-[#121214] rounded-2xl border border-[#27272A] p-6 shadow-xl text-right">
              <h4 className="text-sm font-bold text-[#E4E4E7] mb-4">توزيع نسب الحضور والغياب الإجمالية للشهر</h4>
              <div className="w-full h-4 bg-[#0F0F11] rounded-full overflow-hidden flex flex-row-reverse mb-3 border border-[#27272A]">
                <div className="bg-emerald-500 h-full" style={{ width: `${reports.presentRate}%` }} title="حاضر في الموعد"></div>
                <div className="bg-amber-400 h-full" style={{ width: `${reports.lateRate}%` }} title="حاضر متأخر"></div>
                <div className="bg-rose-500 h-full" style={{ width: `${reports.absentRate}%` }} title="غياب"></div>
              </div>
              <div className="flex flex-wrap justify-end gap-6 text-xs text-[#8E8E93] font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-emerald-500"></span>
                  <span>حضور في الموعد ({reports.presentRate}%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-amber-400"></span>
                  <span>حضور متأخر ({reports.lateRate}%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-rose-500"></span>
                  <span>غياب ({reports.absentRate}%)</span>
                </div>
              </div>
            </div>

            {/* Detailed Employee Attendance Table */}
            <div className="bg-[#121214] rounded-2xl border border-[#27272A] overflow-hidden shadow-xl text-right">
              <div className="p-5 border-b border-[#27272A] flex items-center justify-between">
                <span className="text-xs font-mono text-[#8E8E93]">عدد الموظفين: {reports.employeeBreakdown.length}</span>
                <h4 className="text-sm font-bold text-[#E4E4E7]">كشف تفصيلي لحضور وانصراف الموظفين</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[950px] text-right border-collapse text-xs whitespace-nowrap">
                  <thead>
                    <tr className="bg-[#0F0F11] text-[#8E8E93] text-xs border-b border-[#27272A]">
                      <th className="px-4 py-3 font-bold">الموظف</th>
                      <th className="px-4 py-3 font-bold">طبيعة العمل</th>
                      <th className="px-4 py-3 font-bold">أيام الحضور</th>
                      <th className="px-4 py-3 font-bold">أيام التأخير</th>
                      <th className="px-4 py-3 font-bold">أيام الغياب</th>
                      <th className="px-4 py-3 font-bold">ساعات العمل المنجزة</th>
                      <th className="px-4 py-3 font-bold">نسبة الالتزام</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#27272A] text-[#E4E4E7]">
                    {reports.employeeBreakdown.map((b) => (
                      <tr key={b.id} className="hover:bg-[#0F0F11]/50 transition-colors">
                        <td className="px-4 py-3 font-bold text-[#E4E4E7]">
                          <div>
                            <p>{b.name}</p>
                            <p className="text-[10px] text-[#8E8E93] font-normal">{b.role}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {b.workModel === 'on-site' ? (
                            <span className="bg-blue-950/30 text-blue-400 px-2.5 py-0.5 rounded-full font-bold border border-blue-900/30">حضوري</span>
                          ) : (
                            <span className="bg-violet-950/30 text-violet-400 px-2.5 py-0.5 rounded-full font-bold border border-violet-900/30">عن بعد</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-bold font-mono text-emerald-400">{b.presents} أيام</td>
                        <td className="px-4 py-3 font-bold font-mono text-amber-400">{b.lates} مرات</td>
                        <td className="px-4 py-3 font-bold font-mono text-rose-400">{b.absences} أيام</td>
                        <td className="px-4 py-3 font-extrabold font-mono text-white">{b.hours} س</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <div className="w-12 bg-[#0F0F11] rounded-full h-1.5 overflow-hidden border border-[#27272A]">
                              <div className={`h-full rounded-full ${
                                b.attendancePercentage >= 90 ? 'bg-emerald-500' : b.attendancePercentage >= 75 ? 'bg-amber-400' : 'bg-rose-500'
                              }`} style={{ width: `${b.attendancePercentage}%` }}></div>
                            </div>
                            <span className="text-xs font-bold font-mono text-[#E4E4E7]">{b.attendancePercentage}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ========================================== */}
            {/* NEW MODULE: ADVANCED PERIOD & CRUD MANAGEMENT */}
            {/* ========================================== */}
            <div className="bg-[#121214] rounded-2xl border border-[#27272A] p-6 shadow-xl text-right space-y-6">
              <div className="border-b border-[#27272A] pb-4">
                <h4 className="text-base font-extrabold text-[#D4AF37] flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#D4AF37]" />
                  <span>فلترة وتصدير التقارير المتقدمة للفترات والتحكم بالسجلات</span>
                </h4>
                <p className="text-xs text-[#8E8E93] mt-1">
                  اختر فترة مخصصة وفلتر الحضور لتصدير ملفات Excel/PDF وتعديل أو حذف أي سجل للتحضير بشكل كامل وفوري.
                </p>
              </div>

              {/* 5-Columns Filter Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 bg-[#0F0F11] p-4 rounded-xl border border-[#27272A]">
                {/* Start Date */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#8E8E93] block">من تاريخ:</label>
                  <input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="w-full bg-[#121214] border border-[#27272A] rounded-lg text-xs px-3 py-2 text-[#E4E4E7] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                {/* End Date */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#8E8E93] block">إلى تاريخ:</label>
                  <input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="w-full bg-[#121214] border border-[#27272A] rounded-lg text-xs px-3 py-2 text-[#E4E4E7] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                {/* Employee Filter */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#8E8E93] block">الموظف:</label>
                  <select
                    value={filterEmployeeId}
                    onChange={(e) => setFilterEmployeeId(e.target.value)}
                    className="w-full bg-[#121214] border border-[#27272A] rounded-lg text-xs px-3 py-2 text-[#E4E4E7] focus:outline-none focus:border-[#D4AF37] cursor-pointer"
                  >
                    <option value="all">كل الموظفين</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>

                {/* Work Model Filter */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#8E8E93] block">نموذج العمل:</label>
                  <select
                    value={filterWorkModel}
                    onChange={(e) => setFilterWorkModel(e.target.value)}
                    className="w-full bg-[#121214] border border-[#27272A] rounded-lg text-xs px-3 py-2 text-[#E4E4E7] focus:outline-none focus:border-[#D4AF37] cursor-pointer"
                  >
                    <option value="all">الكل</option>
                    <option value="on-site">حضوري</option>
                    <option value="remote">عن بعد</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#8E8E93] block">حالة الحضور:</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full bg-[#121214] border border-[#27272A] rounded-lg text-xs px-3 py-2 text-[#E4E4E7] focus:outline-none focus:border-[#D4AF37] cursor-pointer"
                  >
                    <option value="all">الكل</option>
                    <option value="حاضر">حاضر في الموعد</option>
                    <option value="متأخر">حاضر متأخر</option>
                    <option value="غياب">غياب كلي</option>
                  </select>
                </div>
              </div>

              {/* Statistics of Selected Filter */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-[#0F0F11]/55 border border-[#27272A]/80 p-4 rounded-xl">
                <div className="text-center p-2 border-l border-[#27272A] last:border-0">
                  <p className="text-[10px] text-[#8E8E93] font-semibold">إجمالي السجلات بالفترة</p>
                  <p className="text-lg font-extrabold text-white mt-1">{filteredRecords.length}</p>
                </div>
                <div className="text-center p-2 border-l border-[#27272A] last:border-0">
                  <p className="text-[10px] text-[#8E8E93] font-semibold">أيام حضور الموعد</p>
                  <p className="text-lg font-extrabold text-emerald-400 mt-1">
                    {filteredRecords.filter(r => r.status === 'حاضر').length}
                  </p>
                </div>
                <div className="text-center p-2 border-l border-[#27272A] last:border-0">
                  <p className="text-[10px] text-[#8E8E93] font-semibold">أيام حضور متأخر</p>
                  <p className="text-lg font-extrabold text-amber-400 mt-1">
                    {filteredRecords.filter(r => r.status === 'متأخر').length}
                  </p>
                </div>
                <div className="text-center p-2 border-l border-[#27272A] last:border-0">
                  <p className="text-[10px] text-[#8E8E93] font-semibold">أيام الغياب</p>
                  <p className="text-lg font-extrabold text-rose-400 mt-1">
                    {filteredRecords.filter(r => r.status === 'غياب').length}
                  </p>
                </div>
                <div className="text-center p-2 last:border-0 col-span-2 md:col-span-1">
                  <p className="text-[10px] text-[#8E8E93] font-semibold">الساعات المنجزة بالفترة</p>
                  <p className="text-lg font-extrabold text-blue-400 mt-1">
                    {filteredRecords.reduce((acc, curr) => acc + (curr.checkOut ? curr.totalHours || 0 : 0), 0).toFixed(1)} س
                  </p>
                </div>
              </div>

              {/* Download Buttons Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0F0F11]/40 border border-[#27272A]/40 p-3 rounded-xl text-right">
                <span className="text-xs font-bold text-white">
                  تم العثور على <span className="text-[#D4AF37] font-mono">{filteredRecords.length}</span> سجلاً للخيارات المحددة.
                </span>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (filteredRecords.length === 0) {
                        alert('لا توجد سجلات لتصديرها للفترة المحددة.');
                        return;
                      }
                      const title = `تقرير الحضور والانصراف المخصص للفترة من ${filterStartDate} إلى ${filterEndDate}`;
                      exportToExcel(filteredRecords, title);
                    }}
                    className="bg-[#1A1C1E] hover:bg-[#27272A] text-[#E4E4E7] font-bold text-xs py-2 px-3.5 rounded-lg border border-[#27272A] flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>تحميل كملف Excel مخصص</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (filteredRecords.length === 0) {
                        alert('لا توجد سجلات لتصديرها للفترة المحددة.');
                        return;
                      }
                      const title = `تقرير الحضور والانصراف المخصص (لوحة التحكم الإدارية)`;
                      const subtitle = `فلترة مخصصة للفترة من ${filterStartDate} إلى ${filterEndDate}`;
                      exportToPDF(filteredRecords, title, subtitle);
                    }}
                    className="bg-rose-950/30 hover:bg-rose-950/50 text-rose-300 font-bold text-xs py-2 px-3.5 rounded-lg border border-rose-900/40 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-rose-400" />
                    <span>تحميل تقرير PDF مخصص ملوّن</span>
                  </button>
                </div>
              </div>

              {/* Records List Table with inline CRUD actions */}
              <div className="overflow-x-auto rounded-xl border border-[#27272A] bg-[#0F0F11]">
                {filteredRecords.length === 0 ? (
                  <div className="text-center py-12 text-[#8E8E93] text-sm">
                    لا توجد سجلات حضور وانصراف مرصودة تطابق الفلاتر المحددة لهذه الفترة.
                  </div>
                ) : (
                  <table className="w-full min-w-[950px] text-right border-collapse text-xs whitespace-nowrap">
                    <thead>
                      <tr className="bg-[#161618] border-b border-[#27272A] text-[#8E8E93] font-bold">
                        <th className="px-4 py-3 text-right">الموظف</th>
                        <th className="px-4 py-3 text-center">التاريخ</th>
                        <th className="px-4 py-3 text-center">نموذج العمل</th>
                        <th className="px-4 py-3 text-center">وقت الحضور</th>
                        <th className="px-4 py-3 text-center">وقت الانصراف</th>
                        <th className="px-4 py-3 text-center">ساعات العمل</th>
                        <th className="px-4 py-3 text-center">الحالة</th>
                        <th className="px-4 py-3 text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#27272A] text-[#E4E4E7]">
                      {filteredRecords.map((rec) => {
                        const emp = employees.find(e => e.id === rec.employeeId);
                        return (
                          <tr key={rec.id} className="hover:bg-[#121214]/40 transition-colors">
                            <td className="px-4 py-3 font-bold text-right">
                              <div>
                                <p>{rec.employeeName}</p>
                                <p className="text-[10px] text-[#8E8E93] font-normal">{emp?.role || 'موظف'}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center font-mono text-[#E4E4E7]">{rec.date}</td>
                            <td className="px-4 py-3 text-center">
                              {rec.workModel === 'on-site' ? (
                                <span className="bg-blue-950/20 text-blue-400 border border-blue-900/30 px-2 py-0.5 rounded-full text-[10px] font-bold">حضوري</span>
                              ) : (
                                <span className="bg-violet-950/20 text-violet-400 border border-violet-900/30 px-2 py-0.5 rounded-full text-[10px] font-bold">عن بعد</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center font-mono text-emerald-400 font-semibold">{rec.checkIn || '-'}</td>
                            <td className="px-4 py-3 text-center font-mono text-rose-400 font-semibold">{rec.checkOut || '-'}</td>
                            <td className="px-4 py-3 text-center font-mono font-bold text-white">
                              {rec.checkOut ? `${rec.totalHours} س` : 'قيد العمل...'}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {rec.status === 'حاضر' ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/40 text-emerald-400 border border-emerald-900/30 font-bold">حاضر</span>
                              ) : rec.status === 'متأخر' ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/40 text-amber-400 border border-amber-900/30 font-bold">متأخر</span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/40 text-rose-400 border border-rose-900/30 font-bold">غياب</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex justify-center items-center gap-1.5">
                                {/* Edit Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingRecord(rec);
                                    setEditRecDate(rec.date);
                                    setEditRecCheckIn(rec.checkIn || '');
                                    setEditRecCheckOut(rec.checkOut || '');
                                    setEditRecStatus(rec.status);
                                    setEditRecWorkModel(rec.workModel || 'on-site');
                                    setEditRecError('');
                                  }}
                                  className="p-1.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 hover:border-amber-400 transition-colors cursor-pointer"
                                  title="تعديل هذا السجل"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>

                                {/* Delete Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm(`هل أنت متأكد من رغبتك في حذف سجل حضور الموظف "${rec.employeeName}" بتاريخ ${rec.date} بشكل نهائي؟ لا يمكن التراجع عن هذا الإجراء.`)) {
                                      onDeleteAttendance?.(rec.id);
                                    }
                                  }}
                                  className="p-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-400 transition-colors cursor-pointer"
                                  title="حذف هذا السجل نهائياً"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* ========================================== */}
            {/* NEW MODAL: EDIT ATTENDANCE RECORD (ADMIN ONLY) */}
            {/* ========================================== */}
            {editingRecord && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[60] animate-in fade-in duration-200">
                <div className="bg-[#121214] rounded-2xl border border-[#27272A] p-6 w-full max-w-lg shadow-2xl relative text-right">
                  <button 
                    type="button"
                    onClick={() => setEditingRecord(null)}
                    className="absolute left-4 top-4 text-[#8E8E93] hover:text-[#E4E4E7] transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <h4 className="text-base font-extrabold text-[#D4AF37] mb-2 flex items-center gap-2">
                    <Edit className="w-5 h-5 text-[#D4AF37]" />
                    <span>تعديل سجل حضور الموظف</span>
                  </h4>
                  <p className="text-xs text-[#8E8E93] mb-4">
                    أنت تقوم الآن بتعديل سجل حضور الموظف <span className="text-white font-bold">{editingRecord.employeeName}</span>. سيقوم النظام بإعادة حساب ساعات العمل المنجزة تلقائياً بناءً على الوقت المدخل.
                  </p>

                  <form onSubmit={handleSaveEditRecord} className="space-y-4">
                    {editRecError && (
                      <div className="bg-rose-950/30 border border-rose-900/40 text-rose-400 text-xs p-3 rounded-lg font-bold">
                        {editRecError}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      {/* Date */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-[#8E8E93] block">التاريخ:</label>
                        <input
                          type="date"
                          required
                          value={editRecDate}
                          onChange={(e) => setEditRecDate(e.target.value)}
                          className="w-full bg-[#0F0F11] border border-[#27272A] rounded-lg text-xs px-3 py-2.5 text-[#E4E4E7] focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>

                      {/* Work Model */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-[#8E8E93] block">طبيعة العمل:</label>
                        <select
                          value={editRecWorkModel}
                          onChange={(e) => setEditRecWorkModel(e.target.value as 'on-site' | 'remote')}
                          className="w-full bg-[#0F0F11] border border-[#27272A] rounded-lg text-xs px-3 py-2.5 text-[#E4E4E7] focus:outline-none focus:border-[#D4AF37] cursor-pointer"
                        >
                          <option value="on-site">حضوري</option>
                          <option value="remote">عن بعد</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Check In */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-[#8E8E93] block">وقت الحضور (التحضير):</label>
                        <input
                          type="time"
                          value={editRecCheckIn}
                          onChange={(e) => setEditRecCheckIn(e.target.value)}
                          className="w-full bg-[#0F0F11] border border-[#27272A] rounded-lg text-xs px-3 py-2.5 text-[#E4E4E7] focus:outline-none focus:border-[#D4AF37] font-mono"
                        />
                      </div>

                      {/* Check Out */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-[#8E8E93] block">وقت الانصراف:</label>
                        <input
                          type="time"
                          value={editRecCheckOut}
                          onChange={(e) => setEditRecCheckOut(e.target.value)}
                          className="w-full bg-[#0F0F11] border border-[#27272A] rounded-lg text-xs px-3 py-2.5 text-[#E4E4E7] focus:outline-none focus:border-[#D4AF37] font-mono"
                        />
                      </div>
                    </div>

                    {/* Status selection */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#8E8E93] block">حالة الحضور الإجمالية:</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['حاضر', 'متأخر', 'غياب'] as const).map((status) => (
                          <button
                            key={status}
                            type="button"
                            onClick={() => {
                              setEditRecStatus(status);
                              if (status === 'غياب') {
                                setEditRecCheckIn('');
                                setEditRecCheckOut('');
                              } else if (!editRecCheckIn) {
                                setEditRecCheckIn('08:00');
                              }
                            }}
                            className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                              editRecStatus === status
                                ? status === 'حاضر'
                                  ? 'bg-emerald-950/30 border-emerald-500 text-emerald-400'
                                  : status === 'متأخر'
                                  ? 'bg-amber-950/30 border-amber-500 text-amber-400'
                                  : 'bg-rose-950/30 border-rose-500 text-rose-400'
                                : 'bg-[#0F0F11] border-[#27272A] text-[#8E8E93] hover:text-[#E4E4E7]'
                            }`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Modal Buttons */}
                    <div className="flex gap-2 pt-3 border-t border-[#27272A]">
                      <button
                        type="submit"
                        className="flex-1 bg-[#D4AF37] hover:bg-[#F3C63F] text-slate-950 font-extrabold text-xs py-2.5 rounded-lg transition-colors cursor-pointer"
                      >
                        حفظ سجل التحضير
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingRecord(null)}
                        className="flex-1 bg-[#1A1C1E] hover:bg-[#27272A] text-[#E4E4E7] font-bold text-xs py-2.5 rounded-lg border border-[#27272A] transition-colors cursor-pointer"
                      >
                        إلغاء الأمر
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

          </div>
        )}

        {/* TAB 4: OFFICE SETTINGS */}
        {activeTab === 'settings' && (
          <div className="max-w-3xl mx-auto space-y-6 animate-fade-in" id="admin-tab-settings">
            
            <form onSubmit={handleSaveOfficeSettings} className="bg-[#121214] rounded-2xl border border-[#27272A] p-6 shadow-xl space-y-5 text-right relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37] opacity-5 blur-[50px] pointer-events-none"></div>
              
              <div>
                <h3 className="text-lg font-bold text-[#E4E4E7] mb-1">إعدادات المنشأة وضوابط التحضير الذكي</h3>
                <p className="text-xs text-[#8E8E93]">
                  قم بضبط مواقيت العمل الرسمية، وموقع المنشأة الجغرافي، ونطاق التحضير المسموح للموظفين.
                </p>
              </div>

              {showSettingsSuccess && (
                <div className="bg-emerald-950/30 border border-emerald-900/30 text-emerald-400 text-xs p-3.5 rounded-lg flex items-center gap-1.5 font-bold" id="settings-success-alert">
                  <CheckCircle className="w-4.5 h-4.5 text-emerald-400" />
                  <span>تم حفظ الإعدادات بنجاح وتحديثها لجميع الموظفين فوراً!</span>
                </div>
              )}

              {/* SECTION: Basic settings */}
              <div className="space-y-4 pt-2 border-t border-[#27272A]/50">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#8E8E93] block">اسم مقر العمل / العنوان الرئيسي *</label>
                  <input
                    id="settings-address-name"
                    type="text"
                    required
                    value={officeForm.addressName}
                    onChange={(e) => setOfficeForm({ ...officeForm, addressName: e.target.value })}
                    className="w-full bg-[#0F0F11] border border-[#27272A] rounded-lg text-sm px-3 py-2.5 focus:outline-none focus:border-[#D4AF37] text-[#E4E4E7]"
                  />
                </div>

                {/* Smart Map Link / Coordinates paste field */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#8E8E93] block">رابط مقر العمل (ضع رابط موقع خرائط Google أو الإحداثيات مباشرة) *</label>
                  <input
                    id="settings-map-input"
                    type="text"
                    placeholder="ضع رابط الخريطة هنا (مثال: https://maps.app.goo.gl/... أو 24.7622,46.6409)"
                    value={locationInput}
                    onChange={handleMapLinkChange}
                    className="w-full bg-[#0F0F11] border border-[#27272A] rounded-lg text-xs px-3 py-2.5 focus:outline-none focus:border-[#D4AF37] text-[#E4E4E7] placeholder-[#8E8E93]/60"
                  />
                  {parseSuccess ? (
                    <p className="text-[10px] font-bold text-emerald-400 mt-1 bg-emerald-950/20 p-2 rounded-lg border border-emerald-900/30">
                      ✓ تم استخراج الإحداثيات بنجاح تلقائياً! (خط العرض: {officeForm.latitude} | خط الطول: {officeForm.longitude})
                    </p>
                  ) : (
                    <p className="text-[10px] text-[#8E8E93] mt-0.5">عند لصق أي رابط من خرائط Google، سيقوم النظام باستخراج الإحداثيات وتعبئة الحقول بالأسفل تلقائياً.</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#8E8E93] block">خط العرض (Latitude) *</label>
                    <input
                      id="settings-lat"
                      type="number"
                      step="0.00000001"
                      required
                      value={officeForm.latitude}
                      onChange={(e) => setOfficeForm({ ...officeForm, latitude: Number(e.target.value) })}
                      className="w-full bg-[#0F0F11]/60 border border-[#27272A] rounded-lg text-sm px-3 py-2.5 font-mono focus:outline-none focus:border-[#D4AF37] text-[#E4E4E7]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#8E8E93] block">خط الطول (Longitude) *</label>
                    <input
                      id="settings-lng"
                      type="number"
                      step="0.00000001"
                      required
                      value={officeForm.longitude}
                      onChange={(e) => setOfficeForm({ ...officeForm, longitude: Number(e.target.value) })}
                      className="w-full bg-[#0F0F11]/60 border border-[#27272A] rounded-lg text-sm px-3 py-2.5 font-mono focus:outline-none focus:border-[#D4AF37] text-[#E4E4E7]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Radius Setting */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#8E8E93] block">قطر نطاق التحضير المسموح *</label>
                    <div className="relative">
                      <input
                        id="settings-radius"
                        type="number"
                        required
                        min="10"
                        max="10000"
                        value={officeForm.radius}
                        onChange={(e) => setOfficeForm({ ...officeForm, radius: Number(e.target.value) })}
                        className="w-full bg-[#0F0F11] border border-[#27272A] rounded-lg text-sm pr-3 pl-12 py-2.5 focus:outline-none focus:border-[#D4AF37] text-[#E4E4E7]"
                      />
                      <span className="absolute left-3 top-3 text-xs text-[#8E8E93] font-bold">متر</span>
                    </div>
                    <p className="text-[10px] text-[#8E8E93] mt-0.5">القطر المسموح فيه للتحضير.</p>
                  </div>

                  {/* Work start hour Setting */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#8E8E93] block">وقت بدء الدوام الرسمي *</label>
                    <input
                      id="settings-work-start-time"
                      type="time"
                      required
                      value={officeForm.workStartTime || '08:30'}
                      onChange={(e) => setOfficeForm({ ...officeForm, workStartTime: e.target.value })}
                      className="w-full bg-[#0F0F11] border border-[#27272A] rounded-lg text-sm px-3 py-2.5 focus:outline-none focus:border-[#D4AF37] text-[#E4E4E7] text-left font-mono"
                    />
                    <p className="text-[10px] text-[#8E8E93] mt-0.5">وقت بدء الدوام وحساب التأخير.</p>
                  </div>

                  {/* Work end hour Setting */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#8E8E93] block">وقت نهاية الدوام الرسمي *</label>
                    <input
                      id="settings-work-end-time"
                      type="time"
                      required
                      value={officeForm.workEndTime || '16:30'}
                      onChange={(e) => setOfficeForm({ ...officeForm, workEndTime: e.target.value })}
                      className="w-full bg-[#0F0F11] border border-[#27272A] rounded-lg text-sm px-3 py-2.5 focus:outline-none focus:border-[#D4AF37] text-[#E4E4E7] text-left font-mono"
                    />
                    <p className="text-[10px] text-[#8E8E93] mt-0.5">وقت انتهاء الدوام وحساب الانصراف.</p>
                  </div>

                  {/* Late Grace Period Setting */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#8E8E93] block">مهلة التأخير المسموحة *</label>
                    <div className="relative">
                      <input
                        id="settings-late-grace-period"
                        type="number"
                        required
                        min="0"
                        max="180"
                        value={officeForm.lateGracePeriod !== undefined ? officeForm.lateGracePeriod : 10}
                        onChange={(e) => setOfficeForm({ ...officeForm, lateGracePeriod: Number(e.target.value) })}
                        className="w-full bg-[#0F0F11] border border-[#27272A] rounded-lg text-sm pr-3 pl-14 py-2.5 focus:outline-none focus:border-[#D4AF37] text-[#E4E4E7]"
                      />
                      <span className="absolute left-3 top-3 text-xs text-[#8E8E93] font-bold font-sans">دقيقة</span>
                    </div>
                    <p className="text-[10px] text-[#8E8E93] mt-0.5">مهلة إضافية بعد بداية الدوام لا يُسجل فيها متأخراً.</p>
                  </div>
                </div>
              </div>

              <button
                id="btn-save-settings"
                type="submit"
                className="w-full bg-[#D4AF37] hover:bg-[#F3C63F] text-slate-950 font-extrabold text-xs py-2.5 rounded-xl transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-[#D4AF37]/10"
              >
                <Save className="w-4 h-4 text-slate-950" />
                <span>حفظ التغييرات وتحديث قواعد الدوام</span>
              </button>
            </form>

            {/* SECTION: Administrator credentials change */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                setCredError('');
                setCredSuccess('');

                if (!adminUser.trim() || !adminPass.trim() || !compName.trim()) {
                  setCredError('اسم المؤسسة واسم المستخدم وكلمة المرور مطلوبان.');
                  return;
                }

                if (adminUser.trim().toLowerCase() === 'superadmin') {
                  setCredError('اسم المستخدم "superadmin" محجوز كلياً ومحمي.');
                  return;
                }

                if (onUpdateAdminCredentials) {
                  onUpdateAdminCredentials(adminUser.trim(), adminPass.trim(), compName.trim());
                  setCredSuccess('تم تحديث بيانات المؤسسة وحساب الإدارة بنجاح!');
                  setTimeout(() => setCredSuccess(''), 3000);
                }
              }} 
              className="bg-[#121214] rounded-2xl border border-[#27272A] p-6 shadow-xl space-y-5 text-right relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37] opacity-5 blur-[50px] pointer-events-none"></div>
              
              <div>
                <h3 className="text-lg font-bold text-[#E4E4E7] mb-1 flex items-center justify-start gap-2">
                  <Key className="w-5 h-5 text-[#D4AF37]" />
                  <span>تعديل اسم المؤسسة وبيانات حساب مدير النظام</span>
                </h3>
                <p className="text-xs text-[#8E8E93]">
                  قم بتحديث اسم المؤسسة أو المشروع، بالإضافة إلى اسم المستخدم وكلمة المرور الخاصة بلوحة تحكم الإدارة.
                </p>
              </div>

              {credError && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-lg font-bold">
                  {credError}
                </div>
              )}

              {credSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs p-3 rounded-lg font-bold">
                  {credSuccess}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-[#27272A]/50">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#8E8E93] block">اسم المؤسسة أو المشروع *</label>
                  <input
                    type="text"
                    required
                    value={compName}
                    onChange={(e) => setCompName(e.target.value)}
                    className="w-full bg-[#0F0F11] border border-[#27272A] rounded-lg text-sm px-3 py-2.5 focus:outline-none focus:border-[#D4AF37] text-[#E4E4E7]"
                    placeholder="مثال: شركة نيوليب"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#8E8E93] block">اسم مستخدم المدير الجديد *</label>
                  <input
                    type="text"
                    required
                    value={adminUser}
                    onChange={(e) => setAdminUser(e.target.value)}
                    className="w-full bg-[#0F0F11] border border-[#27272A] rounded-lg text-sm px-3 py-2.5 focus:outline-none focus:border-[#D4AF37] text-[#E4E4E7] font-mono"
                    placeholder="اسم المستخدم"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#8E8E93] block">كلمة المرور الجديدة *</label>
                  <input
                    type="text"
                    required
                    value={adminPass}
                    onChange={(e) => setAdminPass(e.target.value)}
                    className="w-full bg-[#0F0F11] border border-[#27272A] rounded-lg text-sm px-3 py-2.5 focus:outline-none focus:border-[#D4AF37] text-[#E4E4E7] font-mono"
                    placeholder="كلمة المرور"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-[#1A1C1E] hover:bg-[#27272A] text-[#D4AF37] border border-[#D4AF37]/30 hover:border-[#D4AF37]/50 font-extrabold text-xs py-2.5 rounded-xl transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                <Save className="w-4 h-4 animate-pulse" />
                <span>حفظ بيانات دخول المدير الجديدة واسم المؤسسة</span>
              </button>
            </form>

          </div>
        )}

      </main>

    </div>
  );
}
