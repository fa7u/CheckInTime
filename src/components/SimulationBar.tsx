import React, { useState } from 'react';
import { Users, Shield, ArrowLeftRight, ChevronDown, ChevronUp } from 'lucide-react';
import { Employee } from '../types';

interface SimulationBarProps {
  employees: Employee[];
  selectedEmployeeId: string | 'admin';
  onSelectUser: (userId: string | 'admin') => void;
}

export default function SimulationBar({
  employees,
  selectedEmployeeId,
  onSelectUser,
}: SimulationBarProps) {
  const [isOpen, setIsOpen] = useState(true);

  const currentUser = selectedEmployeeId === 'admin' 
    ? { name: 'الإدارة (المدير)', role: 'لوحة التحكم والتقارير', color: 'bg-[#D4AF37]' }
    : (() => {
        const emp = employees.find(e => e.id === selectedEmployeeId);
        return emp 
          ? { name: emp.name, role: emp.role, color: emp.avatarColor }
          : { name: 'مستخدم مجهول', role: 'موظف', color: 'bg-gray-400' };
      })();

  return (
    <div className="bg-[#0F0F11] text-[#E4E4E7] shadow-lg border-b border-[#27272A] transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[#8E8E93] text-xs font-medium">
            <ArrowLeftRight className="w-4 h-4 text-[#D4AF37]" />
            <span>مُحاكي الأدوار للتجربة:</span>
          </div>
          <div className="flex items-center gap-1.5 bg-[#121214] px-3 py-1 rounded-full border border-[#27272A]">
            <span className={`w-2 h-2 rounded-full ${currentUser.color}`}></span>
            <span className="text-xs font-semibold text-[#E4E4E7]">{currentUser.name}</span>
            <span className="text-[10px] text-[#8E8E93]">({currentUser.role})</span>
          </div>
        </div>

        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 text-xs text-[#E4E4E7]/70 hover:text-white bg-[#121214] hover:bg-[#1A1A1E] px-3 py-1.5 rounded-lg border border-[#27272A] transition-all duration-200"
          id="btn-toggle-sim"
        >
          <span>{isOpen ? 'إخفاء شريط المحاكاة' : 'عرض شريط المحاكاة'}</span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-[#D4AF37]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#D4AF37]" />}
        </button>
      </div>

      {isOpen && (
        <div className="bg-[#0A0A0B] border-t border-[#27272A] px-4 py-3.5 transition-all duration-300">
          <div className="max-w-7xl mx-auto">
            <p className="text-[11px] text-[#8E8E93] mb-2.5 font-medium">
              اضغط على أي اسم لتغيير المستخدم الحالي وتجربة سلوك التطبيق لكل دور:
            </p>
            
            <div className="flex flex-wrap gap-2">
              {/* Admin Button */}
              <button
                id="sim-user-admin"
                onClick={() => onSelectUser('admin')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  selectedEmployeeId === 'admin'
                    ? 'bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/40 shadow-[0_0_15px_rgba(212,175,55,0.15)] scale-105'
                    : 'bg-[#121214] text-[#E4E4E7]/70 border border-[#27272A] hover:bg-[#1A1A1E] hover:text-white'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>لوحة تحكم الإدارة</span>
              </button>

              <div className="w-px h-6 bg-[#27272A] self-center mx-1"></div>

              {/* Employee Buttons */}
              {employees.map((emp) => {
                const isSelected = selectedEmployeeId === emp.id;
                return (
                  <button
                    id={`sim-user-${emp.id}`}
                    key={emp.id}
                    onClick={() => onSelectUser(emp.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all duration-200 ${
                      isSelected
                        ? 'bg-blue-500/15 text-blue-400 border border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.15)] scale-105 font-medium'
                        : 'bg-[#121214] text-[#E4E4E7]/70 border border-[#27272A] hover:bg-[#1A1A1E] hover:text-white'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${emp.avatarColor}`}></span>
                    <div className="text-right">
                      <p className="font-semibold leading-none">{emp.name}</p>
                      <p className="text-[9px] text-[#8E8E93] mt-0.5 font-normal">
                        {emp.workModel === 'on-site' ? 'حضوري' : 'عن بعد'} - {emp.role}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
