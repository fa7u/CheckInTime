import React, { useState, useEffect } from 'react';
import { 
  Clock, MapPin, CheckCircle, AlertCircle, Laptop, Landmark, 
  History, Eye, Calendar, User, Compass, Info, ShieldCheck, XCircle, Bell
} from 'lucide-react';
import { Employee, AttendanceRecord, OfficeSettings, ApprovalRequest, WorkModel } from '../types';

interface EmployeePanelProps {
  employee: Employee;
  attendanceRecords: AttendanceRecord[];
  pendingRequests: ApprovalRequest[];
  officeSettings: OfficeSettings;
  onCheckInOnSite: (status: 'حاضر' | 'متأخر', simulatedLocation?: { lat: number; lng: number }) => void;
  onCheckOutOnSite: (simulatedLocation?: { lat: number; lng: number }) => void;
  onCheckInRemote: (notes?: string, employeeId?: string) => void;
  onCheckOutRemote: (notes?: string, employeeId?: string) => void;
}

// Distance calculation helper (Haversine formula in meters)
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(dp / 2) * Math.sin(dp / 2) +
            Math.cos(p1) * Math.cos(p2) *
            Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

export default function EmployeePanel({
  employee,
  attendanceRecords,
  pendingRequests,
  officeSettings,
  onCheckInOnSite,
  onCheckOutOnSite,
  onCheckInRemote,
  onCheckOutRemote,
}: EmployeePanelProps) {
  const formatTimeStr = (timeStr: string) => {
    try {
      const [h, m] = timeStr.split(':').map(Number);
      const period = h >= 12 ? 'مساءً' : 'صباحاً';
      const formattedHour = h % 12 === 0 ? 12 : h % 12;
      return `${formattedHour.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`;
    } catch (e) {
      return timeStr;
    }
  };

  // Derived active work model assigned by Admin (non-modifiable by employee)
  const activeModel = employee.workModel;
  
  // GPS configuration (using real GPS now)
  const [realCoords, setRealCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [realDistance, setRealDistance] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Out of range check confirmation state
  const [showOutOfRangeConfirm, setShowOutOfRangeConfirm] = useState(false);
  const [showCheckOutConfirm, setShowCheckOutConfirm] = useState(false);
  const [outOfRangeDistance, setOutOfRangeDistance] = useState<number | null>(null);
  const [outOfRangeCoords, setOutOfRangeCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [outOfRangeActionType, setOutOfRangeActionType] = useState<'check-in' | 'check-out' | null>(null);

  // Filter logs
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  // Smart notification states
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    return localStorage.getItem('checkintime_notifications_enabled') === 'true';
  });
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => {
    return 'Notification' in window ? Notification.permission : 'default';
  });
  const [notificationSuccessMsg, setNotificationSuccessMsg] = useState<string | null>(null);

  // Sync notification configurations automatically with the service worker
  useEffect(() => {
    if (notificationsEnabled && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.active?.postMessage({
          type: 'SET_ALERTS_CONFIG',
          employeeName: employee.name,
          workStartTime: officeSettings.workStartTime || '08:30',
          workEndTime: officeSettings.workEndTime || '16:30',
          companyName: 'checkInTime'
        });
      }).catch(err => console.error('Failed to sync sw configuration:', err));
    }
  }, [notificationsEnabled, employee.name, officeSettings.workStartTime, officeSettings.workEndTime]);

  // Trigger real location search when component mounts or employee/settings changes
  useEffect(() => {
    setErrorMessage(null);
    setRealCoords(null);
    setRealDistance(null);
    setGpsError(null);

    if (activeModel === 'on-site') {
      setIsLocating(true);
      if (!navigator.geolocation) {
        setGpsError('متصفحك لا يدعم تحديد الموقع الجغرافي.');
        setIsLocating(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setRealCoords({ lat, lng });
          
          const distance = calculateDistance(
            lat,
            lng,
            officeSettings.latitude,
            officeSettings.longitude
          );
          setRealDistance(distance);
          setIsLocating(false);
        },
        (error) => {
          console.error(error);
          let errorMsg = 'تعذر الحصول على موقعك الجغرافي الحقيقي.';
          if (error.code === error.PERMISSION_DENIED) {
            errorMsg = 'تم رفض الوصول للموقع الجغرافي. يرجى تفعيل صلاحيات تحديد الموقع بالمتصفح.';
          }
          setGpsError(errorMsg);
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, [employee, officeSettings, activeModel]);

  // Current employee status today
  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecord = attendanceRecords.find(
    (r) => r.employeeId === employee.id && r.date === todayStr && !r.archived
  );

  const pendingCheckInRequest = pendingRequests.find(
    (r) => r.employeeId === employee.id && r.date === todayStr && r.type === 'check-in' && r.status === 'pending'
  );

  const pendingCheckOutRequest = pendingRequests.find(
    (r) => r.employeeId === employee.id && r.date === todayStr && r.type === 'check-out' && r.status === 'pending'
  );

  const todayCheckInRequest = pendingRequests.find(
    (r) => r.employeeId === employee.id && r.date === todayStr && r.type === 'check-in'
  );

  const todayCheckOutRequest = pendingRequests.find(
    (r) => r.employeeId === employee.id && r.date === todayStr && r.type === 'check-out'
  );

  const currentDistance = realDistance;
  const isWithinRadius = currentDistance !== null && currentDistance <= officeSettings.radius;

  // Toggle notifications opt-in/opt-out
  const handleToggleNotifications = async () => {
    setNotificationSuccessMsg(null);
    setErrorMessage(null);

    if (!('Notification' in window)) {
      setErrorMessage('متصفحك الحالي لا يدعم ميزة الإشعارات.');
      return;
    }

    if (notificationsEnabled) {
      // Opt out
      setNotificationsEnabled(false);
      localStorage.setItem('checkintime_notifications_enabled', 'false');
      setNotificationSuccessMsg('تم إلغاء تفعيل إشعارات التذكير بنجاح.');
      return;
    }

    // Request permissions
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);

      if (permission === 'granted') {
        setNotificationsEnabled(true);
        localStorage.setItem('checkintime_notifications_enabled', 'true');
        
        // Push setup to Service Worker immediately
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.ready;
          reg.active?.postMessage({
            type: 'SET_ALERTS_CONFIG',
            employeeName: employee.name,
            workStartTime: officeSettings.workStartTime || '08:30',
            workEndTime: officeSettings.workEndTime || '16:30',
            companyName: 'checkInTime'
          });
        }
        
        setNotificationSuccessMsg('🎉 تم تفعيل الإشعارات الذكية بنجاح! ستتلقى تنبيهات مرتبة بانتظام قبل الدوام والانصراف بـ 5 دقائق.');
      } else if (permission === 'denied') {
        setErrorMessage('تم حجب الإشعارات من قبل المتصفح. يرجى تفعيل الإشعارات من إعدادات المتصفح/الهاتف للاستفادة من الخدمة.');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('حدث خطأ أثناء محاولة تفعيل الإشعارات.');
    }
  };

  // Test Notification Trigger
  const handleSendTestNotification = async () => {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      setErrorMessage('يرجى تفعيل الإشعارات أولاً لتتمكن من تجربة الإرسال.');
      return;
    }

    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        reg.active?.postMessage({
          type: 'TEST_NOTIFICATION',
          employeeName: employee.name,
          workStartTime: officeSettings.workStartTime || '08:30',
          workEndTime: officeSettings.workEndTime || '16:30'
        });
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('فشلت محاولة إرسال إشعار تجريبي.');
    }
  };

  // Generate and download a persistent standard .ics Calendar Alarm for absolute 100% offline accuracy
  const handleDownloadCalendarAlarms = () => {
    try {
      const startTimeStr = officeSettings.workStartTime || "08:30";
      const endTimeStr = officeSettings.workEndTime || "16:30";

      const [startHour, startMin] = startTimeStr.split(':').map(Number);
      const [endHour, endMin] = endTimeStr.split(':').map(Number);

      // Calculate 5 minutes before
      let checkInHour = startHour;
      let checkInMin = startMin - 5;
      if (checkInMin < 0) {
        checkInHour = (checkInHour - 1 + 24) % 24;
        checkInMin += 60;
      }

      let checkOutHour = endHour;
      let checkOutMin = endMin - 5;
      if (checkOutMin < 0) {
        checkOutHour = (checkOutHour - 1 + 24) % 24;
        checkOutMin += 60;
      }

      const pad = (num: number) => String(num).padStart(2, '0');

      // Use a fixed start Sunday to repeat weekly Sunday-Thursday (SU, MO, TU, WE, TH)
      const startDateStr = "20260705"; // Sunday

      const checkInTimeFormatted = `${startDateStr}T${pad(checkInHour)}${pad(checkInMin)}00`;
      const checkOutTimeFormatted = `${startDateStr}T${pad(checkOutHour)}${pad(checkOutMin)}00`;

      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//checkInTime//Attendance Alarms//AR
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:checkin-reminder-uid-${employee.id}@checkintime
DTSTAMP:20260706T120000Z
DTSTART;TZID=Asia/Riyadh:${checkInTimeFormatted}
RRULE:FREQ=WEEKLY;BYDAY=SU,MO,TU,WE,TH
SUMMARY:⏰ تذكير التحضير اليومي - حضور
DESCRIPTION:مرحباً ${employee.name}! يبدأ دوامك الفعلي بعد 5 دقائق (الساعة ${startTimeStr}). يرجى تسجيل حضورك على نظام التحضير الآن لتفادي التأخير. ✨
BEGIN:VALARM
TRIGGER:-PT0M
ACTION:DISPLAY
DESCRIPTION:تذكير الحضور اليومي
END:VALARM
END:VEVENT
BEGIN:VEVENT
UID:checkout-reminder-uid-${employee.id}@checkintime
DTSTAMP:20260706T120000Z
DTSTART;TZID=Asia/Riyadh:${checkOutTimeFormatted}
RRULE:FREQ=WEEKLY;BYDAY=SU,MO,TU,WE,TH
SUMMARY:🚪 تذكير تسجيل الانصراف اليومي - خروج
DESCRIPTION:مرحباً ${employee.name}! ينتهي دوامك الفعلي بعد 5 دقائق (الساعة ${endTimeStr}). يرجى تسجيل انصرافك على نظام التحضير الآن لحفظ ساعات العمل لليوم. 🌟
BEGIN:VALARM
TRIGGER:-PT0M
ACTION:DISPLAY
DESCRIPTION:تذكير الانصراف اليومي
END:VALARM
END:VEVENT
END:VCALENDAR`;

      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `منبهات_الدوام_${employee.name}.ics`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setNotificationSuccessMsg('📅 تم تحميل ملف التقويم بنجاح! افتحه الآن على هاتف الموظف لإضافة المنبهات المتكررة (الأحد - الخميس) قبل الدوام بـ 5 دقائق لحل مشكلة إغلاق التطبيق نهائياً.');
    } catch (err) {
      console.error('Error generating ics file:', err);
      setErrorMessage('حدث خطأ أثناء محاولة توليد ملف تقويم المنبهات.');
    }
  };

  // Handle Action button
  const handleAttendanceClick = () => {
    setErrorMessage(null);

    // If they are checking out, we must ask for confirmation first!
    if (todayRecord && !todayRecord.checkOut) {
      setShowCheckOutConfirm(true);
      return;
    }

    // Otherwise, it's a check-in, proceed normally
    executeAttendanceAction();
  };

  const executeAttendanceAction = () => {
    // Get current time
    const now = new Date();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    
    // Determine status (Punctual if checked in before workStartTime + lateGracePeriod)
    const [startHour, startMin] = (officeSettings.workStartTime || "08:30").split(':').map(Number);
    const graceMinutes = typeof officeSettings.lateGracePeriod === 'number' ? officeSettings.lateGracePeriod : 10;
    const startTimeInMinutes = startHour * 60 + startMin;
    const checkInTimeInMinutes = currentHour * 60 + currentMin;
    const isLate = checkInTimeInMinutes > (startTimeInMinutes + graceMinutes);
    const calculatedStatus = isLate ? 'متأخر' : 'حاضر';

    if (activeModel === 'on-site') {
      setIsLocating(true);
      
      if (!navigator.geolocation) {
        setErrorMessage('متصفحك لا يدعم تحديد الموقع الجغرافي.');
        setIsLocating(false);
        setTimeout(() => setErrorMessage(null), 3000);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setRealCoords({ lat, lng });
          
          const distance = calculateDistance(
            lat,
            lng,
            officeSettings.latitude,
            officeSettings.longitude
          );
          setRealDistance(distance);
          setIsLocating(false);

          const isWithin = distance <= officeSettings.radius;

          if (!isWithin) {
            setOutOfRangeDistance(distance);
            setOutOfRangeCoords({ lat, lng });
            setOutOfRangeActionType(!todayRecord ? 'check-in' : 'check-out');
            setShowOutOfRangeConfirm(true);
            return;
          }

          // If within range, perform check-in / check-out
          if (!todayRecord) {
            onCheckInOnSite(calculatedStatus, { lat, lng });
          } else if (todayRecord && !todayRecord.checkOut) {
            onCheckOutOnSite({ lat, lng });
          }
        },
        (error) => {
          console.error(error);
          let errorMsg = 'تعذر الحصول على موقعك الجغرافي لتأكيد التحضير الميداني.';
          if (error.code === error.PERMISSION_DENIED) {
            errorMsg = 'تم رفض الوصول للموقع الجغرافي. يرجى تفعيل الصلاحية لتتمكن من التحضير.';
          }
          setErrorMessage(errorMsg);
          setIsLocating(false);
          setTimeout(() => {
            setErrorMessage(null);
          }, 3000);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      // REMOTE ATTENDANCE: Requires Admin Approval
      if (!todayRecord) {
        if (pendingCheckInRequest) {
          setErrorMessage('طلب التحضير عن بعد قيد المراجعة بالفعل من قبل الإدارة.');
          setTimeout(() => setErrorMessage(null), 3000);
          return;
        }
        onCheckInRemote(undefined, employee.id);
      } else if (todayRecord && !todayRecord.checkOut) {
        if (pendingCheckOutRequest) {
          setErrorMessage('طلب الانصراف عن بعد قيد المراجعة بالفعل من قبل الإدارة.');
          setTimeout(() => setErrorMessage(null), 3000);
          return;
        }
        onCheckOutRemote(undefined, employee.id);
      }
    }
  };

  // Filter logs list
  const filteredRecords = [...attendanceRecords]
    .filter((r) => r.employeeId === employee.id)
    .filter((r) => {
      if (selectedMonth === 'all') return true;
      return r.date.startsWith(selectedMonth);
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  // Months lists for dropdown filter
  const uniqueMonths = Array.from(
    new Set(
      attendanceRecords
        .filter((r) => r.employeeId === employee.id)
        .map((r) => r.date.substring(0, 7))
    )
  ).sort().reverse();

  return (
    <div className="space-y-6" id="employee-panel-root">
      {/* Top Banner - Employee Info */}
      <div className="bg-[#121214] rounded-2xl border border-[#27272A] p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden">
        {/* Subtle Ambient Glow */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-[#D4AF37] opacity-5 blur-[60px] pointer-events-none"></div>
        
        <div className="flex items-center gap-4 relative z-10">
          <div className={`w-16 h-16 rounded-full ${employee.avatarColor} text-white flex items-center justify-center text-xl font-bold shadow-md`}>
            {employee.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold text-[#E4E4E7]">{employee.name}</h2>
            <p className="text-sm text-[#8E8E93] font-medium">{employee.role}</p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-xs bg-[#1A1C1E] text-[#8E8E93] border border-[#27272A] px-2.5 py-0.5 rounded-full font-medium">
                معرّف الموظف: {employee.id}
              </span>
              <span className="text-xs bg-blue-950/30 text-blue-400 border border-blue-900/30 px-2.5 py-0.5 rounded-full font-medium">
                تاريخ الانضمام: {employee.joinDate}
              </span>
            </div>
          </div>
        </div>

        {/* Current Date & Time Clock Display */}
        <div className="flex items-center gap-3 bg-[#0F0F11] px-4 py-3 rounded-xl border border-[#27272A] relative z-10">
          <Clock className="w-5 h-5 text-[#D4AF37] animate-pulse" />
          <div className="text-right">
            <p className="text-[10px] text-[#8E8E93] uppercase tracking-normal">الوقت والتاريخ الحالي</p>
            <p className="text-sm font-bold text-[#E4E4E7] font-serif">
              {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {/* Check In / Out Center Module */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Interactive Panel (Button and Settings) */}
        <div className="lg:col-span-7 bg-[#121214] rounded-2xl border border-[#27272A] p-6 shadow-xl flex flex-col items-center justify-center space-y-6 relative overflow-hidden">
          {/* Ambient Glow */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#D4AF37] opacity-5 blur-[80px] pointer-events-none"></div>

          <div className="w-full relative z-10">
            <h3 className="text-lg font-serif italic text-[#D4AF37] text-right mb-4">بوابة تسجيل الدخول اليومي</h3>
            
            {/* Work Model Mode (Assigned by Admin) */}
            <div className="bg-[#0A0A0B]/60 p-3.5 rounded-xl mb-4 border border-[#27272A] flex items-center justify-between text-right">
              <span className="text-xs text-[#8E8E93] font-bold">طبيعة نظام العمل المعتمد لك:</span>
              {activeModel === 'on-site' ? (
                <span className="inline-flex items-center gap-1.5 text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/20 px-3.5 py-1.5 rounded-lg font-bold text-xs">
                  <Landmark className="w-4 h-4 text-[#D4AF37]" />
                  <span>حضوري (من المكتب)</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3.5 py-1.5 rounded-lg font-bold text-xs">
                  <Laptop className="w-4 h-4 text-blue-400" />
                  <span>عن بُعد (خارج المكتب)</span>
                </span>
              )}
            </div>
          </div>

          {/* Location Verification Settings (Shows if on-site is assigned) */}
          {activeModel === 'on-site' && (
            <div className="w-full bg-[#0A0A0B] p-4 rounded-xl border border-[#27272A] space-y-3 relative z-10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#8E8E93] flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-[#D4AF37]" />
                  حالة تحديد الموقع الجغرافي (GPS حقيقي):
                </span>
              </div>
              
              <div className="text-[11px] text-[#8E8E93]">
                {isLocating ? (
                  <span className="text-blue-400 font-medium animate-pulse flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></span>
                    جاري رصد إحداثيات GPS الحقيقية للمتصفح...
                  </span>
                ) : realCoords ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    موقعك الحالي: {realCoords.lat.toFixed(4)} , {realCoords.lng.toFixed(4)} (يبعد {Math.round(realDistance || 0)} متر عن المقر)
                  </span>
                ) : gpsError ? (
                  <span className="text-rose-400 font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                    {gpsError}
                  </span>
                ) : (
                  <span className="text-amber-400 font-medium flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                    اضغط على زر التحضير بالأسفل وسيطلب المتصفح إذن تحديد موقعك للتحقق.
                  </span>
                )}
              </div>

              <div className="text-[11px] text-[#8E8E93] flex items-start gap-1 bg-[#121214] p-2.5 rounded-lg border border-[#27272A]">
                <MapPin className="w-3.5 h-3.5 text-[#D4AF37] mt-0.5 shrink-0" />
                <span>مقر العمل المحدد: <strong className="text-white">{officeSettings.addressName}</strong> (النطاق المسموح: {officeSettings.radius} متر).</span>
              </div>
            </div>
          )}

          {/* The MAIN Action Button */}
          <div className="relative py-4 flex flex-col items-center z-10">
            {/* Visual Radar Pulse background */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {(!todayRecord && !pendingCheckInRequest) && (
                <div className={`w-32 h-32 rounded-full absolute animate-ping opacity-10 duration-1000 ${
                  activeModel === 'on-site' ? 'bg-[#D4AF37]' : 'bg-blue-500'
                }`}></div>
              )}
              {(todayRecord && !todayRecord.checkOut && !pendingCheckOutRequest) && (
                <div className="w-32 h-32 rounded-full absolute animate-ping opacity-10 duration-1000 bg-rose-500"></div>
              )}
            </div>

            {/* Attendance Main Button */}
            <button
              id="attendance-action-btn"
              type="button"
              onClick={handleAttendanceClick}
              disabled={
                (todayRecord && todayRecord.checkOut !== null) ||
                !!pendingCheckInRequest ||
                !!pendingCheckOutRequest
              }
              className={`w-40 h-40 rounded-full font-bold text-lg shadow-2xl border-2 transition-all duration-300 z-10 flex flex-col items-center justify-center gap-1 cursor-pointer transform hover:scale-105 active:scale-95 ${
                // Case 1: Checked Out Completed
                todayRecord && todayRecord.checkOut
                  ? 'bg-[#121214] border-[#27272A] text-[#8E8E93] cursor-not-allowed shadow-none'
                  // Case 2: Pending Approval
                  : (pendingCheckInRequest || pendingCheckOutRequest)
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-400 animate-pulse cursor-not-allowed'
                    // Case 3: Checked In, ready to Check Out
                    : todayRecord && !todayRecord.checkOut
                      ? 'bg-rose-950/20 border-rose-500/40 hover:bg-rose-900/30 text-rose-400 shadow-[0_0_20px_rgba(239,68,68,0.1)]'
                      // Case 4: Not Checked In, ready to Check In
                      : activeModel === 'on-site'
                        ? 'bg-[#0A0A0B] border-[#D4AF37] hover:bg-[#D4AF37]/10 text-[#D4AF37] shadow-[0_0_25px_rgba(212,175,55,0.15)]'
                        : 'bg-[#0A0A0B] border-blue-500 hover:bg-blue-500/10 text-blue-400 shadow-[0_0_25px_rgba(59,130,246,0.15)]'
              }`}
            >
              <Clock className="w-6 h-6 mb-1 text-[#D4AF37]" />
              <span className="tracking-normal">
                {todayRecord && todayRecord.checkOut
                  ? 'عمل مكتمل'
                  : pendingCheckInRequest
                    ? 'طلب حضور...'
                    : pendingCheckOutRequest
                      ? 'طلب انصراف...'
                      : todayRecord && !todayRecord.checkOut
                        ? 'تسجيل الانصراف'
                        : 'تسجيل الحضور'}
              </span>
              <span className="text-[10px] font-normal opacity-80 uppercase tracking-wider font-serif italic">
                {todayRecord && todayRecord.checkOut
                  ? 'Completed'
                  : todayRecord && !todayRecord.checkOut
                    ? 'Check Out'
                    : activeModel === 'on-site'
                      ? 'Check In On-Site'
                      : 'Check In Remote'}
              </span>
            </button>
          </div>

          {/* Check Out Confirmation Dialog */}
          {showCheckOutConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs text-right">
              <div className="w-full max-w-sm bg-[#1A1C1E] border border-rose-500/30 rounded-xl p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-start gap-3 text-rose-400">
                  <AlertCircle className="w-6 h-6 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-base text-white">هل أنت متأكد من تسجيل الانصراف؟</h4>
                    <p className="text-xs text-[#8E8E93] mt-2 leading-relaxed">
                      سيتم تسجيل وقت انصرافك الفعلي لليوم الآن. يرجى التأكد من إنهاء كافة مهامك قبل تأكيد الخروج.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCheckOutConfirm(false);
                      executeAttendanceAction();
                    }}
                    className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs py-2.5 px-3 rounded-lg transition-colors cursor-pointer"
                  >
                    نعم، تأكيد الانصراف
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCheckOutConfirm(false)}
                    className="flex-1 bg-[#121214] hover:bg-[#27272A] text-[#8E8E93] font-bold text-xs py-2.5 px-3 rounded-lg border border-[#27272A] transition-colors cursor-pointer"
                  >
                    تراجع
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Out of Range Request Confirmation Prompt */}
          {showOutOfRangeConfirm && outOfRangeDistance && (
            <div className="w-full bg-[#1A1C1E] border border-amber-500/30 rounded-xl p-4 space-y-3 relative z-10 text-right animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-start gap-2.5 text-amber-400">
                <Compass className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs">تنبيه: أنت خارج النطاق الجغرافي!</h4>
                  <p className="text-[11px] text-[#8E8E93] mt-1 leading-relaxed">
                    أنت تبعد حالياً <strong className="text-white">{Math.round(outOfRangeDistance)} متر</strong> عن مقر العمل، بينما النطاق المسموح هو {officeSettings.radius} متر فقط.
                  </p>
                  <p className="text-[11px] text-[#8E8E93] mt-1">
                    هل ترغب في تقديم طلب معلق للمدير للموافقة على تحضيرك بشكل استثنائي؟
                  </p>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const notes = `خارج النطاق بـ ${Math.round(outOfRangeDistance)} متر`;
                    if (outOfRangeActionType === 'check-in') {
                      onCheckInRemote(notes, employee.id);
                    } else {
                      onCheckOutRemote(notes, employee.id);
                    }
                    setShowOutOfRangeConfirm(false);
                  }}
                  className="flex-1 bg-[#D4AF37] hover:bg-[#F3C63F] text-slate-950 font-bold text-xs py-2 px-3 rounded-lg transition-colors cursor-pointer"
                >
                  نعم، إرسال الطلب للمدير
                </button>
                <button
                  type="button"
                  onClick={() => setShowOutOfRangeConfirm(false)}
                  className="flex-1 bg-[#121214] hover:bg-[#27272A] text-[#8E8E93] font-bold text-xs py-2 px-3 rounded-lg border border-[#27272A] transition-colors cursor-pointer"
                >
                  تراجع
                </button>
              </div>
            </div>
          )}

          {/* Feedback Messages */}
          {errorMessage && (
            <div className="w-full bg-rose-950/20 border border-rose-900/40 rounded-xl p-3.5 flex items-start gap-2.5 text-rose-400 text-sm relative z-10" id="employee-error-msg">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="text-right">
                <p className="font-bold">خطأ في التحضير:</p>
                <p className="text-xs mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Success Status Info */}
          <div className="w-full relative z-10 space-y-4">
            {todayRecord ? (
              <div className="space-y-4">
                <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    <span>تأكيد تسجيل الحضور لليوم:</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs text-[#E4E4E7] border-t border-[#27272A] pt-2">
                    <div>
                      <span className="text-[#8E8E93] block">وقت الحضور:</span>
                      <strong className="text-sm font-bold font-mono text-emerald-400">{todayRecord.checkIn}</strong>
                    </div>
                    <div>
                      <span className="text-[#8E8E93] block">وقت الانصراف:</span>
                      <strong className="text-sm font-bold font-mono text-rose-400">{todayRecord.checkOut || 'قيد العمل...'}</strong>
                    </div>
                    <div>
                      <span className="text-[#8E8E93] block">حالة التحضير:</span>
                      <strong className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        todayRecord.status === 'حاضر' ? 'bg-emerald-900/20 text-emerald-400 border border-emerald-900/30' : 'bg-amber-900/20 text-amber-400 border border-amber-900/30'
                      }`}>
                        {todayRecord.status}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[#8E8E93] block">ساعات العمل اليوم:</span>
                      <strong className="text-sm font-bold text-[#D4AF37] font-serif italic">
                        {todayRecord.checkOut ? `${todayRecord.totalHours} ساعة` : 'جار الحساب...'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* If they checked in but checkout is pending */}
                {pendingCheckOutRequest && (
                  <div className="bg-amber-950/20 border border-amber-900/40 rounded-xl p-4 flex items-start gap-3 text-amber-400 animate-in fade-in duration-300">
                    <Clock className="w-5 h-5 text-amber-500 animate-spin mt-0.5 shrink-0" />
                    <div className="text-right">
                      <p className="font-bold text-xs">طلب تسجيل الانصراف قيد المراجعة ⏳</p>
                      <p className="text-[11px] text-[#8E8E93] mt-0.5">لقد قمت بإرسال طلب انصراف في انتظار موافقة المدير وتأكيده.</p>
                    </div>
                  </div>
                )}

                {/* If checkout request was rejected */}
                {!pendingCheckOutRequest && todayCheckOutRequest && todayCheckOutRequest.status === 'rejected' && (
                  <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-4 flex items-start gap-3 text-rose-400 animate-in fade-in duration-300">
                    <XCircle className="w-5 h-5 text-rose-500 mt-0.5 shrink-0" />
                    <div className="text-right">
                      <p className="font-bold text-xs">تم رفض طلب تسجيل الانصراف ❌</p>
                      <p className="text-[11px] text-[#8E8E93] mt-0.5">تم رفض طلب تسجيل الانصراف الخاص بك من قبل الإدارة. يرجى إعادة تقديم الطلب بالضغط على زر تسجيل الانصراف أعلاه.</p>
                      {todayCheckOutRequest.notes && (
                        <p className="text-[11px] text-rose-400 font-bold mt-1">الملاحظة من الإدارة: {todayCheckOutRequest.notes}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (pendingCheckInRequest || pendingCheckOutRequest) ? (
              <div className="bg-amber-950/20 border border-amber-900/40 rounded-xl p-4 space-y-2 text-right animate-in fade-in duration-300">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <Clock className="w-5 h-5 text-amber-500 animate-spin" />
                  <span>بانتظار موافقة الإدارة:</span>
                </div>
                <p className="text-xs text-[#8E8E93] leading-relaxed">
                  لقد قمت بإرسال طلب التحضير عن بعد للعمل في تاريخ اليوم. ستتلقى إشعاراً فور مراجعة المدير للطلب وقبوله.
                </p>
              </div>
            ) : (todayCheckInRequest && todayCheckInRequest.status === 'rejected') ? (
              <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-4 space-y-2 text-right animate-in fade-in duration-300 font-sans">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                  <XCircle className="w-5 h-5 text-rose-500" />
                  <span>تم رفض طلب الحضور من قبل الإدارة ❌</span>
                </div>
                <p className="text-xs text-[#8E8E93] leading-relaxed">
                  تم رفض طلب تسجيل حضورك لليوم من قبل المدير. يمكنك محاولة تسجيل الحضور مرة أخرى بالضغط على زر تسجيل الحضور أعلاه، أو التواصل مع الإدارة للاستفسار.
                </p>
                {todayCheckInRequest.notes && (
                  <p className="text-xs text-rose-400 font-bold mt-1">
                    الملاحظة من الإدارة: {todayCheckInRequest.notes}
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-[#0A0A0B] border border-[#27272A] rounded-xl p-4 text-center text-xs text-[#8E8E93] animate-in fade-in duration-300">
                أنت لم تقم بتسجيل الحضور أو الانصراف لليوم بعد. يرجى اختيار طبيعة العمل والضغط على الزر أعلاه للبدء.
              </div>
            )}
          </div>

          {/* Card: Smart Notification Reminders */}
          <div className="bg-[#121214] rounded-2xl border border-[#27272A] p-6 shadow-xl relative overflow-hidden">
            <div className="absolute -top-10 -left-10 w-24 h-24 bg-[#D4AF37] opacity-5 blur-[50px] pointer-events-none"></div>
            
            <h3 className="text-base font-bold text-[#E4E4E7] mb-3 flex items-center gap-2 justify-start font-sans">
              <Bell className="w-5 h-5 text-[#D4AF37]" />
              <span>نظام التنبيهات والمنبهات الذكية للدوام</span>
            </h3>

            <p className="text-xs text-[#8E8E93] leading-relaxed mb-4 text-right">
              حتى لا تنسى تسجيل حضورك أو انصرافك اليومي، صممنا لك نوعين من المنبهات لضمان التنبيه الفعال قبل الدوام والانصراف بـ 5 دقائق:
            </p>

            <div className="space-y-4">
              {/* Option 1: Browser / App Notifications */}
              <div className="bg-[#1A1C1E] border border-[#27272A] rounded-xl p-4 text-right space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded-md">خيار 1: إشعارات الهاتف / المتصفح (PWA)</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    notificationsEnabled 
                      ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/40' 
                      : 'bg-rose-950/40 text-rose-400 border border-rose-900/40'
                  }`}>
                    {notificationsEnabled ? 'مفعّلة' : 'غير نشطة'}
                  </span>
                </div>
                <p className="text-[11px] text-[#8E8E93] leading-relaxed">
                  ترسل لك إشعارات ذكية في شريط التنبيهات. (قد تتوقف إذا قام نظام الهاتف بحذف التطبيق كلياً من الذاكرة العشوائية لتوفير البطارية).
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleToggleNotifications}
                    className={`flex-1 font-bold text-[11px] py-2 px-3 rounded-lg transition-colors cursor-pointer ${
                      notificationsEnabled 
                        ? 'bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/20' 
                        : 'bg-[#D4AF37] hover:bg-[#B3922E] text-[#0A0A0B]'
                    }`}
                  >
                    <span>{notificationsEnabled ? 'إيقاف إشعارات المتصفح' : 'تفعيل إشعارات المتصفح'}</span>
                  </button>
                  {notificationsEnabled && (
                    <button
                      type="button"
                      onClick={handleSendTestNotification}
                      className="bg-[#121214] hover:bg-[#27272A] text-[#E4E4E7] font-bold text-[11px] py-2 px-3 rounded-lg border border-[#27272A] transition-colors cursor-pointer"
                    >
                      <span>تجربة الإرسال 🧪</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Option 2: 100% Guaranteed Native Calendar Reminders */}
              <div className="bg-[#1A1C1E] border border-[#D4AF37]/20 rounded-xl p-4 text-right space-y-3 relative">
                <div className="absolute top-3 left-3">
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-900/40 px-2 py-0.5 rounded">مضمون 100%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#D4AF37]" />
                  <span className="text-[11px] font-bold text-white">خيار 2: منبهات تقويم الهاتف الافتراضية (موصى به)</span>
                </div>
                <p className="text-[11px] text-[#8E8E93] leading-relaxed">
                  <strong>الحل الأقوى للتحضير المستقر:</strong> نقوم بتوليد ملف تقويم ذكي يحتوي على منبهات متكررة (الأحد - الخميس) مخصصة لمواعيد دوامك الفعلي (<span className="text-[#D4AF37]">{officeSettings.workStartTime} - {officeSettings.workEndTime}</span>) قبل الموعد بـ 5 دقائق.
                  <br />
                  <span className="text-white font-medium">سيرن الهاتف كمنبه حتى لو كان التطبيق محذوفاً ومغلقاً كلياً من الخلفية أو الهاتف مغلقاً!</span>
                </p>
                <button
                  type="button"
                  onClick={handleDownloadCalendarAlarms}
                  className="w-full bg-[#121214] hover:bg-emerald-950/20 text-[#D4AF37] hover:text-emerald-400 font-bold text-[11px] py-2.5 px-3 rounded-lg border border-[#D4AF37]/30 hover:border-emerald-500/30 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>تحميل وضبط منبهات تقويم الهاتف لدوامك 📅</span>
                </button>
              </div>



              {/* Success / Info Alerts */}
              {notificationSuccessMsg && (
                <div className="bg-emerald-950/30 border border-emerald-900/40 text-emerald-400 text-xs p-3.5 rounded-xl text-right leading-relaxed animate-in fade-in duration-200">
                  {notificationSuccessMsg}
                </div>
              )}
            </div>
          </div>

          {/* Quick personal statistics summary */}
          <div className="bg-gradient-to-br from-[#0F0F11] to-[#121214] border border-[#27272A] text-[#E4E4E7] rounded-2xl p-6 shadow-xl relative overflow-hidden">
            {/* Elegant Ambient Background lines */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37] opacity-5 blur-[50px] pointer-events-none"></div>

            <h3 className="text-base font-serif italic text-[#D4AF37] mb-4 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#D4AF37]" />
              مؤشرات الأداء لشهر يونيو 2026
            </h3>

            {(() => {
              const personalRecords = attendanceRecords.filter(r => r.employeeId === employee.id);
              const totalDays = personalRecords.length || 1;
              const presentDays = personalRecords.filter(r => r.status === 'حاضر' || r.status === 'متأخر').length;
              const lateDays = personalRecords.filter(r => r.status === 'متأخر').length;
              const absentDays = personalRecords.filter(r => r.status === 'غياب').length;
              const totalWorkedHours = personalRecords.reduce((sum, r) => sum + r.totalHours, 0);
              
              const attendanceRate = Math.round((presentDays / totalDays) * 100);

              return (
                <div className="space-y-4 relative z-10">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#8E8E93]">نسبة الالتزام بالحضور:</span>
                    <span className="text-sm font-extrabold text-[#D4AF37] font-serif">{attendanceRate}%</span>
                  </div>
                  <div className="w-full bg-[#0A0A0B] rounded-full h-2 overflow-hidden border border-[#27272A]">
                    <div className="bg-[#D4AF37] h-full rounded-full shadow-[0_0_10px_rgba(212,175,55,0.5)]" style={{ width: `${attendanceRate}%` }}></div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                    <div className="bg-[#0A0A0B] p-2 rounded-lg border border-[#27272A]">
                      <span className="text-[10px] text-[#8E8E93] block">حاضر</span>
                      <strong className="text-base font-bold text-[#E4E4E7] font-serif">{presentDays - lateDays}</strong>
                    </div>
                    <div className="bg-[#0A0A0B] p-2 rounded-lg border border-[#27272A]">
                      <span className="text-[10px] text-[#8E8E93] block">تأخير</span>
                      <strong className="text-base font-bold text-amber-400 font-serif">{lateDays}</strong>
                    </div>
                    <div className="bg-[#0A0A0B] p-2 rounded-lg border border-[#27272A]">
                      <span className="text-[10px] text-[#8E8E93] block">غياب</span>
                      <strong className="text-base font-bold text-rose-400 font-serif">{absentDays}</strong>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#27272A] flex justify-between items-center text-xs">
                    <span className="text-[#8E8E93]">إجمالي الساعات المنجزة:</span>
                    <strong className="font-bold text-[#D4AF37] text-sm font-serif italic">{Math.round(totalWorkedHours)} ساعة</strong>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Bottom Log: Personal Attendance Records History */}
      <div className="bg-[#121214] rounded-2xl border border-[#27272A] p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 relative z-10">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[#D4AF37]" />
            <h3 className="text-lg font-serif italic text-[#D4AF37]">سجل الحضور والانصراف التاريخي</h3>
          </div>

          {/* Month Filtering Dropdown */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Calendar className="w-4 h-4 text-[#8E8E93]" />
            <span className="text-xs text-[#8E8E93] font-medium">الشهر:</span>
            <select
              id="employee-month-filter"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-[#0A0A0B] border border-[#27272A] rounded-lg text-xs font-semibold px-2.5 py-1.5 focus:outline-none focus:border-[#D4AF37] text-[#E4E4E7] cursor-pointer"
            >
              <option value="all">كل الأشهر المتاحة</option>
              {uniqueMonths.map((m) => {
                const parts = m.split('-');
                const monthName = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1)
                  .toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
                return (
                  <option key={m} value={m}>
                     {monthName}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Attendance Records Table */}
        <div className="overflow-x-auto rounded-xl border border-[#27272A] relative z-10">
          <table className="w-full text-right border-collapse text-sm">
            <thead>
              <tr className="bg-[#0F0F11] border-b border-[#27272A] text-[#8E8E93] font-bold">
                <th className="px-4 py-3.5 text-right font-medium">اليوم والتاريخ</th>
                <th className="px-4 py-3.5 text-right font-medium">طبيعة العمل</th>
                <th className="px-4 py-3.5 text-right font-medium">تسجيل الحضور</th>
                <th className="px-4 py-3.5 text-right font-medium">تسجيل الانصراف</th>
                <th className="px-4 py-3.5 text-right font-medium">الحالة اليومية</th>
                <th className="px-4 py-3.5 text-right font-medium">عدد الساعات المنجزة</th>
                <th className="px-4 py-3.5 text-right font-medium">اعتماد الإدارة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272A] text-[#E4E4E7]">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((rec) => {
                  const dateObj = new Date(rec.date);
                  const formattedDate = dateObj.toLocaleDateString('ar-EG', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });

                  return (
                    <tr key={rec.id} className="hover:bg-[#18181B]/40 transition-colors duration-150">
                      <td className="px-4 py-4 font-bold text-[#E4E4E7]">
                        {formattedDate}
                      </td>
                      <td className="px-4 py-4 text-xs">
                        {rec.workModel === 'on-site' ? (
                          <span className="inline-flex items-center gap-1 text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/30 px-2.5 py-0.5 rounded-full font-bold">
                            <Landmark className="w-3 h-3" />
                            حضوري
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-blue-400 bg-blue-500/10 border border-blue-500/30 px-2.5 py-0.5 rounded-full font-bold">
                            <Laptop className="w-3 h-3" />
                            عن بُعد
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 font-mono text-[#E4E4E7] font-bold">{rec.checkIn}</td>
                      <td className="px-4 py-4 font-mono text-[#E4E4E7] font-bold">
                        {rec.checkOut || <span className="text-[#8E8E93] font-normal">--:--</span>}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold ${
                          rec.status === 'حاضر'
                            ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-900/40'
                            : rec.status === 'متأخر'
                              ? 'bg-amber-950/30 text-amber-400 border border-amber-900/40'
                              : 'bg-rose-950/30 text-rose-400 border border-rose-900/40'
                        }`}>
                          {rec.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-bold font-mono text-[#D4AF37]">
                        {rec.totalHours > 0 ? `${rec.totalHours} س` : '-'}
                      </td>
                      <td className="px-4 py-4">
                        {rec.workModel === 'on-site' ? (
                          <span className="text-emerald-400 font-semibold text-xs flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                            تلقائي (ميداني)
                          </span>
                        ) : rec.isApproved ? (
                          <span className="text-emerald-400 font-semibold text-xs flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                            معتمد
                          </span>
                        ) : rec.status === 'غياب' ? (
                          <span className="text-[#8E8E93] text-xs">لا يوجد</span>
                        ) : (
                          <span className="text-amber-400 font-semibold text-xs flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                            طلب مرفوض / معلق
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[#8E8E93]">
                    لا توجد سجلات حضور مسجلة لهذا الشهر.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
