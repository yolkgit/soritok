import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { TimeSlot } from '../types';

interface StatsCardProps {
  schedule: TimeSlot[];
}

const COLORS = {
  study: '#FBBF24', // yellow-400
  rest: '#34D399', // emerald-400
  routine: '#60A5FA', // blue-400
  school: '#F87171', // red-400
  academy: '#F472B6', // pink-400
  sleep: '#9CA3AF', // gray-400
};

const LABELS = {
  study: '공부',
  rest: '휴식',
  routine: '생활',
  school: '학교',
  academy: '학원',
  sleep: '수면'
};

const RADIAN = Math.PI / 180;

// Custom label to render inside the chart slices
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, value, fill }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  // Hide label if slice is too small (less than 5%)
  if (percent < 0.05) return null;

  const h = Math.floor(value / 60);
  const m = value % 60;
  const timeText = h > 0 ? `${h}h` : `${m}m`;

  // Improve contrast for yellow background
  const textColor = fill === '#FBBF24' ? '#451a03' : '#FFFFFF';
  const textShadow = fill === '#FBBF24' ? 'none' : '0px 1px 2px rgba(0,0,0,0.2)';

  return (
    <text x={x} y={y} fill={textColor} textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight="bold" style={{ textShadow, pointerEvents: 'none' }}>
      {timeText}
      <tspan x={x} dy="1.1em" fontSize={9} fontWeight="normal">{(percent * 100).toFixed(0)}%</tspan>
    </text>
  );
};

export const StatsCard: React.FC<StatsCardProps> = ({ schedule }) => {
  const dataMap = schedule.reduce((acc, slot) => {
    if (!acc[slot.type]) acc[slot.type] = 0;
    acc[slot.type] += slot.durationMinutes;
    return acc;
  }, {} as Record<string, number>);

  // Filter out sleep for the chart to focus on active time
  const activeTypes = Object.keys(dataMap).filter(key => key !== 'sleep');
  const totalActiveMinutes = activeTypes.reduce((sum, key) => sum + dataMap[key], 0);

  const data = activeTypes.map(key => ({
    name: LABELS[key as keyof typeof LABELS] || '기타',
    value: dataMap[key],
    color: COLORS[key as keyof typeof COLORS] || '#ccc'
  })).sort((a, b) => b.value - a.value);

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) return `${h}시간 ${m}분`;
    return `${m}분`;
  };

  return (
    <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 h-full flex flex-col justify-center">
      <h3 className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">이번 주 활동 (수면 제외)</h3>
      <div className="flex justify-center items-center w-full" style={{ minWidth: 0, height: 140 }}>
        <PieChart width={220} height={140}>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            innerRadius={25}
            outerRadius={55}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={1} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => {
              const percent = totalActiveMinutes > 0 ? ((value / totalActiveMinutes) * 100).toFixed(1) : 0;
              return [`${formatTime(value)} (${percent}%)`, name];
            }}
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', padding: '8px 12px' }}
            itemStyle={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}
          />
          <Legend
            layout="vertical"
            verticalAlign="middle"
            align="right"
            width={70}
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: '11px', right: 0 }}
            formatter={(value) => <span className="text-slate-600 font-medium ml-1">{value}</span>}
          />
        </PieChart>
      </div>
    </div>
  );
};