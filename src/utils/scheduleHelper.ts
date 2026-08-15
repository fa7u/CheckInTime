import { OfficeSettings } from '../types';

export interface EffectiveSchedule {
  startTime: string; // e.g. "08:30" or "09:00"
  endTime: string; // e.g. "16:30" or "14:00"
  gracePeriod: number; // e.g. 10
  isSaturdaySchedule: boolean;
  isCustomSaturday: boolean;
  dayNameArabic: string;
}

const ARABIC_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

/**
 * Returns the effective work schedule for a given date (YYYY-MM-DD or Date object)
 * taking into account whether custom Saturday schedule is enabled and if the date is a Saturday.
 */
export function getScheduleForDate(
  dateInput: string | Date | undefined,
  settings: OfficeSettings
): EffectiveSchedule {
  let isSaturday = false;
  let dayIndex = 0;

  if (dateInput instanceof Date) {
    dayIndex = dateInput.getDay();
    isSaturday = dayIndex === 6;
  } else if (typeof dateInput === 'string' && dateInput) {
    const parts = dateInput.split('-').map(Number);
    if (parts.length === 3) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      dayIndex = d.getDay();
      isSaturday = dayIndex === 6;
    } else {
      const d = new Date(dateInput);
      dayIndex = isNaN(d.getDay()) ? new Date().getDay() : d.getDay();
      isSaturday = dayIndex === 6;
    }
  } else {
    dayIndex = new Date().getDay();
    isSaturday = dayIndex === 6;
  }

  const isCustomSaturday = Boolean(isSaturday && settings.enableSaturdayCustomSchedule);

  const startTime = (isCustomSaturday && settings.saturdayStartTime)
    ? settings.saturdayStartTime
    : (settings.workStartTime || '08:30');

  const endTime = (isCustomSaturday && settings.saturdayEndTime)
    ? settings.saturdayEndTime
    : (settings.workEndTime || '16:30');

  const gracePeriod = (isCustomSaturday && settings.saturdayGracePeriod !== undefined)
    ? settings.saturdayGracePeriod
    : (settings.lateGracePeriod !== undefined ? settings.lateGracePeriod : 10);

  return {
    startTime,
    endTime,
    gracePeriod,
    isSaturdaySchedule: isCustomSaturday,
    isCustomSaturday: isCustomSaturday,
    dayNameArabic: ARABIC_DAYS[dayIndex] || '',
  };
}

/**
 * Helper to determine attendance status ('حاضر' vs 'متأخر') based on check-in time and date schedule
 */
export function calculateAttendanceStatus(
  checkInTime: string, // "HH:MM"
  dateStr: string | undefined, // "YYYY-MM-DD"
  settings: OfficeSettings
): 'حاضر' | 'متأخر' {
  if (!checkInTime) return 'حاضر';
  const schedule = getScheduleForDate(dateStr, settings);

  const [startHour, startMin] = schedule.startTime.split(':').map(Number);
  const [inHour, inMin] = checkInTime.split(':').map(Number);

  if (isNaN(startHour) || isNaN(startMin) || isNaN(inHour) || isNaN(inMin)) {
    return 'حاضر';
  }

  const startTotalMinutes = startHour * 60 + startMin;
  const inTotalMinutes = inHour * 60 + inMin;
  const allowedMinutes = startTotalMinutes + schedule.gracePeriod;

  return inTotalMinutes > allowedMinutes ? 'متأخر' : 'حاضر';
}
