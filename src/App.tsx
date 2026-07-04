import React, { useState, useEffect } from 'react';
import { 
  Users, Shield, Laptop, Landmark, ClipboardList, 
  MapPin, Clock, LogOut, CheckCircle, HelpCircle,
  Eye, EyeOff, Lock, Key, X, AlertTriangle, Search, Check
} from 'lucide-react';
import { Employee, AttendanceRecord, ApprovalRequest, OfficeSettings, WorkModel, Tenant } from './types';
import { INITIAL_EMPLOYEES, INITIAL_APPROVAL_REQUESTS, DEFAULT_OFFICE, generateMockHistory } from './mockData';
import EmployeePanel from './components/EmployeePanel';
import AdminPanel from './components/AdminPanel';
import SuperAdminPanel from './components/SuperAdminPanel';
import { collection, onSnapshot, query, where, doc } from 'firebase/firestore';
import {
  db,
  getTenantsFromFirebase,
  saveTenantToFirebase,
  deleteTenantFromFirebase,
  migrateTenantInFirebase,
  getSuperAdminCredentialsFromFirebase,
  saveSuperAdminCredentialsToFirebase,
  getEmployeesFromFirebase,
  saveEmployeeToFirebase,
  deleteEmployeeFromFirebase,
  getAttendanceFromFirebase,
  saveAttendanceToFirebase,
  getRequestsFromFirebase,
  saveRequestToFirebase,
  getOfficeSettingsFromFirebase,
  saveOfficeSettingsToFirebase
} from './firebase';


// Avatar background colors list
const AVATAR_COLORS = [
  'bg-emerald-500', 'bg-blue-500', 'bg-violet-500', 'bg-amber-500', 
  'bg-pink-500', 'bg-cyan-500', 'bg-rose-500', 'bg-teal-500'
];

export default function App() {
  // Global States
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [pendingRequests, setPendingRequests] = useState<ApprovalRequest[]>([]);
  const [officeSettings, setOfficeSettings] = useState<OfficeSettings>(DEFAULT_OFFICE);

  // Multi-tenancy & Super Admin States
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [activeTenantId, setActiveTenantId] = useState<string>('default');
  const [isSuperAdminMode, setIsSuperAdminMode] = useState<boolean>(false);
  const [superAdminUsername, setSuperAdminUsername] = useState(() => {
    return localStorage.getItem('hader_super_admin_username') || 'superadmin';
  });
  const [superAdminPassword, setSuperAdminPassword] = useState(() => {
    return localStorage.getItem('hader_super_admin_password') || 'superadmin123';
  });
  
  // Simulation selected user state
  const [selectedUser, setSelectedUser] = useState<string | 'admin'>('');
  
  // Employee Portal Mode states
  const [isEmployeePortalMode, setIsEmployeePortalMode] = useState(false);
  const [portalLoginEmployeeId, setPortalLoginEmployeeId] = useState<string>('');
  const [portalPasswordInput, setPortalPasswordInput] = useState<string>('');
  const [portalPasswordError, setPortalPasswordError] = useState<string>('');
  const [portalPasswordVisible, setPortalPasswordVisible] = useState<boolean>(false);
  const [employeePortalSearch, setEmployeePortalSearch] = useState<string>('');

  // Admin Login via Portal modal state
  const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);
  const [adminUsernameInput, setAdminUsernameInput] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminLoginError, setAdminLoginError] = useState('');
  const [adminLoginPasswordVisible, setAdminLoginPasswordVisible] = useState(false);
  
  // App initialization state
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInitialDataLoaded, setIsInitialDataLoaded] = useState(false);

  // Admin Side Drawer Menu visibility
  const [isAdminDrawerOpen, setIsAdminDrawerOpen] = useState(false);
  const [isAdminPasswordVisible, setIsAdminPasswordVisible] = useState(false);

  // Load Tenants & Active Tenant configuration on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let resolvedEmployeePortal = false;
    if (params.get('portal') === 'employee') {
      setIsEmployeePortalMode(true);
      setSelectedUser('');
      resolvedEmployeePortal = true;
    }

    // 1. Initial local load for instant rendering
    const storedTenants = localStorage.getItem('hader_tenants');
    let currentTenants: Tenant[] = [];
    if (storedTenants) {
      currentTenants = JSON.parse(storedTenants);
      setTenants(currentTenants);
    }

    // Resolve active tenant ID from URL or local storage
    const urlTenantId = params.get('tenant');
    let targetTenantId = 'default';
    if (urlTenantId) {
      targetTenantId = urlTenantId;
    } else {
      const storedActiveId = localStorage.getItem('hader_active_tenant_id');
      if (storedActiveId) {
        targetTenantId = storedActiveId;
      }
    }
    setActiveTenantId(targetTenantId);
    localStorage.setItem('hader_active_tenant_id', targetTenantId);

    if (!urlTenantId) {
      params.set('tenant', targetTenantId);
      window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
    }

    // Resolve role/session in a tenant-scoped manner to isolate tabs/urls
    const savedRole = localStorage.getItem(`hader_logged_in_role_${targetTenantId}`);
    const savedSuperAdminActive = localStorage.getItem(`hader_super_admin_active_${targetTenantId}`);
    
    if (resolvedEmployeePortal) {
      setIsSuperAdminMode(false);
      setIsEmployeePortalMode(true);
      const savedEmpId = localStorage.getItem(`hader_logged_in_emp_id_${targetTenantId}`);
      if (savedRole === 'employee' && savedEmpId) {
        setSelectedUser(savedEmpId);
      } else {
        setSelectedUser('');
      }
    } else if (savedSuperAdminActive === 'true' || savedRole === 'superadmin') {
      if (urlTenantId) {
        setIsSuperAdminMode(false);
        setIsEmployeePortalMode(false);
        setSelectedUser('admin');
      } else {
        setIsSuperAdminMode(true);
        setSelectedUser('admin');
        setIsEmployeePortalMode(false);
      }
    } else if (savedRole === 'admin') {
      setIsSuperAdminMode(false);
      setSelectedUser('admin');
      setIsEmployeePortalMode(false);
    } else if (savedRole === 'employee') {
      setIsEmployeePortalMode(true);
      const savedEmpId = localStorage.getItem(`hader_logged_in_emp_id_${targetTenantId}`);
      if (savedEmpId) {
        setSelectedUser(savedEmpId);
      }
    } else {
      setSelectedUser('');
      setIsEmployeePortalMode(false);
      setIsSuperAdminMode(false);
    }

    // 2. Fetch live global configs from Firebase
    getTenantsFromFirebase().then(liveTenants => {
      setTenants(liveTenants);
      localStorage.setItem('hader_tenants', JSON.stringify(liveTenants));
    });

    getSuperAdminCredentialsFromFirebase().then(creds => {
      setSuperAdminUsername(creds.username);
      setSuperAdminPassword(creds.password);
      localStorage.setItem('hader_super_admin_username', creds.username);
      localStorage.setItem('hader_super_admin_password', creds.password);
    });

    setIsLoaded(true);
  }, []);

  // Keep URL in sync with activeTenantId to isolate multiple tabs
  useEffect(() => {
    if (!isLoaded) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('tenant') !== activeTenantId) {
      params.set('tenant', activeTenantId);
      window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
    }
  }, [activeTenantId, isLoaded]);

  // Sync / load workspace data from LocalStorage & Firebase using real-time listeners
  useEffect(() => {
    if (!isLoaded) return;

    const empKey = activeTenantId === 'default' ? 'hader_employees' : `hader_employees_${activeTenantId}`;
    const attKey = activeTenantId === 'default' ? 'hader_attendance' : `hader_attendance_${activeTenantId}`;
    const reqKey = activeTenantId === 'default' ? 'hader_requests' : `hader_requests_${activeTenantId}`;
    const offKey = activeTenantId === 'default' ? 'hader_office' : `hader_office_${activeTenantId}`;

    setIsInitialDataLoaded(false);

    // A. Local cached load to render immediately if possible
    const cachedEmp = localStorage.getItem(empKey);
    if (cachedEmp) {
      setEmployees(JSON.parse(cachedEmp));
    }
    const cachedAtt = localStorage.getItem(attKey);
    if (cachedAtt) {
      setAttendanceRecords(JSON.parse(cachedAtt));
    }
    const cachedReq = localStorage.getItem(reqKey);
    if (cachedReq) {
      setPendingRequests(JSON.parse(cachedReq));
    }
    const cachedOff = localStorage.getItem(offKey);
    if (cachedOff) {
      setOfficeSettings(JSON.parse(cachedOff));
    }

    // B. Setup real-time listeners (onSnapshot)
    let empFirst = false;
    let attFirst = false;
    let reqFirst = false;
    let offFirst = false;

    const checkFirstLoads = () => {
      if (empFirst && attFirst && reqFirst && offFirst) {
        setIsInitialDataLoaded(true);
      }
    };

    // 1. Employees Subscriber
    const qEmp = query(collection(db, 'employees'), where('tenantId', '==', activeTenantId));
    const unsubscribeEmp = onSnapshot(qEmp, (snapshot) => {
      const list = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          role: data.role,
          password: data.password,
          workModel: data.workModel,
          joinDate: data.joinDate,
          avatarColor: data.avatarColor,
        } as Employee;
      });
      setEmployees(list);
      localStorage.setItem(empKey, JSON.stringify(list));
      empFirst = true;
      checkFirstLoads();
    }, (error) => {
      console.error("Error subscribing to employees:", error);
      empFirst = true;
      checkFirstLoads();
    });

    // 2. Attendance Subscriber
    const qAtt = query(collection(db, 'attendance'), where('tenantId', '==', activeTenantId));
    const unsubscribeAtt = onSnapshot(qAtt, (snapshot) => {
      const records = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          employeeId: data.employeeId,
          employeeName: data.employeeName,
          date: data.date,
          checkIn: data.checkIn,
          checkOut: data.checkOut,
          workModel: data.workModel,
          status: data.status,
          totalHours: data.totalHours,
          isApproved: data.isApproved,
          approvedAt: data.approvedAt,
        } as AttendanceRecord;
      });
      // Sort descending by date / time
      const sorted = records.sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.checkIn}`);
        const dateB = new Date(`${b.date}T${b.checkIn}`);
        return dateB.getTime() - dateA.getTime();
      });
      setAttendanceRecords(sorted);
      localStorage.setItem(attKey, JSON.stringify(sorted));
      attFirst = true;
      checkFirstLoads();
    }, (error) => {
      console.error("Error subscribing to attendance:", error);
      attFirst = true;
      checkFirstLoads();
    });

    // 3. Requests Subscriber
    const qReq = query(collection(db, 'requests'), where('tenantId', '==', activeTenantId));
    const unsubscribeReq = onSnapshot(qReq, (snapshot) => {
      const requests = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          employeeId: data.employeeId,
          employeeName: data.employeeName,
          role: data.role,
          date: data.date,
          time: data.time,
          type: data.type,
          status: data.status,
          notes: data.notes
        } as ApprovalRequest;
      });
      const sorted = requests.sort((a, b) => b.id.localeCompare(a.id));
      setPendingRequests(sorted);
      localStorage.setItem(reqKey, JSON.stringify(sorted));
      reqFirst = true;
      checkFirstLoads();
    }, (error) => {
      console.error("Error subscribing to requests:", error);
      reqFirst = true;
      checkFirstLoads();
    });

    // 4. Office Settings Subscriber
    const docRef = doc(db, 'officeSettings', activeTenantId);
    const unsubscribeOff = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const settings = docSnap.data() as OfficeSettings;
        setOfficeSettings(settings);
        localStorage.setItem(offKey, JSON.stringify(settings));
      } else {
        saveOfficeSettingsToFirebase(activeTenantId, DEFAULT_OFFICE);
      }
      offFirst = true;
      checkFirstLoads();
    }, (error) => {
      console.error("Error subscribing to officeSettings:", error);
      offFirst = true;
      checkFirstLoads();
    });

    return () => {
      unsubscribeEmp();
      unsubscribeAtt();
      unsubscribeReq();
      unsubscribeOff();
    };
  }, [activeTenantId, isLoaded]);

  // Sync state helper to write to localStorage for the active tenant
  const saveState = (
    updatedEmployees?: Employee[],
    updatedRecords?: AttendanceRecord[],
    updatedRequests?: ApprovalRequest[],
    updatedSettings?: OfficeSettings
  ) => {
    const empKey = activeTenantId === 'default' ? 'hader_employees' : `hader_employees_${activeTenantId}`;
    const attKey = activeTenantId === 'default' ? 'hader_attendance' : `hader_attendance_${activeTenantId}`;
    const reqKey = activeTenantId === 'default' ? 'hader_requests' : `hader_requests_${activeTenantId}`;
    const offKey = activeTenantId === 'default' ? 'hader_office' : `hader_office_${activeTenantId}`;

    if (updatedEmployees) {
      setEmployees(updatedEmployees);
      localStorage.setItem(empKey, JSON.stringify(updatedEmployees));
    }
    if (updatedRecords) {
      setAttendanceRecords(updatedRecords);
      localStorage.setItem(attKey, JSON.stringify(updatedRecords));
    }
    if (updatedRequests) {
      setPendingRequests(updatedRequests);
      localStorage.setItem(reqKey, JSON.stringify(updatedRequests));
    }
    if (updatedSettings) {
      setOfficeSettings(updatedSettings);
      localStorage.setItem(offKey, JSON.stringify(updatedSettings));
    }
  };


  // Helper to format current time as HH:MM
  const getFormattedTime = () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  };

  // Helper to calculate hours between two HH:MM strings
  const calculateHoursDiff = (time1: string, time2: string): number => {
    const [h1, m1] = time1.split(':').map(Number);
    const [h2, m2] = time2.split(':').map(Number);
    const diffMin = (h2 * 60 + m2) - (h1 * 60 + m1);
    const hours = diffMin / 60;
    return parseFloat(Math.max(0, hours).toFixed(2));
  };

  // --- EMPLOYEE ACTIONS ---

  // 1. On-Site Check In
  const handleCheckInOnSite = (status: 'حاضر' | 'متأخر', simulatedLocation?: { lat: number; lng: number }) => {
    const activeEmp = employees.find(e => e.id === selectedUser);
    if (!activeEmp) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const newRecord: AttendanceRecord = {
      id: `rec-onsite-${Date.now()}`,
      employeeId: activeEmp.id,
      employeeName: activeEmp.name,
      date: todayStr,
      checkIn: getFormattedTime(),
      checkOut: null,
      workModel: 'on-site',
      status: status,
      totalHours: 0,
      isApproved: true,
    };

    const updated = [newRecord, ...attendanceRecords];
    saveState(undefined, updated);
    saveAttendanceToFirebase(activeTenantId, newRecord);
  };

  // 2. On-Site Check Out
  const handleCheckOutOnSite = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const recordIndex = attendanceRecords.findIndex(
      r => r.employeeId === selectedUser && r.date === todayStr && r.workModel === 'on-site'
    );

    if (recordIndex === -1) return;

    const updated = [...attendanceRecords];
    const record = updated[recordIndex];
    const checkOutTime = getFormattedTime();
    
    record.checkOut = checkOutTime;
    record.totalHours = calculateHoursDiff(record.checkIn, checkOutTime);

    saveState(undefined, updated);
    saveAttendanceToFirebase(activeTenantId, record);
  };

  // 2b. Admin Force Check Out Employee
  const handleAdminCheckOutEmployee = (employeeId: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const recordIndex = attendanceRecords.findIndex(
      r => r.employeeId === employeeId && r.date === todayStr && !r.checkOut
    );

    if (recordIndex === -1) return;

    const updated = [...attendanceRecords];
    const record = updated[recordIndex];
    const checkOutTime = getFormattedTime();
    
    record.checkOut = checkOutTime;
    record.totalHours = calculateHoursDiff(record.checkIn, checkOutTime);

    saveState(undefined, updated);
    saveAttendanceToFirebase(activeTenantId, record);
  };

  // 2c. Archive Today's Records
  const handleArchiveTodayRecords = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const updated = attendanceRecords.map(r => {
      if (r.date === todayStr) {
        const archivedRec = { ...r, archived: true };
        saveAttendanceToFirebase(activeTenantId, archivedRec);
        return archivedRec;
      }
      return r;
    });
    saveState(undefined, updated);
  };

  // 3. Remote Check In Request
  const handleCheckInRemote = (notes?: string) => {
    const activeEmp = employees.find(e => e.id === selectedUser);
    if (!activeEmp) return;

    const todayStr = new Date().toISOString().split('T')[0];
    
    const newRequest: ApprovalRequest = {
      id: `req-${Date.now()}`,
      employeeId: activeEmp.id,
      employeeName: activeEmp.name,
      role: activeEmp.role,
      date: todayStr,
      time: getFormattedTime(),
      type: 'check-in',
      status: 'pending',
      notes: notes,
    };

    const updated = [newRequest, ...pendingRequests];
    saveState(undefined, undefined, updated);
    saveRequestToFirebase(activeTenantId, newRequest);
  };

  // 4. Remote Check Out Request
  const handleCheckOutRemote = (notes?: string) => {
    const activeEmp = employees.find(e => e.id === selectedUser);
    if (!activeEmp) return;

    const todayStr = new Date().toISOString().split('T')[0];
    
    const newRequest: ApprovalRequest = {
      id: `req-${Date.now()}`,
      employeeId: activeEmp.id,
      employeeName: activeEmp.name,
      role: activeEmp.role,
      date: todayStr,
      time: getFormattedTime(),
      type: 'check-out',
      status: 'pending',
      notes: notes,
    };

    const updated = [newRequest, ...pendingRequests];
    saveState(undefined, undefined, updated);
    saveRequestToFirebase(activeTenantId, newRequest);
  };

  // --- ADMIN ACTIONS ---

  // 1. Approve Remote Request
  const handleApproveRequest = (requestId: string) => {
    const requestIndex = pendingRequests.findIndex(r => r.id === requestId);
    if (requestIndex === -1) return;

    const updatedRequests = [...pendingRequests];
    const request = updatedRequests[requestIndex];
    request.status = 'approved';

    const updatedRecords = [...attendanceRecords];

    if (request.type === 'check-in') {
      // Work hour policy: Starts dynamically based on officeSettings.workStartTime
      const [hour, min] = request.time.split(':').map(Number);
      const [startHour, startMin] = (officeSettings.workStartTime || "08:30").split(':').map(Number);
      const isLate = hour > startHour || (hour === startHour && min > startMin);
      const attendanceStatus = isLate ? 'متأخر' : 'حاضر';

      const isOutOfRangeOnSite = request.notes?.includes('خارج النطاق');

      const newRecord: AttendanceRecord = {
        id: `rec-remote-${Date.now()}`,
        employeeId: request.employeeId,
        employeeName: request.employeeName,
        date: request.date,
        checkIn: request.time,
        checkOut: null,
        workModel: isOutOfRangeOnSite ? 'on-site' : 'remote',
        status: attendanceStatus,
        totalHours: 0,
        isApproved: true,
        approvedAt: getFormattedTime(),
      };
      updatedRecords.unshift(newRecord);
    } else if (request.type === 'check-out') {
      const recordIndex = updatedRecords.findIndex(
        r => r.employeeId === request.employeeId && r.date === request.date && !r.checkOut
      );

      if (recordIndex !== -1) {
        const record = updatedRecords[recordIndex];
        record.checkOut = request.time;
        record.totalHours = calculateHoursDiff(record.checkIn, request.time);
      }
    }

    saveState(undefined, updatedRecords, updatedRequests);
    saveRequestToFirebase(activeTenantId, request);
    if (request.type === 'check-in') {
      const newRecord = updatedRecords[0];
      if (newRecord) {
        saveAttendanceToFirebase(activeTenantId, newRecord);
      }
    } else if (request.type === 'check-out') {
      const record = updatedRecords.find(
        r => r.employeeId === request.employeeId && r.date === request.date && r.checkOut === request.time
      );
      if (record) {
        saveAttendanceToFirebase(activeTenantId, record);
      }
    }
  };

  // 2. Reject Remote Request
  const handleRejectRequest = (requestId: string) => {
    const updatedRequests = pendingRequests.map(r => {
      if (r.id === requestId) {
        const rejectedReq = { ...r, status: 'rejected' as const };
        saveRequestToFirebase(activeTenantId, rejectedReq);
        return rejectedReq;
      }
      return r;
    });
    saveState(undefined, undefined, updatedRequests);
  };

  // 3. Add Employee
  const handleAddEmployee = (newEmp: Omit<Employee, 'id' | 'joinDate' | 'avatarColor'>) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const randomColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    
    const empRecord: Employee = {
      ...newEmp,
      id: `emp-${Date.now().toString().slice(-4)}`,
      joinDate: todayStr,
      avatarColor: randomColor,
    };

    const updated = [...employees, empRecord];
    saveState(updated);
    saveEmployeeToFirebase(activeTenantId, empRecord);
  };

  // 3b. Edit Employee
  const handleEditEmployee = (updatedEmp: Employee) => {
    const updated = employees.map(e => e.id === updatedEmp.id ? updatedEmp : e);
    // Propagate updated name to existing records
    const updatedRecords = attendanceRecords.map(r => {
      if (r.employeeId === updatedEmp.id) {
        const updatedRec = { ...r, employeeName: updatedEmp.name };
        saveAttendanceToFirebase(activeTenantId, updatedRec);
        return updatedRec;
      }
      return r;
    });
    saveState(updated, updatedRecords);
    saveEmployeeToFirebase(activeTenantId, updatedEmp);
  };

  // 4. Delete Employee
  const handleDeleteEmployee = (empId: string) => {
    const updated = employees.filter(e => e.id !== empId);
    saveState(updated);
    deleteEmployeeFromFirebase(empId);
  };

  // 5. Update Office GPS Coordinates
  const handleUpdateOfficeSettings = (settings: OfficeSettings) => {
    saveState(undefined, undefined, undefined, settings);
    saveOfficeSettingsToFirebase(activeTenantId, settings);
  };

  // 6. Hard Reset System Data (Convenient for testers)
  const handleHardReset = () => {
    if (confirm('هل أنت متأكد من رغبتك في إعادة تعيين كافة البيانات؟ سيؤدي هذا إلى مسح التغييرات الحالية واستعادة البيانات الافتراضية.')) {
      localStorage.removeItem('hader_employees');
      localStorage.removeItem('hader_attendance');
      localStorage.removeItem('hader_requests');
      localStorage.removeItem('hader_office');
      localStorage.removeItem('hader_tenants');
      localStorage.removeItem('hader_active_tenant_id');
      localStorage.removeItem('hader_super_admin_active');
      window.location.reload();
    }
  };

  // --- SUPER ADMIN ACTIONS ---
  
  // 1. Add Tenant
  const handleAddTenant = (createdTenant: Tenant) => {
    const updated = [...tenants, createdTenant];
    setTenants(updated);
    localStorage.setItem('hader_tenants', JSON.stringify(updated));
    saveTenantToFirebase(createdTenant);
  };

  // 2. Edit Tenant
  const handleEditTenant = async (oldId: string, updatedTenant: Tenant) => {
    let updated = [...tenants];
    if (oldId !== updatedTenant.id) {
      // The ID has changed!
      updated = tenants.map(t => t.id === oldId ? updatedTenant : t);
      
      // If the currently active tenant ID is the one being modified, we should update the active tenant ID
      if (activeTenantId === oldId) {
        setActiveTenantId(updatedTenant.id);
        localStorage.setItem('hader_active_tenant_id', updatedTenant.id);
      }
      
      // Migrate localStorage keys
      const oldKeys = {
        emp: oldId === 'default' ? 'hader_employees' : `hader_employees_${oldId}`,
        att: oldId === 'default' ? 'hader_attendance' : `hader_attendance_${oldId}`,
        req: oldId === 'default' ? 'hader_requests' : `hader_requests_${oldId}`,
        off: oldId === 'default' ? 'hader_office' : `hader_office_${oldId}`
      };
      const newKeys = {
        emp: updatedTenant.id === 'default' ? 'hader_employees' : `hader_employees_${updatedTenant.id}`,
        att: updatedTenant.id === 'default' ? 'hader_attendance' : `hader_attendance_${updatedTenant.id}`,
        req: updatedTenant.id === 'default' ? 'hader_requests' : `hader_requests_${updatedTenant.id}`,
        off: updatedTenant.id === 'default' ? 'hader_office' : `hader_office_${updatedTenant.id}`
      };
      
      const empData = localStorage.getItem(oldKeys.emp);
      if (empData) {
        localStorage.setItem(newKeys.emp, empData);
        localStorage.removeItem(oldKeys.emp);
      }
      const attData = localStorage.getItem(oldKeys.att);
      if (attData) {
        localStorage.setItem(newKeys.att, attData);
        localStorage.removeItem(oldKeys.att);
      }
      const reqData = localStorage.getItem(oldKeys.req);
      if (reqData) {
        localStorage.setItem(newKeys.req, reqData);
        localStorage.removeItem(oldKeys.req);
      }
      const offData = localStorage.getItem(oldKeys.off);
      if (offData) {
        localStorage.setItem(newKeys.off, offData);
        localStorage.removeItem(oldKeys.off);
      }
      
      // Call firebase update helper
      await migrateTenantInFirebase(oldId, updatedTenant.id, updatedTenant);
    } else {
      // Normal edit, only properties changed
      updated = tenants.map(t => t.id === updatedTenant.id ? updatedTenant : t);
      await saveTenantToFirebase(updatedTenant);
    }
    
    setTenants(updated);
    localStorage.setItem('hader_tenants', JSON.stringify(updated));
  };

  // 3. Delete Tenant
  const handleDeleteTenant = (id: string) => {
    const updated = tenants.filter(t => t.id !== id);
    setTenants(updated);
    localStorage.setItem('hader_tenants', JSON.stringify(updated));
    
    // Clear associated local storage databases
    localStorage.removeItem(`hader_employees_${id}`);
    localStorage.removeItem(`hader_attendance_${id}`);
    localStorage.removeItem(`hader_requests_${id}`);
    localStorage.removeItem(`hader_office_${id}`);
    
    deleteTenantFromFirebase(id);

    if (activeTenantId === id) {
      setActiveTenantId('default');
      localStorage.setItem('hader_active_tenant_id', 'default');
    }
  };

  // 4. Logout Super Admin Mode
  const handleSuperAdminLogout = () => {
    setIsSuperAdminMode(false);
    localStorage.removeItem(`hader_super_admin_active_${activeTenantId}`);
    localStorage.removeItem(`hader_logged_in_role_${activeTenantId}`);
    
    // Reset states so they return to unified Login Screen
    setActiveTenantId('default');
    localStorage.setItem('hader_active_tenant_id', 'default');
    setSelectedUser('');
    setIsEmployeePortalMode(false);
  };

  // 5. Update Super Admin Credentials
  const handleUpdateSuperAdminCredentials = (user: string, pass: string) => {
    setSuperAdminUsername(user);
    setSuperAdminPassword(pass);
    localStorage.setItem('hader_super_admin_username', user);
    localStorage.setItem('hader_super_admin_password', pass);
    saveSuperAdminCredentialsToFirebase(user, pass);
  };

  // 6. Update Active Tenant Admin Credentials
  const handleUpdateAdminCredentials = (user: string, pass: string) => {
    let tenantExists = tenants.some(t => t.id === activeTenantId);
    let updated: Tenant[];
    if (!tenantExists) {
      const newTenant: Tenant = {
        id: activeTenantId,
        companyName: activeTenantId === 'default' ? 'حاضر - الفرع الرئيسي' : 'مؤسسة جديدة',
        adminName: activeTenantId === 'default' ? 'مدير النظام الافتراضي' : 'مدير جديد',
        username: user,
        password: pass,
        createdAt: new Date().toISOString().split('T')[0]
      };
      saveTenantToFirebase(newTenant);
      updated = [...tenants, newTenant];
    } else {
      updated = tenants.map(t => {
        if (t.id === activeTenantId) {
          const updatedTenant = { ...t, username: user, password: pass };
          saveTenantToFirebase(updatedTenant);
          return updatedTenant;
        }
        return t;
      });
    }
    setTenants(updated);
    localStorage.setItem('hader_tenants', JSON.stringify(updated));
  };

  const activeTenant = tenants.find(t => t.id === activeTenantId);
  const activeCompanyName = activeTenant ? activeTenant.companyName : 'حاضر - الفرع الرئيسي';
  const currentAdminUsername = activeTenant ? activeTenant.username : 'admin';
  const currentAdminPassword = activeTenant ? activeTenant.password : 'admin123';
  const currentAdminName = activeTenant ? activeTenant.adminName : 'مدير النظام (الرئيسي)';

  if (!isLoaded || !isInitialDataLoaded) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex flex-col items-center justify-center p-4">
        <Clock className="w-12 h-12 text-[#D4AF37] animate-spin mb-4" />
        <p className="text-sm font-bold text-[#E4E4E7] font-serif italic">جاري تحميل نظام حاضر للتحضير الذكي...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#E4E4E7] flex flex-col font-sans" dir="rtl" id="app-wrapper">

      {/* Super Admin Preview Banner */}
      {localStorage.getItem(`hader_super_admin_active_${activeTenantId}`) === 'true' && !isSuperAdminMode && (
        <div className="bg-[#D4AF37] text-slate-950 px-4 py-2.5 text-xs font-extrabold text-center flex flex-col sm:flex-row items-center justify-center gap-2 relative z-50 shadow-md">
          <div className="flex items-center gap-1.5 justify-center">
            <Shield className="w-4 h-4 animate-bounce" />
            <span>وضع معاينة المصمم العام: أنت تستعرض حالياً لوحة تحكم {activeCompanyName}</span>
          </div>
          <button
            onClick={() => {
              setIsSuperAdminMode(true);
              const url = new URL(window.location.href);
              url.searchParams.delete('tenant');
              url.searchParams.delete('portal');
              window.history.pushState({}, '', url.toString());
              setActiveTenantId('default');
              localStorage.setItem('hader_active_tenant_id', 'default');
              setSelectedUser('admin');
              setIsEmployeePortalMode(false);
            }}
            className="bg-slate-950 text-[#D4AF37] hover:bg-slate-900 px-3 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer shadow-sm mr-2"
          >
            العودة للوحة الإدارة العامة الرئيسية
          </button>
        </div>
      )}

      {/* Main Core Application Header */}
      <header className="bg-[#0F0F11] border-b border-[#27272A] py-5 px-6 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Logo / Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#D4AF37] rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.25)]">
              <ClipboardList className="w-5 h-5 text-[#0A0A0B]" />
            </div>
            <div className="text-right">
              <h1 className="text-lg font-serif italic text-[#D4AF37] tracking-wide leading-tight">
                {isSuperAdminMode ? 'حاضر | لوحة المصمم العام' : `${activeCompanyName}`}
              </h1>
              <p className="text-[10px] text-[#8E8E93] mt-0.5 uppercase tracking-[0.1em] font-medium">
                {isSuperAdminMode ? 'إدارة كافة المؤسسات والمشاريع وعمليات التهيئة' : 'النظام الذكي لإدارة الموارد البشرية والتحضير'}
              </p>
            </div>
          </div>

          {/* Header Action Elements */}
          <div className="flex items-center gap-3">
            {isSuperAdminMode ? (
              <button
                type="button"
                onClick={handleSuperAdminLogout}
                className="inline-flex items-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs px-3.5 py-2 rounded-xl font-bold cursor-pointer transition-all duration-150"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>الخروج من الإدارة العامة</span>
              </button>
            ) : isEmployeePortalMode ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAdminUsernameInput('');
                    setAdminPasswordInput('');
                    setAdminLoginError('');
                    setShowAdminLoginModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 text-xs px-3.5 py-2 rounded-xl font-bold cursor-pointer transition-all duration-150"
                >
                  <Shield className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>دخول الإدارة</span>
                </button>
              </div>
            ) : (
              <>
                {selectedUser === 'admin' ? (
                  <>
                    {/* Switch to Employee Portal view manually */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsEmployeePortalMode(true);
                        setSelectedUser(''); // Go to portal log-in screen
                        localStorage.setItem(`hader_logged_in_role_${activeTenantId}`, 'employee');
                      }}
                      className="inline-flex items-center gap-1.5 bg-[#1A1C1E] hover:bg-[#27272A] text-slate-200 border border-[#27272A] text-xs px-3.5 py-2 rounded-xl font-bold cursor-pointer transition-all duration-150"
                    >
                      <Laptop className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>بوابة الموظفين</span>
                    </button>

                    {/* Trigger button for Admin Side Drawer Menu */}
                    <button
                      id="btn-toggle-admin-drawer"
                      type="button"
                      onClick={() => setIsAdminDrawerOpen(true)}
                      className="inline-flex items-center gap-1.5 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 text-xs px-3.5 py-2 rounded-xl font-bold cursor-pointer transition-all duration-150"
                    >
                      <Shield className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>لوحة التحكم والمحاكاة</span>
                    </button>

                    {/* Secure Log out for Tenant Admin */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUser('');
                        setIsEmployeePortalMode(false);
                        setIsSuperAdminMode(false);
                        localStorage.removeItem(`hader_logged_in_role_${activeTenantId}`);
                        localStorage.removeItem(`hader_logged_in_emp_id_${activeTenantId}`);
                        localStorage.removeItem(`hader_super_admin_active_${activeTenantId}`);
                      }}
                      className="inline-flex items-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs px-3.5 py-2 rounded-xl font-bold cursor-pointer transition-all duration-150"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>تسجيل الخروج</span>
                    </button>
                  </>
                ) : null}
              </>
            )}
          </div>
        </div>
      </header>


      {/* ADMIN PROFILE & SIMULATION SLIDE-OVER DRAWER (SIDE MENU) */}
      {isAdminDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden text-right" id="admin-side-drawer-root" role="dialog" aria-modal="true">
          {/* Backdrop Overlay */}
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300 cursor-pointer" 
            onClick={() => setIsAdminDrawerOpen(false)}
          ></div>

          {/* Sliding Panel Content */}
          <div className="absolute inset-y-0 right-0 max-w-sm w-full bg-[#121214] border-l border-[#27272A] shadow-2xl flex flex-col justify-between p-6 transform transition-transform duration-300">
            
            {/* Drawer Body Area */}
            <div className="space-y-6">
              
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[#27272A]">
                <button 
                  type="button"
                  onClick={() => setIsAdminDrawerOpen(false)}
                  className="p-1 rounded-lg bg-[#1A1C1E] hover:bg-[#27272A] border border-[#27272A] text-[#8E8E93] hover:text-[#E4E4E7] transition-all cursor-pointer"
                  title="إغلاق القائمة"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="text-right">
                  <h2 className="text-sm font-bold text-[#E4E4E7]">بيانات مدير النظام</h2>
                  <p className="text-[10px] text-[#8E8E93] mt-0.5">لوحة التحكم والمحاكاة</p>
                </div>
              </div>

              {/* Admin Profile Block */}
              <div className="bg-[#0F0F11] border border-[#27272A] rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#1A1C1E] to-[#121214] border border-[#D4AF37]/30 flex items-center justify-center shadow-lg text-[#D4AF37] shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">{currentAdminName}</h3>
                  <p className="text-[9px] text-[#8E8E93] mt-0.5">كامل صلاحيات لوحة التحكم والتهيئة لمؤسسة: {activeCompanyName}</p>
                </div>
              </div>

              {/* Admin Login Credentials Box */}
              <div className="space-y-2">
                <span className="text-[10px] text-[#8E8E93] font-bold block">بيانات دخول المدير:</span>
                <div className="bg-[#1A1C1E] border border-[#27272A] rounded-xl p-3.5 space-y-2 text-xs font-mono">
                  <div className="flex justify-between items-center bg-[#0F0F11] px-3 py-2 rounded-lg border border-[#27272A]/50">
                    <span className="text-[#E4E4E7] font-bold">{currentAdminUsername}</span>
                    <span className="text-[#8E8E93] text-[10px]">اسم المستخدم</span>
                  </div>
                  <div className="flex justify-between items-center bg-[#0F0F11] px-3 py-2 rounded-lg border border-[#27272A]/50">
                    <div className="flex items-center gap-2">
                      <button 
                        type="button" 
                        onClick={() => setIsAdminPasswordVisible(!isAdminPasswordVisible)}
                        className="text-[#D4AF37] hover:text-[#F3C63F] cursor-pointer"
                        title={isAdminPasswordVisible ? "إخفاء كلمة المرور" : "عرض كلمة المرور"}
                      >
                        {isAdminPasswordVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <span className="text-[#E4E4E7] font-bold">
                        {isAdminPasswordVisible ? currentAdminPassword : '••••••••'}
                      </span>
                    </div>
                    <span className="text-[#8E8E93] text-[10px]">كلمة المرور</span>
                  </div>
                </div>
              </div>


              {/* Account Simulation Switcher Option */}
              <div className="space-y-2">
                <span className="text-[10px] text-[#8E8E93] font-bold block">تبديل حساب المحاكاة النشط:</span>
                <div className="bg-[#1A1C1E] border border-[#27272A] rounded-xl p-3 flex flex-col gap-2">
                  <p className="text-[10px] text-[#8E8E93] leading-relaxed">تتيح لك المحاكاة الدخول كأحد موظفيك لمراجعة تجربة التحضير، دون الحاجة لتسجيل الخروج.</p>
                  
                  <div className="relative mt-1">
                    <select
                      id="drawer-user-switcher"
                      value={selectedUser}
                      onChange={(e) => {
                        setSelectedUser(e.target.value);
                        setIsAdminDrawerOpen(false); // Close drawer on selection
                      }}
                      className="w-full bg-[#0F0F11] border border-[#27272A] text-xs px-3 py-2.5 rounded-lg text-white font-bold focus:outline-none focus:border-[#D4AF37] cursor-pointer appearance-none"
                    >
                      <option value="admin" className="text-[#D4AF37]">مدير النظام (الرئيسي)</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          الموظف: {emp.name} ({emp.role})
                        </option>
                      ))}
                    </select>
                    <div className="absolute left-3 top-3.5 pointer-events-none text-[#8E8E93]">
                      <Users className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Warning factory reset action */}
              <div className="bg-rose-950/10 border border-rose-900/30 rounded-xl p-4 text-xs space-y-3">
                <div className="flex items-center gap-2 text-rose-400 font-bold justify-end">
                  <span>إعادة تهيئة النظام بالكامل</span>
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  سيقوم هذا الإجراء بحذف كافة السجلات والموظفين المضافين والطلبات، والبدء بقائمة موظفين فارغة تماماً.
                </p>
                <button
                  id="btn-factory-reset-drawer"
                  onClick={() => {
                    if (confirm('هل أنت متأكد تماماً من رغبتك في إعادة ضبط النظام ومسح كافة البيانات المضافة؟')) {
                      handleHardReset();
                      setIsAdminDrawerOpen(false);
                    }
                  }}
                  className="w-full bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 hover:border-rose-400/50 font-bold py-2 rounded-lg text-[11px] transition-all cursor-pointer text-center"
                >
                  تنفيذ إعادة التهيئة الكلية
                </button>
              </div>

            </div>

            {/* Close Drawer Footer Button */}
            <div className="pt-4 border-t border-[#27272A]">
              <button
                type="button"
                onClick={() => setIsAdminDrawerOpen(false)}
                className="w-full bg-[#1A1C1E] hover:bg-[#27272A] border border-[#27272A] text-[#E4E4E7] font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer text-center"
              >
                إغلاق القائمة الجانبية
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Dynamic Screen Content container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        {isSuperAdminMode ? (
          <SuperAdminPanel
            tenants={tenants}
            onAddTenant={handleAddTenant}
            onEditTenant={handleEditTenant}
            onDeleteTenant={handleDeleteTenant}
            onLogout={handleSuperAdminLogout}
            superAdminUsername={superAdminUsername}
            superAdminPassword={superAdminPassword}
            onUpdateSuperAdminCredentials={handleUpdateSuperAdminCredentials}
          />
        ) : isEmployeePortalMode ? (
          selectedUser && employees.some(e => e.id === selectedUser) ? (
            // Employee is logged in via portal
            (() => {
              const activeEmp = employees.find(e => e.id === selectedUser)!;
              return (
                <div className="space-y-6">
                  {/* Small portal info banner */}
                  <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/20 p-4 rounded-2xl flex flex-col sm:flex-row gap-3 justify-between items-center text-right">
                    <div className="flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <p className="text-xs text-[#D4AF37] font-bold">بوابة الخدمة الذاتية النشطة - الموظف: {activeEmp.name}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUser('');
                        setPortalLoginEmployeeId('');
                        setPortalPasswordInput('');
                        setPortalPasswordError('');
                      }}
                      className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-[10px] px-3 py-1.5 rounded-lg transition-colors cursor-pointer font-bold"
                    >
                      تسجيل الخروج من البوابة
                    </button>
                  </div>

                  <EmployeePanel
                    employee={activeEmp}
                    attendanceRecords={attendanceRecords}
                    pendingRequests={pendingRequests}
                    officeSettings={officeSettings}
                    onCheckInOnSite={handleCheckInOnSite}
                    onCheckOutOnSite={handleCheckOutOnSite}
                    onCheckInRemote={handleCheckInRemote}
                    onCheckOutRemote={handleCheckOutRemote}
                  />
                </div>
              );
            })()
          ) : (
            // Portal login screen (No employee logged in yet)
            <div className="max-w-xl mx-auto space-y-6 animate-in fade-in duration-300">
              
              {/* Card container */}
              <div className="bg-[#121214] border border-[#27272A] rounded-3xl p-6 sm:p-8 shadow-2xl relative text-right">
                
                <div className="text-center pb-6 border-b border-[#27272A] mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#1A1C1E] to-[#121214] border border-[#D4AF37]/40 rounded-2xl flex items-center justify-center shadow-lg text-[#D4AF37] mx-auto mb-3">
                    <Users className="w-6 h-6 animate-pulse" />
                  </div>
                  <h2 className="text-lg font-bold text-white">بوابة الخدمة الذاتية للموظفين</h2>
                  <p className="text-xs text-[#8E8E93] mt-1.5">الرجاء تحديد اسمك من القائمة وإدخال كلمة المرور للتحضير</p>
                </div>

                {portalLoginEmployeeId === '' ? (
                  // Step 1: List and Search Employees
                  <div className="space-y-4">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="ابحث عن اسمك في الكادر..."
                        value={employeePortalSearch}
                        onChange={(e) => setEmployeePortalSearch(e.target.value)}
                        className="w-full bg-[#0F0F11] border border-[#27272A] hover:border-[#8E8E93]/40 focus:border-[#D4AF37] rounded-xl text-xs pl-4 pr-10 py-3 text-right focus:outline-none text-white font-medium"
                      />
                      <Search className="w-4 h-4 text-[#8E8E93] absolute right-3.5 top-4" />
                    </div>

                    <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1" id="employee-portal-list">
                      {(() => {
                        const filtered = employees.filter(e => 
                          e.name.toLowerCase().includes(employeePortalSearch.toLowerCase()) ||
                          e.role.toLowerCase().includes(employeePortalSearch.toLowerCase())
                        );

                        if (filtered.length === 0) {
                          return (
                            <div className="text-center py-8 text-xs text-[#8E8E93] bg-[#0F0F11]/50 rounded-xl border border-dashed border-[#27272A]">
                              {employees.length === 0 ? 'لا يوجد موظفون مضافون بالنظام حالياً.' : 'لا توجد نتائج مطابقة لبحثك.'}
                            </div>
                          );
                        }

                        return filtered.map(emp => (
                          <button
                            key={emp.id}
                            type="button"
                            onClick={() => {
                              setPortalLoginEmployeeId(emp.id);
                              setPortalPasswordInput('');
                              setPortalPasswordError('');
                            }}
                            className="w-full text-right p-3 rounded-xl bg-[#1A1C1E] hover:bg-[#202125] border border-[#27272A] hover:border-[#D4AF37]/30 flex items-center justify-between transition-all cursor-pointer group"
                          >
                            <span className="text-[10px] font-bold text-[#8E8E93] group-hover:text-[#D4AF37] transition-colors flex items-center gap-1.5">
                              {emp.workModel === 'on-site' ? (
                                <span className="bg-blue-950/40 text-blue-400 border border-blue-900/30 px-2 py-0.5 rounded-full text-[9px]">حضوري</span>
                              ) : (
                                <span className="bg-violet-950/40 text-violet-400 border border-violet-900/30 px-2 py-0.5 rounded-full text-[9px]">عن بُعد</span>
                              )}
                              <span>اختر ←</span>
                            </span>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <h3 className="text-xs font-bold text-white group-hover:text-[#D4AF37] transition-colors">{emp.name}</h3>
                                <p className="text-[10px] text-[#8E8E93] mt-0.5">{emp.role}</p>
                              </div>
                              <span className={`w-8 h-8 rounded-full ${emp.avatarColor} text-white flex items-center justify-center text-xs font-extrabold shadow-sm shrink-0`}>
                                {emp.name.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                          </button>
                        ));
                      })()}
                    </div>
                  </div>
                ) : (
                  // Step 2: Enter password for selected employee
                  (() => {
                    const emp = employees.find(e => e.id === portalLoginEmployeeId);
                    if (!emp) return null;

                    return (
                      <div className="space-y-5 animate-in fade-in duration-200">
                        {/* Selected employee info summary */}
                        <div className="flex items-center justify-between p-3 rounded-xl bg-[#0F0F11] border border-[#27272A]">
                          <button
                            type="button"
                            onClick={() => {
                              setPortalLoginEmployeeId('');
                              setPortalPasswordInput('');
                              setPortalPasswordError('');
                            }}
                            className="text-[10px] text-[#8E8E93] hover:text-white bg-[#1A1C1E] border border-[#27272A] px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                          >
                            تغيير الموظف
                          </button>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <h3 className="text-xs font-bold text-white">{emp.name}</h3>
                              <p className="text-[10px] text-[#8E8E93] mt-0.5">{emp.role}</p>
                            </div>
                            <span className={`w-9 h-9 rounded-full ${emp.avatarColor} text-white flex items-center justify-center text-xs font-extrabold shadow-sm`}>
                              {emp.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                        </div>

                        {/* Password form field */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-[#8E8E93] block flex items-center justify-between">
                            <span>* حقل مطلوب</span>
                            <span className="text-[#D4AF37] font-bold flex items-center gap-1">
                              <Lock className="w-3 h-3" />
                              أدخل الرقم السري للموظف
                            </span>
                          </label>
                          <div className="relative">
                            <input
                              type={portalPasswordVisible ? 'text' : 'password'}
                              required
                              placeholder="أدخل الرمز السري الخاص بك..."
                              value={portalPasswordInput}
                              onChange={(e) => {
                                setPortalPasswordInput(e.target.value);
                                setPortalPasswordError('');
                              }}
                              className="w-full bg-[#0F0F11] border border-[#27272A] focus:border-[#D4AF37] rounded-xl text-xs pl-10 pr-4 py-3 text-right focus:outline-none text-white font-mono"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  if (portalPasswordInput === emp.password) {
                                    setSelectedUser(emp.id);
                                    setPortalPasswordInput('');
                                    localStorage.setItem(`hader_logged_in_role_${activeTenantId}`, 'employee');
                                    localStorage.setItem(`hader_logged_in_emp_id_${activeTenantId}`, emp.id);
                                  } else {
                                    setPortalPasswordError('رمز المرور غير صحيح، يرجى إعادة المحاولة.');
                                  }
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => setPortalPasswordVisible(!portalPasswordVisible)}
                              className="absolute left-3 top-3 text-[#8E8E93] hover:text-white transition-colors"
                            >
                              {portalPasswordVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          {portalPasswordError && (
                            <p className="text-[10px] font-bold text-rose-400 mt-1 bg-rose-950/20 p-2 rounded-lg border border-rose-900/30">
                              {portalPasswordError}
                            </p>
                          )}
                        </div>

                        <div className="flex gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (portalPasswordInput === emp.password) {
                                setSelectedUser(emp.id);
                                setPortalPasswordInput('');
                                localStorage.setItem(`hader_logged_in_role_${activeTenantId}`, 'employee');
                                localStorage.setItem(`hader_logged_in_emp_id_${activeTenantId}`, emp.id);
                              } else {
                                setPortalPasswordError('رمز المرور غير صحيح، يرجى إعادة المحاولة.');
                              }
                            }}
                            className="flex-1 bg-[#D4AF37] hover:bg-[#F3C63F] text-slate-950 font-extrabold text-xs py-3 rounded-xl transition-all shadow-md cursor-pointer text-center"
                          >
                            دخول وبدء التحضير الذاتي
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => {
                              setPortalLoginEmployeeId('');
                              setPortalPasswordInput('');
                              setPortalPasswordError('');
                            }}
                            className="bg-[#1A1C1E] hover:bg-[#27272A] border border-[#27272A] text-white font-bold text-xs px-4 rounded-xl transition-colors cursor-pointer"
                          >
                            إلغاء
                          </button>
                        </div>
                      </div>
                    );
                  })()
                )}

              </div>
              
              {/* Return to Admin simulation button */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setAdminUsernameInput('');
                    setAdminPasswordInput('');
                    setAdminLoginError('');
                    setShowAdminLoginModal(true);
                  }}
                  className="text-xs text-[#D4AF37] hover:underline hover:text-[#F3C63F] cursor-pointer inline-flex items-center gap-1.5 font-bold"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>تسجيل الدخول كمدير النظام للتحكم والمراقبة</span>
                </button>
              </div>

            </div>
          )
        ) : selectedUser === '' ? (
          // RENDER SECURE UNIFIED LOGIN SCREEN!
          <div className="max-w-md mx-auto space-y-6 animate-in fade-in duration-300">
            <div className="bg-[#121214] border border-[#27272A] rounded-3xl p-6 sm:p-8 shadow-2xl relative text-right">
              
              <div className="text-center pb-6 border-b border-[#27272A] mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-[#1A1C1E] to-[#121214] border border-[#D4AF37]/40 rounded-2xl flex items-center justify-center shadow-lg text-[#D4AF37] mx-auto mb-3">
                  <Shield className="w-7 h-7 animate-pulse" />
                </div>
                <h2 className="text-xl font-extrabold text-white">بوابة الدخول الموحدة</h2>
                <p className="text-xs text-[#8E8E93] mt-1.5">أدخل بيانات الاعتماد للولوج للوحة الإدارة العامة أو الخاصة بالمؤسسة</p>
              </div>

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const user = adminUsernameInput.trim();
                  const pass = adminPasswordInput.trim();

                  // 1. Check Super Admin login with dynamic credentials
                  if (user.toLowerCase() === superAdminUsername.toLowerCase() && pass === superAdminPassword) {
                    setIsSuperAdminMode(true);
                    localStorage.setItem(`hader_super_admin_active_${activeTenantId}`, 'true');
                    localStorage.setItem(`hader_logged_in_role_${activeTenantId}`, 'superadmin');
                    setIsEmployeePortalMode(false);
                    setSelectedUser('admin');
                    setAdminUsernameInput('');
                    setAdminPasswordInput('');
                    setAdminLoginError('');
                    return;
                  }

                  // 2. Check general tenants login list
                  const matchedTenant = tenants.find(t => t.username.toLowerCase() === user.toLowerCase() && t.password === pass);
                  if (matchedTenant) {
                    // Force credentials matching the current active tenant if we are on a specific URL
                    if (activeTenantId !== 'default' && matchedTenant.id !== activeTenantId) {
                      setAdminLoginError('بيانات الاعتماد المدخلة لا تنتمي لهذه المؤسسة. يرجى التأكد من الرابط الصحيح لمؤسستك.');
                      return;
                    }

                    setActiveTenantId(matchedTenant.id);
                    localStorage.setItem('hader_active_tenant_id', matchedTenant.id);
                    localStorage.setItem(`hader_logged_in_role_${matchedTenant.id}`, 'admin');
                    setIsEmployeePortalMode(false);
                    setIsSuperAdminMode(false);
                    localStorage.removeItem(`hader_super_admin_active_${matchedTenant.id}`);
                    setSelectedUser('admin');
                    setAdminUsernameInput('');
                    setAdminPasswordInput('');
                    setAdminLoginError('');
                    
                    const url = new URL(window.location.href);
                    url.searchParams.set('tenant', matchedTenant.id);
                    window.history.pushState({}, '', url.toString());
                    return;
                  }

                  // 3. Fallback for default admin
                  const defaultTenant = tenants.find(t => t.id === 'default');
                  const fallbackUser = defaultTenant ? defaultTenant.username : 'admin';
                  const fallbackPass = defaultTenant ? defaultTenant.password : 'admin123';
                  if (user.toLowerCase() === fallbackUser.toLowerCase() && pass === fallbackPass) {
                    if (activeTenantId !== 'default') {
                      setAdminLoginError('بيانات الاعتماد المدخلة لا تنتمي لهذه المؤسسة. يرجى التأكد من الرابط الصحيح لمؤسستك.');
                      return;
                    }
                    setActiveTenantId('default');
                    localStorage.setItem('hader_active_tenant_id', 'default');
                    localStorage.setItem(`hader_logged_in_role_default`, 'admin');
                    setIsEmployeePortalMode(false);
                    setIsSuperAdminMode(false);
                    localStorage.removeItem(`hader_super_admin_active_default`);
                    setSelectedUser('admin');
                    setAdminUsernameInput('');
                    setAdminPasswordInput('');
                    setAdminLoginError('');
                    return;
                  }

                  setAdminLoginError('اسم المستخدم أو كلمة المرور غير صحيحة.');
                }} 
                className="space-y-4"
              >
                {adminLoginError && (
                  <p className="text-xs text-rose-400 font-bold bg-rose-950/30 p-3 rounded-xl border border-rose-900/30">
                    {adminLoginError}
                  </p>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#8E8E93] block">اسم مستخدم الإدارة</label>
                  <input
                    type="text"
                    required
                    placeholder="ادخل اسم المستخدم هنا..."
                    value={adminUsernameInput}
                    onChange={(e) => setAdminUsernameInput(e.target.value)}
                    className="w-full bg-[#0F0F11] border border-[#27272A] rounded-xl text-xs px-3 py-3.5 focus:outline-none focus:border-[#D4AF37] text-[#E4E4E7] font-mono text-right"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#8E8E93] block">كلمة المرور</label>
                  <div className="relative">
                    <input
                      type={adminLoginPasswordVisible ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={adminPasswordInput}
                      onChange={(e) => setAdminPasswordInput(e.target.value)}
                      className="w-full bg-[#0F0F11] border border-[#27272A] rounded-xl text-xs pl-10 pr-3 py-3.5 focus:outline-none focus:border-[#D4AF37] text-[#E4E4E7] font-mono text-right"
                    />
                    <button
                      type="button"
                      onClick={() => setAdminLoginPasswordVisible(!adminLoginPasswordVisible)}
                      className="absolute left-3 top-3.5 text-[#8E8E93] hover:text-white transition-colors"
                    >
                      {adminLoginPasswordVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#D4AF37] hover:bg-[#F3C63F] text-slate-950 font-extrabold text-xs py-3 rounded-xl transition-all shadow-md cursor-pointer text-center mt-2"
                >
                  تسجيل الدخول الآمن
                </button>
              </form>
            </div>

            {/* Switch to Employee Portal Link */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsEmployeePortalMode(true);
                  setSelectedUser('');
                  localStorage.setItem(`hader_logged_in_role_${activeTenantId}`, 'employee');
                }}
                className="text-xs text-[#D4AF37] hover:underline hover:text-[#F3C63F] cursor-pointer inline-flex items-center gap-1.5 font-bold"
              >
                <Laptop className="w-3.5 h-3.5" />
                <span>الدخول لبوابة الخدمة الذاتية للموظفين (التحضير الفوري)</span>
              </button>
            </div>
          </div>
        ) : (
          // Admin Simulator Mode
          selectedUser === 'admin' ? (
            <AdminPanel 
              employees={employees}
              attendanceRecords={attendanceRecords}
              pendingRequests={pendingRequests}
              officeSettings={officeSettings}
              onApproveRequest={handleApproveRequest}
              onRejectRequest={handleRejectRequest}
              onAddEmployee={handleAddEmployee}
              onEditEmployee={handleEditEmployee}
              onDeleteEmployee={handleDeleteEmployee}
              onUpdateOfficeSettings={handleUpdateOfficeSettings}
              onForceCheckOut={handleAdminCheckOutEmployee}
              onArchiveTodayRecords={handleArchiveTodayRecords}
              adminUsername={currentAdminUsername}
              adminPassword={currentAdminPassword}
              onUpdateAdminCredentials={handleUpdateAdminCredentials}
              activeTenantId={activeTenantId}
            />
          ) : (
            (() => {
              const activeEmp = employees.find(e => e.id === selectedUser);
              if (!activeEmp) {
                return (
                  <div className="bg-[#121214] border border-[#27272A] rounded-2xl p-8 text-center max-w-md mx-auto">
                    <HelpCircle className="w-12 h-12 text-[#8E8E93] mx-auto mb-3" />
                    <p className="text-sm font-bold text-[#E4E4E7]">عذراً، هذا الموظف لم يعد نشطاً أو تم حذفه.</p>
                    <p className="text-xs text-[#8E8E93] mt-1">يرجى تبديل المستخدم من شريط المحاكاة العلوي.</p>
                  </div>
                );
              }
              return (
                <div className="space-y-4">
                  {/* Info Banner in simulation */}
                  <div className="bg-[#1A1C1E] border border-[#27272A] p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-center text-right gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                      <p className="text-xs text-[#8E8E93]">
                        أنت الآن في <span className="text-white font-bold">وضع المحاكاة</span> كـ الموظف: <span className="text-[#D4AF37] font-bold">{activeEmp.name}</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedUser('admin')}
                      className="bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 text-[10px] px-3 py-1.5 rounded-lg transition-colors font-bold cursor-pointer"
                    >
                      العودة للوحة الإدارة الرئيسية
                    </button>
                  </div>

                  <EmployeePanel
                    employee={activeEmp}
                    attendanceRecords={attendanceRecords}
                    pendingRequests={pendingRequests}
                    officeSettings={officeSettings}
                    onCheckInOnSite={handleCheckInOnSite}
                    onCheckOutOnSite={handleCheckOutOnSite}
                    onCheckInRemote={handleCheckInRemote}
                    onCheckOutRemote={handleCheckOutRemote}
                  />
                </div>
              );
            })()
          )
        )}
      </main>
      
      {/* Admin Login Modal Overlay */}
      {showAdminLoginModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-[#121214] rounded-2xl border border-[#27272A] p-6 w-full max-w-sm shadow-2xl relative text-right">
            
            <button 
              id="btn-close-admin-portal-login"
              onClick={() => setShowAdminLoginModal(false)}
              className="absolute left-4 top-4 text-[#8E8E93] hover:text-[#E4E4E7] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h4 className="text-base font-bold text-[#E4E4E7] mb-4 flex items-center gap-2 border-b border-[#27272A] pb-3">
              <Shield className="w-5 h-5 text-[#D4AF37]" />
              بوابة التحقق لمدير النظام
            </h4>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const user = adminUsernameInput.trim();
                const pass = adminPasswordInput.trim();

                // 1. Check Super Admin login
                if (user.toLowerCase() === superAdminUsername.toLowerCase() && pass === superAdminPassword) {
                  setIsSuperAdminMode(true);
                  localStorage.setItem(`hader_super_admin_active_${activeTenantId}`, 'true');
                  localStorage.setItem(`hader_logged_in_role_${activeTenantId}`, 'superadmin');
                  setIsEmployeePortalMode(false);
                  setShowAdminLoginModal(false);
                  setAdminUsernameInput('');
                  setAdminPasswordInput('');
                  setAdminLoginError('');
                  return;
                }

                // 2. Check general tenants login list
                const matchedTenant = tenants.find(t => t.username.toLowerCase() === user.toLowerCase() && t.password === pass);
                if (matchedTenant) {
                  // Enforce credentials belong to active tenant when on a specific tenant page
                  if (activeTenantId !== 'default' && matchedTenant.id !== activeTenantId) {
                    setAdminLoginError('بيانات الاعتماد المدخلة لا تنتمي لهذه المؤسسة. يرجى التأكد من الرابط الصحيح لمؤسستك.');
                    return;
                  }

                  setActiveTenantId(matchedTenant.id);
                  localStorage.setItem('hader_active_tenant_id', matchedTenant.id);
                  localStorage.setItem(`hader_logged_in_role_${matchedTenant.id}`, 'admin');
                  setIsEmployeePortalMode(false);
                  setIsSuperAdminMode(false);
                  localStorage.removeItem(`hader_super_admin_active_${matchedTenant.id}`);
                  setSelectedUser('admin');
                  setShowAdminLoginModal(false);
                  setAdminUsernameInput('');
                  setAdminPasswordInput('');
                  setAdminLoginError('');
                  
                  // Retain tenant state in search parameters if possible
                  const url = new URL(window.location.href);
                  url.searchParams.set('tenant', matchedTenant.id);
                  window.history.pushState({}, '', url.toString());
                  return;
                }

                // 3. Fallback for default admin
                const defaultTenant = tenants.find(t => t.id === 'default');
                const fallbackUser = defaultTenant ? defaultTenant.username : 'admin';
                const fallbackPass = defaultTenant ? defaultTenant.password : 'admin123';
                if (user.toLowerCase() === fallbackUser.toLowerCase() && pass === fallbackPass) {
                  if (activeTenantId !== 'default') {
                    setAdminLoginError('بيانات الاعتماد المدخلة لا تنتمي لهذه المؤسسة. يرجى التأكد من الرابط الصحيح لمؤسستك.');
                    return;
                  }
                  setActiveTenantId('default');
                  localStorage.setItem('hader_active_tenant_id', 'default');
                  localStorage.setItem(`hader_logged_in_role_default`, 'admin');
                  setIsEmployeePortalMode(false);
                  setIsSuperAdminMode(false);
                  localStorage.removeItem(`hader_super_admin_active_default`);
                  setSelectedUser('admin');
                  setShowAdminLoginModal(false);
                  setAdminUsernameInput('');
                  setAdminPasswordInput('');
                  setAdminLoginError('');
                  return;
                }

                setAdminLoginError('اسم المستخدم أو كلمة المرور غير صحيحة.');
              }} 
              className="space-y-4"
            >
              {adminLoginError && (
                <p className="text-[10px] text-rose-400 font-bold bg-rose-950/30 p-2 rounded border border-rose-900/30">
                  {adminLoginError}
                </p>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#8E8E93] block">اسم مستخدم المدير</label>
                <input
                  type="text"
                  required
                  placeholder="admin"
                  value={adminUsernameInput}
                  onChange={(e) => setAdminUsernameInput(e.target.value)}
                  className="w-full bg-[#0F0F11] border border-[#27272A] rounded-lg text-xs px-3 py-2.5 focus:outline-none focus:border-[#D4AF37] text-[#E4E4E7] font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#8E8E93] block">كلمة مرور لوحة الإدارة</label>
                <div className="relative">
                  <input
                    type={adminLoginPasswordVisible ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={adminPasswordInput}
                    onChange={(e) => setAdminPasswordInput(e.target.value)}
                    className="w-full bg-[#0F0F11] border border-[#27272A] rounded-lg text-xs pl-10 pr-3 py-2.5 focus:outline-none focus:border-[#D4AF37] text-[#E4E4E7] font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setAdminLoginPasswordVisible(!adminLoginPasswordVisible)}
                    className="absolute left-3 top-3 text-[#8E8E93] hover:text-white transition-colors"
                  >
                    {adminLoginPasswordVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-[#D4AF37] hover:bg-[#F3C63F] text-slate-950 font-extrabold text-xs py-2.5 rounded-xl transition-all shadow-md cursor-pointer text-center"
              >
                التحقق وتسجيل الدخول كمدير
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Pure, Honest Footer */}
      <footer className="bg-[#0A0A0B] border-t border-[#27272A] py-6 text-center text-xs text-[#8E8E93]" id="footer-system">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 حاضر - تطبيق التحضير والمراقبة الذكي. جميع الحقوق محفوظة.</p>
          <div className="flex gap-4">
            <span className="hover:text-[#D4AF37] transition-colors font-medium cursor-pointer">سياسة الخصوصية</span>
            <span className="hover:text-[#D4AF37] transition-colors font-medium cursor-pointer">شروط الخدمة</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
