
import { DayConfig, TimeSlot, ActivityType, GradeLevel, RewardConfig } from './types';

export const generateId = () => Math.random().toString(36).substr(2, 9);

// Order based on the image: Sat, Sun, Mon, Tue, Wed, Thu, Fri
export const DAYS: DayConfig[] = [
    { name: '토요일', shortName: '토' },
    { name: '일요일', shortName: '일' },
    { name: '월요일', shortName: '월' },
    { name: '화요일', shortName: '화' },
    { name: '수요일', shortName: '수' },
    { name: '목요일', shortName: '목' },
    { name: '금요일', shortName: '금' },
];

export const TIME_SLOTS_START = 6;
export const TIME_SLOTS_END = 26; // up to 02:00
export const INTERVAL = 30; // minutes

// Helper to generate empty slots structure
const createSlot = (dayIdx: number, time: string, activity: string, type: ActivityType): TimeSlot => ({
    id: generateId(),
    dayIndex: dayIdx,
    startTime: time,
    durationMinutes: 30,
    activity,
    type,
    status: 'pending',
});

// Full Range for Schedule Generation (Internal Logic)
export const FULL_TIME_RANGE = [
    "06:00", "06:30", "07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
    "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
    "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30",
    "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00", "22:30",
    "23:00", "23:30", "00:00", "00:30", "01:00", "01:30", "02:00"
];

export const GRADE_DEFAULTS = {
    elementary: { start: '07:00', end: '22:00' },
    middle: { start: '07:00', end: '23:00' },
    high: { start: '06:00', end: '02:00' }
};

export const DEFAULT_REWARD_CONFIG: RewardConfig = {
    mode: 'time',
    unit: '포인트',
    study: 20,   // 공부: 20점
    academy: 20, // 학원: 20점
    school: 10,  // 학교: 10점
    routine: 5,  // 생활: 5점
    rest: 0,     // 휴식: 0점 (보상 없음)
    sleep: 0     // 수면: 0점
};

// Dynamic Time Range for UI Display
export const getTimeRange = (grade: GradeLevel): string[] => {
    const def = GRADE_DEFAULTS[grade] || GRADE_DEFAULTS.elementary;
    return getCustomTimeRange(def.start, def.end);
};

export const getCustomTimeRange = (start: string, end: string): string[] => {
    let startIndex = FULL_TIME_RANGE.indexOf(start);
    let endIndex = FULL_TIME_RANGE.indexOf(end);

    // Safety check fallback
    if (startIndex === -1) startIndex = 0;
    if (endIndex === -1) endIndex = FULL_TIME_RANGE.length - 1;

    // Ensure start is before end (circular handling not needed for linear list, just clamping)
    if (startIndex > endIndex) endIndex = FULL_TIME_RANGE.length - 1;

    return FULL_TIME_RANGE.slice(startIndex, endIndex + 1);
};

export const getRecommendedSchedule = (grade: GradeLevel): TimeSlot[] => {
    const schedule: TimeSlot[] = [];

    DAYS.forEach((_, dayIdx) => {
        const isWeekend = dayIdx < 2; // Sat(0), Sun(1)

        FULL_TIME_RANGE.forEach(time => {
            const hour = parseInt(time.split(':')[0]);
            const min = parseInt(time.split(':')[1]);
            let activity = "";
            let type: ActivityType = 'rest';

            // --- Case 1: Elementary School ---
            if (grade === 'elementary') {
                // Sleep (Before 7:00 is mostly sleep, actually start from 07:00 in UI usually but data needs to be clean)
                if (hour < 7 || (hour >= 22 || (hour === 21 && min >= 30) || hour > 22 || hour === 0 || hour === 1 || hour === 2)) {
                    if (hour >= 6 || hour === 0 || hour >= 21) {
                        activity = "꿈나라 여행 (수면)";
                        type = 'sleep';
                    }
                }
                // Morning Routine
                else if (hour === 7) {
                    // Only 07:00 - 08:00 logic here if range starts early, otherwise handled
                    if (min === 0) { activity = "기상"; type = 'routine'; } // 7:00
                    else { activity = "아침 준비"; type = 'routine'; }
                }
                else if (hour === 8) {
                    if (min === 0) { activity = "기상 & 이불정리"; type = 'routine'; }
                    else { activity = "아침 식사"; type = 'routine'; }
                }
                // Morning Block (Focus)
                else if (hour >= 9 && hour < 12) {
                    if (isWeekend) {
                        if (hour === 9) { activity = "자유 독서"; type = 'study'; }
                        else { activity = "자유시간 / TV"; type = 'rest'; }
                    } else {
                        if (hour === 9) { activity = "아침 독서 (30분)"; type = 'study'; }
                        else if (hour === 10) { activity = "수학/연산 공부"; type = 'study'; }
                        else if (hour === 11) { activity = "영어 집중 듣기"; type = 'study'; }
                    }
                }
                // Lunch
                else if (hour === 12) { activity = "맛있는 점심"; type = 'routine'; }
                // Afternoon 1
                else if (hour >= 13 && hour < 15) {
                    if (isWeekend) { activity = "가족 나들이 / 휴식"; type = 'rest'; }
                    else {
                        if (hour === 13) { activity = "방학 숙제 / 일기"; type = 'school'; }
                        else { activity = "창의 활동 (블럭/그리기)"; type = 'rest'; }
                    }
                }
                // Afternoon 2 (Academy/Exercise)
                else if (hour >= 15 && hour < 17) {
                    if (isWeekend) { activity = "신체 활동 / 놀이터"; type = 'rest'; }
                    else {
                        if (hour === 15) { activity = "피아노 / 미술 학원"; type = 'academy'; }
                        else { activity = "태권도 / 줄넘기"; type = 'academy'; }
                    }
                }
                // Late Afternoon
                else if (hour === 17) {
                    if (min === 0) { activity = "샤워 & 휴식"; type = 'routine'; }
                    else { activity = "자유시간"; type = 'rest'; }
                }
                // Dinner
                else if (hour === 18) { activity = "저녁 식사"; type = 'routine'; }
                // Evening
                else if (hour >= 19 && hour < 21.5) {
                    if (hour === 19) { activity = isWeekend ? "가족 영화 관람" : "보드게임 / TV"; type = 'rest'; }
                    else if (hour === 20) {
                        if (min === 0) { activity = "내일 준비"; type = 'routine'; }
                        else { activity = "양치 / 세수"; type = 'routine'; }
                    }
                    else { activity = "잠자리 독서"; type = 'rest'; }
                }
            }

            // --- Case 2: Middle School ---
            else if (grade === 'middle') {
                // Sleep (Later sleep time: 23:00+, Wake up 07:30)
                if (hour < 7 || (hour === 7 && min < 30) || hour >= 23 || hour === 0 || hour === 1 || hour === 2) {
                    if (hour >= 6 || hour >= 23 || hour === 0) {
                        activity = "수면 (충전 시간)";
                        type = 'sleep';
                    }
                }
                // Morning Routine
                else if (hour === 7 && min === 30) { activity = "기상 & 스트레칭"; type = 'routine'; }
                else if (hour === 8) {
                    if (min === 0) { activity = "아침 식사"; type = 'routine'; }
                    else { activity = "등교/학습 준비"; type = 'routine'; }
                }
                // Morning Study (Intensive)
                else if (hour >= 9 && hour < 12) {
                    if (isWeekend) {
                        if (hour === 9) { activity = "부족한 잠 보충 / 휴식"; type = 'rest'; }
                        else { activity = "자유 시간"; type = 'rest'; }
                    } else {
                        if (hour === 9) { activity = "수학 집중 학습 (선행)"; type = 'study'; }
                        else if (hour === 10) { activity = "영어 단어/독해"; type = 'study'; }
                        else { activity = "인강 수강 / 복습"; type = 'study'; }
                    }
                }
                // Lunch
                else if (hour === 12) { activity = "점심 식사"; type = 'routine'; }
                // Early Afternoon
                else if (hour >= 13 && hour < 15) {
                    if (isWeekend) { activity = "취미 활동 / 친구 만남"; type = 'rest'; }
                    else {
                        if (hour === 13) { activity = "독서 / 수행평가 준비"; type = 'school'; }
                        else { activity = "과학/사회 개념 정리"; type = 'study'; }
                    }
                }
                // Late Afternoon (Academy)
                else if (hour >= 15 && hour < 18) {
                    if (isWeekend) { activity = "자유 시간 / 게임"; type = 'rest'; }
                    else { activity = "학원 (영어/수학)"; type = 'academy'; }
                }
                // Dinner
                else if (hour === 18) { activity = "저녁 식사"; type = 'routine'; }
                // Evening Study (Self-directed)
                else if (hour >= 19 && hour < 21) {
                    if (isWeekend) { activity = "가족 시간 / 영화"; type = 'rest'; }
                    else { activity = "학원 숙제 / 자율 학습"; type = 'study'; }
                }
                // Night Free Time
                else if (hour >= 21 && hour < 23) {
                    if (hour === 21) { activity = "스마트폰 / 게임 / 휴식"; type = 'rest'; }
                    else if (hour === 22) {
                        if (min === 0) { activity = "하루 마무리 일기/플래너"; type = 'study'; }
                        else { activity = "샤워 & 취침 준비"; type = 'routine'; }
                    }
                }
            }

            // --- Case 3: High School ---
            else if (grade === 'high') {
                // Sleep (02:00 ~ 06:30)
                if ((hour === 2 && min >= 0) || hour === 3 || hour === 4 || hour === 5 || (hour === 6 && min < 30)) {
                    activity = "수면 (Deep Sleep)";
                    type = 'sleep';
                }
                // Wake up & Morning
                else if (hour === 6 && min === 30) { activity = "기상 & 아침 스트레칭"; type = 'routine'; }
                else if (hour === 7) {
                    if (min === 0) { activity = "아침 식사"; type = 'routine'; }
                    else { activity = "영어 단어 암기 / 등교"; type = 'study'; }
                }
                else if (hour === 8) { activity = "0교시 자습 / 독서"; type = 'school'; }

                // School Time / Morning Study
                else if (hour >= 9 && hour < 12) {
                    if (isWeekend) {
                        if (hour <= 10) { activity = "부족한 잠 보충 / 휴식"; type = 'rest'; }
                        else { activity = "취약 과목 집중 공략"; type = 'study'; }
                    } else {
                        activity = "학교 수업 / 오전 공부";
                        type = 'school';
                    }
                }

                // Lunch
                else if (hour === 12) { activity = "점심 식사 & 산책"; type = 'routine'; }

                // Afternoon
                else if (hour >= 13 && hour < 18) {
                    if (isWeekend) {
                        if (hour < 15) { activity = "학원 / 인강"; type = 'academy'; }
                        else { activity = "자율 학습 (독서실)"; type = 'study'; }
                    } else {
                        if (hour < 17) { activity = "학교 수업 / 보충"; type = 'school'; }
                        else { activity = "저녁 시간 / 휴식"; type = 'routine'; } // 17:00
                    }
                }

                // Dinner (For School, usually 17-18 or 18-19. Let's assume 18:00)
                else if (hour === 18) { activity = "저녁 식사"; type = 'routine'; }

                // Night Study (Ya-ja / Academy)
                else if (hour >= 19 && hour < 22) {
                    if (isWeekend) { activity = "자유 시간 / 휴식"; type = 'rest'; }
                    else { activity = "야간 자율 학습 / 학원"; type = 'study'; }
                }

                // Late Night (Self Study)
                else if (hour >= 22 || hour === 0 || hour === 1) {
                    activity = "심야 자율 학습 (수학/탐구)";
                    type = 'study';
                }

            }

            if (activity) {
                schedule.push(createSlot(dayIdx, time, activity, type));
            }
        });
    });

    return schedule;
};

// Default export for backward compatibility
export const INITIAL_SCHEDULE: TimeSlot[] = getRecommendedSchedule('elementary');
