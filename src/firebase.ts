import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { Tenant, Employee, AttendanceRecord, ApprovalRequest, OfficeSettings } from './types';
import { DEFAULT_OFFICE } from './mockData';

import firebaseConfig from '../firebase-applet-config.json';

export const app = initializeApp(firebaseConfig);

// Use custom firestoreDatabaseId if provided, else default
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || "ai-studio-099ab2a7-7e36-45c1-9989-fbb077471437");

// Helper to strip any undefined values from an object before sending to Firestore
function cleanUndefined<T extends object>(obj: T): T {
  const clean = { ...obj } as any;
  Object.keys(clean).forEach(key => {
    if (clean[key] === undefined) {
      delete clean[key];
    }
  });
  return clean;
}

// --- FIREBASE ASSISTANT ACTIONS ---

// 1. Tenants Operations
export async function getTenantsFromFirebase(): Promise<Tenant[]> {
  try {
    const tenantsCol = collection(db, 'tenants');
    const tenantSnapshot = await getDocs(tenantsCol);
    let tenantList = tenantSnapshot.docs.map(doc => doc.data() as Tenant);
    
    // If 'default' exists in the fetched list, we delete it from Firestore and filter it out of the returned list
    const hasDefault = tenantList.some(t => t.id === 'default');
    if (hasDefault) {
      console.log("Removing 'default' tenant from Firebase...");
      await deleteTenantFromFirebase('default');
      tenantList = tenantList.filter(t => t.id !== 'default');
    }
    
    return tenantList;
  } catch (error) {
    console.error('Error fetching tenants from Firebase:', error);
    // Return localStorage fallback if any
    const stored = localStorage.getItem('hader_tenants');
    if (stored) {
      const parsed = JSON.parse(stored) as Tenant[];
      return parsed.filter(t => t.id !== 'default');
    }
    return [];
  }
}

export async function saveTenantToFirebase(tenant: Tenant): Promise<void> {
  try {
    const tenantDocRef = doc(db, 'tenants', tenant.id);
    await setDoc(tenantDocRef, cleanUndefined(tenant));
  } catch (error) {
    console.error('Error saving tenant to Firebase:', error);
  }
}

export async function migrateTenantInFirebase(oldId: string, newId: string, updatedTenant: Tenant): Promise<void> {
  try {
    // 1. Save new tenant document
    await saveTenantToFirebase(updatedTenant);
    
    // 2. Migrate officeSettings doc
    const oldSettingsRef = doc(db, 'officeSettings', oldId);
    const oldSettingsSnap = await getDoc(oldSettingsRef);
    if (oldSettingsSnap.exists()) {
      await setDoc(doc(db, 'officeSettings', newId), oldSettingsSnap.data());
      await deleteDoc(oldSettingsRef);
    }
    
    // 3. Migrate employees
    const empQuery = query(collection(db, 'employees'), where('tenantId', '==', oldId));
    const empSnap = await getDocs(empQuery);
    for (const d of empSnap.docs) {
      const empData = d.data();
      await setDoc(doc(db, 'employees', d.id), {
        ...empData,
        tenantId: newId
      });
    }
    
    // 4. Migrate attendance
    const attQuery = query(collection(db, 'attendance'), where('tenantId', '==', oldId));
    const attSnap = await getDocs(attQuery);
    for (const d of attSnap.docs) {
      const attData = d.data();
      await setDoc(doc(db, 'attendance', d.id), {
        ...attData,
        tenantId: newId
      });
    }
    
    // 5. Migrate requests
    const reqQuery = query(collection(db, 'requests'), where('tenantId', '==', oldId));
    const reqSnap = await getDocs(reqQuery);
    for (const d of reqSnap.docs) {
      const reqData = d.data();
      await setDoc(doc(db, 'requests', d.id), {
        ...reqData,
        tenantId: newId
      });
    }
    
    // 6. Delete old tenant document
    await deleteDoc(doc(db, 'tenants', oldId));
  } catch (error) {
    console.error(`Error migrating tenant from ${oldId} to ${newId} in Firebase:`, error);
  }
}

export async function deleteTenantFromFirebase(tenantId: string): Promise<void> {
  try {
    const tenantDocRef = doc(db, 'tenants', tenantId);
    await deleteDoc(tenantDocRef);
    
    // Clean up corresponding office settings, employees, attendance, and requests
    await deleteDoc(doc(db, 'officeSettings', tenantId));
    
    const empQuery = query(collection(db, 'employees'), where('tenantId', '==', tenantId));
    const empSnap = await getDocs(empQuery);
    for (const d of empSnap.docs) {
      await deleteDoc(doc(db, 'employees', d.id));
    }

    const attQuery = query(collection(db, 'attendance'), where('tenantId', '==', tenantId));
    const attSnap = await getDocs(attQuery);
    for (const d of attSnap.docs) {
      await deleteDoc(doc(db, 'attendance', d.id));
    }

    const reqQuery = query(collection(db, 'requests'), where('tenantId', '==', tenantId));
    const reqSnap = await getDocs(reqQuery);
    for (const d of reqSnap.docs) {
      await deleteDoc(doc(db, 'requests', d.id));
    }
  } catch (error) {
    console.error('Error deleting tenant from Firebase:', error);
  }
}

// 2. Super Admin Credentials Operations
export async function getSuperAdminCredentialsFromFirebase(): Promise<{username: string; password: string}> {
  try {
    const docRef = doc(db, 'settings', 'superadmin');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        username: data.username || 'superadmin',
        password: data.password || 'superadmin123'
      };
    } else {
      const defaultCreds = { username: 'superadmin', password: 'superadmin123' };
      await setDoc(docRef, defaultCreds);
      return defaultCreds;
    }
  } catch (error) {
    console.error('Error getting super admin credentials from Firebase:', error);
    return {
      username: localStorage.getItem('hader_super_admin_username') || 'superadmin',
      password: localStorage.getItem('hader_super_admin_password') || 'superadmin123'
    };
  }
}

export async function saveSuperAdminCredentialsToFirebase(user: string, pass: string): Promise<void> {
  try {
    const docRef = doc(db, 'settings', 'superadmin');
    await setDoc(docRef, { username: user, password: pass });
  } catch (error) {
    console.error('Error saving super admin credentials to Firebase:', error);
  }
}

// 3. Employees Operations (Per tenant)
export async function getEmployeesFromFirebase(tenantId: string): Promise<Employee[]> {
  try {
    const employeesCol = collection(db, 'employees');
    const q = query(employeesCol, where('tenantId', '==', tenantId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        email: data.email,
        role: data.role,
        workModel: data.workModel,
        avatarColor: data.avatarColor,
        joinDate: data.joinDate,
        status: data.status,
        username: data.username,
        password: data.password
      } as Employee;
    });
  } catch (error) {
    console.error(`Error getting employees for tenant ${tenantId}:`, error);
    return [];
  }
}

export async function saveEmployeeToFirebase(tenantId: string, employee: Employee): Promise<void> {
  try {
    const docRef = doc(db, 'employees', employee.id);
    await setDoc(docRef, cleanUndefined({
      ...employee,
      tenantId
    }));
  } catch (error) {
    console.error('Error saving employee to Firebase:', error);
  }
}

export async function deleteEmployeeFromFirebase(employeeId: string): Promise<void> {
  try {
    const docRef = doc(db, 'employees', employeeId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting employee from Firebase:', error);
  }
}

// 4. Attendance Operations (Per tenant)
export async function getAttendanceFromFirebase(tenantId: string): Promise<AttendanceRecord[]> {
  try {
    const attendanceCol = collection(db, 'attendance');
    const q = query(attendanceCol, where('tenantId', '==', tenantId));
    const snapshot = await getDocs(q);
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
        archived: data.archived
      } as AttendanceRecord;
    });
    // Sort descending by date / time
    return records.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.checkIn}`);
      const dateB = new Date(`${b.date}T${b.checkIn}`);
      return dateB.getTime() - dateA.getTime();
    });
  } catch (error) {
    console.error(`Error getting attendance for tenant ${tenantId}:`, error);
    return [];
  }
}

export async function saveAttendanceToFirebase(tenantId: string, record: AttendanceRecord): Promise<void> {
  try {
    const docRef = doc(db, 'attendance', record.id);
    await setDoc(docRef, cleanUndefined({
      ...record,
      tenantId
    }));
  } catch (error) {
    console.error('Error saving attendance record to Firebase:', error);
  }
}

export async function deleteAttendanceFromFirebase(recordId: string): Promise<void> {
  try {
    const docRef = doc(db, 'attendance', recordId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting attendance record from Firebase:', error);
  }
}

// 5. Requests Operations (Per tenant)
export async function getRequestsFromFirebase(tenantId: string): Promise<ApprovalRequest[]> {
  try {
    const requestsCol = collection(db, 'requests');
    const q = query(requestsCol, where('tenantId', '==', tenantId));
    const snapshot = await getDocs(q);

    // Calculate today's date in local time (Saudi Arabia UTC+3)
    const now = new Date();
    const offset = 3 * 60; // UTC+3
    const saudiDate = new Date(now.getTime() + (now.getTimezoneOffset() + offset) * 60 * 1000);
    const todayStr = saudiDate.toISOString().split('T')[0];

    const requests: ApprovalRequest[] = [];
    
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const reqDate = data.date || '';
      
      // If the request is from a previous day, delete it automatically from Firebase to save space
      if (reqDate && reqDate < todayStr) {
        deleteDoc(doc(db, 'requests', docSnap.id)).catch(err => {
          console.error(`Error auto-deleting expired request ${docSnap.id}:`, err);
        });
        continue; // skip adding to the returned list
      }

      requests.push({
        id: docSnap.id,
        employeeId: data.employeeId,
        employeeName: data.employeeName,
        role: data.role,
        date: data.date,
        time: data.time,
        type: data.type,
        status: data.status,
        notes: data.notes
      } as ApprovalRequest);
    }

    return requests.sort((a, b) => b.id.localeCompare(a.id));
  } catch (error) {
    console.error(`Error getting requests for tenant ${tenantId}:`, error);
    return [];
  }
}

export async function saveRequestToFirebase(tenantId: string, request: ApprovalRequest): Promise<void> {
  try {
    const docRef = doc(db, 'requests', request.id);
    await setDoc(docRef, cleanUndefined({
      ...request,
      tenantId
    }));
  } catch (error) {
    console.error('Error saving request to Firebase:', error);
  }
}

// 6. Office Settings Operations (Per tenant)
export async function getOfficeSettingsFromFirebase(tenantId: string): Promise<OfficeSettings> {
  try {
    const docRef = doc(db, 'officeSettings', tenantId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const settings = docSnap.data() as OfficeSettings;
      if (settings.lateGracePeriod === undefined) {
        settings.lateGracePeriod = 10;
      }
      return settings;
    } else {
      await saveOfficeSettingsToFirebase(tenantId, DEFAULT_OFFICE);
      return DEFAULT_OFFICE;
    }
  } catch (error) {
    console.error(`Error getting office settings for tenant ${tenantId}:`, error);
    return DEFAULT_OFFICE;
  }
}

export async function saveOfficeSettingsToFirebase(tenantId: string, settings: OfficeSettings): Promise<void> {
  try {
    const docRef = doc(db, 'officeSettings', tenantId);
    await setDoc(docRef, cleanUndefined(settings));
  } catch (error) {
    console.error('Error saving office settings to Firebase:', error);
  }
}
