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
    ? { name: 'الإدارة (المدير)', role: 'لوحة التحكم والتقارير', color: 'bg-indigo-600' }
    : (() => {
        const emp = employees.find(e => e.id === selectedEmployeeId);
        return emp 
          ? { name: emp.name, role: emp.role, color: emp.avatarColor }
          : { name: 'مستخدم مجهول', role: 'موظف', color: 'bg-slate-400' };
      })();

  return (
    <div className="bg-white text-slate-800 shadow-sm border-b border-slate-200 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
            <ArrowLeftRight className="w-4 h-4 text-indigo-600" />
            <span>مُحاكي الأدوار للتجربة:</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
            <span className={`w-2 h-2 rounded-full ${currentUser.color}`}></span>
            <span className="text-xs font-bold text-slate-800">{currentUser.name}</span>
            <span className="text-[10px] text-slate-500">({currentUser.role})</span>
          </div>
        </div>

        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg border border-slate-200 font-medium transition-all duration-150 cursor-pointer"
          id="btn-toggle-sim"
        >
          <span>{isOpen ? 'إخفاء شريط المحاكاة' : 'عرض شريط المحاكاة'}</span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-indigo-600" /> : <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />}
        </button>
      </div>

      {isOpen && (
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-3.5 transition-all duration-300">
          <div className="max-w-7xl mx-auto">
            <p className="text-[11px] text-slate-500 mb-2.5 font-medium">
              اضغط على أي اسم لتغيير المستخدم الحالي وتجربة سلوك التطبيق لكل دور:
            </p>
            
            <div className="flex flex-wrap gap-2">
              {/* Admin Button */}
              <button
                id="sim-user-admin"
                onClick={() => onSelectUser('admin')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${
                  selectedEmployeeId === 'admin'
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200 scale-105'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 hover:text-slate-900 shadow-sm'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>لوحة تحكم الإدارة</span>
              </button>

              <div className="w-px h-6 bg-slate-300 self-center mx-1"></div>

              {/* Employee Buttons */}
              {employees.map((emp) => {
                const isSelected = selectedEmployeeId === emp.id;
                return (
                  <button
                    id={`sim-user-${emp.id}`}
                    key={emp.id}
                    onClick={() => onSelectUser(emp.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-300 shadow-sm font-bold scale-105'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 hover:text-slate-900 shadow-sm'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${emp.avatarColor}`}></span>
                    <div className="text-right">
                      <p className="font-bold leading-none">{emp.name}</p>
                      <p className="text-[9px] text-slate-500 mt-0.5 font-normal">
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
