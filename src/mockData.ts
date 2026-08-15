import { Employee, AttendanceRecord, OfficeSettings, ApprovalRequest } from './types';

// Default Office Location: King Abdullah Financial District (KAFD), Riyadh
export const DEFAULT_OFFICE: OfficeSettings = {
  latitude: 24.7622,
  longitude: 46.6409,
  radius: 150, // 150 meters
  addressName: 'مركز الملك عبد الله المالي (KAFD) - الرياض',
  workStartTime: '08:30',
  workEndTime: '16:30',
  lateGracePeriod: 10,
  enableSaturdayCustomSchedule: false,
  saturdayStartTime: '09:00',
  saturdayEndTime: '14:00',
  saturdayGracePeriod: 15,
};

export const INITIAL_EMPLOYEES: Employee[] = [];

export const INITIAL_APPROVAL_REQUESTS: ApprovalRequest[] = [];

// Helper to generate attendance history (returning empty as requested)
export function generateMockHistory(employees: Employee[]): AttendanceRecord[] {
  return [];
}
