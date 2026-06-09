import React, { useState } from 'react';
import { TimeSlot, ActivityType } from '../types';
import { DAYS } from '../constants';
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, PlusCircle } from 'lucide-react';

interface MobileDayViewProps {
  schedule: TimeSlot[];
  onSlotClick: (dayIndex: number, time: string, slot?: TimeSlot) => void;
  isParentMode: boolean;
}

const getActivityColor = (type: ActivityType) => {
    switch (type) {
      case 'study': return 'bg-yellow-100 border-yellow-200 text-yellow-900';
      case 'rest': return 'bg-emerald-100 border-emerald-200 text-emerald-900';
      case 'academy': return 'bg-orange-100 border-orange-200 text-orange-900';
      case 'school': return 'bg-rose-50 border-rose-100 text-rose-900';
      case 'routine': return 'bg-blue-50 border-blue-100 text-blue-900';
      case 'sleep': return 'bg-slate-50 border-slate-100 text-slate-500';
      default: return 'bg-gray-50 text-gray-500';
    }
  };

export const MobileDayView: React.FC<MobileDayViewProps> = ({ schedule, onSlotClick, isParentMode }) => {
  const [currentDayIdx, setCurrentDayIdx] = useState(new Date().getDay() + 1 > 6 ? 0 : new Date().getDay() + 1); // rough approximation for demo, Sat=0 in our app

  const daySlots = schedule
    .filter(s => s.dayIndex === currentDayIdx)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const handleNext = () => setCurrentDayIdx(prev => (prev + 1) % 7);
  const handlePrev = () => setCurrentDayIdx(prev => (prev - 1 + 7) % 7);

  return (
    <div className="flex flex-col h-full relative">
      {/* Day Navigator */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-4 sticky top-0 z-20">
        <button onClick={handlePrev} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ChevronLeft className="text-slate-600" />
        </button>
        <div className="text-center">
            <h2 className="text-lg font-bold text-slate-800">{DAYS[currentDayIdx].name}</h2>
            <p className="text-xs text-slate-500">계획된 일정 {daySlots.length}개</p>
        </div>
        <button onClick={handleNext} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ChevronRight className="text-slate-600" />
        </button>
      </div>

      {/* Timeline List */}
      <div className="space-y-3 pb-24">
        {daySlots.map(slot => (
          <div 
            key={slot.id}
            onClick={() => isParentMode ? onSlotClick(currentDayIdx, slot.startTime, slot) : null}
            className={`
                flex items-center p-3 rounded-xl border transition-all
                ${getActivityColor(slot.type)}
                ${isParentMode ? 'active:scale-95 cursor-pointer' : ''}
            `}
          >
            <div className="w-16 font-mono text-sm font-semibold opacity-70">
                {slot.startTime}
            </div>
            <div className="flex-1 font-medium text-base pl-2">
                {slot.activity}
            </div>
            
            {/* Status Indicator */}
            <div className="ml-2">
                {slot.status === 'completed' && <CheckCircle2 className="text-green-600 w-6 h-6" />}
                {slot.status === 'failed' && <XCircle className="text-red-500 w-6 h-6" />}
                {slot.status === 'pending' && isParentMode && <div className="w-6 h-6 rounded-full border-2 border-slate-300 border-dashed" />}
            </div>
          </div>
        ))}
        {daySlots.length === 0 && (
            <div className="text-center py-10 text-slate-400">
                일정이 없습니다.
            </div>
        )}
      </div>

      {/* Mobile Add Button (Parent Mode Only) */}
      {isParentMode && (
         <button 
            onClick={() => onSlotClick(currentDayIdx, "09:00")} // Default to 09:00 for new on mobile for simplicity, user can't pick time here easily without more UI
            className="absolute bottom-4 right-4 bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-lg flex items-center gap-2 z-30 transition-transform active:scale-90"
         >
            <PlusCircle size={24} />
            <span className="font-bold">일정 추가</span>
         </button>
      )}
    </div>
  );
};
