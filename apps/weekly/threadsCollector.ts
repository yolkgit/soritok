import type { PrismaClient } from '@prisma/client';

export interface ParsedNote {
  level: string;
  grade: number;
  semester: number;
  subject: string;
  unit: string;
  title?: string | null;
  content: string;
}

const SUBJECT_MAP: Record<string, string> = {
  국어: 'korean',
  수학: 'math',
  영어: 'english',
  과학: 'science',
  사회: 'social',
};

/**
 * Threads 글 본문에서 학교급/학년/학기/과목/단원 태그를 파싱합니다.
 * 예) "[고1][수학][1학기][3단원] ..." 또는 "#고1 #수학 #1학기 #3단원 ..."
 * 필수(급/학년/학기/과목)가 없으면 null 을 반환(수집 제외).
 */
export function parseThreadPost(text: string): ParsedNote | null {
  const lvl = text.match(/(초|중|고)\D{0,2}(\d)\s*학년?/) || text.match(/(초|중|고)(\d)/);
  const sem = text.match(/([12])\s*학기/);
  const subjKey = ['국어', '수학', '영어', '과학', '사회'].find((s) => text.includes(s));
  if (!lvl || !sem || !subjKey) return null;

  const unitM =
    text.match(/(\d+\s*단원[^\n#\]\[]*)/) || text.match(/([가-힣A-Za-z0-9]+\s*단원)/);

  const level = lvl[1] === '초' ? 'elem' : lvl[1] === '중' ? 'mid' : 'high';
  return {
    level,
    grade: Number(lvl[2]),
    semester: Number(sem[1]),
    subject: SUBJECT_MAP[subjKey],
    unit: unitM ? unitM[1].trim() : '기타',
    content: text.trim(),
  };
}

interface UpsertData extends ParsedNote {
  source?: string | null;
  threadId?: string | null;
}

/** threadId(있으면) 또는 급/학년/학기/과목/단원 키로 upsert */
export async function upsertStudyNote(prisma: PrismaClient, data: UpsertData) {
  const payload = {
    level: data.level,
    grade: data.grade,
    semester: data.semester,
    subject: data.subject,
    unit: data.unit,
    title: data.title ?? null,
    content: data.content,
    source: data.source ?? null,
    threadId: data.threadId ?? null,
  };

  if (payload.threadId) {
    return prisma.studyNote.upsert({
      where: { threadId: payload.threadId },
      update: payload,
      create: payload,
    });
  }
  const existing = await prisma.studyNote.findFirst({
    where: {
      level: payload.level,
      grade: payload.grade,
      semester: payload.semester,
      subject: payload.subject,
      unit: payload.unit,
    },
  });
  if (existing) {
    return prisma.studyNote.update({ where: { id: existing.id }, data: payload });
  }
  return prisma.studyNote.create({ data: payload });
}

/**
 * Threads(메타) 수집기. THREADS_ACCESS_TOKEN + THREADS_USER_ID 가 있으면
 * 주기적으로 본인 계정 글을 가져와 StudyNote 로 upsert 합니다(신규/수정 자동 반영).
 * 토큰이 없으면 비활성(no-op).
 */
export function startThreadsCollector(prisma: PrismaClient): void {
  const token = process.env.THREADS_ACCESS_TOKEN;
  const userId = process.env.THREADS_USER_ID;
  if (!token || !userId) {
    console.log('[Threads] 수집기 비활성 — THREADS_ACCESS_TOKEN / THREADS_USER_ID 미설정');
    return;
  }
  const mins = Number(process.env.THREADS_POLL_MINUTES) || 15;

  const poll = async () => {
    try {
      const url =
        `https://graph.threads.net/v1.0/${userId}/threads` +
        `?fields=id,text,permalink,timestamp&limit=50&access_token=${token}`;
      const res = await fetch(url);
      if (!res.ok) {
        console.warn('[Threads] fetch 실패', res.status);
        return;
      }
      const data = (await res.json()) as { data?: { id: string; text?: string; permalink?: string }[] };
      const posts = data.data || [];
      let saved = 0;
      for (const p of posts) {
        if (!p.text) continue;
        const parsed = parseThreadPost(p.text);
        if (!parsed) continue;
        await upsertStudyNote(prisma, { ...parsed, source: p.permalink, threadId: p.id });
        saved++;
      }
      console.log(`[Threads] 동기화 완료 ${saved}/${posts.length} 글`);
    } catch (e) {
      console.warn('[Threads] poll 오류', (e as Error)?.message || e);
    }
  };

  poll();
  setInterval(poll, mins * 60 * 1000);
  console.log(`[Threads] 수집기 시작 (주기 ${mins}분)`);
}
