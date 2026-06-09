
export type ActivityType = 'study' | 'rest' | 'routine' | 'school' | 'academy' | 'sleep';

export interface TimeSlot {
  id: string;
  dayIndex: number; // 0 = Sat, 1 = Sun, ... 6 = Fri (Matching the image order)
  startTime: string; // "07:00"
  durationMinutes: number;
  activity: string;
  type: ActivityType;
  status: 'pending' | 'completed' | 'failed' | 'skipped';
  pointsAwarded?: number;
}

export interface DayConfig {
  name: string;
  shortName: string;
}

export interface AppState {
  schedule: TimeSlot[];
  points: number; // Current banked points (minutes)
  totalPossiblePoints: number;
  totalEarnedPoints: number;
}

export interface FontConfig {
  family: string;
  label: string;
  sizeLevel: 0 | 1 | 2; // 0=Basic, 1=Large, 2=XLarge
}

export type RewardMode = 'time' | 'currency';

export interface RewardConfig {
  mode: RewardMode;
  unit: string;
  study: number;
  academy: number;
  school: number;
  routine: number;
  rest: number;
  sleep: number;
}

export interface PointUsageLog {
  id: string;
  amount: number;
  timestamp: number;
  reason?: string;
}

export type GradeLevel = 'elementary' | 'middle' | 'high';

export interface ChildProfile {
  id: string;
  name: string;
  color: string; // Tailwind color class prefix (e.g., 'indigo', 'rose', 'emerald')
  grade: GradeLevel;
  startTime?: string; // Custom start time e.g., "07:00"
  endTime?: string;   // Custom end time e.g., "21:00"
  isPlanConfirmed?: boolean;
  lastCheckStartDate?: string | Date;
  bankedPoints?: number;
}

export interface AppConfig {
  key: string;
  value: string;
}

export interface User {
  id: string;
  email: string;
  isPremium: boolean;
  premiumExpiry?: string; // ISO Date string
}
