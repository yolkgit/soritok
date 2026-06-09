import { TimeSlot } from '../types';
import { DAYS } from '../constants';

const API_BASE = window.location.origin.includes('localhost:3000')
  ? 'http://localhost:4000/api'
  : '/api';

export const getScheduleAdvice = async (schedule: TimeSlot[]): Promise<string> => {
  // Summarize the schedule for the AI
  const summary = schedule.map(s =>
    `${DAYS[s.dayIndex].name} ${s.startTime}: ${s.activity} (${s.type})`
  ).join('\n');

  const prompt = `
    당신은 아이들의 시간 관리와 습관 형성을 돕는 친절하고 전문적인 'AI 코치'입니다.
    아래는 '안서우' 어린이의 주간 계획표 데이터입니다.
    
    데이터:
    ${summary.substring(0, 3000)}... (데이터가 많아 일부 생략됨)

    다음 항목에 대해 부모님에게 조언해주는 짧은 리포트를 작성해주세요 (한국어):
    1. **학업과 휴식의 균형**: 현재 스케줄이 너무 빡빡하지 않은지, 적절한지 분석해주세요.
    2. **긍정적 강화 제안**: 아이가 이 계획을 잘 지키게 하기 위해 어떤 보상을 주면 좋을까요?
    3. **주의사항**: 번아웃을 방지하기 위해 신경 써야 할 점.

    어투는 부드럽고 격려하는 어조로 해주세요. 마크다운 형식을 사용하지 말고 일반 텍스트로 문단만 나누어주세요.
    최대 300자 내외로 핵심만 요약해주세요.
  `;

  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/ai/advice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
      throw new Error('Failed to fetch advice from server');
    }

    const data = await response.json();
    return data.advice || "분석 결과를 가져올 수 없습니다.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "AI 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
  }
};