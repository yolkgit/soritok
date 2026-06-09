import React, { useState, useEffect } from 'react';
import { TimeSlot, ActivityType, FontConfig } from '../types';
import { DAYS } from '../constants';
import { Check, X, Plus } from 'lucide-react';

interface ScheduleGridProps {
  schedule: TimeSlot[];
  onSlotClick: (dayIndex: number, time: string, slot?: TimeSlot) => void;
  onRangeSelect: (start: { day: number; time: string }, end: { day: number; time: string }) => void;
  isParentMode: boolean;
  isPlanConfirmed: boolean;
  fontConfig: FontConfig;
  timeRange: string[];
}

const getActivityColor = (type: ActivityType) => {
  switch (type) {
    case 'study': return 'bg-yellow-200 border-yellow-300 text-yellow-900';
    case 'rest': return 'bg-emerald-200 border-emerald-300 text-emerald-900';
    case 'academy': return 'bg-orange-200 border-orange-300 text-orange-900';
    case 'school': return 'bg-rose-100 border-rose-200 text-rose-900';
    case 'routine': return 'bg-blue-100 border-blue-200 text-blue-900';
    case 'sleep': return 'bg-slate-100 border-slate-200 text-slate-500';
    default: return 'bg-gray-100 text-gray-500';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed': return <div className="absolute top-0.5 right-0.5 bg-green-600 rounded-full p-0.5 shadow-sm z-20"><Check size={10} className="text-white" strokeWidth={4} /></div>;
    case 'failed': return <div className="absolute top-0.5 right-0.5 bg-red-500 rounded-full p-0.5 shadow-sm z-20"><X size={10} className="text-white" strokeWidth={4} /></div>;
    default: return null;
  }
};

export const ScheduleGrid: React.FC<ScheduleGridProps> = ({ schedule, onSlotClick, onRangeSelect, isParentMode, isPlanConfirmed, fontConfig, timeRange }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ day: number; time: string } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ day: number; time: string } | null>(null);

  // Stop dragging if mouse leaves the window
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        finishDrag();
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDragging, dragCurrent]);

  const handleMouseDown = (day: number, time: string) => {
    if (isPlanConfirmed && !isParentMode) return; // Disable drag if plan is confirmed and not parent
    setIsDragging(true);
    setDragStart({ day, time });
    setDragCurrent({ day, time });
  };

  const handleMouseEnter = (day: number, time: string) => {
    if (isDragging) {
      if (isPlanConfirmed) return; // Prevent range dragging in confirmed mode (even for parents)
      setDragCurrent({ day, time });
    }
  };

  const finishDrag = () => {
    setIsDragging(false);
    if (dragStart && dragCurrent) {
      // If start and end are the same, treat as click
      if (dragStart.day === dragCurrent.day && dragStart.time === dragCurrent.time) {
        const slot = schedule.find(s => s.dayIndex === dragStart.day && s.startTime === dragStart.time);
        if (slot) {
          // Existing slot: Clickable if not confirmed OR (confirmed AND parent mode)
          if (!isPlanConfirmed || isParentMode) {
            onSlotClick(dragStart.day, dragStart.time, slot);
          }
        } else {
          // Empty slot: Clickable only if not confirmed
          if (!isPlanConfirmed) {
            onSlotClick(dragStart.day, dragStart.time);
          }
        }
      } else {
        // It's a range select
        onRangeSelect(dragStart, dragCurrent);
      }
    }
    setDragStart(null);
    setDragCurrent(null);
  };

  // Helper to determine if a cell is selected
  const isCellSelected = (dayIdx: number, time: string) => {
    if (!dragStart || !dragCurrent) return false;

    const minDay = Math.min(dragStart.day, dragCurrent.day);
    const maxDay = Math.max(dragStart.day, dragCurrent.day);

    const timeIdx = timeRange.indexOf(time);
    const startTimeIdx = timeRange.indexOf(dragStart.time);
    const currentTimeIdx = timeRange.indexOf(dragCurrent.time);

    const minTimeIdx = Math.min(startTimeIdx, currentTimeIdx);
    const maxTimeIdx = Math.max(startTimeIdx, currentTimeIdx);

    return (
      dayIdx >= minDay &&
      dayIdx <= maxDay &&
      timeIdx >= minTimeIdx &&
      timeIdx <= maxTimeIdx
    );
  };

  // Dynamic Text Sizes based on Level
  const getTextSize = (type: 'header' | 'time' | 'cell') => {
    const { sizeLevel } = fontConfig;
    if (type === 'header') return sizeLevel === 0 ? 'text-sm' : sizeLevel === 1 ? 'text-base' : 'text-lg';
    if (type === 'time') return sizeLevel === 0 ? 'text-xs' : sizeLevel === 1 ? 'text-sm' : 'text-base';
    if (type === 'cell') return sizeLevel === 0 ? 'text-xs' : sizeLevel === 1 ? 'text-sm' : 'text-base';
    return 'text-xs';
  };

  const headerSize = getTextSize('header');
  const timeSize = getTextSize('time');
  const cellSize = getTextSize('cell');

  return (
    <div className="overflow-x-auto pb-4 print-overflow-visible select-none" style={{ fontFamily: fontConfig.family }}>
      <div className="min-w-[800px] border-collapse">
        {/* Header */}
        <div className="grid grid-cols-8 gap-1 mb-1">
          <div className={`flex items-center justify-center font-bold text-slate-400 ${timeSize} h-10 bg-transparent`}>시간</div>
          {DAYS.map((day, idx) => (
            <div
              key={day.shortName}
              className={`
                    flex items-center justify-center font-bold h-10 rounded-t-lg border-b-2 pdf-header-cell ${headerSize}
                    ${idx < 2 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-slate-50 text-slate-700 border-slate-200'}
                `}
            >
              <span className="pdf-header-text">{day.name}</span>
            </div>
          ))}
        </div>

        {/* Rows */}
        {timeRange.map(time => (
          <div key={time} className="grid grid-cols-8 gap-1 mb-1 h-10 pdf-row">
            <div className={`flex items-start justify-center pt-1 text-center font-medium text-slate-400 bg-slate-50 rounded-md print:flex print:items-start print:justify-center print:pt-1 print:border print:border-slate-200 w-full ${timeSize}`}>
              <span className="w-full block text-center">{time}</span>
            </div>
            {DAYS.map((_, dayIdx) => {
              const slot = schedule.find(s => s.dayIndex === dayIdx && s.startTime === time);
              const isSelected = isCellSelected(dayIdx, time);

              // If slot exists
              if (slot) {
                const isClickable = !isPlanConfirmed || (isPlanConfirmed && isParentMode);
                return (
                  <div
                    key={slot.id}
                    className="relative w-full h-full"
                    onMouseDown={() => handleMouseDown(dayIdx, time)}
                    onMouseEnter={() => handleMouseEnter(dayIdx, time)}
                    onMouseUp={finishDrag}
                  >
                    <button
                      className={`
                            w-full h-full rounded-md border font-medium flex flex-col items-center justify-center p-0.5 text-center leading-tight transition-all
                            pdf-cell ${cellSize}
                            ${getActivityColor(slot.type)}
                            ${isSelected ? 'ring-4 ring-indigo-400 ring-offset-1 z-30 scale-105 shadow-xl' : ''}
                            ${isClickable && !isSelected ? 'hover:scale-105 hover:z-10 hover:shadow-md cursor-pointer' : 'cursor-default'}
                            ${slot.status === 'completed' ? 'ring-2 ring-green-500 ring-offset-1 z-10' : ''}
                            ${slot.status === 'failed' ? 'opacity-50 grayscale' : ''}
                            print:border-slate-300 print:shadow-none print:opacity-100 print:ring-0
                          `}
                    >
                      {getStatusIcon(slot.status)}
                      <span className="w-full truncate px-1 pdf-cell-text">{slot.activity}</span>
                    </button>
                  </div>
                );
              }

              // Empty Slot
              return (
                <div
                  key={`${dayIdx}-${time}`}
                  className="relative w-full h-full"
                  onMouseDown={() => handleMouseDown(dayIdx, time)}
                  onMouseEnter={() => handleMouseEnter(dayIdx, time)}
                  onMouseUp={finishDrag}
                >
                  <button
                    disabled={isPlanConfirmed}
                    className={`
                            w-full h-full rounded-md border border-dashed border-slate-200 bg-slate-50/30 transition-all flex items-center justify-center group
                            print:border-slate-100
                            ${!isPlanConfirmed ? 'hover:bg-indigo-50 hover:border-indigo-200 cursor-pointer' : 'cursor-default'}
                            ${isSelected ? 'bg-indigo-100/80 border-indigo-400 ring-2 ring-indigo-400 z-10' : ''}
                            pdf-cell
                        `}
                  >
                    {!isPlanConfirmed && !isSelected && <Plus size={16} className="text-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity" />}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};