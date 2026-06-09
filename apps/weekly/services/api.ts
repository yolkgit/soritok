
import { ChildProfile, TimeSlot, PointUsageLog, RewardConfig } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || (window.location.origin.includes('localhost')
    ? 'http://localhost:4000/api'
    : '/api');

const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

export const api = {
    // --- Auth ---
    signup: async (email, password) => {
        const res = await fetch(`${API_BASE}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Signup failed');
        }
        return res.json();
    },

    login: async (email, password) => {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Login failed');
        }
        return res.json();
    },

    updateParentPassword: async (parentPassword: string) => {
        const res = await fetch(`${API_BASE}/auth/parent-password`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ parentPassword }),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to update parent password');
        }
        return res.json();
    },

    resetParentPassword: async (loginPassword: string) => {
        const res = await fetch(`${API_BASE}/auth/reset-parent-password`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ loginPassword })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '비밀번호 초기화 실패');
        return data;
    },

    // --- Children ---
    getChildren: async (): Promise<ChildProfile[]> => {
        const res = await fetch(`${API_BASE}/children`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Failed to fetch children');
        const data = await res.json();
        return data.map((c: any) => ({
            id: c.id,
            name: c.name,
            color: c.color,
            grade: c.grade,
            startTime: c.startTime,
            endTime: c.endTime,
            isPlanConfirmed: c.isPlanConfirmed,
            bankedPoints: c.bankedPoints,
            lastCheckStartDate: c.lastCheckStartDate
        }));
    },

    createChild: async (child: Partial<ChildProfile>): Promise<ChildProfile> => {
        const res = await fetch(`${API_BASE}/children`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(child),
        });
        if (!res.ok) throw new Error('Failed to create child');
        return res.json();
    },

    updateChild: async (id: string, child: Partial<ChildProfile>): Promise<ChildProfile> => {
        const res = await fetch(`${API_BASE}/children/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(child),
        });
        if (!res.ok) throw new Error('Failed to update child');
        return res.json();
    },

    deleteChild: async (id: string): Promise<void> => {
        const res = await fetch(`${API_BASE}/children/${id}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });
        if (!res.ok) throw new Error('Failed to delete child');
    },

    // --- Schedule ---
    getSchedule: async (childId: string): Promise<TimeSlot[]> => {
        const res = await fetch(`${API_BASE}/schedules?childId=${childId}`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Failed to fetch schedule');
        return res.json();
    },

    saveScheduleBatch: async (childId: string, slots: TimeSlot[]): Promise<any> => {
        const res = await fetch(`${API_BASE}/schedules/batch`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ childId, slots }),
        });
        if (!res.ok) throw new Error('Failed to save schedule');
        return res.json();
    },

    deleteSlot: async (id: string): Promise<void> => {
        const res = await fetch(`${API_BASE}/schedules/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!res.ok) throw new Error('Failed to delete slot');
    },

    clearSchedule: async (childId: string): Promise<void> => {
        const res = await fetch(`${API_BASE}/schedules/all/${childId}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!res.ok) throw new Error('Failed to clear schedule');
    },

    resetChecks: async (childId: string): Promise<void> => {
        const res = await fetch(`${API_BASE}/children/${childId}/reset-checks`, {
            method: 'POST',
            headers: getHeaders()
        });
        if (!res.ok) throw new Error('Failed to reset checks');
    },

    // --- Snapshots ---
    getSnapshots: async (childId?: string) => {
        const query = childId ? `?childId=${childId}` : '';
        const res = await fetch(`${API_BASE}/snapshots${query}`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Failed to fetch snapshots');
        return res.json();
    },

    createSnapshot: async (data: { childId: string, name: string, date: string, schedule: TimeSlot[] }) => {
        const res = await fetch(`${API_BASE}/snapshots`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to create snapshot');
        return res.json();
    },

    deleteSnapshot: async (id: string) => {
        const res = await fetch(`${API_BASE}/snapshots/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!res.ok) throw new Error('Failed to delete snapshot');
    },

    // --- Logs & Rewards ---
    getLogs: async (childId: string): Promise<PointUsageLog[]> => {
        const res = await fetch(`${API_BASE}/logs?childId=${childId}`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Failed to fetch logs');
        return res.json();
    },

    addLog: async (childId: string, amount: number, reason: string): Promise<PointUsageLog> => {
        const res = await fetch(`${API_BASE}/logs`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ childId, amount, reason }),
        });
        if (!res.ok) throw new Error('Failed to add log');
        return res.json();
    },

    resetLogs: async (childId: string): Promise<void> => {
        const res = await fetch(`${API_BASE}/logs/reset`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ childId })
        });
        if (!res.ok) throw new Error('Failed to reset logs');
    },

    deleteLog: async (logId: string): Promise<void> => {
        const res = await fetch(`${API_BASE}/logs/item/${logId}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!res.ok) throw new Error('Failed to delete log');
    },

    getRewardConfig: async (childId: string): Promise<RewardConfig> => {
        const res = await fetch(`${API_BASE}/rewards/${childId}`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Failed to fetch reward config');
        const data = await res.json();
        if (!data) return {} as RewardConfig;
        const { id, childId: _, ...config } = data;
        return config as RewardConfig;
    },

    saveRewardConfig: async (childId: string, config: RewardConfig): Promise<RewardConfig> => {
        const res = await fetch(`${API_BASE}/rewards/${childId}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(config),
        });
        if (!res.ok) throw new Error('Failed to save reward config');
        const data = await res.json();
        const { id, childId: _, ...savedConfig } = data;
        return savedConfig as RewardConfig;
    },

    // --- Admin & Config ---
    getPublicConfig: async () => {
        const res = await fetch(`${API_BASE}/public/config`);
        if (!res.ok) throw new Error('Failed to fetch config');
        return res.json();
    },

    updateAdminConfig: async (password: string, settings: Record<string, string>) => {
        const res = await fetch(`${API_BASE}/admin/config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password, ...settings })
        });
        if (!res.ok) throw new Error('Failed to update config');
        return res.json();
    },

    adminGetUsers: async (password: string) => {
        const res = await fetch(`${API_BASE}/admin/users/list`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        if (!res.ok) throw new Error('Failed to fetch users');
        return res.json();
    },

    adminResetUserPassword: async (password: string, userId: string) => {
        const res = await fetch(`${API_BASE}/admin/users/${userId}/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        if (!res.ok) throw new Error('Failed to reset password');
        return res.json();
    },

    adminDeleteUser: async (password: string, userId: string) => {
        const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        if (!res.ok) throw new Error('Failed to delete user');
        return res.json();
    },

    // --- Premium ---
    getUserInfo: async () => {
        const res = await fetch(`${API_BASE}/user/me`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Failed to fetch user info');
        return res.json();
    },

    upgradePremium: async (depositorName?: string) => {
        const res = await fetch(`${API_BASE}/user/premium`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ depositorName })
        });
        if (!res.ok) throw new Error('Failed to upgrade premium');
        return res.json();
    }
};
