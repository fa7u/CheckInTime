export type WorkModel = 'on-site' | 'remote'; // حضوري / عن بعد

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  workModel: WorkModel;
  avatarColor: string;
  joinDate: string;
  status: 'active' | 'inactive';
  username?: string;
  password?: string;
  fcmToken?: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string; // denormalized for easy rendering
  date: string; // YYYY-MM-DD
  checkIn: string; // HH:MM
  checkOut: string | null; // HH:MM or null if not checked out yet
  workModel: WorkModel;
  status: 'حاضر' | 'متأخر' | 'غياب'; // Present, Late, Absent
  totalHours: number; // calculated when checked out
  isApproved: boolean; // Remote requires admin approval
  approvedAt?: string; // Approved time or date
  archived?: boolean; // Archived from live daily views
}

export interface ApprovalRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  role: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  type: 'check-in' | 'check-out';
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
}

export interface OfficeSettings {
  latitude: number;
  longitude: number;
  radius: number; // in meters (e.g., 100)
  addressName: string;
  workStartTime?: string; // e.g. "08:30"
  workEndTime?: string; // e.g. "16:30"
  mapLink?: string; // Google maps link or coordinate string
  lateGracePeriod?: number; // in minutes (e.g., 10)
}

export interface Tenant {
  id: string;
  adminName: string;
  companyName: string;
  username: string;
  password: string;
  createdAt: string;
}

