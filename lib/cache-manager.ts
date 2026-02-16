"use client";

const CACHE_PREFIX = "jpm_cache_v1_";

export const CacheKeys = {
    STUDENT_HOME: "student_home",
    STUDENT_PROGRESS: "student_progress",
    STUDENT_STUDY_PLAN: "student_study_plan",
    STUDENT_LIBRARY: "student_library",
    TEACHER_HOME: "teacher_home",
    ADMIN_DASHBOARD: "admin_dashboard",
};

export const CacheManager = {
    save: <T>(key: string, data: T): void => {
        if (typeof window === "undefined") return;
        try {
            const serialized = JSON.stringify({
                data,
                timestamp: Date.now(),
            });
            localStorage.setItem(`${CACHE_PREFIX}${key}`, serialized);
        } catch (e) {
            console.warn("Failed to save to cache", e);
        }
    },

    load: <T>(key: string): T | null => {
        if (typeof window === "undefined") return null;
        try {
            const raw = localStorage.getItem(`${CACHE_PREFIX}${key}`);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            return parsed.data as T;
        } catch (e) {
            return null;
        }
    },

    clear: (key: string): void => {
        if (typeof window === "undefined") return;
        localStorage.removeItem(`${CACHE_PREFIX}${key}`);
    },

    clearAll: (): void => {
        if (typeof window === "undefined") return;
        Object.values(CacheKeys).forEach((key) => {
            localStorage.removeItem(`${CACHE_PREFIX}${key}`);
        });
    },
};
