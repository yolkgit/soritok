
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticateToken } from './authMiddleware.ts';
import type { AuthRequest } from './authMiddleware.ts';

import { GoogleGenAI } from "@google/genai";

const prisma = new PrismaClient();
const app = express();
const PORT = Number(process.env.PORT) || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-this';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- Debug API ---
app.get('/api/debug/status', async (req, res) => {
    try {
        const tables = await prisma.$queryRaw`SHOW TABLES`;
        const userCount = await prisma.user.count();
        res.json({
            status: 'ok',
            tables,
            userCount,
            env: {
                // Safe env vars only
                NODE_ENV: process.env.NODE_ENV
            }
        });
    } catch (e) {
        res.status(500).json({ error: 'DB Connection Failed', details: (e as any).message });
    }
});

// --- Auth API ---

app.post('/api/auth/signup', async (req, res) => {
    try {
        console.log("Signup Request Body:", req.body);
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

        console.log("Checking for existing user...");
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) return res.status(400).json({ error: 'User already exists' });

        console.log("Hashing password...");
        const hashedPassword = await bcrypt.hash(password, 10);

        console.log("Generating initial parent password...");
        const initialParentPassword = "0000";

        console.log("Creating user in DB...");
        const user = await prisma.user.create({
            data: { email, password: hashedPassword, parentPassword: initialParentPassword }
        });

        console.log("Signing token...");
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });

        console.log("Signup successful!");
        res.json({ token, user: { id: user.id, email: user.email, parentPassword: "0000" } });
    } catch (e: any) {
        console.error("Signup Error:", e);
        res.status(500).json({ error: 'Signup failed: ' + (e.message || String(e)) });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        console.log("Login Request:", req.body);
        const { email, password } = req.body;

        console.log("Finding user...");
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(400).json({ error: 'User not found' });

        console.log("Comparing password...");
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(400).json({ error: 'Invalid password' });

        console.log("Signing token...");
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });

        console.log("Login successful!");
        res.json({ token, user: { id: user.id, email: user.email, parentPassword: user.parentPassword } });
    } catch (e) {
        res.status(500).json({ error: 'Login failed' });
    }
});

app.post('/api/auth/parent-password', authenticateToken, async (req: AuthRequest, res) => {
    const { parentPassword } = req.body;
    if (!parentPassword || parentPassword.length < 4 || parentPassword.length > 8) {
        return res.status(400).json({ error: 'Password must be 4-8 digits' });
    }

    try {
        await prisma.user.update({
            where: { id: (req as any).user!.id },
            data: { parentPassword }
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to update parent password' });
    }
});

app.post('/api/auth/reset-parent-password', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const { loginPassword } = req.body;
        const user = await prisma.user.findUnique({ where: { id: (req as any).user!.id } });
        
        if (!user) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        
        const valid = await bcrypt.compare(loginPassword, user.password);
        if (!valid) return res.status(400).json({ error: '계정 비밀번호가 일치하지 않습니다.' });

        await prisma.user.update({
            where: { id: user.id },
            data: { parentPassword: "0000" }
        });
        
        res.json({ success: true, message: '부모 비밀번호가 0000으로 초기화되었습니다.' });
    } catch (e) {
        console.error("Password reset error:", e);
        res.status(500).json({ error: '비밀번호 초기화에 실패했습니다.' });
    }
});

// --- Snapshot API (Protected) ---

app.get('/api/snapshots', authenticateToken, async (req: AuthRequest, res) => {
    const childId = req.query.childId as string | undefined;
    try {
        const whereClause: any = { child: { userId: (req as any).user!.id } };
        if (childId) {
            whereClause.childId = childId;
        }

        const snapshots = await prisma.scheduleSnapshot.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' }
        });
        res.json(snapshots);
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch snapshots' });
    }
});

app.post('/api/snapshots', authenticateToken, async (req: AuthRequest, res) => {
    const { childId, name, date, schedule } = req.body;
    try {
        // Verify child owns by user
        const child = await prisma.child.findFirst({
            where: { id: childId as string, userId: (req as any).user!.id }
        });
        if (!child) return res.status(403).json({ error: 'Unauthorized' });

        const snapshot = await prisma.scheduleSnapshot.create({
            data: { childId: childId as string, name, date, schedule }
        });
        res.json(snapshot);
    } catch (e) {
        res.status(500).json({ error: 'Failed to create snapshot' });
    }
});

app.delete('/api/snapshots/:id', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const snapshot = await prisma.scheduleSnapshot.findFirst({
            where: { id: req.params.id as string, child: { userId: (req as any).user!.id } }
        });
        if (!snapshot) return res.status(404).json({ error: 'Snapshot not found' });

        await prisma.scheduleSnapshot.delete({ where: { id: req.params.id as string } });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to delete snapshot' });
    }
});


// --- Children API (Protected) ---

app.get('/api/children', authenticateToken, async (req: AuthRequest, res) => {
    try {
        console.log(`Fetching children for user: ${(req as any).user!.id}`);
        const children = await prisma.child.findMany({
            where: { userId: (req as any).user!.id },
            include: {
                rewardConfig: true
            },
            orderBy: { createdAt: 'asc' }
        });
        console.log(`Found ${children.length} children`);
        res.json(children);
    } catch (error) {
        console.error("Failed to fetch children:", error);
        res.status(500).json({ error: 'Failed to fetch children' });
    }
});

app.post('/api/children', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const { name, color, grade, startTime, endTime } = req.body;

        const child = await prisma.child.create({
            data: {
                userId: (req as any).user!.id, // Link to user
                name,
                color,
                grade,
                startTime,
                endTime,
                rewardConfig: {
                    create: {}
                }
            },
            include: { rewardConfig: true }
        });

        res.json(child);
    } catch (error) {
        console.error("Create child error:", error);
        res.status(500).json({ error: 'Failed to create child', details: (error as any).message });
    }
});

app.put('/api/children/:id', authenticateToken, async (req: AuthRequest, res) => {
    const { id } = req.params;
    const data = req.body;

    try {
        // Verify ownership
        const child = await prisma.child.findFirst({
            where: { id: id as string, user: { id: (req as any).user!.id } }
        });
        if (!child) return res.status(403).json({ error: 'Unauthorized' });

        const { name, color, grade, startTime, endTime, isPlanConfirmed } = data;

        const updated = await prisma.child.update({
            where: { id: id as string },
            data: {
                name,
                color,
                grade,
                startTime: startTime as string,
                endTime: endTime as string,
                isPlanConfirmed: !!isPlanConfirmed,
                updatedAt: new Date()
            }
        });
        res.json(updated);
    } catch (error) {
        console.error("Update child error:", error);
        res.status(500).json({ error: 'Failed to update child' });
    }
});

app.delete('/api/children/:id', authenticateToken, async (req: AuthRequest, res) => {
    const { id } = req.params;
    try {
        // Verify ownership
        const child = await prisma.child.findFirst({
            where: { id: id as string, user: { id: (req as any).user!.id } }
        });
        if (!child) return res.status(403).json({ error: 'Unauthorized' });

        await prisma.child.delete({ where: { id: id as string } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete child' });
    }
});

app.post('/api/children/:id/reset-checks', authenticateToken, async (req: AuthRequest, res) => {
    const { id } = req.params;
    try {
        const child = await prisma.child.findFirst({
            where: { id, user: { id: (req as any).user!.id } }
        });
        if (!child) return res.status(403).json({ error: 'Unauthorized' });

        const slots = await prisma.timeSlot.findMany({
            where: { childId: id, status: { in: ['completed', 'failed'] } }
        });
        const config = await prisma.rewardConfig.findUnique({
            where: { childId: id }
        });

        let newPoints = 0;
        if (config) {
            slots.forEach((slot: any) => {
                const p = (config as any)[slot.type] || 0;
                if (slot.status === 'completed') newPoints += p;
                else if (slot.status === 'failed') newPoints -= p;
            });
        }

        await prisma.$transaction([
            prisma.timeSlot.updateMany({
                where: { childId: id, status: { in: ['completed', 'failed'] } },
                data: { status: 'pending' }
            }),
            prisma.child.update({
                where: { id },
                data: { 
                    lastCheckStartDate: null,
                    bankedPoints: { increment: newPoints }
                }
            })
        ]);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to reset checks' });
    }
});

// --- Schedule API (Protected) ---

app.get('/api/schedules', authenticateToken, async (req: AuthRequest, res) => {
    const childId = req.query.childId as string | undefined;
    if (!childId) {
        return res.status(400).json({ error: 'Child ID required' });
    }

    // Verify ownership
    const child = await prisma.child.findFirst({
        where: { id: childId, user: { id: (req as any).user!.id } }
    });
    if (!child) return res.status(403).json({ error: 'Unauthorized' });

    try {
        // --- Auto Reset Logic ---
        if (child.lastCheckStartDate) {
            const now = new Date();
            const lastCheck = new Date(child.lastCheckStartDate);
            const diffInMs = now.getTime() - lastCheck.getTime();
            const diffInHours = diffInMs / (1000 * 60 * 60);

            if (diffInHours >= 168) { // 7 days
                const slots = await prisma.timeSlot.findMany({
                    where: { childId, status: { in: ['completed', 'failed'] } }
                });
                const config = await prisma.rewardConfig.findUnique({
                    where: { childId }
                });

                let newPoints = 0;
                if (config) {
                    slots.forEach((slot: any) => {
                        const p = (config as any)[slot.type] || 0;
                        if (slot.status === 'completed') newPoints += p;
                        else if (slot.status === 'failed') newPoints -= p;
                    });
                }

                await prisma.timeSlot.updateMany({
                    where: { childId, status: { in: ['completed', 'failed'] } },
                    data: { status: 'pending' }
                });
                await prisma.child.update({
                    where: { id: childId },
                    data: { 
                        lastCheckStartDate: null,
                        bankedPoints: { increment: newPoints }
                    }
                });
            }
        }
        // ------------------------

        const schedules = await prisma.timeSlot.findMany({
            where: { childId },
            orderBy: [
                { dayIndex: 'asc' },
                { startTime: 'asc' }
            ]
        });
        res.json(schedules);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch schedules' });
    }
});

app.post('/api/schedules/batch', authenticateToken, async (req: AuthRequest, res) => {
    const { childId, slots } = req.body;
    if (!childId) return res.status(400).json({ error: 'ChildId required' });

    // Verify ownership
    const child = await prisma.child.findFirst({
        where: { id: childId, userId: (req as any).user!.id }
    });
    if (!child) return res.status(403).json({ error: 'Unauthorized' });

    try {
        const incomingSlots = slots;
        const incomingSlotIds = incomingSlots.filter((s: any) => s.id).map((s: any) => s.id);

        // Fetch existing slots
        const existingSlots = await prisma.timeSlot.findMany({
            where: { childId }
        });

        // 1. Delete slots that are no longer present
        const slotsToDelete = existingSlots.filter(
            (existing) => !incomingSlotIds.includes(existing.id)
        );

        const deleteOps = slotsToDelete.map((slot: any) =>
            prisma.timeSlot.delete({ where: { id: slot.id } })
        );

        // 2. Classify Creates and Updates
        const updateOps: any[] = [];
        const createOps: any[] = [];

        for (const incomingSlot of incomingSlots) {
            const data = {
                childId,
                dayIndex: incomingSlot.dayIndex,
                startTime: incomingSlot.startTime,
                durationMinutes: incomingSlot.durationMinutes,
                activity: incomingSlot.activity,
                type: incomingSlot.type,
                status: incomingSlot.status,
            };

            const existingSlot = existingSlots.find((s) => s.id === incomingSlot.id);

            if (existingSlot) {
                // Check if anything actually changed
                const hasChanged =
                    existingSlot.dayIndex !== data.dayIndex ||
                    existingSlot.startTime !== data.startTime ||
                    existingSlot.durationMinutes !== data.durationMinutes ||
                    existingSlot.activity !== data.activity ||
                    existingSlot.type !== data.type ||
                    existingSlot.status !== data.status;

                if (hasChanged) {
                    updateOps.push(
                        prisma.timeSlot.update({
                            where: { id: existingSlot.id },
                            data: { ...data, updatedAt: new Date() },
                        })
                    );
                }
            } else {
                // Completely new slot (doesn't exist in DB)
                createOps.push(
                    prisma.timeSlot.create({
                        data: incomingSlot.id
                            ? { ...data, id: incomingSlot.id as string }
                            : data,
                    })
                );
            }
        }

        // Execute all required operations atomically
        const result = await prisma.$transaction([
            ...deleteOps,
            ...updateOps,
            ...createOps,
        ]);

        // Check if we need to start the week timer
        if (!child.lastCheckStartDate) {
            const hasCheckedSlot = incomingSlots.some((s: any) => s.status === 'completed' || s.status === 'failed');
            if (hasCheckedSlot) {
                await prisma.child.update({
                    where: { id: childId },
                    data: { lastCheckStartDate: new Date() }
                });
            }
        }

        res.json(result);
    } catch (error) {
        console.error("Batch save error:", error);
        res.status(500).json({ error: 'Failed to save batch schedules' });
    }
});

app.delete('/api/schedules/:id', authenticateToken, async (req: AuthRequest, res) => {
    try {
        // Need to find if slot belongs to a child of this user
        const slot = await prisma.timeSlot.findUnique({
            where: { id: req.params.id as string },
            include: { child: true }
        });

        if (!slot || (slot.child as any).userId !== (req as any).user!.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        await prisma.timeSlot.delete({ where: { id: req.params.id as string } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete schedule slot' });
    }
});

app.delete('/api/schedules/all/:childId', authenticateToken, async (req: AuthRequest, res) => {
    const childId = req.params.childId as string;
    try {
        // Verify ownership
        const child = await prisma.child.findFirst({
            where: { id: childId, userId: (req as any).user!.id }
        });
        if (!child) return res.status(403).json({ error: 'Unauthorized' });

        await prisma.timeSlot.deleteMany({ where: { childId } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to clear schedule' });
    }
});

// --- Logs & Points (Protected) ---

app.get('/api/logs', authenticateToken, async (req: AuthRequest, res) => {
    const childId = req.query.childId as string | undefined;
    if (!childId) return res.status(400).json([]);

    const child = await prisma.child.findFirst({
        where: { id: childId, userId: (req as any).user!.id }
    });
    if (!child) return res.status(403).json({ error: 'Unauthorized' });

    try {
        const logs = await prisma.pointUsageLog.findMany({
            where: { childId },
            orderBy: { timestamp: 'desc' },
            take: 50
        });
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: 'Failed logs' });
    }
});

app.post('/api/logs', authenticateToken, async (req: AuthRequest, res) => {
    const { childId, amount, reason } = req.body;

    const child = await prisma.child.findFirst({
        where: { id: childId, userId: (req as any).user!.id }
    });
    if (!child) return res.status(403).json({ error: 'Unauthorized' });

    try {
        if (amount < 0) {
            const aggregate = await prisma.pointUsageLog.aggregate({
                where: { childId },
                _sum: { amount: true }
            });
            const currentTotal = aggregate._sum.amount || 0;

            if (currentTotal + amount < 0) {
                return res.status(400).json({ error: '포인트가 부족합니다' });
            }
        }

        const log = await prisma.pointUsageLog.create({
            data: { childId, amount, reason, timestamp: new Date() }
        });
        res.json(log);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add log' });
    }
});

app.post('/api/logs/reset', authenticateToken, async (req: AuthRequest, res) => {
    const { childId } = req.body;

    const child = await prisma.child.findFirst({
        where: { id: childId, userId: (req as any).user!.id }
    });
    if (!child) return res.status(403).json({ error: 'Unauthorized' });

    try {
        await prisma.pointUsageLog.deleteMany({ where: { childId } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed reset logs' });
    }
});

app.delete('/api/logs/item/:logId', authenticateToken, async (req: AuthRequest, res) => {
    const logId = req.params.logId as string;

    try {
        const log = await prisma.pointUsageLog.findUnique({
            where: { id: logId },
            include: { child: true }
        });

        if (!log || (log.child as any).userId !== (req as any).user!.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        await prisma.pointUsageLog.delete({ where: { id: logId } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete log' });
    }
});

// --- Reward Config (Protected) ---

app.get('/api/rewards/:childId', authenticateToken, async (req: AuthRequest, res) => {
    const childId = req.params.childId as string;
    const child = await prisma.child.findFirst({
        where: { id: childId, userId: (req as any).user!.id }
    });
    if (!child) return res.status(403).json({ error: 'Unauthorized' });

    try {
        const config = await prisma.rewardConfig.findUnique({
            where: { childId: childId }
        });
        res.json(config || {});
    } catch (e) {
        res.status(500).json({ error: 'Failed fetch config' });
    }
});

app.put('/api/rewards/:childId', authenticateToken, async (req: AuthRequest, res) => {
    const childId = req.params.childId as string;
    const child = await prisma.child.findFirst({
        where: { id: childId, userId: (req as any).user!.id }
    });
    if (!child) return res.status(403).json({ error: 'Unauthorized' });

    const { mode, unit, study, academy, school, routine, rest, sleep } = req.body;

    try {
        const config = await prisma.rewardConfig.upsert({
            where: { childId: childId },
            update: { mode, unit, study, academy, school, routine, rest, sleep },
            create: { childId, mode, unit, study, academy, school, routine, rest, sleep }
        });
        res.json(config);
    } catch (e) {
        res.status(500).json({ error: 'Failed update config' });
    }
});

// --- Admin & Global Config API ---

// Public Config (for Frontend)
app.get('/api/public/config', async (req, res) => {
    try {
        const configs = await prisma.appConfig.findMany();
        const configMap: Record<string, string> = {};
        configs.forEach((c: any) => {
            configMap[c.key] = c.value;
        });
        res.json(configMap);
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch config' });
    }
});

// --- 미니게임 리더보드 API ---
const GAME_IDS = ['2048', 'snake', 'tetris', 'flappy', 'mole'];

app.post('/api/games/scores', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const { game, score } = req.body;
        if (!GAME_IDS.includes(game)) return res.status(400).json({ error: 'Unknown game' });
        const s = Math.floor(Number(score));
        if (!Number.isFinite(s) || s < 0 || s > 10_000_000) return res.status(400).json({ error: 'Invalid score' });
        const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
        await prisma.gameScore.create({
            data: { userId: req.user!.id, game, score: s, name: user?.email || req.user!.email },
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to save score' });
    }
});

app.get('/api/games/leaderboard', async (req, res) => {
    try {
        const game = String(req.query.game || '');
        if (!GAME_IDS.includes(game)) return res.status(400).json({ error: 'Unknown game' });
        const limit = Math.min(Number(req.query.limit) || 10, 50);
        // 점수 내림차순으로 넉넉히 조회한 뒤 유저별 최고점만 남겨 상위 N개 반환
        const rows = await prisma.gameScore.findMany({
            where: { game },
            orderBy: { score: 'desc' },
            take: 300,
        });
        const seen = new Set<string>();
        const top: { name: string; score: number }[] = [];
        for (const r of rows) {
            const key = r.userId || `name:${r.name}`;
            if (seen.has(key)) continue;
            seen.add(key);
            top.push({ name: r.name, score: r.score });
            if (top.length >= limit) break;
        }
        res.json(top);
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

app.get('/api/games/scores/me', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const game = String(req.query.game || '');
        if (!GAME_IDS.includes(game)) return res.status(400).json({ error: 'Unknown game' });
        const my = await prisma.gameScore.findFirst({
            where: { game, userId: req.user!.id },
            orderBy: { score: 'desc' },
        });
        res.json({ best: my?.score ?? 0 });
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});

// --- Admin API ---
app.post('/api/admin/config', async (req, res) => {
    const { password } = req.body;
    if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const { ADS_ENABLED, ADSENSE_SLOT_ID, COUPANG_BANNER_HTML, KAKAO_PAY_QR, AD_SIDEBAR_WIDTH, AD_SIDEBAR_HEIGHT, AD_SIDEBAR_MARGIN, AD_SIDEBAR_TOP, ADSENSE_INTERSTITIAL_ID, COUPANG_INTERSTITIAL_HTML, AD_INTERSTITIAL_TIMER, AD_INTERSTITIAL_WIDTH, AD_INTERSTITIAL_HEIGHT, COUPANG_MOBILE_HTML, ADSENSE_MOBILE_ID } = req.body;

    try {
        if (ADS_ENABLED !== undefined) await prisma.appConfig.upsert({ where: { key: 'ADS_ENABLED' }, update: { value: ADS_ENABLED }, create: { key: 'ADS_ENABLED', value: ADS_ENABLED } });
        if (ADSENSE_SLOT_ID !== undefined) await prisma.appConfig.upsert({ where: { key: 'ADSENSE_SLOT_ID' }, update: { value: ADSENSE_SLOT_ID }, create: { key: 'ADSENSE_SLOT_ID', value: ADSENSE_SLOT_ID } });
        if (COUPANG_BANNER_HTML !== undefined) await prisma.appConfig.upsert({ where: { key: 'COUPANG_BANNER_HTML' }, update: { value: COUPANG_BANNER_HTML }, create: { key: 'COUPANG_BANNER_HTML', value: COUPANG_BANNER_HTML } });
        if (KAKAO_PAY_QR !== undefined) await prisma.appConfig.upsert({ where: { key: 'KAKAO_PAY_QR' }, update: { value: KAKAO_PAY_QR }, create: { key: 'KAKAO_PAY_QR', value: KAKAO_PAY_QR } });
        if (AD_SIDEBAR_WIDTH !== undefined) await prisma.appConfig.upsert({ where: { key: 'AD_SIDEBAR_WIDTH' }, update: { value: AD_SIDEBAR_WIDTH }, create: { key: 'AD_SIDEBAR_WIDTH', value: AD_SIDEBAR_WIDTH } });
        if (AD_SIDEBAR_HEIGHT !== undefined) await prisma.appConfig.upsert({ where: { key: 'AD_SIDEBAR_HEIGHT' }, update: { value: AD_SIDEBAR_HEIGHT }, create: { key: 'AD_SIDEBAR_HEIGHT', value: AD_SIDEBAR_HEIGHT } });
        if (AD_SIDEBAR_MARGIN !== undefined) await prisma.appConfig.upsert({ where: { key: 'AD_SIDEBAR_MARGIN' }, update: { value: AD_SIDEBAR_MARGIN }, create: { key: 'AD_SIDEBAR_MARGIN', value: AD_SIDEBAR_MARGIN } });
        if (AD_SIDEBAR_TOP !== undefined) await prisma.appConfig.upsert({ where: { key: 'AD_SIDEBAR_TOP' }, update: { value: AD_SIDEBAR_TOP }, create: { key: 'AD_SIDEBAR_TOP', value: AD_SIDEBAR_TOP } });
        if (ADSENSE_INTERSTITIAL_ID !== undefined) await prisma.appConfig.upsert({ where: { key: 'ADSENSE_INTERSTITIAL_ID' }, update: { value: ADSENSE_INTERSTITIAL_ID }, create: { key: 'ADSENSE_INTERSTITIAL_ID', value: ADSENSE_INTERSTITIAL_ID } });
        if (COUPANG_INTERSTITIAL_HTML !== undefined) await prisma.appConfig.upsert({ where: { key: 'COUPANG_INTERSTITIAL_HTML' }, update: { value: COUPANG_INTERSTITIAL_HTML }, create: { key: 'COUPANG_INTERSTITIAL_HTML', value: COUPANG_INTERSTITIAL_HTML } });
        if (AD_INTERSTITIAL_TIMER !== undefined) await prisma.appConfig.upsert({ where: { key: 'AD_INTERSTITIAL_TIMER' }, update: { value: AD_INTERSTITIAL_TIMER }, create: { key: 'AD_INTERSTITIAL_TIMER', value: AD_INTERSTITIAL_TIMER } });
        if (AD_INTERSTITIAL_WIDTH !== undefined) await prisma.appConfig.upsert({ where: { key: 'AD_INTERSTITIAL_WIDTH' }, update: { value: AD_INTERSTITIAL_WIDTH }, create: { key: 'AD_INTERSTITIAL_WIDTH', value: AD_INTERSTITIAL_WIDTH } });
        if (AD_INTERSTITIAL_HEIGHT !== undefined) await prisma.appConfig.upsert({ where: { key: 'AD_INTERSTITIAL_HEIGHT' }, update: { value: AD_INTERSTITIAL_HEIGHT }, create: { key: 'AD_INTERSTITIAL_HEIGHT', value: AD_INTERSTITIAL_HEIGHT } });
        if (COUPANG_MOBILE_HTML !== undefined) await prisma.appConfig.upsert({ where: { key: 'COUPANG_MOBILE_HTML' }, update: { value: COUPANG_MOBILE_HTML }, create: { key: 'COUPANG_MOBILE_HTML', value: COUPANG_MOBILE_HTML } });
        if (ADSENSE_MOBILE_ID !== undefined) await prisma.appConfig.upsert({ where: { key: 'ADSENSE_MOBILE_ID' }, update: { value: ADSENSE_MOBILE_ID }, create: { key: 'ADSENSE_MOBILE_ID', value: ADSENSE_MOBILE_ID } });

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});

app.get('/api/admin/pending-deposits', async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            where: { premiumStatus: 'PENDING' },
            select: { id: true, email: true, premiumStatus: true, depositorName: true, createdAt: true }
        });
        res.json(users);
    } catch (e: any) {
        console.error("Error fetching pending deposits:", e);
        res.status(500).json({ error: 'Failed to fetch pending deposits' });
    }
});

app.post('/api/admin/approve-deposit', async (req, res) => {
    const { userId, password } = req.body;
    if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30); // 30-day Premium expiry

        await prisma.user.update({
            where: { id: userId },
            data: {
                isPremium: true,
                premiumStatus: 'APPROVED',
                premiumExpiry: expiryDate
            }
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to approve' });
    }
});

app.get('/api/admin/approved-donations', async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            where: { premiumStatus: 'APPROVED' },
            select: { id: true, email: true, premiumStatus: true, depositorName: true, createdAt: true }
        });
        res.json(users);
    } catch (e: any) {
        console.error("Error fetching approved donations:", e);
        res.status(500).json({ error: 'Failed to fetch approved donations' });
    }
});

app.post('/api/admin/revoke-donation', async (req, res) => {
    const { userId, password } = req.body;
    if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        await prisma.user.update({
            where: { id: userId },
            data: {
                isPremium: false,
                premiumStatus: 'NONE'
            }
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to revoke' });
    }
});

// --- Admin User Management API ---
app.post('/api/admin/users/list', async (req, res) => {
    const { password } = req.body;
    if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                isPremium: true,
                premiumStatus: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(users);
    } catch (e: any) {
        console.error("Error fetching admin user list:", e);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

app.post('/api/admin/users/:id/reset-password', async (req, res) => {
    const { password } = req.body;
    const userId = req.params.id;

    if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const hashedLoginPassword = await bcrypt.hash("123456", 10);
        await prisma.user.update({
            where: { id: userId },
            data: {
                password: hashedLoginPassword,
                parentPassword: "0000"
            }
        });
        res.json({ success: true, message: 'Password reset to 123456 (Parent: 0000)' });
    } catch (e: any) {
        console.error(`Error resetting password for user ${userId}:`, e);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

app.delete('/api/admin/users/:id', async (req, res) => {
    const { password } = req.body;
    const userId = req.params.id;

    if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        await prisma.user.delete({
            where: { id: userId }
        });
        res.json({ success: true, message: 'User permanently deleted' });
    } catch (e: any) {
        console.error(`Error deleting user ${userId}:`, e);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// --- User Premium API ---

app.get('/api/user/me', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: (req as any).user!.id }
        });
        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json({
            id: user.id,
            email: user.email,
            parentPassword: user.parentPassword,
            isPremium: !!user.isPremium,
            premiumStatus: user.premiumStatus || 'NONE',
            premiumExpiry: user.premiumExpiry
        });
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch user info' });
    }
});

app.post('/api/user/premium', authenticateToken, async (req, res) => {
    try {
        const { depositorName } = req.body;
        // Request Premium (Set to PENDING)
        await prisma.user.update({
            where: { id: (req as any).user.id },
            data: {
                premiumStatus: 'PENDING',
                depositorName: depositorName
                // Do NOT set isPremium: true yet
            }
        });
        res.json({ success: true, status: 'PENDING' });
    } catch (e) {
        res.status(500).json({ error: 'Failed to request premium' });
    }
});

// Serve Static Files in Production
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// Catch-all to serve index.html for frontend routing
app.use((req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API route not found' });
    }
    res.sendFile(path.join(distPath, 'index.html'));
});
// --- AI Advice API ---
app.post('/api/ai/advice', authenticateToken, async (req, res) => {
    try {
        const { prompt } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'Server API Key not configured' });
        }

        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt,
            config: {
                thinkingConfig: { includeThoughts: false }
            }
        });

        res.json({ advice: response.text });
    } catch (e: any) {
        console.error("Gemini API Error:", e);
        res.status(500).json({ error: 'Failed to generate advice', details: e.message });
    }
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
